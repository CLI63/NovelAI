import { ref } from 'vue'
import db from '@/utils/db'

/**
 * 后台任务管理 composable
 * 用于管理所有静默任务（章节后处理、批量操作等）
 */
export function useBackgroundTask() {
  const loading = ref(false)
  const tasks = ref([])

  // 任务类型定义
  const TASK_TYPES = {
    CHAPTER_POST_PROCESS: 'chapter_post_process',  // 章节后处理
    BATCH_CHAPTER_PROCESS: 'batch_chapter_process', // 批量章节处理
    SUMMARY_GENERATION: 'summary_generation',       // 摘要生成
    FORESHADOWING_EXTRACT: 'foreshadowing_extract', // 伏笔提取
    CHARACTER_UPDATE: 'character_update',           // 角色更新
    TIMELINE_RECORD: 'timeline_record'              // 时间线记录
  }

  // 任务状态定义
  const TASK_STATUS = {
    PENDING: 'pending',       // 待执行
    RUNNING: 'running',       // 执行中
    COMPLETED: 'completed',   // 已完成
    FAILED: 'failed',         // 失败
    PARTIAL: 'partial'        // 部分成功
  }

  /**
   * 创建后台任务
   * @param {Object} taskData - 任务数据
   * @returns {Promise<number>} 任务ID
   */
  const createTask = async (taskData) => {
    const task = {
      type: taskData.type,
      status: TASK_STATUS.PENDING,
      novelId: taskData.novelId || null,
      chapterId: taskData.chapterId || null,
      chapterNumber: taskData.chapterNumber || null,
      data: taskData.data || {},
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const id = await db.backgroundTasks.add(task)
    return id
  }

  /**
   * 更新任务状态
   * @param {number} taskId - 任务ID
   * @param {Object} updates - 更新数据
   */
  const updateTask = async (taskId, updates) => {
    await db.backgroundTasks.update(taskId, {
      ...updates,
      updatedAt: new Date().toISOString()
    })
  }

  /**
   * 获取所有待执行任务
   * @returns {Promise<Array>} 待执行任务列表
   */
  const getPendingTasks = async () => {
    const pendingTasks = await db.backgroundTasks
      .where('status')
      .equals(TASK_STATUS.PENDING)
      .toArray()
    return pendingTasks
  }

  /**
   * 获取指定小说的所有任务
   * @param {number} novelId - 小说ID
   * @returns {Promise<Array>} 任务列表
   */
  const getTasksByNovel = async (novelId) => {
    const novelTasks = await db.backgroundTasks
      .where('novelId')
      .equals(novelId)
      .reverse()
      .sortBy('createdAt')
    return novelTasks
  }

  /**
   * 获取指定章节的后处理任务
   * @param {number} chapterId - 章节ID
   * @returns {Promise<Array>} 任务列表
   */
  const getTasksByChapter = async (chapterId) => {
    const chapterTasks = await db.backgroundTasks
      .where('chapterId')
      .equals(chapterId)
      .reverse()
      .sortBy('createdAt')
    return chapterTasks
  }

  /**
   * 获取所有任务（分页）
   * @param {Object} options - 分页选项
   * @returns {Promise<Array>} 任务列表
   */
  const getAllTasks = async (options = {}) => {
    const { limit = 50, offset = 0, status = null } = options
    
    let query = db.backgroundTasks.toCollection()
    
    if (status) {
      query = db.backgroundTasks.where('status').equals(status)
    }
    
    const allTasks = await query.reverse().sortBy('createdAt')
    
    return {
      tasks: allTasks.slice(offset, offset + limit),
      total: allTasks.length
    }
  }

  /**
   * 删除任务
   * @param {number} taskId - 任务ID
   */
  const deleteTask = async (taskId) => {
    await db.backgroundTasks.delete(taskId)
  }

  /**
   * 清理已完成的任务（保留最近N天）
   * @param {number} days - 保留天数
   */
  const cleanupCompletedTasks = async (days = 7) => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    const completedTasks = await db.backgroundTasks
      .where('status')
      .anyOf([TASK_STATUS.COMPLETED, TASK_STATUS.FAILED])
      .toArray()
    
    const toDelete = completedTasks.filter(t => 
      new Date(t.updatedAt) < cutoffDate
    )
    
    for (const task of toDelete) {
      await db.backgroundTasks.delete(task.id)
    }
    
    return toDelete.length
  }

  /**
   * 获取任务统计
   * @param {number} novelId - 小说ID（可选）
   * @returns {Promise<Object>} 统计数据
   */
  const getTaskStats = async (novelId = null) => {
    let allTasks
    
    if (novelId) {
      allTasks = await getTasksByNovel(novelId)
    } else {
      allTasks = await db.backgroundTasks.toArray()
    }
    
    return {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === TASK_STATUS.PENDING).length,
      running: allTasks.filter(t => t.status === TASK_STATUS.RUNNING).length,
      completed: allTasks.filter(t => t.status === TASK_STATUS.COMPLETED).length,
      failed: allTasks.filter(t => t.status === TASK_STATUS.FAILED).length,
      partial: allTasks.filter(t => t.status === TASK_STATUS.PARTIAL).length
    }
  }

  /**
   * 检查章节是否有成功的后处理记录
   * @param {number} chapterId - 章节ID
   * @returns {Promise<boolean>}
   */
  const hasSuccessfulPostProcess = async (chapterId) => {
    const tasks = await getTasksByChapter(chapterId)
    return tasks.some(t => 
      t.type === TASK_TYPES.CHAPTER_POST_PROCESS && 
      t.status === TASK_STATUS.COMPLETED
    )
  }

  /**
   * 获取章节后处理状态
   * @param {number} chapterId - 章节ID
   * @returns {Promise<Object>} 后处理状态
   */
  const getChapterPostProcessStatus = async (chapterId) => {
    const tasks = await getTasksByChapter(chapterId)
    const postProcessTasks = tasks.filter(t => t.type === TASK_TYPES.CHAPTER_POST_PROCESS)
    
    if (postProcessTasks.length === 0) {
      return {
        status: 'not_started',
        message: '未触发后处理',
        lastTask: null
      }
    }
    
    const lastTask = postProcessTasks[0]
    
    switch (lastTask.status) {
      case TASK_STATUS.PENDING:
        return { status: 'pending', message: '等待处理', lastTask }
      case TASK_STATUS.RUNNING:
        return { status: 'running', message: '处理中', lastTask }
      case TASK_STATUS.COMPLETED:
        return { status: 'completed', message: '处理完成', lastTask }
      case TASK_STATUS.FAILED:
        return { status: 'failed', message: '处理失败', lastTask }
      case TASK_STATUS.PARTIAL:
        return { status: 'partial', message: '部分成功', lastTask }
      default:
        return { status: 'unknown', message: '未知状态', lastTask }
    }
  }

  return {
    loading,
    tasks,
    TASK_TYPES,
    TASK_STATUS,
    createTask,
    updateTask,
    getPendingTasks,
    getTasksByNovel,
    getTasksByChapter,
    getAllTasks,
    deleteTask,
    cleanupCompletedTasks,
    getTaskStats,
    hasSuccessfulPostProcess,
    getChapterPostProcessStatus
  }
}
