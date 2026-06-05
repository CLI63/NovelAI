import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useBackgroundTask } from '@/composables/useBackgroundTask'

const DEEPSEEK_PROVIDER = 'deepseek'
const CUSTOM_OPENAI_PROVIDER = 'custom-openai'
const DEEPSEEK_DEFAULT_MODEL = 'deepseek-v4-flash'

// 统一清洗设置，确保历史配置升级后仍然能兼容新的双入口结构。
function normalizeSettings(rawSettings = {}) {
  // 只允许当前支持的 provider，历史非法值统一回落到 DeepSeek。
  const normalizedProvider = [DEEPSEEK_PROVIDER, CUSTOM_OPENAI_PROVIDER].includes(rawSettings.aiProvider)
    ? rawSettings.aiProvider
    : DEEPSEEK_PROVIDER

  const normalizedSettings = {
    ...rawSettings,
    aiProvider: normalizedProvider,
    deepseekApiKey: rawSettings.deepseekApiKey || '',
    deepseekModel: rawSettings.deepseekModel || DEEPSEEK_DEFAULT_MODEL,
    customOpenAIBaseUrl: rawSettings.customOpenAIBaseUrl || '',
    customOpenAIApiKey: rawSettings.customOpenAIApiKey || '',
    customOpenAIModel: rawSettings.customOpenAIModel || '',
  }

  // 清理旧提供商残留字段，避免历史多 provider 配置继续干扰新逻辑。
  delete normalizedSettings.kimiApiKey
  delete normalizedSettings.qianwenApiKey
  delete normalizedSettings.doubaoApiKey
  delete normalizedSettings.kimiModel
  delete normalizedSettings.qianwenModel
  delete normalizedSettings.doubaoModel

  return normalizedSettings
}

export const useAppStore = defineStore('app', () => {
  const currentNovel = ref(null)
  const currentChapter = ref(null)
  const settings = ref(normalizeSettings({
    aiProvider: DEEPSEEK_PROVIDER,
    deepseekApiKey: '',
    deepseekModel: DEEPSEEK_DEFAULT_MODEL,
    customOpenAIBaseUrl: '',
    customOpenAIApiKey: '',
    customOpenAIModel: '',
    timeout: 1200000,
    // 字数补偿配置
    wordCountCompensation: true,      // 是否启用字数补偿
    compensationThreshold: 0.8,        // 触发补偿的阈值（目标字数的百分比）
    maxExpandAttempts: 2,              // 最大扩写尝试次数
    expansionStrategy: 'paragraph',    // 扩写策略: 'paragraph' | 'whole'
  }))

  const setCurrentNovel = (novel) => {
    currentNovel.value = novel
  }

  const setCurrentChapter = (chapter) => {
    currentChapter.value = chapter
  }

  const updateSettings = (newSettings) => {
    // 保存前统一归一化，避免旧 provider 或缺省字段重新写回本地。
    settings.value = normalizeSettings({ ...settings.value, ...newSettings })
    localStorage.setItem('novelAISettings', JSON.stringify(settings.value))
  }

  const loadSettings = () => {
    const saved = localStorage.getItem('novelAISettings')
    if (saved) {
      // 加载历史设置时兼容旧结构，并立即升级为 DeepSeek 单提供商配置。
      settings.value = normalizeSettings(JSON.parse(saved))
      localStorage.setItem('novelAISettings', JSON.stringify(settings.value))
    }
  }

  const getCurrentApiKey = () => {
    if (settings.value.aiProvider === CUSTOM_OPENAI_PROVIDER) {
      return settings.value.customOpenAIApiKey || ''
    }
    return settings.value.deepseekApiKey || ''
  }

  const getCurrentModel = () => {
    if (settings.value.aiProvider === CUSTOM_OPENAI_PROVIDER) {
      return settings.value.customOpenAIModel || ''
    }
    return settings.value.deepseekModel || DEEPSEEK_DEFAULT_MODEL
  }

  const getCurrentBaseUrl = () => {
    if (settings.value.aiProvider === CUSTOM_OPENAI_PROVIDER) {
      return settings.value.customOpenAIBaseUrl || ''
    }
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
    getCurrentBaseUrl,
  }
})
