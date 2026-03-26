import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const currentNovel = ref(null)
  const currentChapter = ref(null)
  const settings = ref({
    aiProvider: 'kimi',
    kimiApiKey: '',
    qianwenApiKey: '',
    deepseekApiKey: '',
    doubaoApiKey: '',
    kimiModel: 'kimi-k2-turbo-preview',
    qianwenModel: 'qwen3-max',
    deepseekModel: 'deepseek-chat',
    doubaoModel: 'doubao-pro-32k-chat',
    timeout: 1200000,
    // 字数补偿配置
    wordCountCompensation: true,      // 是否启用字数补偿
    compensationThreshold: 0.8,        // 触发补偿的阈值（目标字数的百分比）
    maxExpandAttempts: 2,              // 最大扩写尝试次数
    expansionStrategy: 'paragraph',    // 扩写策略: 'paragraph' | 'whole'
  })

  const setCurrentNovel = (novel) => {
    currentNovel.value = novel
  }

  const setCurrentChapter = (chapter) => {
    currentChapter.value = chapter
  }

  const updateSettings = (newSettings) => {
    settings.value = { ...settings.value, ...newSettings }
    localStorage.setItem('novelAISettings', JSON.stringify(settings.value))
  }

  const loadSettings = () => {
    const saved = localStorage.getItem('novelAISettings')
    if (saved) {
      settings.value = JSON.parse(saved)
    }
  }

  const getCurrentApiKey = () => {
    const provider = settings.value.aiProvider
    if (provider === 'kimi') return settings.value.kimiApiKey
    if (provider === 'qianwen') return settings.value.qianwenApiKey
    if (provider === 'deepseek') return settings.value.deepseekApiKey
    if (provider === 'doubao') return settings.value.doubaoApiKey
    return ''
  }

  const getCurrentModel = () => {
    const provider = settings.value.aiProvider
    if (provider === 'kimi') return settings.value.kimiModel || 'kimi-k2-turbo-preview'
    if (provider === 'qianwen') return settings.value.qianwenModel || 'qwen3-max'
    if (provider === 'deepseek') return settings.value.deepseekModel || 'deepseek-chat'
    if (provider === 'doubao') return settings.value.doubaoModel || 'doubao-pro-32k-chat'
    return ''
  }

  return {
    currentNovel,
    currentChapter,
    settings,
    setCurrentNovel,
    setCurrentChapter,
    updateSettings,
    loadSettings,
    getCurrentApiKey,
    getCurrentModel,
  }
})
