import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useAppStore } from '@/stores/app'
import { callAI, callAIStream, getProviderConfig, getSupportedProviders } from '@/utils/api'

/**
 * AI API调用相关的组合式函数
 * 提供统一的AI调用接口，包括API Key检查、流式生成等功能
 */
export function useAI() {
  const router = useRouter()
  const appStore = useAppStore()

  const loading = ref(false)
  const error = ref(null)

  /**
   * 检查API Key是否已配置
   * @returns {boolean} 是否已配置
   */
  const checkApiKey = () => {
    const apiKey = appStore.getCurrentApiKey()
    if (!apiKey) {
      message.warning('请先在设置中配置API Key')
      router.push('/settings')
      return false
    }
    return true
  }

  /**
   * 获取当前API Key
   * @returns {string} API Key
   */
  const getApiKey = () => appStore.getCurrentApiKey()

  /**
   * 获取当前模型
   * @returns {string} 模型名称
   */
  const getCurrentModel = () => appStore.getCurrentModel()

  /**
   * 获取当前提供商
   * @returns {string} 提供商名称
   */
  const currentProvider = computed(() => appStore.settings.aiProvider)

  /**
   * 调用AI API
   * @param {Array} messages - 消息数组
   * @param {Object} options - 可选配置
   * @returns {Promise<string>} 生成的内容
   */
  const generate = async (messages, options = {}) => {
    if (!checkApiKey()) return null

    loading.value = true
    error.value = null

    try {
      const apiKey = options.apiKey || getApiKey()
      const model = options.model || getCurrentModel()
      const provider = options.provider || currentProvider.value

      const result = await callAI(messages, provider, apiKey, model, options)
      return result
    } catch (err) {
      error.value = err.message
      message.error('生成失败：' + err.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 流式调用AI API
   * @param {Array} messages - 消息数组
   * @param {Function} onChunk - 接收到内容块的回调
   * @param {Object} options - 可选配置
   * @param {Function} [options.onReasoning] - 接收到思考内容的回调
   */
  const generateStream = async (messages, onChunk, options = {}) => {
    if (!checkApiKey()) return false

    loading.value = true
    error.value = null

    try {
      const apiKey = options.apiKey || getApiKey()
      const model = options.model || getCurrentModel()
      const provider = options.provider || currentProvider.value

      await callAIStream(messages, provider, apiKey, model, onChunk, options.onReasoning)
      return true
    } catch (err) {
      if (err.message === '用户停止生成') {
        return false
      }
      error.value = err.message
      message.error('生成失败：' + err.message)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 测试API连接
   * @returns {Promise<boolean>} 是否连接成功
   */
  const testConnection = async () => {
    if (!checkApiKey()) return false

    try {
      const response = await generate([
        { role: 'user', content: '你好，请回复"测试成功"' }
      ])
      return response?.includes('测试成功') || false
    } catch {
      return false
    }
  }

  return {
    loading,
    error,
    currentProvider,
    checkApiKey,
    getApiKey,
    getCurrentModel,
    generate,
    generateStream,
    testConnection,
    getProviderConfig,
    getSupportedProviders,
  }
}

/**
 * API Key检查的组合式函数
 * 简化版本，仅用于检查API Key
 */
export function useApiKeyCheck() {
  const router = useRouter()
  const appStore = useAppStore()

  const checkApiKey = () => {
    const apiKey = appStore.getCurrentApiKey()
    if (!apiKey) {
      message.warning('请先在设置中配置API Key')
      router.push('/settings')
      return false
    }
    return true
  }

  const getApiKey = () => appStore.getCurrentApiKey()
  const getCurrentModel = () => appStore.getCurrentModel()
  const currentProvider = computed(() => appStore.settings.aiProvider)

  return {
    checkApiKey,
    getApiKey,
    getCurrentModel,
    currentProvider,
  }
}
