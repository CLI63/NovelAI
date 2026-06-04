import { ref } from 'vue'
import db from '@/utils/db'

/**
 * 清洗后台任务负载，避免把 Vue 响应式代理对象直接写入 IndexedDB，
 * 导致 DataCloneError。
 * @param {any} payload - 原始任务负载
 * @returns {any} 可安全写入 IndexedDB 的普通数据
 */
function sanitizeBackgroundTaskPayload(payload) {
  if (payload == null) return payload

  try {
    return JSON.parse(JSON.stringify(payload))
  } catch (error) {
    console.warn('后台任务负载清洗失败，已回退为安全默认值:', error)
    return Array.isArray(payload) ? [] : {}
  }
}

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
    TIMELINE_RECORD: 'timeline_record',              // 时间线记录
    FULL_NOVEL_GENERATION: 'full_novel_generation',  // 全本生成
    BATCH_CHAPTER_GENERATION: 'batch_chapter_generation' // 批量章节生成
  }

  // 任务状态定义
  const TASK_STATUS = {
    PENDING: 'pending',       // 待执行
    RUNNING: 'running',       // 执行中
    COMPLETED: 'completed',   // 已完成
    FAILED: 'failed',         // 失败
    PARTIAL: 'partial',       // 部分成功
    PAUSED: 'paused'          // 已暂停
  }

  /**
   * 创建后台任务
   * @param {Object} taskData - 任务数据
   * @returns {Promise<number>} 任务ID
   */
  const createTask = async (taskData) => {
    // 写库前统一转成普通对象，避免数组或对象仍带有 Vue Proxy。
    const task = sanitizeBackgroundTaskPayload({
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
    })

    const id = await db.backgroundTasks.add(task)
    return id
  }

  /**
   * 确保章节后处理任务存在且不重复创建
   * @param {Object} taskData - 任务数据
   * @returns {Promise<Object>} 任务信息
   */
  const ensureChapterPostProcessTask = async (taskData) => {
    const chapterTasks = await getTasksByChapter(taskData.chapterId)
    const existingTask = chapterTasks.find(task =>
      task.type === TASK_TYPES.CHAPTER_POST_PROCESS &&
      [TASK_STATUS.PENDING, TASK_STATUS.RUNNING, TASK_STATUS.COMPLETED].includes(task.status)
    )

    if (existingTask) {
      return { id: existingTask.id, task: existingTask, created: false }
    }

    const id = await createTask(taskData)
    return {
      id,
      task: {
        id,
        type: taskData.type,
        status: TASK_STATUS.PENDING,
        novelId: taskData.novelId || null,
        chapterId: taskData.chapterId || null,
        chapterNumber: taskData.chapterNumber || null,
        data: taskData.data || {}
      },
      created: true
    }
  }

  /**
   * 更新任务状态
   * @param {number} taskId - 任务ID
   * @param {Object} updates - 更新数据
   */
  const updateTask = async (taskId, updates) => {
    // 更新任务时也做一次清洗，避免执行结果中的响应式对象再次写库失败。
    await db.backgroundTasks.update(taskId, sanitizeBackgroundTaskPayload({
      ...updates,
      updatedAt: new Date().toISOString()
    }))
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
   * 获取所有执行中的任务
   * @returns {Promise<Array>} 执行中任务列表
   */
  const getRunningTasks = async () => {
    const runningTasks = await db.backgroundTasks
      .where('status')
      .equals(TASK_STATUS.RUNNING)
      .toArray()
    return runningTasks
  }

  /**
   * 恢复被页面刷新或会话中断打断的任务
   * @param {Object} options - 恢复选项
   * @returns {Promise<Array>} 被恢复的任务列表
   */
  const recoverInterruptedTasks = async (options = {}) => {
    const { taskTypes = null } = options
    const runningTasks = await getRunningTasks()
    const interruptedTasks = Array.isArray(taskTypes) && taskTypes.length > 0
      ? runningTasks.filter(task => taskTypes.includes(task.type))
      : runningTasks

    for (const task of interruptedTasks) {
      await db.backgroundTasks.update(task.id, {
        status: TASK_STATUS.PENDING,
        error: null,
        updatedAt: new Date().toISOString()
      })
    }

    return interruptedTasks.map(task => ({
      ...task,
      status: TASK_STATUS.PENDING,
      error: null
    }))
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
      .sortBy('createdAt')
    return novelTasks.reverse()
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
      .sortBy('createdAt')
    return chapterTasks.reverse()
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

    const allTasks = await query.sortBy('createdAt')
    allTasks.reverse()

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
      partial: allTasks.filter(t => t.status === TASK_STATUS.PARTIAL).length,
      paused: allTasks.filter(t => t.status === TASK_STATUS.PAUSED).length
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
    ensureChapterPostProcessTask,
    updateTask,
    getPendingTasks,
    getRunningTasks,
    recoverInterruptedTasks,
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
