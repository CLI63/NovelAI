import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const currentNovel = ref(null)
  const currentChapter = ref(null)
  const settings = ref({
    aiProvider: 'kimi',
    kimiApiKey: '',
    qianwenApiKey: '',
    kimiModel: 'kimi-k2-turbo-preview',
    qianwenModel: 'qwen3-max',
    timeout: 1200000,
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
    return settings.value.aiProvider === 'kimi'
      ? settings.value.kimiApiKey
      : settings.value.qianwenApiKey
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
  }
})
