import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'

/**
 * 内容质量检测组合式函数
 * 提供章节内容的质量检测功能
 */
export function useQualityCheck() {
  const checkResults = ref(null)
  const checking = ref(false)

  /**
   * 敏感词列表（示例，实际项目中应该从配置或后端获取）
   */
  const sensitiveWords = [
    // 这里可以添加需要检测的敏感词
  ]

  /**
   * 检测字数
   * @param {string} content - 内容
   * @param {number} minWords - 最小字数
   */
  const checkWordCount = (content, minWords) => {
    const wordCount = content?.length || 0
    return {
      passed: wordCount >= minWords,
      wordCount,
      minWords,
      message: wordCount >= minWords 
        ? `字数达标（${wordCount}字）` 
        : `字数不足（当前${wordCount}字，需要${minWords}字）`
    }
  }

  /**
   * 检测重复内容
   * @param {string} content - 当前章节内容
   * @param {Array} existingChapters - 已有章节列表
   */
  const checkRepetition = (content, existingChapters = []) => {
    if (!content || existingChapters.length === 0) {
      return { passed: true, repetitionRate: 0, message: '无重复内容' }
    }

    // 提取当前章节的关键句子（简化处理）
    const sentences = content.split(/[。！？\n]/).filter(s => s.trim().length > 10)
    
    let repeatedCount = 0
    const repeatedSentences = []

    existingChapters.forEach(chapter => {
      const existingSentences = (chapter.content || '').split(/[。！？\n]/).filter(s => s.trim().length > 10)
      
      sentences.forEach(sentence => {
        if (existingSentences.some(es => similarityRate(sentence, es) > 0.8)) {
          repeatedCount++
          repeatedSentences.push(sentence.slice(0, 50) + '...')
        }
      })
    })

    const repetitionRate = sentences.length > 0 ? (repeatedCount / sentences.length) * 100 : 0
    
    return {
      passed: repetitionRate < 30,
      repetitionRate: Math.round(repetitionRate),
      repeatedCount,
      repeatedSentences: [...new Set(repeatedSentences)].slice(0, 5),
      message: repetitionRate < 30 
        ? `重复率正常（${Math.round(repetitionRate)}%）` 
        : `重复率过高（${Math.round(repetitionRate)}%）`
    }
  }

  /**
   * 计算两个字符串的相似度
   * @param {string} str1 - 字符串1
   * @param {string} str2 - 字符串2
   */
  const similarityRate = (str1, str2) => {
    if (!str1 || !str2) return 0
    const len1 = str1.length
    const len2 = str2.length
    const maxLen = Math.max(len1, len2)
    if (maxLen === 0) return 1
    
    // 简化的相似度计算
    const commonChars = [...str1].filter(c => str2.includes(c)).length
    return commonChars / maxLen
  }

  /**
   * 检测敏感词
   * @param {string} content - 内容
   */
  const checkSensitiveWords = (content) => {
    if (!content) {
      return { passed: true, foundWords: [], message: '无敏感词' }
    }

    const foundWords = []
    sensitiveWords.forEach(word => {
      if (content.includes(word)) {
        foundWords.push(word)
      }
    })

    return {
      passed: foundWords.length === 0,
      foundWords,
      message: foundWords.length === 0 
        ? '无敏感词' 
        : `发现${foundWords.length}个敏感词：${foundWords.join('、')}`
    }
  }

  /**
   * 检测逻辑一致性（简化版）
   * @param {Object} chapter - 章节信息
   * @param {Object} novel - 小说信息
   */
  const checkLogicConsistency = (chapter, novel) => {
    const issues = []
    
    if (!chapter || !novel) {
      return { passed: true, issues: [], message: '无法检测' }
    }

    // 检查角色名称是否一致
    const protagonistName = novel.characters?.protagonist?.name
    if (protagonistName && chapter.content) {
      // 简单检查主角名字是否出现
      if (!chapter.content.includes(protagonistName)) {
        // 主角未出场不一定是问题，只是提示
        issues.push({
          type: 'info',
          message: `主角"${protagonistName}"在本章未出场`
        })
      }
    }

    // 检查世界观设定是否被违反（简化处理）
    const worldSetting = novel.worldSetting
    if (worldSetting?.powerSystem && chapter.content) {
      // 可以添加更多逻辑检查
    }

    return {
      passed: issues.filter(i => i.type === 'error').length === 0,
      issues,
      message: issues.length === 0 
        ? '逻辑一致性检测通过' 
        : `发现${issues.length}个潜在问题`
    }
  }

  /**
   * 检测章节连贯性
   * @param {Object} chapter - 当前章节
   * @param {Object} previousChapter - 上一章
   */
  const checkCoherence = (chapter, previousChapter) => {
    if (!chapter || !previousChapter) {
      return { passed: true, score: 100, message: '无上一章参考' }
    }

    let score = 100
    const issues = []

    // 检查章节衔接
    const prevEnding = previousChapter.content?.slice(-200) || ''
    const currBeginning = chapter.content?.slice(0, 200) || ''

    // 简化的连贯性评分
    // 实际项目中可以使用AI来评估
    if (prevEnding && currBeginning) {
      // 检查是否有明显的衔接词
      const transitionWords = ['于是', '随后', '接着', '第二天', '次日', '此时', '就在这时']
      const hasTransition = transitionWords.some(w => currBeginning.includes(w))
      
      if (!hasTransition) {
        score -= 10
        issues.push('章节开头缺少过渡')
      }
    }

    return {
      passed: score >= 60,
      score,
      issues,
      message: score >= 80 
        ? `连贯性良好（${score}分）` 
        : score >= 60 
          ? `连贯性一般（${score}分）` 
          : `连贯性较差（${score}分）`
    }
  }

  /**
   * 执行完整质量检测
   * @param {Object} chapter - 章节信息
   * @param {Object} options - 检测选项
   */
  const runQualityCheck = async (chapter, options = {}) => {
    const {
      novel = null,
      existingChapters = [],
      previousChapter = null,
      minWords = 2000
    } = options

    checking.value = true
    const results = {
      wordCount: null,
      repetition: null,
      sensitiveWords: null,
      logicConsistency: null,
      coherence: null,
      overallPassed: true,
      overallScore: 100
    }

    try {
      // 字数检测
      results.wordCount = checkWordCount(chapter.content, minWords)
      if (!results.wordCount.passed) results.overallPassed = false

      // 重复检测
      results.repetition = checkRepetition(chapter.content, existingChapters)
      if (!results.repetition.passed) {
        results.overallPassed = false
        results.overallScore -= 20
      }

      // 敏感词检测
      results.sensitiveWords = checkSensitiveWords(chapter.content)
      if (!results.sensitiveWords.passed) {
        results.overallPassed = false
        results.overallScore -= 30
      }

      // 逻辑一致性检测
      if (novel) {
        results.logicConsistency = checkLogicConsistency(chapter, novel)
        if (!results.logicConsistency.passed) {
          results.overallScore -= 15
        }
      }

      // 连贯性检测
      if (previousChapter) {
        results.coherence = checkCoherence(chapter, previousChapter)
        if (!results.coherence.passed) {
          results.overallScore -= 15
        }
      }

      results.overallScore = Math.max(0, results.overallScore)
      checkResults.value = results

      return results
    } finally {
      checking.value = false
    }
  }

  /**
   * 获取质量报告摘要
   */
  const getQualitySummary = computed(() => {
    if (!checkResults.value) return null

    const results = checkResults.value
    const summary = []

    if (results.wordCount) {
      summary.push({
        type: results.wordCount.passed ? 'success' : 'error',
        label: '字数',
        value: results.wordCount.message
      })
    }

    if (results.repetition) {
      summary.push({
        type: results.repetition.passed ? 'success' : 'warning',
        label: '重复率',
        value: results.repetition.message
      })
    }

    if (results.sensitiveWords) {
      summary.push({
        type: results.sensitiveWords.passed ? 'success' : 'error',
        label: '敏感词',
        value: results.sensitiveWords.message
      })
    }

    if (results.logicConsistency) {
      summary.push({
        type: results.logicConsistency.passed ? 'success' : 'warning',
        label: '逻辑一致性',
        value: results.logicConsistency.message
      })
    }

    if (results.coherence) {
      summary.push({
        type: results.coherence.passed ? 'success' : 'warning',
        label: '连贯性',
        value: results.coherence.message
      })
    }

    return summary
  })

  /**
   * 清除检测结果
   */
  const clearResults = () => {
    checkResults.value = null
  }

  return {
    checkResults,
    checking,
    getQualitySummary,
    runQualityCheck,
    checkWordCount,
    checkRepetition,
    checkSensitiveWords,
    checkLogicConsistency,
    checkCoherence,
    clearResults
  }
}
