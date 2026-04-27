import axios from 'axios'

/**
 * 重试配置
 */
export const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 初始延迟 1 秒
  maxRetryDelay: 16000, // 最大延迟 16 秒
  retryOn: [408, 429, 500, 502, 503, 504], // 可重试的 HTTP 状态码
  retryOnNetworkErrors: true, // 网络错误是否重试
}

/**
 * 错误类型枚举
 */
export const ErrorType = {
  RETRYABLE: 'retryable', // 可重试错误
  NON_RETRYABLE: 'non_retryable', // 不可重试错误
  NETWORK: 'network', // 网络错误
  AUTH: 'auth', // 认证错误
  RATE_LIMIT: 'rate_limit', // 限流错误
  SERVER: 'server', // 服务器错误
}

/**
 * 错误信息映射
 */
const errorMessages = {
  [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
  [ErrorType.AUTH]: 'API密钥无效或已过期，请检查配置',
  [ErrorType.RATE_LIMIT]: '请求过于频繁，请稍后重试',
  [ErrorType.SERVER]: 'AI服务暂时不可用，请稍后重试',
  [ErrorType.NON_RETRYABLE]: '请求参数错误，请检查输入',
  [ErrorType.RETRYABLE]: '请求失败，正在重试...',
}

/**
 * 分析错误类型
 * @param {Error} error - 错误对象
 * @returns {{ type: string, canRetry: boolean, message: string }}
 */
export function classifyError(error) {
  // Axios 网络错误（无响应）
  if (!error.response && error.code === 'ERR_NETWORK') {
    return {
      type: ErrorType.NETWORK,
      canRetry: true,
      message: errorMessages[ErrorType.NETWORK],
    }
  }

  // Fetch API 网络错误（TypeError: Failed to fetch）
  if (error instanceof TypeError && error.message?.includes('fetch')) {
    return {
      type: ErrorType.NETWORK,
      canRetry: true,
      message: errorMessages[ErrorType.NETWORK],
    }
  }

  // 超时错误
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      type: ErrorType.NETWORK,
      canRetry: true,
      message: '请求超时，正在重试...',
    }
  }

  // HTTP 状态码错误（支持 axios 和 fetch）
  const status = error.response?.status || error.status
  if (status) {
    // 认证错误
    if (status === 401 || status === 403) {
      return {
        type: ErrorType.AUTH,
        canRetry: false,
        message: errorMessages[ErrorType.AUTH],
      }
    }

    // 限流错误
    if (status === 429) {
      return {
        type: ErrorType.RATE_LIMIT,
        canRetry: true,
        message: errorMessages[ErrorType.RATE_LIMIT],
      }
    }

    // 服务器错误
    if (status >= 500) {
      return {
        type: ErrorType.SERVER,
        canRetry: true,
        message: errorMessages[ErrorType.SERVER],
      }
    }

    // 客户端错误（除限流外）
    if (status >= 400 && status < 500 && status !== 429) {
      return {
        type: ErrorType.NON_RETRYABLE,
        canRetry: false,
        message: error.response?.data?.error?.message || errorMessages[ErrorType.NON_RETRYABLE],
      }
    }

    // 其他可重试状态码
    if (retryConfig.retryOn.includes(status)) {
      return {
        type: ErrorType.RETRYABLE,
        canRetry: true,
        message: `请求失败 (${status})，正在重试...`,
      }
    }
  }

  // 默认：可重试
  return {
    type: ErrorType.RETRYABLE,
    canRetry: true,
    message: error.message || '未知错误',
  }
}

/**
 * 计算指数退避延迟
 * @param {number} attempt - 当前尝试次数（从 0 开始）
 * @param {number} baseDelay - 基础延迟（毫秒）
 * @param {number} maxDelay - 最大延迟（毫秒）
 * @returns {number} 延迟时间（毫秒）
 */
function calculateBackoff(attempt, baseDelay, maxDelay) {
  // 指数退避：delay = baseDelay * 2^attempt
  const delay = baseDelay * Math.pow(2, attempt)
  // 添加随机抖动（±20%）避免请求同步
  const jitter = delay * 0.2 * (Math.random() * 2 - 1)
  return Math.min(delay + jitter, maxDelay)
}

/**
 * 延迟执行
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 带重试的 AI API 调用
 * @param {Array} messages - 消息数组
 * @param {string} provider - 提供商名称
 * @param {string} apiKey - API密钥
 * @param {string} [model] - 模型名称（可选）
 * @param {Object} [options] - 重试选项（可选）
 * @param {number} [options.maxRetries] - 最大重试次数
 * @param {number} [options.retryDelay] - 初始重试延迟
 * @param {Function} [options.onRetry] - 重试回调 (attempt, error, delay) => void
 * @returns {Promise<string>} 生成的内容
 */
export async function callAIWithRetry(messages, provider, apiKey, model, options = {}) {
  const config = getProviderConfig(provider)
  const useModel = model || config.defaultModel
  const maxRetries = options.maxRetries ?? retryConfig.maxRetries
  const retryDelay = options.retryDelay ?? retryConfig.retryDelay

  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await apiClient.post(
        config.url,
        {
          model: useModel,
          messages,
          temperature: config.temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      )

      console.log(`${config.name} API完整响应:`, response)
      const content = extractContent(response, config.name)
      console.log(`${config.name} API返回的内容:`, content)
      return content
    } catch (error) {
      lastError = error
      const errorInfo = classifyError(error)

      // 如果不可重试或已达到最大重试次数，抛出错误
      if (!errorInfo.canRetry || attempt >= maxRetries) {
        throw new Error(`${config.name} API调用失败: ${errorInfo.message}`)
      }

      // 计算退避延迟
      const backoffDelay = calculateBackoff(attempt, retryDelay, retryConfig.maxRetryDelay)

      console.warn(
        `${config.name} API调用失败 (尝试 ${attempt + 1}/${maxRetries + 1}): ${errorInfo.message}，${backoffDelay.toFixed(0)}ms 后重试`
      )

      // 调用重试回调
      if (options.onRetry) {
        options.onRetry(attempt + 1, errorInfo, backoffDelay)
      }

      // 等待后重试
      await delay(backoffDelay)
    }
  }

  // 理论上不会执行到这里，但为了安全
  throw new Error(`${config.name} API调用失败: ${lastError?.message || '未知错误'}`)
}

/**
 * 带重试的流式 AI API 调用
 * @param {Array} messages - 消息数组
 * @param {string} provider - 提供商名称
 * @param {string} apiKey - API密钥
 * @param {string} [model] - 模型名称（可选）
 * @param {Function} onChunk - 每次接收到内容块的回调
 * @param {Function} [onReasoning] - 接收到思考内容的回调（可选）
 * @param {Object} [options] - 重试选项（可选）
 * @returns {Promise<void>}
 */
export async function callAIStreamWithRetry(
  messages,
  provider,
  apiKey,
  model,
  onChunk,
  onReasoning,
  options = {}
) {
  const config = getProviderConfig(provider)
  const useModel = model || config.defaultModel
  const maxRetries = options.maxRetries ?? retryConfig.maxRetries
  const retryDelay = options.retryDelay ?? retryConfig.retryDelay

  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: useModel,
          messages,
          stream: true,
          temperature: config.temperature,
        }),
      })

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      await handleStreamResponse(response, onChunk, onReasoning)
      return
    } catch (error) {
      lastError = error
      const errorInfo = classifyError(error)

      // 如果不可重试或已达到最大重试次数，抛出错误
      if (!errorInfo.canRetry || attempt >= maxRetries) {
        throw new Error(`${config.name} 流式API调用失败: ${errorInfo.message}`)
      }

      // 用户主动停止不重试
      if (error.message === '用户停止生成') {
        throw error
      }

      // 计算退避延迟
      const backoffDelay = calculateBackoff(attempt, retryDelay, retryConfig.maxRetryDelay)

      console.warn(
        `${config.name} 流式API调用失败 (尝试 ${attempt + 1}/${maxRetries + 1}): ${errorInfo.message}，${backoffDelay.toFixed(0)}ms 后重试`
      )

      // 调用重试回调
      if (options.onRetry) {
        options.onRetry(attempt + 1, errorInfo, backoffDelay)
      }

      // 等待后重试
      await delay(backoffDelay)
    }
  }

  throw new Error(`${config.name} 流式API调用失败: ${lastError?.message || '未知错误'}`)
}

/**
 * AI提供商配置
 * 使用策略模式统一管理不同提供商的API配置
 */
export const providerConfigs = {
  kimi: {
    name: 'Kimi',
    url: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'kimi-k2-turbo-preview',
    temperature: 1,
  },
  qianwen: {
    name: '千问',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen3-max',
    temperature: 1,
  },
  deepseek: {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    temperature: 1.0,
  },
  doubao: {
    name: '豆包',
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    defaultModel: 'doubao-pro-32k-chat',
    temperature: 1,
  },
}

/**
 * 获取提供商配置
 * @param {string} provider - 提供商名称
 * @returns {Object} 提供商配置
 */
export function getProviderConfig(provider) {
  const config = providerConfigs[provider]
  if (!config) {
    throw new Error(`不支持的AI提供商: ${provider}`)
  }
  return config
}

/**
 * 获取所有支持的提供商列表
 * @returns {string[]} 提供商名称列表
 */
export function getSupportedProviders() {
  return Object.keys(providerConfigs)
}

// Axios实例
const apiClient = axios.create({
  timeout: 1800000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API请求错误:', error)
    return Promise.reject(error)
  }
)

/**
 * 从API响应中提取内容
 * @param {Object} response - API响应
 * @param {string} providerName - 提供商名称（用于错误信息）
 * @returns {string} 生成的内容
 */
function extractContent(response, providerName) {
  if (response?.choices?.length > 0) {
    return response.choices[0].message.content
  }
  throw new Error(`${providerName} API返回格式错误`)
}

/**
 * 统一的AI API调用
 * @param {Array} messages - 消息数组
 * @param {string} provider - 提供商名称
 * @param {string} apiKey - API密钥
 * @param {string} [model] - 模型名称（可选，使用默认值）
 * @returns {Promise<string>} 生成的内容
 */
export async function callAI(messages, provider, apiKey, model) {
  const config = getProviderConfig(provider)
  const useModel = model || config.defaultModel

  try {
    const response = await apiClient.post(
      config.url,
      {
        model: useModel,
        messages,
        temperature: config.temperature,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    console.log(`${config.name} API完整响应:`, response)
    const content = extractContent(response, config.name)
    console.log(`${config.name} API返回的内容:`, content)
    return content
  } catch (error) {
    throw new Error(`${config.name} API调用失败: ${error.message}`)
  }
}

/**
 * 处理SSE流式响应
 * @param {Response} response - Fetch响应对象
 * @param {Function} onChunk - 每次接收到内容块的回调
 * @param {Function} [onReasoning] - 接收到思考内容的回调（可选）
 */
async function handleStreamResponse(response, onChunk, onReasoning) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || !trimmedLine.startsWith('data:')) continue

      const data = trimmedLine.slice(5).trim()
      
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta
        
        // 处理思考过程（reasoning_content）
        const reasoningContent = delta?.reasoning_content
        if (reasoningContent && onReasoning) {
          onReasoning(reasoningContent)
        }
        
        // 处理实际内容（content）
        const content = delta?.content
        if (content) {
          onChunk(content)
        }
      } catch (e) {
        // 如果是停止异常，取消读取器并重新抛出
        if (e.message === '用户停止生成') {
          reader.cancel()
          throw e
        }
        // 忽略其他解析错误
      }
    }
  }
}

/**
 * 统一的流式AI API调用
 * @param {Array} messages - 消息数组
 * @param {string} provider - 提供商名称
 * @param {string} apiKey - API密钥
 * @param {string} [model] - 模型名称（可选）
 * @param {Function} onChunk - 每次接收到内容块的回调
 * @param {Function} [onReasoning] - 接收到思考内容的回调（可选）
 */
export async function callAIStream(messages, provider, apiKey, model, onChunk, onReasoning) {
  const config = getProviderConfig(provider)
  const useModel = model || config.defaultModel

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: useModel,
      messages,
      stream: true,
      temperature: config.temperature,
    }),
  })

  if (!response.ok) {
    throw new Error(`${config.name} API调用失败: ${response.status}`)
  }

  await handleStreamResponse(response, onChunk, onReasoning)
}

// ============ 向后兼容的导出函数 ============
// 这些函数保留以保持向后兼容性，但内部使用统一的callAI函数

export async function callKimiAPI(messages, apiKey, model = 'kimi-k2-turbo-preview') {
  return callAI(messages, 'kimi', apiKey, model)
}

export async function callQianwenAPI(messages, apiKey, model = 'qwen3-max') {
  return callAI(messages, 'qianwen', apiKey, model)
}

export async function callDeepSeekAPI(messages, apiKey, model = 'deepseek-chat') {
  return callAI(messages, 'deepseek', apiKey, model)
}

export async function callDoubaoAPI(messages, apiKey, model = 'doubao-pro-32k-chat') {
  return callAI(messages, 'doubao', apiKey, model)
}

export async function callDeepSeekStream(messages, apiKey, model, onChunk) {
  return callAIStream(messages, 'deepseek', apiKey, model, onChunk)
}

export async function callKimiStream(messages, apiKey, model, onChunk) {
  return callAIStream(messages, 'kimi', apiKey, model, onChunk)
}

export async function callQianwenStream(messages, apiKey, model, onChunk) {
  return callAIStream(messages, 'qianwen', apiKey, model, onChunk)
}

export async function callDoubaoStream(messages, apiKey, model, onChunk) {
  return callAIStream(messages, 'doubao', apiKey, model, onChunk)
}
