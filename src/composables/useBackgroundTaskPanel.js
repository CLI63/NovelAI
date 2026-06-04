import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useBackgroundTask } from '@/composables/useBackgroundTask'
import { useNovel } from '@/composables/useNovel'
import { useChapter } from '@/composables/useChapter'
import { useAI } from '@/composables/useAI'
import { useQualityCheck } from '@/composables/useQualityCheck'
import { processChapter } from '@/utils/chapterPostProcessor'
import { useGlobalFullNovelGeneration } from '@/composables/useGlobalFullNovelGeneration'
import { eventBus, EVENTS } from '@/utils/eventBus'
import { buildChapterContext } from '@/utils/contextBuilder'
import { getStrategyInfo } from '@/utils/batchGenerator'
import { buildChapterSummaryPrompt, buildStreamChapterPrompt, getVolumeContext } from '@/utils/prompts'
import { chapterDao } from '@/utils/dao'

const runningSessionIds = new Set()
const recentTasks = ref([])
const taskStats = ref({
  total: 0,
  pending: 0,
  running: 0,
  completed: 0,
  failed: 0,
  partial: 0,
  paused: 0
})
const loading = ref(false)
const runningTaskIds = ref(new Set())
const autoRunQueue = []
let autoRunScheduled = false

function isPanelExecutableTask(task, taskTypes) {
  return task?.type !== taskTypes.BATCH_CHAPTER_GENERATION
}

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
  const { runQualityCheck } = useQualityCheck()

  const taskTypeNames = {
    [TASK_TYPES.CHAPTER_POST_PROCESS]: '章节后处理',
    [TASK_TYPES.BATCH_CHAPTER_PROCESS]: '批量章节处理',
    [TASK_TYPES.SUMMARY_GENERATION]: '摘要生成',
    [TASK_TYPES.FORESHADOWING_EXTRACT]: '伏笔提取',
    [TASK_TYPES.CHARACTER_UPDATE]: '角色更新',
    [TASK_TYPES.TIMELINE_RECORD]: '时间线记录',
    [TASK_TYPES.FULL_NOVEL_GENERATION]: '全本生成',
    [TASK_TYPES.BATCH_CHAPTER_GENERATION]: '批量章节生成'
  }

  const statusNames = {
    [TASK_STATUS.PENDING]: '待执行',
    [TASK_STATUS.RUNNING]: '执行中',
    [TASK_STATUS.COMPLETED]: '已完成',
    [TASK_STATUS.FAILED]: '失败',
    [TASK_STATUS.PARTIAL]: '部分成功',
    [TASK_STATUS.PAUSED]: '已暂停'
  }

  const actionableTasks = computed(() =>
    recentTasks.value.filter(task =>
      isPanelExecutableTask(task, TASK_TYPES) &&
      [TASK_STATUS.PENDING, TASK_STATUS.FAILED].includes(task.status)
    )
  )

  const pendingTasks = computed(() =>
    recentTasks.value.filter(task =>
      isPanelExecutableTask(task, TASK_TYPES) &&
      task.status === TASK_STATUS.PENDING
    )
  )

  const autoRunnableTaskTypes = [
    TASK_TYPES.CHAPTER_POST_PROCESS,
    TASK_TYPES.BATCH_CHAPTER_PROCESS,
    TASK_TYPES.FULL_NOVEL_GENERATION,
    TASK_TYPES.BATCH_CHAPTER_GENERATION
  ]

  function emitTaskStatus(task, status) {
    eventBus.emit(EVENTS.TASK_STATUS_CHANGED, {
      id: task.id,
      type: task.type,
      novelId: task.novelId,
      chapterId: task.chapterId,
      chapterNumber: task.chapterNumber,
      status
    })
  }

  async function refreshTasks() {
    loading.value = true
    try {
      // 面板需要尽量展示完整任务列表，避免任务较多时被前端截断。
      const { tasks } = await getAllTasks({ limit: 50 })
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

  function createBatchGenerationProgress(data, plannedChapters, overrides = {}) {
    const processedCount = plannedChapters.filter(item =>
      ['completed', 'failed'].includes(item.status)
    ).length
    const completedCount = plannedChapters.filter(item => item.status === 'completed').length
    const totalChapters = Number(data.totalToGenerate || plannedChapters.length) || 0

    return {
      totalChapters,
      completedChapters: completedCount,
      currentNumber: overrides.currentNumber || plannedChapters.find(item => item.status === 'generating')?.number || data.startChapter || 0,
      currentTitle: overrides.currentTitle || '',
      currentContent: overrides.currentContent || '',
      currentPhase: overrides.currentPhase || 'generating',
      percent: overrides.percent ?? (totalChapters > 0 ? Math.round((processedCount / totalChapters) * 100) : 0),
      phase: overrides.phase || 'chapters'
    }
  }

  function normalizeBatchGenerationChapters(data) {
    if (Array.isArray(data.chapters) && data.chapters.length > 0) {
      return data.chapters.map(item => ({ ...item }))
    }

    const startChapter = Number(data.startChapter) || 1
    const endChapter = Number(data.endChapter) || startChapter
    const chaptersToGenerate = []
    for (let chapterNumber = startChapter; chapterNumber <= endChapter; chapterNumber += 1) {
      chaptersToGenerate.push({
        number: chapterNumber,
        status: 'pending',
        content: '',
        title: '',
        summary: '',
        wordCount: 0
      })
    }
    return chaptersToGenerate
  }

  function updateBatchChapterState(plannedChapters, chapterNumber, patch) {
    return plannedChapters.map(item =>
      item.number === chapterNumber ? { ...item, ...patch } : item
    )
  }

  async function persistBatchGenerationProgress(task, data, plannedChapters, status = TASK_STATUS.RUNNING, progressOverrides = {}) {
    const progress = createBatchGenerationProgress(data, plannedChapters, progressOverrides)
    await updateTask(task.id, {
      status,
      data: {
        ...data,
        chapters: plannedChapters,
        progress
      }
    })
    emitTaskStatus(task, status)
    return progress
  }

  async function generateChapterSummary(novelData, chapterTitle, content) {
    const messages = buildChapterSummaryPrompt(novelData, chapterTitle, content)
    const response = await generate(messages)
    if (!response) return content.slice(0, 200) + '...'

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return result.summary || content.slice(0, 200) + '...'
    }
    return response.trim().slice(0, 200)
  }

  async function executeBatchChapterGeneration(task) {
    const data = { ...(task.data || {}) }
    const novelId = Number(data.novelId || task.novelId)
    let plannedChapters = normalizeBatchGenerationChapters(data)

    await loadNovel(novelId)
    if (!novel.value) {
      return { success: false, error: '找不到小说数据' }
    }

    const totalNovelChapters = Number(novel.value.chapterStructure?.totalChapters) || 100
    const results = Array.isArray(data.results) ? [...data.results] : []

    await persistBatchGenerationProgress(task, data, plannedChapters, TASK_STATUS.RUNNING)

    for (const plannedChapter of plannedChapters) {
      const chapterNum = Number(plannedChapter.number)
      if (!chapterNum) continue

      const existingChapter = await chapterDao.getByNovelIdAndChapterNumber(novelId, chapterNum)
      if (existingChapter) {
        plannedChapters = updateBatchChapterState(plannedChapters, chapterNum, {
          status: 'completed',
          content: existingChapter.content || '',
          title: existingChapter.title || `第${chapterNum}章`,
          summary: existingChapter.summary || '',
          wordCount: existingChapter.wordCount || existingChapter.content?.length || 0,
          chapterId: existingChapter.id,
          skippedExisting: true
        })
        await persistBatchGenerationProgress(task, data, plannedChapters, TASK_STATUS.RUNNING, {
          currentNumber: chapterNum,
          currentTitle: existingChapter.title || '',
          currentPhase: 'saving'
        })
        continue
      }

      plannedChapters = updateBatchChapterState(plannedChapters, chapterNum, { status: 'generating' })
      await persistBatchGenerationProgress(task, data, plannedChapters, TASK_STATUS.RUNNING, {
        currentNumber: chapterNum,
        currentPhase: 'generating'
      })

      try {
        const recentChapters = await chapterDao.getRecentChapters(novelId, 3)
        const chapterSummaries = await chapterDao.getChapterSummaries(novelId, 100)
        const enhancedContext = await buildChapterContext(novelId, chapterNum, {
          recentChapterCount: 3,
          summaryLimit: 50,
          includeCharacterStatus: true,
          includeForeshadowing: true,
          includeTimeline: true
        })

        const progressRatio = (chapterNum - 1) / totalNovelChapters
        const strategy = getStrategyInfo(progressRatio, totalNovelChapters)
        const messages = buildStreamChapterPrompt(
          novel.value,
          recentChapters,
          chapterSummaries,
          strategy.wordRange[0],
          strategy.wordRange[1],
          chapterNum,
          enhancedContext
        )

        let content = await generate(messages)
        const lines = String(content || '').split('\n')
        let title = `第${chapterNum}章`
        if (lines.length > 0) {
          title = lines[0].trim() || title
          content = lines.slice(1).join('\n').trim()
        }

        const summary = await generateChapterSummary(novel.value, title, content)
        const existingChapters = await chapterDao.getByNovelId(novelId)
        const qualityResult = await runQualityCheck(
          { content, title, chapterNumber: chapterNum },
          { minWords: strategy.wordRange[0], existingChapters }
        )

        const now = new Date().toISOString()
        const chapterData = {
          novelId,
          chapterNumber: chapterNum,
          title,
          content,
          summary,
          wordCount: content.length,
          volumeName: getVolumeContext(chapterNum, novel.value.outline)?.name || '',
          createdAt: now,
          updatedAt: now
        }
        const chapterId = await chapterDao.add(chapterData)

        await processChapter({
          novel: novel.value,
          chapter: { id: chapterId, content, chapterNumber: chapterNum, title },
          callAI: generate
        })

        results.push({
          chapter: chapterNum,
          success: true,
          title,
          wordCount: content.length,
          quality: qualityResult
        })
        plannedChapters = updateBatchChapterState(plannedChapters, chapterNum, {
          status: 'completed',
          content,
          title,
          summary,
          wordCount: content.length,
          chapterId
        })
      } catch (error) {
        results.push({
          chapter: chapterNum,
          success: false,
          error: error.message
        })
        plannedChapters = updateBatchChapterState(plannedChapters, chapterNum, {
          status: 'failed',
          error: error.message
        })
        data.results = results

        // 批量章节必须严格顺序生成；某章失败时立即停止，避免后续章节先生成造成断档。
        await persistBatchGenerationProgress(task, data, plannedChapters, TASK_STATUS.FAILED, {
          currentNumber: chapterNum,
          currentPhase: 'error',
          phase: 'error'
        })

        return {
          success: false,
          error: `第 ${chapterNum} 章生成失败：${error.message}`
        }
      }

      data.results = results
      await persistBatchGenerationProgress(task, data, plannedChapters, TASK_STATUS.RUNNING, {
        currentNumber: chapterNum,
        currentTitle: plannedChapters.find(item => item.number === chapterNum)?.title || '',
        currentPhase: 'saving'
      })
    }

    const failedCount = plannedChapters.filter(item => item.status === 'failed').length
    const finalStatus = failedCount > 0 ? TASK_STATUS.PARTIAL : TASK_STATUS.COMPLETED
    const progress = createBatchGenerationProgress(data, plannedChapters, {
      percent: 100,
      currentPhase: finalStatus === TASK_STATUS.PARTIAL ? 'partial' : 'completed',
      phase: finalStatus === TASK_STATUS.PARTIAL ? 'partial' : 'completed'
    })

    return {
      success: true,
      status: finalStatus,
      data: {
        ...data,
        chapters: plannedChapters,
        results,
        progress
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
        case TASK_TYPES.BATCH_CHAPTER_GENERATION:
          result = await executeBatchChapterGeneration(task)
          break
      }

      if (result.success) {
        const nextStatus = result.status || TASK_STATUS.COMPLETED
        await updateTask(task.id, {
          status: nextStatus,
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
        status: result.success ? (result.status || TASK_STATUS.COMPLETED) : TASK_STATUS.FAILED
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
    if (!autoRunnableTaskTypes.includes(task.type)) return
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
