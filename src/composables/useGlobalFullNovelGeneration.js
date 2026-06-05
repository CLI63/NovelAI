import { computed, reactive, ref } from 'vue'
import { useFullNovelGeneration } from '@/composables/useFullNovelGeneration'
import { novelDao } from '@/utils/dao'
import { useBackgroundTask } from '@/composables/useBackgroundTask'
import { eventBus, EVENTS } from '@/utils/eventBus'

let fullGen = null

const visible = ref(false)
const expanded = ref(false)
const novelId = ref(null)
const currentTaskId = ref(null)
const runtimeTaskId = ref(null)
const taskControlBusy = ref(false)

function ensureFullGen() {
  if (!fullGen) {
    fullGen = reactive(useFullNovelGeneration())
  }
  return fullGen
}

function createEmptyProgress() {
  return {
    totalChapters: 0,
    completedChapters: 0,
    currentNumber: 0,
    currentTitle: '',
    currentContent: '',
    currentPhase: '',
    percent: 0,
    phase: 'idle'
  }
}

function applyTaskSnapshot(task) {
  if (!task) return null

  const gen = ensureFullGen()
  const progressSnapshot = task.result?.progress || task.data?.progress || {}
  const resultSnapshot = Array.isArray(task.result?.results)
    ? task.result.results
    : Array.isArray(task.data?.results)
      ? task.data.results
      : []
  const errorSnapshot = Array.isArray(task.result?.errors)
    ? task.result.errors
    : Array.isArray(task.data?.errors)
      ? task.data.errors
      : []

  visible.value = true
  novelId.value = task.data?.novelId ?? task.novelId ?? null
  currentTaskId.value = task.id ?? null

  gen.progress = {
    ...createEmptyProgress(),
    ...progressSnapshot
  }
  gen.results = resultSnapshot

  if (task.status === 'cancelled' || (task.status === 'completed' && task.result?.cancelled)) {
    gen.phase = 'cancelled'
    gen.errors = errorSnapshot
  } else if (task.status === 'completed') {
    gen.phase = 'completed'
    gen.errors = []
  } else if (task.status === 'failed') {
    gen.phase = 'error'
    gen.errors = errorSnapshot.length > 0 ? errorSnapshot : [{
      chapter: progressSnapshot.currentNumber || 0,
      phase: progressSnapshot.currentPhase || 'system',
      error: task.error || '全本生成失败'
    }]
  } else if (task.status === 'paused') {
    gen.phase = 'paused'
    gen.errors = errorSnapshot
  } else {
    gen.phase = progressSnapshot.phase === 'paused' ? 'paused' : 'chapters'
    gen.errors = errorSnapshot
  }

  return task
}

export function useGlobalFullNovelGeneration() {
  const gen = ensureFullGen()
  const {
    TASK_TYPES,
    TASK_STATUS,
    createTask,
    getAllTasks,
    getTaskById,
    mergeTaskData
  } = useBackgroundTask()

  const isRunning = computed(() => ['chapters', 'paused'].includes(gen.phase))
  const canClose = computed(() => ['completed', 'error', 'cancelled', 'idle'].includes(gen.phase))
  const hasRuntimeSession = computed(() => runtimeTaskId.value != null && runtimeTaskId.value === currentTaskId.value)
  const terminalTaskStatuses = [
    TASK_STATUS.COMPLETED,
    TASK_STATUS.FAILED,
    TASK_STATUS.CANCELLED
  ]

  function createRuntimeDataSnapshot(progressPatch = {}) {
    return {
      progress: {
        ...createEmptyProgress(),
        ...(gen.progress || {}),
        ...progressPatch
      },
      results: Array.isArray(gen.results) ? [...gen.results] : [],
      errors: Array.isArray(gen.errors) ? [...gen.errors] : []
    }
  }

  async function updateTaskProgressState(taskId, status, progressPatch = {}) {
    const task = await getTaskById(taskId)
    if (!task) return null

    const nextProgress = {
      ...createEmptyProgress(),
      ...(task.result?.progress || task.data?.progress || {}),
      ...(gen.progress || {}),
      ...progressPatch
    }
    const snapshot = createRuntimeDataSnapshot(nextProgress)

    // 任务状态和运行快照走同一个合并入口，避免旧进度覆盖暂停/取消状态。
    return await mergeTaskData(taskId, snapshot, { status })
  }

  async function start(id, extraPrompt = '') {
    if (isRunning.value) {
      throw new Error('已有全本生成任务正在运行')
    }

    const novel = await novelDao.getById(id)
    if (!novel) {
      throw new Error('小说不存在')
    }

    const totalChapters = Number(novel.chapterStructure?.totalChapters) || 0
    if (totalChapters === 0) {
      throw new Error('章节结构未设置，请先生成小说概览')
    }

    const taskData = {
      type: TASK_TYPES.FULL_NOVEL_GENERATION,
      novelId: id,
      data: {
        novelId: id,
        extraPrompt,
        results: [],
        errors: [],
        progress: {
          totalChapters,
          completedChapters: 0,
          currentNumber: 0,
          currentTitle: '',
          currentContent: '',
          currentPhase: 'generating',
          percent: 0,
          phase: 'chapters'
        }
      }
    }

    const taskId = await createTask(taskData)
    applyTaskSnapshot({
      id: taskId,
      ...taskData,
      status: TASK_STATUS.PENDING,
      result: null,
      error: null
    })
    expanded.value = false

    await eventBus.emitAsync(EVENTS.TASK_CREATED, {
      id: taskId,
      ...taskData,
      status: TASK_STATUS.PENDING
    })

    return taskId
  }

  async function restoreLatestTask() {
    const { tasks } = await getAllTasks({ limit: 100 })
    const candidates = tasks.filter(item =>
      item.type === TASK_TYPES.FULL_NOVEL_GENERATION &&
      [TASK_STATUS.PENDING, TASK_STATUS.RUNNING, TASK_STATUS.PAUSED].includes(item.status)
    )
    const task = candidates.sort((left, right) =>
      new Date(right.updatedAt || right.createdAt || 0).getTime() -
      new Date(left.updatedAt || left.createdAt || 0).getTime()
    )[0]

    if (!task) return null
    return applyTaskSnapshot(task)
  }

  function attachRuntimeTask(taskId) {
    runtimeTaskId.value = taskId
  }

  function detachRuntimeTask(taskId = null) {
    if (taskId == null || runtimeTaskId.value === taskId) {
      runtimeTaskId.value = null
    }
  }

  async function pauseCurrentTask() {
    if (!currentTaskId.value || taskControlBusy.value) return null
    taskControlBusy.value = true

    try {
      const taskId = currentTaskId.value
      const latestTask = await getTaskById(taskId)
      if (!latestTask || terminalTaskStatuses.includes(latestTask.status)) return latestTask

      if (latestTask.status === TASK_STATUS.PAUSED) {
        syncFromTask(latestTask)
        return latestTask
      }

      if (hasRuntimeSession.value) {
        gen.pause()
      }

      const nextTask = await updateTaskProgressState(taskId, TASK_STATUS.PAUSED, {
        phase: 'paused',
        currentPhase: 'paused'
      })
      if (nextTask) {
        syncFromTask(nextTask)
        await eventBus.emitAsync(EVENTS.TASK_STATUS_CHANGED, {
          id: nextTask.id,
          type: nextTask.type,
          novelId: nextTask.novelId,
          chapterId: nextTask.chapterId,
          chapterNumber: nextTask.chapterNumber,
          status: TASK_STATUS.PAUSED
        })
      }
      return nextTask
    } finally {
      taskControlBusy.value = false
    }
  }

  async function resumeCurrentTask() {
    if (!currentTaskId.value || taskControlBusy.value) return null
    taskControlBusy.value = true

    try {
      const taskId = currentTaskId.value
      const latestTask = await getTaskById(taskId)
      if (!latestTask || terminalTaskStatuses.includes(latestTask.status)) return latestTask

      if (hasRuntimeSession.value) {
        gen.resume()
        const nextTask = await updateTaskProgressState(taskId, TASK_STATUS.RUNNING, {
          phase: 'chapters',
          currentPhase: 'generating'
        })
        if (nextTask) {
          syncFromTask(nextTask)
          await eventBus.emitAsync(EVENTS.TASK_STATUS_CHANGED, {
            id: nextTask.id,
            type: nextTask.type,
            novelId: nextTask.novelId,
            chapterId: nextTask.chapterId,
            chapterNumber: nextTask.chapterNumber,
            status: TASK_STATUS.RUNNING
          })
        }
        return nextTask
      }

      const nextTask = await updateTaskProgressState(taskId, TASK_STATUS.PENDING, {
        phase: 'chapters',
        currentPhase: 'generating'
      })
      if (nextTask) {
        syncFromTask(nextTask)
        await eventBus.emitAsync(EVENTS.TASK_CREATED, {
          ...nextTask,
          status: TASK_STATUS.PENDING
        })
      }
      return nextTask
    } finally {
      taskControlBusy.value = false
    }
  }

  async function cancelCurrentTask() {
    if (!currentTaskId.value || taskControlBusy.value) return null
    taskControlBusy.value = true

    try {
      const taskId = currentTaskId.value
      const latestTask = await getTaskById(taskId)
      if (!latestTask) return null
      if (terminalTaskStatuses.includes(latestTask.status)) {
        syncFromTask(latestTask)
        return latestTask
      }

      if (hasRuntimeSession.value) {
        gen.cancel()
      }

      const nextTask = await updateTaskProgressState(taskId, TASK_STATUS.CANCELLED, {
        phase: 'cancelled',
        currentPhase: 'cancelled'
      })
      if (nextTask) {
        syncFromTask(nextTask)
        await eventBus.emitAsync(EVENTS.TASK_STATUS_CHANGED, {
          id: nextTask.id,
          type: nextTask.type,
          novelId: nextTask.novelId,
          chapterId: nextTask.chapterId,
          chapterNumber: nextTask.chapterNumber,
          status: TASK_STATUS.CANCELLED
        })
      }
      return nextTask
    } finally {
      taskControlBusy.value = false
    }
  }

  function syncFromTask(task) {
    return applyTaskSnapshot(task)
  }

  function close() {
    if (!canClose.value) return
    visible.value = false
    novelId.value = null
    currentTaskId.value = null
    runtimeTaskId.value = null
    gen.reset()
  }

  return {
    fullGen: gen,
    visible,
    expanded,
    novelId,
    currentTaskId,
    isRunning,
    canClose,
    start,
    restoreLatestTask,
    attachRuntimeTask,
    detachRuntimeTask,
    pauseCurrentTask,
    resumeCurrentTask,
    cancelCurrentTask,
    syncFromTask,
    close,
    hasRuntimeSession,
    taskControlBusy
  }
}
