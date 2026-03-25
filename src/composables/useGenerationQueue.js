import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { generationTaskDao } from '@/utils/dao'

/**
 * 生成任务队列组合式函数
 * 提供批量生成任务的管理功能
 */
export function useGenerationQueue() {
  const tasks = ref([])
  const currentTask = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * 加载小说的所有生成任务
   * @param {number} novelId - 小说ID
   */
  const loadTasks = async (novelId) => {
    loading.value = true
    error.value = null

    try {
      const list = await generationTaskDao.getByNovelId(novelId)
      tasks.value = list.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )
      return tasks.value
    } catch (err) {
      error.value = err.message
      console.error('加载任务列表失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新的生成任务
   * @param {Object} taskData - 任务数据
   */
  const createTask = async (taskData) => {
    try {
      const task = {
        ...taskData,
        status: 'pending',
        chapters: taskData.chapters || [],
        progress: 0,
        error: null,
        startedAt: null,
        completedAt: null
      }
      
      const id = await generationTaskDao.add(task)
      message.success('任务创建成功！')
      return id
    } catch (err) {
      error.value = err.message
      message.error('创建任务失败：' + err.message)
      return null
    }
  }

  /**
   * 创建批量生成任务
   * @param {number} novelId - 小说ID
   * @param {number} startChapter - 起始章节号
   * @param {number} endChapter - 结束章节号
   * @param {Object} options - 生成选项
   */
  const createBatchTask = async (novelId, startChapter, endChapter, options = {}) => {
    const chapters = []
    for (let i = startChapter; i <= endChapter; i++) {
      chapters.push({
        number: i,
        status: 'pending',
        content: null,
        title: null,
        summary: null,
        wordCount: 0
      })
    }

    return await createTask({
      novelId,
      type: 'batch',
      chapters,
      options: {
        minWords: options.minWords || 2000,
        maxWords: options.maxWords || 3000,
        useOutline: options.useOutline !== false,
        autoSave: options.autoSave !== false,
        ...options
      }
    })
  }

  /**
   * 开始执行任务
   * @param {number} taskId - 任务ID
   */
  const startTask = async (taskId) => {
    try {
      await generationTaskDao.markRunning(taskId)
      const task = await generationTaskDao.getById(taskId)
      if (task) {
        task.status = 'running'
        task.startedAt = new Date().toISOString()
        await generationTaskDao.update(taskId, task)
      }
      return true
    } catch (err) {
      console.error('启动任务失败:', err)
      return false
    }
  }

  /**
   * 暂停任务
   * @param {number} taskId - 任务ID
   */
  const pauseTask = async (taskId) => {
    try {
      await generationTaskDao.markPaused(taskId)
      message.info('任务已暂停')
      return true
    } catch (err) {
      console.error('暂停任务失败:', err)
      return false
    }
  }

  /**
   * 继续任务
   * @param {number} taskId - 任务ID
   */
  const resumeTask = async (taskId) => {
    try {
      await generationTaskDao.markRunning(taskId)
      message.success('任务已继续')
      return true
    } catch (err) {
      console.error('继续任务失败:', err)
      return false
    }
  }

  /**
   * 取消任务
   * @param {number} taskId - 任务ID
   */
  const cancelTask = async (taskId) => {
    try {
      await generationTaskDao.delete(taskId)
      message.success('任务已取消')
      return true
    } catch (err) {
      console.error('取消任务失败:', err)
      return false
    }
  }

  /**
   * 更新章节生成进度
   * @param {number} taskId - 任务ID
   * @param {number} chapterIndex - 章节索引
   * @param {string} status - 状态
   * @param {Object} content - 内容
   */
  const updateChapterProgress = async (taskId, chapterIndex, status, content = null) => {
    try {
      await generationTaskDao.updateTaskProgress(taskId, chapterIndex, status, content)
      
      // 更新任务进度
      const task = await generationTaskDao.getById(taskId)
      if (task) {
        const completedCount = task.chapters.filter(c => c.status === 'completed').length
        const progress = Math.round((completedCount / task.chapters.length) * 100)
        await generationTaskDao.update(taskId, { progress })
      }
      
      return true
    } catch (err) {
      console.error('更新进度失败:', err)
      return false
    }
  }

  /**
   * 更新任务
   * @param {number} taskId - 任务ID
   * @param {Object} updates - 更新内容
   */
  const updateTask = async (taskId, updates) => {
    try {
      await generationTaskDao.update(taskId, updates)
      return true
    } catch (err) {
      console.error('更新任务失败:', err)
      return false
    }
  }

  /**
   * 标记任务完成
   * @param {number} taskId - 任务ID
   */
  const completeTask = async (taskId) => {
    try {
      await generationTaskDao.markCompleted(taskId)
      message.success('任务完成！')
      return true
    } catch (err) {
      console.error('标记任务完成失败:', err)
      return false
    }
  }

  /**
   * 标记任务失败
   * @param {number} taskId - 任务ID
   * @param {string} errorMsg - 错误信息
   */
  const failTask = async (taskId, errorMsg) => {
    try {
      await generationTaskDao.markFailed(taskId, errorMsg)
      message.error('任务失败：' + errorMsg)
      return true
    } catch (err) {
      console.error('标记任务失败失败:', err)
      return false
    }
  }

  /**
   * 获取待处理的任务
   * @param {number} novelId - 小说ID
   */
  const getPendingTasks = async (novelId) => {
    try {
      return await generationTaskDao.getPending(novelId)
    } catch (err) {
      console.error('获取待处理任务失败:', err)
      return []
    }
  }

  /**
   * 获取正在运行的任务
   * @param {number} novelId - 小说ID
   */
  const getRunningTasks = async (novelId) => {
    try {
      return await generationTaskDao.getRunning(novelId)
    } catch (err) {
      console.error('获取运行中任务失败:', err)
      return []
    }
  }

  /**
   * 获取下一个待生成的章节
   * @param {Object} task - 任务对象
   */
  const getNextPendingChapter = (task) => {
    if (!task || !task.chapters) return null
    return task.chapters.find(c => c.status === 'pending')
  }

  /**
   * 计算任务进度
   */
  const getTaskProgress = (task) => {
    if (!task || !task.chapters || task.chapters.length === 0) return 0
    const completed = task.chapters.filter(c => c.status === 'completed').length
    return Math.round((completed / task.chapters.length) * 100)
  }

  /**
   * 任务统计
   */
  const taskStats = computed(() => {
    const total = tasks.value.length
    const pending = tasks.value.filter(t => t.status === 'pending').length
    const running = tasks.value.filter(t => t.status === 'running').length
    const completed = tasks.value.filter(t => t.status === 'completed').length
    const failed = tasks.value.filter(t => t.status === 'failed').length
    const paused = tasks.value.filter(t => t.status === 'paused').length

    return {
      total,
      pending,
      running,
      completed,
      failed,
      paused
    }
  })

  /**
   * 是否有正在运行的任务
   */
  const hasRunningTask = computed(() => {
    return tasks.value.some(t => t.status === 'running')
  })

  return {
    tasks,
    currentTask,
    loading,
    error,
    taskStats,
    hasRunningTask,
    loadTasks,
    createTask,
    createBatchTask,
    startTask,
    pauseTask,
    resumeTask,
    cancelTask,
    updateTask,
    updateChapterProgress,
    completeTask,
    failTask,
    getPendingTasks,
    getRunningTasks,
    getNextPendingChapter,
    getTaskProgress
  }
}
