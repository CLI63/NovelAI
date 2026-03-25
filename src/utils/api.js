import axios from 'axios'

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
    temperature: 1.5,
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
