import { ref } from 'vue'
import { callAIWithRetry } from '../utils/api'

/**
 * 修辞助手组合式函数
 * 提供段落优化建议、修辞手法分析等功能
 */
export function useRhetoricAssistant() {
  const analyzing = ref(false)
  const suggestions = ref([])
  const error = ref(null)

  /**
   * 修辞手法类型
   */
  const rhetoricTypes = {
    metaphor: { name: '比喻', description: '用相似的事物来描写本体' },
    simile: { name: '明喻', description: '用"像""如"等词进行比喻' },
    personification: { name: '拟人', description: '把物当做人来写' },
    hyperbole: { name: '夸张', description: '故意夸大或缩小事物' },
    parallelism: { name: '排比', description: '三个或以上结构相似的句子' },
    contrast: { name: '对比', description: '将两个相反的事物放在一起' },
    rhetorical: { name: '反问', description: '用疑问的形式表达确定的意思' },
    irony: { name: '反语', description: '用相反的词语表达本意' },
    synecdoche: { name: '借代', description: '用相关的事物代替本体' },
    repetition: { name: '反复', description: '重复使用某些词语或句子' }
  }

  /**
   * 构建段落优化提示词
   * @param {string} content - 原文内容
   * @param {string} style - 小说风格
   * @param {string} focus - 优化重点
   */
  const buildOptimizationPrompt = (content, style = '', focus = '') => {
    return [
      {
        role: 'system',
        content: `你是一位资深的小说编辑和修辞学专家。请分析用户提供的段落，给出专业的优化建议。

【分析维度】：
1. 语言表达：是否生动、精准、有感染力
2. 修辞手法：是否使用了恰当的修辞手法
3. 句式变化：是否有多样性，避免单调
4. 节奏感：是否张弛有度
5. 感官描写：是否充分调动多种感官
6. 情感传达：是否有效传达了想要表达的情感

【建议原则】：
- 保持原意和风格不变
- 建议要具体、可操作
- 解释优化的原因和效果
- 提供1-3个优化版本供参考

请严格按照JSON格式返回结果：
{
  "analysis": {
    "strengths": ["优点1", "优点2"],
    "weaknesses": ["不足1", "不足2"],
    "rhetoricUsed": ["已使用的修辞手法"],
    "suggestions": ["改进方向1", "改进方向2"]
  },
  "optimizations": [
    {
      "type": "优化类型（如：增强画面感、丰富细节等）",
      "reason": "优化原因",
      "original": "原文片段",
      "optimized": "优化后版本",
      "explanation": "优化说明"
    }
  ],
  "rewrittenVersions": [
    {
      "style": "版本风格描述",
      "content": "重写后的完整段落"
    }
  ]
}`
      },
      {
        role: 'user',
        content: `请分析以下段落并给出优化建议：

【小说风格】${style || '未指定'}

【优化重点】${focus || '综合优化'}

【原文内容】
${content}`
      }
    ]
  }

  /**
   * 分析段落修辞
   * @param {string} content - 内容
   * @param {string} style - 小说风格
   * @param {string} focus - 优化重点
   */
  const analyzeParagraph = async (content, style = '', focus = '') => {
    if (!content || !content.trim()) {
      error.value = '请输入要分析的内容'
      return null
    }

    analyzing.value = true
    error.value = null
    suggestions.value = []

    try {
      const messages = buildOptimizationPrompt(content, style, focus)
      const apiKey = localStorage.getItem('apiKey')
      const provider = localStorage.getItem('provider') || 'deepseek'

      if (!apiKey) {
        error.value = '请先配置API密钥'
        return null
      }

      const response = await callAIWithRetry(messages, provider, apiKey)

      // 解析JSON响应
      let result
      try {
        // 尝试提取JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('无法解析响应')
        }
      } catch (parseError) {
        // 如果解析失败，创建一个基本的结果对象
        result = {
          analysis: {
            strengths: [],
            weaknesses: [],
            rhetoricUsed: [],
            suggestions: [response]
          },
          optimizations: [],
          rewrittenVersions: []
        }
      }

      suggestions.value = result
      return result
    } catch (err) {
      error.value = err.message || '分析失败'
      return null
    } finally {
      analyzing.value = false
    }
  }

  /**
   * 快速优化建议（不使用AI）
   * @param {string} content - 内容
   */
  const getQuickSuggestions = (content) => {
    const quickTips = []

    if (!content) return quickTips

    // 检查句子长度变化
    const sentences = content.split(/[。！？\n]/).filter(s => s.trim())
    const lengths = sentences.map(s => s.length)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const lengthVariance = Math.sqrt(
      lengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / lengths.length
    )

    if (lengthVariance < 10) {
      quickTips.push({
        type: 'sentence-variety',
        title: '句式变化不足',
        description: '句子长度较为一致，建议增加长短句的变化，增强节奏感。',
        severity: 'warning'
      })
    }

    // 检查形容词使用
    const adjectiveCount = (content.match(/的|地|得/g) || []).length
    const wordCount = content.length
    if (adjectiveCount / wordCount > 0.1) {
      quickTips.push({
        type: 'adjective-overuse',
        title: '形容词可能过多',
        description: '"的/地/得"使用较多，可考虑用更具体的动词或名词代替。',
        severity: 'info'
      })
    }

    // 检查感官描写
    const sensoryWords = {
      visual: ['看', '见', '望', '瞧', '颜色', '明亮', '黑暗', '闪烁'],
      auditory: ['听', '声', '响', '音', '嘈杂', '寂静', '呼啸'],
      olfactory: ['闻', '嗅', '香', '臭', '气味', '芬芳'],
      tactile: ['摸', '触', '冷', '热', '温', '粗糙', '光滑'],
      gustatory: ['尝', '吃', '酸甜苦辣', '味道']
    }

    const usedSenses = Object.entries(sensoryWords)
      .filter(([_, words]) => words.some(w => content.includes(w)))
      .map(([sense]) => sense)

    if (usedSenses.length < 2) {
      quickTips.push({
        type: 'sensory-limited',
        title: '感官描写可丰富',
        description: `当前主要使用了${usedSenses.length > 0 ? usedSenses.join('、') : '单一'}感官描写，建议调动更多感官增强沉浸感。`,
        severity: 'info'
      })
    }

    // 检查重复词语
    const words = content.match(/[\u4e00-\u9fa5]{2,}/g) || []
    const wordFreq = {}
    words.forEach(w => {
      wordFreq[w] = (wordFreq[w] || 0) + 1
    })
    const repeatedWords = Object.entries(wordFreq)
      .filter(([_, count]) => count > 2)
      .map(([word, count]) => ({ word, count }))

    if (repeatedWords.length > 0) {
      quickTips.push({
        type: 'word-repetition',
        title: '存在重复词语',
        description: `以下词语出现较多：${repeatedWords.slice(0, 3).map(w => `"${w.word}"(${w.count}次)`).join('、')}。可考虑使用同义词替换。`,
        severity: 'info',
        details: repeatedWords
      })
    }

    return quickTips
  }

  /**
   * 获取修辞手法建议
   * @param {string} content - 内容
   * @param {string} type - 场景类型
   */
  const getRhetoricSuggestions = (content, type = '') => {
    const suggestions = []

    // 根据内容特点推荐修辞手法
    const contentLower = content.toLowerCase()

    // 检查是否适合用比喻
    if (type === 'environment' || type === 'psychology') {
      if (!content.includes('像') && !content.includes('如') && !content.includes('似')) {
        suggestions.push({
          type: 'metaphor',
          name: '比喻',
          suggestion: '可以使用比喻来增强形象感，如"月光如水"。',
          examples: [
            '原句可改为："天空像一块巨大的幕布，缀满了闪烁的星星。"',
            '原句可改为："她的笑容如同春风拂面，让人心生暖意。"'
          ]
        })
      }
    }

    // 检查是否适合用拟人
    if (type === 'environment') {
      if (!/[风月星辰花草树木].*[动作]/.test(content)) {
        suggestions.push({
          type: 'personification',
          name: '拟人',
          suggestion: '可以将自然景物拟人化，增加生动感。',
          examples: [
            '"微风轻抚着树叶，发出沙沙的低语。"',
            '"太阳懒洋洋地爬上山头。"'
          ]
        })
      }
    }

    // 检查是否适合用排比
    const sentences = content.split(/[。！？]/).filter(s => s.trim())
    if (sentences.length >= 3 && type === 'climax') {
      suggestions.push({
        type: 'parallelism',
        name: '排比',
        suggestion: '这个场景适合使用排比增强气势。',
        examples: [
          '"他要为正义而战，为弱者而战，为这片土地而战！"',
          '"风在呼啸，雨在咆哮，天地在颤抖。"'
        ]
      })
    }

    return suggestions
  }

  /**
   * 生成改写建议
   * @param {string} content - 原文
   * @param {string} direction - 改写方向
   */
  const generateRewriteSuggestion = (content, direction) => {
    const rewriteStrategies = {
      'enhance-imagery': {
        name: '增强画面感',
        tips: [
          '添加具体的颜色、形状、声音描写',
          '使用"仿佛""宛如"等比喻词',
          '加入光影、空间感的描写'
        ]
      },
      'deepen-emotion': {
        name: '深化情感',
        tips: [
          '加入内心独白',
          '描写身体反应（心跳、手抖等）',
          '使用反问或感叹句式'
        ]
      },
      'sharpen-action': {
        name: '动作更生动',
        tips: [
          '分解复杂动作为连续小动作',
          '使用具体动词代替笼统描述',
          '添加动作的力度、速度、角度'
        ]
      },
      'enrich-dialogue': {
        name: '丰富对话',
        tips: [
          '加入语气、语速、停顿描写',
          '添加肢体语言和表情',
          '使用省略或打断增加真实感'
        ]
      }
    }

    return rewriteStrategies[direction] || null
  }

  /**
   * 清除分析结果
   */
  const clearAnalysis = () => {
    suggestions.value = []
    error.value = null
  }

  return {
    analyzing,
    suggestions,
    error,
    rhetoricTypes,
    analyzeParagraph,
    getQuickSuggestions,
    getRhetoricSuggestions,
    generateRewriteSuggestion,
    clearAnalysis
  }
}

export default useRhetoricAssistant
