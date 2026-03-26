import { ref, computed } from 'vue'

/**
 * 敏感词管理组合式函数
 * 提供可配置的敏感词库管理和检测功能
 */

// 默认敏感词库存储键
const STORAGE_KEY = 'novel_sensitive_words'
const CUSTOM_WORDS_KEY = 'novel_custom_sensitive_words'

/**
 * 默认敏感词分类
 */
export const defaultCategories = [
  { key: 'politics', name: '政治敏感', enabled: true, severity: 'high' },
  { key: 'violence', name: '暴力血腥', enabled: true, severity: 'medium' },
  { key: 'erotic', name: '色情低俗', enabled: true, severity: 'high' },
  { key: 'gambling', name: '赌博相关', enabled: true, severity: 'medium' },
  { key: 'drug', name: '毒品相关', enabled: true, severity: 'high' },
  { key: 'discrimination', name: '歧视用语', enabled: true, severity: 'medium' },
  { key: 'custom', name: '自定义', enabled: true, severity: 'low' }
]

/**
 * 预设敏感词库（基础示例）
 * 实际使用时应该从服务器获取或由用户配置
 */
export const defaultSensitiveWords = {
  politics: [],
  violence: ['屠杀', '肢解', '虐杀'],
  erotic: [],
  gambling: ['赌博', '博彩', '下注'],
  drug: ['毒品', '海洛因', '冰毒'],
  discrimination: [],
  custom: []
}

/**
 * 敏感词管理函数
 */
export function useSensitiveWords() {
  // 敏感词库
  const wordLibrary = ref({ ...defaultSensitiveWords })
  // 自定义敏感词
  const customWords = ref([])
  // 分类配置
  const categories = ref([...defaultCategories])
  // 检测结果
  const detectionResult = ref(null)
  // 是否正在检测
  const detecting = ref(false)

  /**
   * 从本地存储加载配置
   */
  const loadFromStorage = () => {
    try {
      // 加载自定义词库
      const storedCustomWords = localStorage.getItem(CUSTOM_WORDS_KEY)
      if (storedCustomWords) {
        const parsed = JSON.parse(storedCustomWords)
        customWords.value = parsed
        wordLibrary.value.custom = parsed
      }

      // 加载分类配置
      const storedConfig = localStorage.getItem(STORAGE_KEY)
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig)
        categories.value = parsed.categories || defaultCategories
      }
    } catch (e) {
      console.error('加载敏感词配置失败:', e)
    }
  }

  /**
   * 保存配置到本地存储
   */
  const saveToStorage = () => {
    try {
      localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(customWords.value))
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        categories: categories.value
      }))
    } catch (e) {
      console.error('保存敏感词配置失败:', e)
    }
  }

  /**
   * 添加自定义敏感词
   * @param {string} word - 敏感词
   * @param {string} note - 备注
   */
  const addCustomWord = (word, note = '') => {
    if (!word || !word.trim()) return false

    const trimmedWord = word.trim()
    if (customWords.value.some(w => w.word === trimmedWord)) {
      return false
    }

    customWords.value.push({
      word: trimmedWord,
      note,
      addedAt: new Date().toISOString()
    })

    wordLibrary.value.custom = customWords.value
    saveToStorage()
    return true
  }

  /**
   * 批量添加自定义敏感词
   * @param {Array} words - 敏感词数组
   */
  const addCustomWords = (words) => {
    if (!Array.isArray(words)) return 0

    let addedCount = 0
    words.forEach(item => {
      const word = typeof item === 'string' ? item : item.word
      const note = typeof item === 'object' ? item.note : ''
      if (addCustomWord(word, note)) {
        addedCount++
      }
    })

    return addedCount
  }

  /**
   * 删除自定义敏感词
   * @param {string} word - 要删除的敏感词
   */
  const removeCustomWord = (word) => {
    const index = customWords.value.findIndex(w => w.word === word)
    if (index > -1) {
      customWords.value.splice(index, 1)
      wordLibrary.value.custom = customWords.value
      saveToStorage()
      return true
    }
    return false
  }

  /**
   * 更新分类启用状态
   * @param {string} key - 分类key
   * @param {boolean} enabled - 是否启用
   */
  const setCategoryEnabled = (key, enabled) => {
    const category = categories.value.find(c => c.key === key)
    if (category) {
      category.enabled = enabled
      saveToStorage()
    }
  }

  /**
   * 获取当前启用的所有敏感词
   */
  const getActiveWords = computed(() => {
    const activeWords = new Map()

    categories.value.forEach(cat => {
      if (cat.enabled && wordLibrary.value[cat.key]) {
        const words = wordLibrary.value[cat.key]
        words.forEach(item => {
          const word = typeof item === 'string' ? item : item.word
          activeWords.set(word, {
            word,
            category: cat.key,
            severity: cat.severity
          })
        })
      }
    })

    return activeWords
  })

  /**
   * 检测内容中的敏感词
   * @param {string} content - 要检测的内容
   * @param {Object} options - 检测选项
   */
  const detectSensitiveWords = (content, options = {}) => {
    if (!content) {
      detectionResult.value = null
      return null
    }

    const {
      showPosition = true,
      ignoreCase = true
    } = options

    detecting.value = true

    try {
      const activeWords = getActiveWords.value
      const found = []
      let processedContent = ignoreCase ? content.toLowerCase() : content

      activeWords.forEach((info, word) => {
        const searchWord = ignoreCase ? word.toLowerCase() : word
        let startIndex = 0
        let index

        while ((index = processedContent.indexOf(searchWord, startIndex)) !== -1) {
          found.push({
            word,
            category: info.category,
            severity: info.severity,
            position: showPosition ? index : null,
            context: showPosition ? getContext(content, index, word.length) : null
          })
          startIndex = index + 1
        }
      })

      // 按严重程度和位置排序
      found.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })

      detectionResult.value = {
        hasSensitiveWords: found.length > 0,
        totalCount: found.length,
        byCategory: groupByCategory(found),
        bySeverity: groupBySeverity(found),
        details: found
      }

      return detectionResult.value
    } finally {
      detecting.value = false
    }
  }

  /**
   * 获取上下文
   */
  const getContext = (content, position, length, contextRange = 20) => {
    const start = Math.max(0, position - contextRange)
    const end = Math.min(content.length, position + length + contextRange)
    return {
      before: content.slice(start, position),
      match: content.slice(position, position + length),
      after: content.slice(position + length, end)
    }
  }

  /**
   * 按分类分组
   */
  const groupByCategory = (found) => {
    const grouped = {}
    found.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = []
      }
      grouped[item.category].push(item)
    })
    return grouped
  }

  /**
   * 按严重程度分组
   */
  const groupBySeverity = (found) => {
    return {
      high: found.filter(f => f.severity === 'high'),
      medium: found.filter(f => f.severity === 'medium'),
      low: found.filter(f => f.severity === 'low')
    }
  }

  /**
   * 替换敏感词
   * @param {string} content - 原内容
   * @param {string} replacement - 替换字符
   */
  const replaceSensitiveWords = (content, replacement = '*') => {
    if (!content) return content

    const activeWords = getActiveWords.value
    let result = content

    activeWords.forEach((_, word) => {
      // 转义正则特殊字符，避免敏感词中包含特殊字符时出错
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escapedWord, 'g')
      result = result.replace(regex, replacement.repeat(word.length))
    })

    return result
  }

  /**
   * 导出敏感词配置
   */
  const exportConfig = () => {
    return {
      categories: categories.value,
      customWords: customWords.value,
      exportedAt: new Date().toISOString()
    }
  }

  /**
   * 导入敏感词配置
   * @param {Object} config - 配置对象
   */
  const importConfig = (config) => {
    try {
      if (config.categories) {
        categories.value = config.categories
      }
      if (config.customWords && Array.isArray(config.customWords)) {
        customWords.value = config.customWords
        wordLibrary.value.custom = config.customWords
      }
      saveToStorage()
      return true
    } catch (e) {
      console.error('导入配置失败:', e)
      return false
    }
  }

  /**
   * 重置为默认配置
   */
  const resetToDefault = () => {
    customWords.value = []
    categories.value = [...defaultCategories]
    wordLibrary.value = { ...defaultSensitiveWords }
    localStorage.removeItem(CUSTOM_WORDS_KEY)
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * 清除检测结果
   */
  const clearDetection = () => {
    detectionResult.value = null
  }

  // 初始化加载
  loadFromStorage()

  return {
    wordLibrary,
    customWords,
    categories,
    detectionResult,
    detecting,
    getActiveWords,
    addCustomWord,
    addCustomWords,
    removeCustomWord,
    setCategoryEnabled,
    detectSensitiveWords,
    replaceSensitiveWords,
    exportConfig,
    importConfig,
    resetToDefault,
    clearDetection
  }
}

/**
 * 快速检测敏感词（无需创建实例）
 * @param {string} content - 内容
 * @param {Array} customWords - 自定义敏感词列表
 */
export function quickDetectSensitiveWords(content, customWords = []) {
  if (!content) return { hasSensitiveWords: false, found: [] }

  const found = []
  const allWords = new Set()

  // 添加默认敏感词
  Object.values(defaultSensitiveWords).forEach(words => {
    words.forEach(w => allWords.add(typeof w === 'string' ? w : w.word))
  })

  // 添加自定义敏感词
  customWords.forEach(w => {
    allWords.add(typeof w === 'string' ? w : w.word)
  })

  allWords.forEach(word => {
    if (content.includes(word)) {
      found.push(word)
    }
  })

  return {
    hasSensitiveWords: found.length > 0,
    found,
    count: found.length
  }
}

export default useSensitiveWords
