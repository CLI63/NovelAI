import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { inspirationDao } from '@/utils/dao'
import { callAI, callAIStream } from '@/utils/api'
import {
  buildInspirationExpandPrompt,
  buildInspirationQAPrompt,
  buildMultiInspirationMergePrompt,
  buildInspirationScorePrompt
} from '@/utils/prompts'

const parseJsonObjectFromAI = (result) => {
  const raw = String(result || '').trim()
  if (!raw) {
    throw new Error('AI 返回内容为空')
  }

  const candidates = [
    raw,
    raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim(),
    raw.match(/\{[\s\S]*\}/)?.[0]?.trim()
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // 尝试下一个候选片段，兼容 AI 偶发包裹 markdown 的情况。
    }
  }

  throw new Error('无法解析 AI 返回的概览')
}

/**
 * 灵感工作台组合式函数
 * 提供灵感管理、AI扩写、问答引导、多灵感融合、灵感评分等功能
 */
export function useInspiration() {
  const inspirations = ref([])
  const currentInspiration = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const expandingContent = ref('')
  const isExpanding = ref(false)
  const isScoring = ref(false)

  /**
   * 加载所有灵感
   */
  const loadInspirations = async () => {
    loading.value = true
    error.value = null

    try {
      const list = await inspirationDao.getAll()
      inspirations.value = list
      return list
    } catch (err) {
      error.value = err.message
      console.error('加载灵感失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载单个灵感
   * @param {number} id - 灵感ID
   */
  const loadInspiration = async (id) => {
    loading.value = true
    error.value = null

    try {
      const data = await inspirationDao.getById(id)
      currentInspiration.value = data
      return data
    } catch (err) {
      error.value = err.message
      console.error('加载灵感失败:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新灵感
   * @param {Object} inspirationData - 灵感数据
   */
  const createInspiration = async (inspirationData) => {
    loading.value = true
    error.value = null

    try {
      const id = await inspirationDao.add(inspirationData)
      message.success('灵感创建成功！')
      await loadInspirations()
      return id
    } catch (err) {
      error.value = err.message
      message.error('创建灵感失败：' + err.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新灵感
   * @param {number} id - 灵感ID
   * @param {Object} inspirationData - 更新的数据
   */
  const updateInspiration = async (id, inspirationData) => {
    loading.value = true
    error.value = null

    try {
      await inspirationDao.update(id, inspirationData)
      message.success('灵感更新成功！')
      await loadInspirations()
      return true
    } catch (err) {
      error.value = err.message
      message.error('更新灵感失败：' + err.message)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除灵感
   * @param {number} id - 灵感ID
   */
  const deleteInspiration = async (id) => {
    try {
      await inspirationDao.delete(id)
      message.success('灵感删除成功！')
      await loadInspirations()
      return true
    } catch (err) {
      error.value = err.message
      message.error('删除灵感失败：' + err.message)
      return false
    }
  }

  /**
   * 按状态筛选灵感
   * @param {string} status - 状态 (draft/completed/archived)
   */
  const getByStatus = async (status) => {
    loading.value = true
    try {
      const list = await inspirationDao.getByStatus(status)
      inspirations.value = list
      return list
    } catch (err) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 搜索灵感
   * @param {string} keyword - 搜索关键词
   */
  const searchInspirations = async (keyword) => {
    if (!keyword?.trim()) {
      return loadInspirations()
    }

    loading.value = true
    try {
      const results = await inspirationDao.search(keyword)
      inspirations.value = results
      return results
    } catch (err) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * AI 扩写灵感
   * @param {Object} inspiration - 灵感对象
   * @param {Object} config - API 配置 { provider, apiKey, model }
   * @param {Function} onChunk - 流式回调（可选）
   */
  const expandInspiration = async (inspiration, config, onChunk = null) => {
    isExpanding.value = true
    expandingContent.value = ''
    error.value = null

    try {
      const messages = buildInspirationExpandPrompt(inspiration)

      if (onChunk) {
        // 流式输出
        await callAIStream(
          messages,
          config.provider,
          config.apiKey,
          config.model,
          (chunk) => {
            expandingContent.value += chunk
            onChunk(chunk)
          }
        )
      } else {
        // 非流式
        const result = await callAI(messages, config.provider, config.apiKey, config.model)
        expandingContent.value = result
      }

      return expandingContent.value
    } catch (err) {
      error.value = err.message
      message.error('AI 扩写失败：' + err.message)
      return null
    } finally {
      isExpanding.value = false
    }
  }

  /**
   * AI 引导问答
   * @param {Object} inspiration - 灵感对象
   * @param {Object} config - API 配置
   */
  const askQuestion = async (inspiration, config) => {
    loading.value = true
    error.value = null

    try {
      const messages = buildInspirationQAPrompt(inspiration)
      const result = await callAI(messages, config.provider, config.apiKey, config.model)

      // 解析返回的 JSON
      try {
        const parsed = JSON.parse(result)
        return parsed
      } catch {
        // 如果不是 JSON，直接返回文本
        return { questions: result.split('\n').filter(q => q.trim()) }
      }
    } catch (err) {
      error.value = err.message
      message.error('AI 问答失败：' + err.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 多灵感融合生成小说概览
   * @param {Array} selectedInspirations - 选中的灵感列表
   * @param {Object} config - API 配置
   */
  const mergeInspirations = async (selectedInspirations, config) => {
    loading.value = true
    error.value = null

    try {
      const messages = buildMultiInspirationMergePrompt(selectedInspirations)
      const result = await callAI(messages, config.provider, config.apiKey, config.model)

      // 解析返回的小说概览 JSON，兼容纯 JSON、markdown 代码块和前后带说明文字的返回。
      return parseJsonObjectFromAI(result)
    } catch (err) {
      error.value = err.message
      message.error('融合灵感失败：' + err.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * AI 灵感评分
   * @param {Object} inspiration - 灵感对象
   * @param {Object} config - API 配置
   */
  const scoreInspiration = async (inspiration, config) => {
    isScoring.value = true
    error.value = null

    try {
      const messages = buildInspirationScorePrompt(inspiration)
      const result = await callAI(messages, config.provider, config.apiKey, config.model)

      // 解析评分结果
      let scoreResult
      try {
        scoreResult = JSON.parse(result)
      } catch {
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          scoreResult = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('无法解析评分结果')
        }
      }

      // 更新灵感评分
      if (inspiration.id && scoreResult.totalScore) {
        await inspirationDao.updateScore(inspiration.id, scoreResult)
      }

      return scoreResult
    } catch (err) {
      error.value = err.message
      message.error('灵感评分失败：' + err.message)
      return null
    } finally {
      isScoring.value = false
    }
  }

  /**
   * 保存扩写结果到灵感
   * @param {number} id - 灵感ID
   * @param {string} expandedContent - 扩写内容
   */
  const saveExpandedContent = async (id, expandedContent) => {
    try {
      await inspirationDao.update(id, { expandedContent })
      return true
    } catch (err) {
      error.value = err.message
      message.error('保存失败：' + err.message)
      return false
    }
  }

  /**
   * 获取所有标签
   */
  const getAllTags = async () => {
    try {
      return await inspirationDao.getTags()
    } catch (err) {
      console.error('获取标签失败:', err)
      return []
    }
  }

  /**
   * 按标签筛选
   * @param {string} tag - 标签名
   */
  const getByTag = async (tag) => {
    loading.value = true
    try {
      const results = await inspirationDao.getByTag(tag)
      inspirations.value = results
      return results
    } catch (err) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新灵感状态
   * @param {number} id - 灵感ID
   * @param {string} status - 新状态
   */
  const updateStatus = async (id, status) => {
    try {
      if (status === 'completed') {
        await inspirationDao.markAsCompleted(id)
      } else if (status === 'archived') {
        await inspirationDao.markAsArchived(id)
      } else {
        await inspirationDao.markAsDraft(id)
      }
      message.success('状态更新成功')
      await loadInspirations()
      return true
    } catch (err) {
      error.value = err.message
      message.error('更新状态失败：' + err.message)
      return false
    }
  }

  /**
   * 批量删除灵感
   * @param {Array} ids - 灵感ID数组
   */
  const batchDelete = async (ids) => {
    try {
      await inspirationDao.batchDelete(ids)
      message.success(`成功删除 ${ids.length} 条灵感`)
      await loadInspirations()
      return true
    } catch (err) {
      error.value = err.message
      message.error('批量删除失败：' + err.message)
      return false
    }
  }

  /**
   * 按状态分组的灵感
   */
  const inspirationsByStatus = computed(() => {
    const grouped = {
      draft: [],
      completed: [],
      archived: []
    }

    inspirations.value.forEach(item => {
      if (grouped[item.status]) {
        grouped[item.status].push(item)
      }
    })

    return grouped
  })

  /**
   * 高分灵感（评分 >= 70）
   */
  const highScoreInspirations = computed(() => {
    return inspirations.value.filter(
      item => item.score?.totalScore >= 70
    ).sort((a, b) => (b.score?.totalScore || 0) - (a.score?.totalScore || 0))
  })

  return {
    // 状态
    inspirations,
    currentInspiration,
    loading,
    error,
    expandingContent,
    isExpanding,
    isScoring,

    // 计算属性
    inspirationsByStatus,
    highScoreInspirations,

    // CRUD 操作
    loadInspirations,
    loadInspiration,
    createInspiration,
    updateInspiration,
    deleteInspiration,
    getByStatus,
    searchInspirations,
    getByTag,
    updateStatus,
    batchDelete,

    // AI 功能
    expandInspiration,
    askQuestion,
    mergeInspirations,
    scoreInspiration,
    saveExpandedContent,

    // 工具
    getAllTags
  }
}
