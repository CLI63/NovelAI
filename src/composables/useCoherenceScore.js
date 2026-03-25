import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'

/**
 * 章节连贯性评分组合式函数
 * 提供AI评估章节连贯性并给出修改建议
 */
export function useCoherenceScore() {
  const scoring = ref(false)
  const scoreResult = ref(null)
  const suggestions = ref([])

  /**
   * 评分维度配置
   */
  const scoringDimensions = [
    {
      key: 'plotConnection',
      name: '剧情衔接度',
      description: '评估章节之间的剧情是否连贯',
      weight: 0.3
    },
    {
      key: 'characterConsistency',
      name: '角色一致性',
      description: '评估角色行为和性格是否前后一致',
      weight: 0.25
    },
    {
      key: 'styleUnity',
      name: '风格统一度',
      description: '评估写作风格是否统一',
      weight: 0.2
    },
    {
      key: 'timelineAccuracy',
      name: '时间线准确度',
      description: '评估时间线是否合理',
      weight: 0.15
    },
    {
      key: 'detailConsistency',
      name: '细节一致性',
      description: '评估细节描写是否前后一致',
      weight: 0.1
    }
  ]

  /**
   * 执行连贯性评分
   * @param {Object} currentChapter - 当前章节
   * @param {Object} previousChapter - 上一章
   * @param {Object} novel - 小说信息
   * @param {Function} generate - AI生成函数
   */
  const runCoherenceScore = async (currentChapter, previousChapter, novel, generate) => {
    scoring.value = true
    scoreResult.value = null
    suggestions.value = []

    try {
      const messages = buildCoherenceScorePrompt(currentChapter, previousChapter, novel)
      const response = await generate(messages)
      
      // 解析评分结果
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        
        // 计算加权总分
        let totalScore = 0
        result.dimensions.forEach(dim => {
          const dimension = scoringDimensions.find(d => d.key === dim.key)
          if (dimension) {
            totalScore += dim.score * dimension.weight
          }
        })

        scoreResult.value = {
          overallScore: Math.round(totalScore),
          dimensions: result.dimensions,
          passed: totalScore >= 60,
          level: getScoreLevel(totalScore)
        }

        suggestions.value = result.suggestions || []
        
        return scoreResult.value
      }

      return null
    } catch (err) {
      console.error('连贯性评分失败:', err)
      message.error('连贯性评分失败')
      return null
    } finally {
      scoring.value = false
    }
  }

  /**
   * 获取评分等级
   */
  const getScoreLevel = (score) => {
    if (score >= 90) return { text: '优秀', color: 'success' }
    if (score >= 80) return { text: '良好', color: 'success' }
    if (score >= 70) return { text: '中等', color: 'warning' }
    if (score >= 60) return { text: '及格', color: 'warning' }
    return { text: '不及格', color: 'error' }
  }

  /**
   * 快速连贯性检查（不使用AI）
   * @param {Object} currentChapter - 当前章节
   * @param {Object} previousChapter - 上一章
   */
  const quickCoherenceCheck = (currentChapter, previousChapter) => {
    const issues = []
    let score = 100

    if (!previousChapter) {
      return { score: 100, issues: [], passed: true }
    }

    // 检查章节衔接
    const prevEnding = previousChapter.content?.slice(-200) || ''
    const currBeginning = currentChapter.content?.slice(0, 200) || ''

    // 检查过渡词
    const transitionWords = ['于是', '随后', '接着', '第二天', '次日', '此时', '就在这时', '然而', '但是']
    const hasTransition = transitionWords.some(w => currBeginning.includes(w))
    if (!hasTransition) {
      issues.push({
        type: 'transition',
        message: '章节开头缺少过渡词',
        severity: 'minor'
      })
      score -= 5
    }

    // 检查时间跳跃
    const timeJumpPatterns = ['三年后', '五年后', '十年后', '数年后']
    const hasTimeJump = timeJumpPatterns.some(p => currBeginning.includes(p))
    if (hasTimeJump && !prevEnding.includes('告别') && !prevEnding.includes('离开')) {
      issues.push({
        type: 'timeJump',
        message: '时间跳跃可能过于突兀',
        severity: 'moderate'
      })
      score -= 10
    }

    // 检查场景转换
    const prevLocation = extractLocation(prevEnding)
    const currLocation = extractLocation(currBeginning)
    if (prevLocation && currLocation && prevLocation !== currLocation) {
      const hasSceneTransition = currBeginning.includes('来到') || 
        currBeginning.includes('到达') || 
        currBeginning.includes('出现在')
      if (!hasSceneTransition) {
        issues.push({
          type: 'sceneChange',
          message: `场景从"${prevLocation}"转换到"${currLocation}"缺少过渡`,
          severity: 'moderate'
        })
        score -= 10
      }
    }

    return {
      score: Math.max(0, score),
      issues,
      passed: score >= 60
    }
  }

  /**
   * 提取地点（简单实现）
   */
  const extractLocation = (text) => {
    const locationPatterns = [
      /在(.{2,10})中/,
      /来到(.{2,10})/,
      /身处(.{2,10})/,
      /位于(.{2,10})/
    ]
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }
    
    return null
  }

  /**
   * 获取修改建议
   * @param {Object} scoreResult - 评分结果
   * @param {Object} currentChapter - 当前章节
   * @param {Object} previousChapter - 上一章
   * @param {Function} generate - AI生成函数
   */
  const getImprovementSuggestions = async (scoreResult, currentChapter, previousChapter, generate) => {
    if (!scoreResult || scoreResult.overallScore >= 80) {
      return []
    }

    try {
      const messages = buildSuggestionPrompt(scoreResult, currentChapter, previousChapter)
      const response = await generate(messages)
      
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return result.suggestions || []
      }

      return []
    } catch (err) {
      console.error('获取修改建议失败:', err)
      return []
    }
  }

  /**
   * 评分摘要
   */
  const scoreSummary = computed(() => {
    if (!scoreResult.value) return null

    const result = scoreResult.value
    const summary = []

    result.dimensions.forEach(dim => {
      const dimension = scoringDimensions.find(d => d.key === dim.key)
      summary.push({
        name: dimension?.name || dim.key,
        score: dim.score,
        weight: dimension?.weight || 0,
        issues: dim.issues || []
      })
    })

    return {
      overallScore: result.overallScore,
      level: result.level,
      dimensions: summary
    }
  })

  return {
    scoring,
    scoreResult,
    suggestions,
    scoringDimensions,
    scoreSummary,
    runCoherenceScore,
    quickCoherenceCheck,
    getImprovementSuggestions
  }
}

/**
 * 构建连贯性评分提示词
 */
export function buildCoherenceScorePrompt(currentChapter, previousChapter, novel) {
  return [
    {
      role: 'system',
      content: `你是一位专业的小说编辑，擅长评估章节之间的连贯性。请根据以下维度对章节进行评分（0-100分）：

1. 剧情衔接度（plotConnection）：评估章节之间的剧情是否连贯
2. 角色一致性（characterConsistency）：评估角色行为和性格是否前后一致
3. 风格统一度（styleUnity）：评估写作风格是否统一
4. 时间线准确度（timelineAccuracy）：评估时间线是否合理
5. 细节一致性（detailConsistency）：评估细节描写是否前后一致`
    },
    {
      role: 'user',
      content: `【小说信息】
书名：${novel.title}
风格：${novel.style?.join('、')}

【上一章结尾（最后500字）】
${previousChapter?.content?.slice(-500) || '这是第一章'}

【当前章节开头（前500字）】
${currentChapter?.content?.slice(0, 500) || ''}

【当前章节结尾（最后300字）】
${currentChapter?.content?.slice(-300) || ''}

请按以下JSON格式返回评分结果：
{
  "dimensions": [
    {
      "key": "plotConnection",
      "score": 85,
      "issues": ["问题描述1"]
    },
    {
      "key": "characterConsistency",
      "score": 90,
      "issues": []
    }
  ],
  "suggestions": [
    {
      "type": "improvement",
      "target": "章节开头",
      "suggestion": "建议添加过渡句..."
    }
  ],
  "overallComment": "整体评价"
}

只返回JSON，不要其他文字。`
    }
  ]
}

/**
 * 构建修改建议提示词
 */
export function buildSuggestionPrompt(scoreResult, currentChapter, previousChapter) {
  const lowScoreDimensions = scoreResult.dimensions.filter(d => d.score < 70)
  
  return [
    {
      role: 'system',
      content: `你是一位专业的小说编辑，请根据评分结果提供具体的修改建议。`
    },
    {
      role: 'user',
      content: `【评分结果】
总分：${scoreResult.overallScore}
低分维度：${lowScoreDimensions.map(d => `${d.key}: ${d.score}分`).join('、')}

【上一章结尾】
${previousChapter?.content?.slice(-300) || '无'}

【当前章节开头】
${currentChapter?.content?.slice(0, 300) || ''}

请提供具体的修改建议，按以下JSON格式返回：
{
  "suggestions": [
    {
      "type": "addition|modification|deletion",
      "target": "修改位置",
      "original": "原文（如适用）",
      "suggestion": "修改建议",
      "reason": "修改原因"
    }
  ]
}

只返回JSON，不要其他文字。`
    }
  ]
}
