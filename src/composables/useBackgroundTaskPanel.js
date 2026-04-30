import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useBackgroundTask } from '@/composables/useBackgroundTask'
import { useNovel } from '@/composables/useNovel'
import { useChapter } from '@/composables/useChapter'
import { useAI } from '@/composables/useAI'
import { processChapter } from '@/utils/chapterPostProcessor'
import { useGlobalFullNovelGeneration } from '@/composables/useGlobalFullNovelGeneration'
import { eventBus, EVENTS } from '@/utils/eventBus'

const runningSessionIds = new Set()
const recentTasks = ref([])
const taskStats = ref({
  total: 0,
  pending: 0,
  running: 0,
  completed: 0,
  failed: 0,
  partial: 0
})
const loading = ref(false)
const runningTaskIds = ref(new Set())
const autoRunQueue = []
let autoRunScheduled = false

export function useBackgroundTaskPanel() {
  const {
    TASK_TYPES,
    TASK_STATUS,
    getAllTasks,
    getTaskStats,
    getPendingTasks,
    recoverInterruptedTasks,
    updateTask,
    createTask,
    deleteTask,
    cleanupCompletedTasks
  } = useBackgroundTask()
  const { novel, loadNovel } = useNovel()
  const { chapter, chapters, loadChapters, loadChapter } = useChapter()
  const { generate, checkApiKey } = useAI()
  const { fullGen, syncFromTask } = useGlobalFullNovelGeneration()

  const taskTypeNames = {
    [TASK_TYPES.CHAPTER_POST_PROCESS]: '章节后处理',
    [TASK_TYPES.BATCH_CHAPTER_PROCESS]: '批量章节处理',
    [TASK_TYPES.SUMMARY_GENERATION]: '摘要生成',
    [TASK_TYPES.FORESHADOWING_EXTRACT]: '伏笔提取',
    [TASK_TYPES.CHARACTER_UPDATE]: '角色更新',
    [TASK_TYPES.TIMELINE_RECORD]: '时间线记录',
    [TASK_TYPES.FULL_NOVEL_GENERATION]: '全本生成'
  }

  const statusNames = {
    [TASK_STATUS.PENDING]: '待执行',
    [TASK_STATUS.RUNNING]: '执行中',
    [TASK_STATUS.COMPLETED]: '已完成',
    [TASK_STATUS.FAILED]: '失败',
    [TASK_STATUS.PARTIAL]: '部分成功'
  }

  const actionableTasks = computed(() =>
    recentTasks.value.filter(task => [TASK_STATUS.PENDING, TASK_STATUS.FAILED].includes(task.status))
  )

  const pendingTasks = computed(() =>
    recentTasks.value.filter(task => task.status === TASK_STATUS.PENDING)
  )

  const autoRunnableTaskTypes = [
    TASK_TYPES.CHAPTER_POST_PROCESS,
    TASK_TYPES.BATCH_CHAPTER_PROCESS,
    TASK_TYPES.FULL_NOVEL_GENERATION
  ]

  async function refreshTasks() {
    loading.value = true
    try {
      const { tasks } = await getAllTasks({ limit: 8 })
      recentTasks.value = tasks
      taskStats.value = await getTaskStats()
    } finally {
      loading.value = false
    }
  }

  async function recoverInterruptedAutoRunnableTasks() {
    const recoveredTasks = await recoverInterruptedTasks({
      taskTypes: autoRunnableTaskTypes
    })

    recoveredTasks.forEach(scheduleAutoRun)
    return recoveredTasks
  }

  async function resumePendingAutoRunnableTasks() {
    const tasks = await getPendingTasks()
    const autoRunnableTasks = tasks.filter(task => autoRunnableTaskTypes.includes(task.type))
    autoRunnableTasks.forEach(scheduleAutoRun)
    return autoRunnableTasks
  }

  async function executeChapterPostProcess(task) {
    const { novelId, chapterId, chapterNumber } = task.data

    await loadNovel(novelId)
    await loadChapter(novelId, chapterNumber)

    if (!chapter.value || !novel.value) {
      return { success: false, error: '找不到章节或小说数据' }
    }

    const results = await processChapter({
      novel: novel.value,
      chapter: {
        id: chapterId,
        content: chapter.value.content,
        chapterNumber,
        title: chapter.value.title || ''
      },
      callAI: generate
    })

    return { success: true, data: results }
  }

  async function executeBatchChapterProcess(task) {
    const { chapterIds, novelId } = task.data

    if (!chapterIds || chapterIds.length === 0) {
      return { success: false, error: '没有要处理的章节' }
    }

    await loadChapters(novelId)
    const chapterMap = new Map(chapters.value.map(item => [item.id, item]))
    const results = []

    for (const chapterId of chapterIds) {
      const chapterRecord = chapterMap.get(chapterId)
      if (!chapterRecord) {
        throw new Error(`找不到章节 ${chapterId} 的数据`)
      }

      const subTaskId = await createTask({
        type: TASK_TYPES.CHAPTER_POST_PROCESS,
        novelId,
        chapterId,
        chapterNumber: chapterRecord.chapterNumber,
        data: {
          novelId,
          chapterId,
          chapterNumber: chapterRecord.chapterNumber
        }
      })

      results.push({
        chapterId,
        chapterNumber: chapterRecord.chapterNumber,
        taskId: subTaskId
      })
    }

    for (const item of results) {
      await executeTask({
        id: item.taskId,
        type: TASK_TYPES.CHAPTER_POST_PROCESS,
        novelId,
        chapterId: item.chapterId,
        chapterNumber: item.chapterNumber,
        data: {
          novelId,
          chapterId: item.chapterId,
          chapterNumber: item.chapterNumber
        }
      }, { skipApiKeyCheck: true, silent: true })
    }

    return {
      success: true,
      data: {
        processedCount: results.length,
        executedCount: results.length,
        tasks: results
      }
    }
  }

  async function executeFullNovelGeneration(task) {
    syncFromTask(task)

    fullGen.setOnProgress(async (progress) => {
      await updateTask(task.id, {
        data: {
          ...task.data,
          progress,
          results: [...fullGen.results],
          errors: [...fullGen.errors]
        }
      })
      syncFromTask({
        ...task,
        status: TASK_STATUS.RUNNING,
        data: {
          ...task.data,
          progress,
          results: [...fullGen.results],
          errors: [...fullGen.errors]
        }
      })
    })

    await fullGen.start(task.data.novelId, task.data.extraPrompt || '')

    if (fullGen.phase === 'completed') {
      return { success: true, data: { results: fullGen.results, progress: fullGen.progress } }
    }
    if (fullGen.phase === 'cancelled') {
      return { success: true, data: { cancelled: true, results: fullGen.results, progress: fullGen.progress } }
    }
    return { success: false, error: '生成未完成' }
  }

  async function executeTask(task, options = {}) {
    const { skipApiKeyCheck = false, silent = false } = options

    if (!skipApiKeyCheck && !checkApiKey()) {
      message.warning('请先在设置中配置 API Key')
      return
    }

    if (runningTaskIds.value.has(task.id)) {
      return
    }

    const nextRunning = new Set(runningTaskIds.value)
    nextRunning.add(task.id)
    runningTaskIds.value = nextRunning

    try {
      await updateTask(task.id, { status: TASK_STATUS.RUNNING, error: null })
      runningSessionIds.add(task.id)

      let result = { success: true }
      switch (task.type) {
        case TASK_TYPES.CHAPTER_POST_PROCESS:
          result = await executeChapterPostProcess(task)
          break
        case TASK_TYPES.BATCH_CHAPTER_PROCESS:
          result = await executeBatchChapterProcess(task)
          break
        case TASK_TYPES.FULL_NOVEL_GENERATION:
          result = await executeFullNovelGeneration(task)
          break
      }

      if (result.success) {
        await updateTask(task.id, {
          status: TASK_STATUS.COMPLETED,
          result: result.data || null,
          error: null
        })
        eventBus.emit(EVENTS.TASK_EXECUTED, {
          id: task.id,
          type: task.type,
          novelId: task.novelId,
          chapterId: task.chapterId,
          chapterNumber: task.chapterNumber
        })
      } else {
        await updateTask(task.id, {
          status: TASK_STATUS.FAILED,
          error: result.error || '任务执行失败'
        })
        eventBus.emit(EVENTS.TASK_FAILED, {
          id: task.id,
          type: task.type,
          novelId: task.novelId,
          chapterId: task.chapterId,
          chapterNumber: task.chapterNumber,
          error: result.error || '任务执行失败'
        })
      }
      eventBus.emit(EVENTS.TASK_STATUS_CHANGED, {
        id: task.id,
        type: task.type,
        novelId: task.novelId,
        chapterId: task.chapterId,
        chapterNumber: task.chapterNumber,
        status: result.success ? TASK_STATUS.COMPLETED : TASK_STATUS.FAILED
      })
    } catch (error) {
      await updateTask(task.id, {
        status: TASK_STATUS.FAILED,
        error: error.message
      })
      eventBus.emit(EVENTS.TASK_FAILED, {
        id: task.id,
        type: task.type,
        novelId: task.novelId,
        chapterId: task.chapterId,
        chapterNumber: task.chapterNumber,
        error: error.message
      })
      eventBus.emit(EVENTS.TASK_STATUS_CHANGED, {
        id: task.id,
        type: task.type,
        novelId: task.novelId,
        chapterId: task.chapterId,
        chapterNumber: task.chapterNumber,
        status: TASK_STATUS.FAILED
      })
      if (!silent) {
        message.error(`任务执行失败：${error.message}`)
      }
    } finally {
      const nextRunningAfter = new Set(runningTaskIds.value)
      nextRunningAfter.delete(task.id)
      runningTaskIds.value = nextRunningAfter
      runningSessionIds.delete(task.id)
      await refreshTasks()
    }
  }

  async function flushAutoRunQueue() {
    autoRunScheduled = false

    while (autoRunQueue.length > 0) {
      const task = autoRunQueue.shift()
      if (!task || runningSessionIds.has(task.id)) continue
      await executeTask(task, { silent: true })
    }
  }

  function scheduleAutoRun(task) {
    if (!task?.id) return
    if (runningSessionIds.has(task.id)) return
    if (autoRunQueue.some(item => item.id === task.id)) return

    autoRunQueue.push(task)
    if (!autoRunScheduled) {
      autoRunScheduled = true
      Promise.resolve().then(flushAutoRunQueue)
    }
  }

  async function executeAllPending() {
    if (pendingTasks.value.length === 0) {
      message.info('没有待处理任务')
      return
    }

    for (const task of pendingTasks.value) {
      await executeTask(task)
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  async function removeTask(taskId) {
    await deleteTask(taskId)
    await refreshTasks()
  }

  async function cleanupTasks(days = 7) {
    const count = await cleanupCompletedTasks(days)
    await refreshTasks()
    return count
  }

  return {
    TASK_STATUS,
    loading,
    recentTasks,
    taskStats,
    taskTypeNames,
    statusNames,
    actionableTasks,
    pendingTasks,
    runningTaskIds,
    refreshTasks,
    recoverInterruptedAutoRunnableTasks,
    resumePendingAutoRunnableTasks,
    executeTask,
    executeAllPending,
    scheduleAutoRun,
    removeTask,
    cleanupTasks,
  }
}
