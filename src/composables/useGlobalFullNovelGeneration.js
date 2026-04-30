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
    percent: 0
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
  const errorSnapshot = Array.isArray(task.data?.errors) ? task.data.errors : []

  visible.value = true
  novelId.value = task.data?.novelId ?? task.novelId ?? null
  currentTaskId.value = task.id ?? null

  gen.progress = {
    ...createEmptyProgress(),
    ...progressSnapshot
  }
  gen.results = resultSnapshot

  if (task.status === 'completed') {
    gen.phase = task.result?.cancelled ? 'cancelled' : 'completed'
    gen.errors = []
  } else if (task.status === 'failed') {
    gen.phase = 'error'
    gen.errors = errorSnapshot.length > 0 ? errorSnapshot : [{
      chapter: progressSnapshot.currentNumber || 0,
      phase: progressSnapshot.currentPhase || 'system',
      error: task.error || '全本生成失败'
    }]
  } else {
    gen.phase = progressSnapshot.phase === 'paused' ? 'paused' : 'chapters'
    gen.errors = errorSnapshot
  }

  return task
}

export function useGlobalFullNovelGeneration() {
  const gen = ensureFullGen()
  const { TASK_TYPES, TASK_STATUS, createTask, getAllTasks } = useBackgroundTask()

  const isRunning = computed(() => ['chapters', 'paused'].includes(gen.phase))
  const canClose = computed(() => ['completed', 'error', 'cancelled', 'idle'].includes(gen.phase))

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

    eventBus.emit(EVENTS.TASK_CREATED, {
      id: taskId,
      ...taskData,
      status: TASK_STATUS.PENDING
    })

    return taskId
  }

  async function restoreLatestTask() {
    const { tasks } = await getAllTasks({ limit: 100 })
    const task = tasks.find(item =>
      item.type === TASK_TYPES.FULL_NOVEL_GENERATION &&
      [TASK_STATUS.PENDING, TASK_STATUS.RUNNING].includes(item.status)
    )

    if (!task) return null
    return applyTaskSnapshot(task)
  }

  function syncFromTask(task) {
    return applyTaskSnapshot(task)
  }

  function close() {
    if (!canClose.value) return
    visible.value = false
    novelId.value = null
    currentTaskId.value = null
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
    syncFromTask,
    close
  }
}
