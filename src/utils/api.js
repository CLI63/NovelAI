import axios from 'axios'

const apiClient = axios.create({
  timeout: 1800000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API请求错误:', error)
    return Promise.reject(error)
  },
)

export async function callKimiAPI(messages, apiKey, model = 'kimi-k2-turbo-preview') {
  try {
    const response = await apiClient.post(
      'https://api.moonshot.cn/v1/chat/completions',
      {
        model: model,
        messages: messages,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    )

    console.log('Kimi API完整响应:', response)

    if (response && response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content
      console.log('Kimi API返回的内容:', content)
      return content
    } else {
      throw new Error('Kimi API返回格式错误')
    }
  } catch (error) {
    throw new Error(`Kimi API调用失败: ${error.message}`)
  }
}

export async function callQianwenAPI(messages, apiKey, model = 'qwen3-max') {
  try {
    const response = await apiClient.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: model,
        messages: messages,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    )

    console.log('千问API完整响应:', response)

    if (response && response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content
      console.log('千问API返回的内容:', content)
      return content
    } else {
      throw new Error('千问API返回格式错误')
    }
  } catch (error) {
    throw new Error(`千问API调用失败: ${error.message}`)
  }
}

export async function callAI(messages, provider = 'kimi', apiKey, model) {
  if (provider === 'kimi') {
    return await callKimiAPI(messages, apiKey, model)
  } else if (provider === 'qianwen') {
    return await callQianwenAPI(messages, apiKey, model)
  } else {
    throw new Error('不支持的AI提供商')
  }
}
