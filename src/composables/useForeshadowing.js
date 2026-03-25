import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { foreshadowingDao } from '@/utils/dao'

/**
 * 伏笔管理组合式函数
 * 提供伏笔的CRUD操作和状态追踪功能
 */
export function useForeshadowing() {
  const foreshadowings = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * 加载小说的所有伏笔
   * @param {number} novelId - 小说ID
   */
  const loadForeshadowings = async (novelId) => {
    loading.value = true
    error.value = null

    try {
      const list = await foreshadowingDao.getByNovelId(novelId)
      foreshadowings.value = list
      return list
    } catch (err) {
      error.value = err.message
      console.error('加载伏笔失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新伏笔
   * @param {Object} foreshadowingData - 伏笔数据
   */
  const createForeshadowing = async (foreshadowingData) => {
    loading.value = true
    error.value = null

    try {
      const id = await foreshadowingDao.add(foreshadowingData)
      message.success('伏笔创建成功！')
      return id
    } catch (err) {
      error.value = err.message
      message.error('创建伏笔失败：' + err.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新伏笔
   * @param {number} id - 伏笔ID
   * @param {Object} foreshadowingData - 更新的数据
   */
  const updateForeshadowing = async (id, foreshadowingData) => {
    loading.value = true
    error.value = null

    try {
      await foreshadowingDao.update(id, foreshadowingData)
      message.success('伏笔更新成功！')
      return true
    } catch (err) {
      error.value = err.message
      message.error('更新伏笔失败：' + err.message)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除伏笔
   * @param {number} id - 伏笔ID
   */
  const deleteForeshadowing = async (id) => {
    try {
      await foreshadowingDao.delete(id)
      message.success('伏笔删除成功！')
      return true
    } catch (err) {
      error.value = err.message
      message.error('删除伏笔失败：' + err.message)
      return false
    }
  }

  /**
   * 标记伏笔已回收
   * @param {number} id - 伏笔ID
   * @param {number} resolvedInChapterId - 回收章节ID
   */
  const markResolved = async (id, resolvedInChapterId) => {
    try {
      await foreshadowingDao.markResolved(id, resolvedInChapterId)
      message.success('伏笔已标记为回收！')
      return true
    } catch (err) {
      console.error('标记伏笔回收失败:', err)
      return false
    }
  }

  /**
   * 获取待回收的伏笔
   * @param {number} novelId - 小说ID
   */
  const getPendingForeshadowings = async (novelId) => {
    try {
      return await foreshadowingDao.getPending(novelId)
    } catch (err) {
      console.error('获取待回收伏笔失败:', err)
      return []
    }
  }

  /**
   * 获取高优先级待回收伏笔
   * @param {number} novelId - 小说ID
   */
  const getHighImportancePending = async (novelId) => {
    try {
      return await foreshadowingDao.getHighImportancePending(novelId)
    } catch (err) {
      console.error('获取高优先级伏笔失败:', err)
      return []
    }
  }

  /**
   * 获取伏笔摘要（用于生成上下文）
   * @param {number} novelId - 小说ID
   */
  const getForeshadowingSummary = async (novelId) => {
    try {
      const pending = await foreshadowingDao.getPending(novelId)
      
      return {
        pending: pending.map(f => ({
          id: f.id,
          content: f.content,
          importance: f.importance,
          plantedIn: f.chapterId,
          relatedCharacters: f.relatedCharacters || [],
          notes: f.notes || ''
        })),
        pendingCount: pending.length,
        highImportanceCount: pending.filter(f => f.importance === 'high').length
      }
    } catch (err) {
      console.error('获取伏笔摘要失败:', err)
      return { pending: [], pendingCount: 0, highImportanceCount: 0 }
    }
  }

  /**
   * 从章节内容中自动提取伏笔（AI辅助）
   * @param {string} chapterContent - 章节内容
   * @param {number} chapterId - 章节ID
   * @param {number} novelId - 小说ID
   */
  const extractFromChapter = async (chapterContent, chapterId, novelId) => {
    // 这里可以调用AI来分析章节内容，提取可能的伏笔
    // 目前返回空数组，后续可以集成AI分析
    console.log('提取伏笔功能待实现', { chapterContent: chapterContent.substring(0, 100), chapterId, novelId })
    return []
  }

  /**
   * 待回收伏笔列表
   */
  const pendingForeshadowings = computed(() => {
    return foreshadowings.value.filter(f => f.status === 'pending')
  })

  /**
   * 已回收伏笔列表
   */
  const resolvedForeshadowings = computed(() => {
    return foreshadowings.value.filter(f => f.status === 'resolved')
  })

  /**
   * 高优先级待回收伏笔
   */
  const highImportancePending = computed(() => {
    return foreshadowings.value.filter(f => f.status === 'pending' && f.importance === 'high')
  })

  /**
   * 伏笔统计
   */
  const statistics = computed(() => {
    const total = foreshadowings.value.length
    const pending = pendingForeshadowings.value.length
    const resolved = resolvedForeshadowings.value.length
    const highImportance = highImportancePending.value.length

    return {
      total,
      pending,
      resolved,
      highImportance,
      resolvedRate: total > 0 ? Math.round((resolved / total) * 100) : 0
    }
  })

  return {
    foreshadowings,
    loading,
    error,
    pendingForeshadowings,
    resolvedForeshadowings,
    highImportancePending,
    statistics,
    loadForeshadowings,
    createForeshadowing,
    updateForeshadowing,
    deleteForeshadowing,
    markResolved,
    getPendingForeshadowings,
    getHighImportancePending,
    getForeshadowingSummary,
    extractFromChapter
  }
}
