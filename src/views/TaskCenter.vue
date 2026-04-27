<script>
/**
 * 模块级变量：页面刷新重置，SPA 路由切换保留
 * 用于区分「页面刷新」和「菜单切换」两种场景
 */
const runningSessionIds = new Set()
</script>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useBackgroundTask } from '@/composables/useBackgroundTask'
import { useNovel } from '@/composables/useNovel'
import { useChapter } from '@/composables/useChapter'
import { useAI } from '@/composables/useAI'
import { processChapter } from '@/utils/chapterPostProcessor'
import { useFullNovelGeneration } from '@/composables/useFullNovelGeneration'
import PageHeader from '@/components/common/PageHeader.vue'
import { eventBus, EVENTS } from '@/utils/eventBus'

const router = useRouter()

const { 
  tasks, 
  loading, 
  TASK_TYPES, 
  TASK_STATUS,
  getPendingTasks, 
  getAllTasks, 
  updateTask, 
  deleteTask, 
  getTaskStats,
  cleanupCompletedTasks 
} = useBackgroundTask()

const { novel, loadNovel } = useNovel()
const { chapter, chapters, loadChapters, loadChapter } = useChapter()
const { generate, checkApiKey } = useAI()

// 任务统计
const taskStats = ref({
  total: 0,
  pending: 0,
  running: 0,
  completed: 0,
  failed: 0,
  partial: 0
})

// 筛选条件
const filterStatus = ref('all')
const filterType = ref('all')

// 是否显示待处理任务弹窗
const showPendingModal = ref(false)
const pendingTasksList = ref([])

// 模块级变量：SPA 内路由切换不销毁，页面刷新则重新初始化
// 刷新中断的任务
const showStaleRunningModal = ref(false)
const staleRunningTasks = ref([])

const handleStaleRunningTasks = async () => {
  const allTasks = tasks.value
  // runningSessionIds 是模块级变量，页面刷新会重置为空 Set，
  // SPA 路由切换则保留已有 ID，从而区分两种场景
  const staleTasks = allTasks.filter(t => t.status === TASK_STATUS.RUNNING && !runningSessionIds.has(t.id))
  if (staleTasks.length === 0) return

  for (const task of staleTasks) {
    await updateTask(task.id, {
      status: TASK_STATUS.FAILED,
      error: '页面刷新导致任务中断，请重试'
    })
  }

  staleRunningTasks.value = staleTasks.map(t => ({
    ...t,
    status: TASK_STATUS.FAILED,
    error: '页面刷新导致任务中断，请重试'
  }))
  showStaleRunningModal.value = true

  // 刷新任务列表
  await loadTasks()
}

// 当前正在执行的任务
const runningTaskIds = ref(new Set())

// 定时刷新
let refreshTimer = null

// 任务类型名称映射
const taskTypeNames = {
  [TASK_TYPES.CHAPTER_POST_PROCESS]: '章节后处理',
  [TASK_TYPES.BATCH_CHAPTER_PROCESS]: '批量章节处理',
  [TASK_TYPES.SUMMARY_GENERATION]: '摘要生成',
  [TASK_TYPES.FORESHADOWING_EXTRACT]: '伏笔提取',
  [TASK_TYPES.CHARACTER_UPDATE]: '角色更新',
  [TASK_TYPES.TIMELINE_RECORD]: '时间线记录',
  [TASK_TYPES.FULL_NOVEL_GENERATION]: '全本生成'
}

// 任务状态颜色映射
const statusColors = {
  [TASK_STATUS.PENDING]: 'default',
  [TASK_STATUS.RUNNING]: 'processing',
  [TASK_STATUS.COMPLETED]: 'success',
  [TASK_STATUS.FAILED]: 'error',
  [TASK_STATUS.PARTIAL]: 'warning'
}

// 任务状态名称映射
const statusNames = {
  [TASK_STATUS.PENDING]: '待执行',
  [TASK_STATUS.RUNNING]: '执行中',
  [TASK_STATUS.COMPLETED]: '已完成',
  [TASK_STATUS.FAILED]: '失败',
  [TASK_STATUS.PARTIAL]: '部分成功'
}

// 筛选后的任务列表
const filteredTasks = computed(() => {
  let result = tasks.value
  
  if (filterStatus.value !== 'all') {
    result = result.filter(t => t.status === filterStatus.value)
  }
  
  if (filterType.value !== 'all') {
    result = result.filter(t => t.type === filterType.value)
  }
  
  return result
})

// 加载任务列表
const loadTasks = async () => {
  loading.value = true
  try {
    const { tasks: taskList } = await getAllTasks({ limit: 100 })
    tasks.value = taskList
    taskStats.value = await getTaskStats()
  } catch (err) {
    console.error('加载任务失败:', err)
  } finally {
    loading.value = false
  }
}

// 检查待处理任务
const checkPendingTasks = async () => {
  const pending = await getPendingTasks()
  
  if (pending.length > 0) {
    pendingTasksList.value = pending
    showPendingModal.value = true
  }
}

// 执行单个任务
const executeTask = async (task) => {
  if (!checkApiKey()) {
    message.warning('请先配置API密钥')
    return
  }
  
  if (runningTaskIds.value.has(task.id)) {
    return
  }
  
  runningTaskIds.value.add(task.id)
  
  try {
    await updateTask(task.id, { status: TASK_STATUS.RUNNING })
    const idx = tasks.value.findIndex(t => t.id === task.id)
    if (idx !== -1) tasks.value[idx] = { ...tasks.value[idx], status: TASK_STATUS.RUNNING }
    runningSessionIds.add(task.id)

    // 根据任务类型执行不同逻辑
    let result = null
    
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
      default:
        result = { success: true }
    }
    
    if (result.success) {
      await updateTask(task.id, { 
        status: TASK_STATUS.COMPLETED,
        result: result.data
      })
      message.success('任务执行完成')
    } else {
      await updateTask(task.id, { 
        status: TASK_STATUS.FAILED,
        error: result.error
      })
      message.error('任务执行失败：' + result.error)
    }
  } catch (err) {
    console.error('执行任务失败:', err)
    await updateTask(task.id, { 
      status: TASK_STATUS.FAILED,
      error: err.message
    })
    message.error('任务执行失败：' + err.message)
  } finally {
    runningTaskIds.value.delete(task.id)
    runningSessionIds.delete(task.id)
    await loadTasks()
  }
}

// 执行章节后处理
const executeChapterPostProcess = async (task) => {
  try {
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
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 执行批量章节处理
const executeBatchChapterProcess = async (task) => {
  try {
    const { chapterIds, novelId } = task.data

    if (!chapterIds || chapterIds.length === 0) {
      return { success: false, error: '没有要处理的章节' }
    }

    await loadChapters(novelId)
    const chapterMap = new Map(chapters.value.map(chapter => [chapter.id, chapter]))
    const results = []

    for (const chapterId of chapterIds) {
      const chapterRecord = chapterMap.get(chapterId)
      if (!chapterRecord) {
        throw new Error(`找不到章节 ${chapterId} 的数据`)
      }

      // 创建单个章节后处理任务
      const subTaskId = await useBackgroundTask().createTask({
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

      results.push({ chapterId, chapterNumber: chapterRecord.chapterNumber, taskId: subTaskId })
    }

    return { success: true, data: { processedCount: results.length, tasks: results } }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 执行全本生成
const executeFullNovelGeneration = async (task) => {
  const gen = useFullNovelGeneration()
  try {
    // 将进度持久化到任务数据
    gen.setOnProgress(async (progress) => {
      await updateTask(task.id, {
        data: { ...task.data, progress }
      })
    })

    await gen.start(task.data.novelId)

    if (gen.phase.value === 'completed') {
      return { success: true, data: { results: gen.results.value, progress: gen.progress.value } }
    } else if (gen.phase.value === 'cancelled') {
      return { success: true, data: { cancelled: true, results: gen.results.value } }
    } else {
      return { success: false, error: '生成未完成', data: { errors: gen.errors.value } }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 执行所有待处理任务
const executeAllPending = async () => {
  const pending = tasks.value.filter(t => t.status === TASK_STATUS.PENDING)
  
  if (pending.length === 0) {
    message.info('没有待处理的任务')
    return
  }
  
  showPendingModal.value = false
  
  for (const task of pending) {
    await executeTask(task)
    // 每个任务之间间隔一小段时间
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

// 删除任务
const handleDeleteTask = async (taskId) => {
  await deleteTask(taskId)
  message.success('任务已删除')
  await loadTasks()
}

// 清理已完成任务
const handleCleanup = async () => {
  Modal.confirm({
    title: '清理已完成任务',
    content: '确定要清理7天前已完成的任务吗？',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      const count = await cleanupCompletedTasks(7)
      message.success(`已清理 ${count} 个任务`)
      await loadTasks()
    }
  })
}

// 跳转到小说详情
const goToNovel = (novelId) => {
  router.push(`/novel/${novelId}`)
}

// 跳转到章节详情
const goToChapter = (novelId, chapterNumber) => {
  router.push(`/novel/${novelId}/chapter/${chapterNumber}`)
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

// 判断任务是否正在执行
const isTaskRunning = (taskId) => {
  return runningTaskIds.value.has(taskId)
}

onMounted(async () => {
  await loadTasks()
  // 标记因页面刷新中断的 running 任务
  await handleStaleRunningTasks()
  // 检查是否有待处理任务
  await checkPendingTasks()
  
  // 定时刷新任务状态
  refreshTimer = setInterval(loadTasks, 30000)
  
  // 监听任务创建事件，自动执行新任务
  eventBus.on(EVENTS.TASK_CREATED, handleTaskCreated)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

// 处理新创建的任务
const handleTaskCreated = async (task) => {
  console.log('收到任务创建事件，自动执行:', task)
  if (task && task.id) {
    // 延迟一点时间确保任务已保存到数据库
    setTimeout(async () => {
      await executeTask(task)
    }, 100)
  }
}
</script>

<template>
  <div class="task-center-page">
    <!-- 待处理任务弹窗 -->
    <a-modal
      v-model:open="showPendingModal"
      title="🔄 发现待处理任务"
      :closable="false"
      :maskClosable="false"
      width="600px"
    >
      <div class="pending-tasks-info">
        <a-alert type="info" show-icon style="margin-bottom: 16px">
          <template #message>
            发现 {{ pendingTasksList.length }} 个待处理的后台任务，是否立即执行？
          </template>
        </a-alert>
        
        <div class="pending-tasks-list">
          <div v-for="task in pendingTasksList" :key="task.id" class="pending-task-item">
            <span class="task-type">{{ taskTypeNames[task.type] || task.type }}</span>
            <span class="task-time">{{ formatTime(task.createdAt) }}</span>
          </div>
        </div>
      </div>
      
      <template #footer>
        <a-button @click="showPendingModal = false">稍后处理</a-button>
        <a-button type="primary" @click="executeAllPending">立即执行</a-button>
      </template>
    </a-modal>

    <!-- 刷新中断的任务提醒 -->
    <a-modal
      v-model:open="showStaleRunningModal"
      title="⚠️ 任务中断提醒"
      :closable="false"
      :maskClosable="false"
      width="600px"
    >
      <div class="pending-tasks-info">
        <a-alert type="warning" show-icon style="margin-bottom: 16px">
          <template #message>
            检测到 {{ staleRunningTasks.length }} 个任务因页面刷新而中断，已自动标记为失败，可重新执行。
          </template>
        </a-alert>

        <div class="pending-tasks-list">
          <div v-for="task in staleRunningTasks" :key="task.id" class="pending-task-item">
            <span class="task-type">{{ taskTypeNames[task.type] || task.type }}</span>
            <span class="task-time">{{ formatTime(task.createdAt) }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <a-button type="primary" @click="showStaleRunningModal = false">知道了</a-button>
      </template>
    </a-modal>

    <!-- 页面头部 -->
    <PageHeader
      title="任务中心"
      subtitle="管理所有后台静默任务"
      icon="📋"
    >
      <template #actions>
        <a-button @click="handleCleanup">清理已完成任务</a-button>
        <a-button type="primary" @click="loadTasks">刷新</a-button>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <a-row :gutter="16" class="stats-row">
      <a-col :span="4">
        <a-card :bordered="false" class="stat-card">
          <a-statistic title="总任务" :value="taskStats.total" />
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card :bordered="false" class="stat-card pending">
          <a-statistic title="待执行" :value="taskStats.pending" :value-style="{ color: '#faad14' }" />
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card :bordered="false" class="stat-card running">
          <a-statistic title="执行中" :value="taskStats.running" :value-style="{ color: '#1890ff' }" />
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card :bordered="false" class="stat-card completed">
          <a-statistic title="已完成" :value="taskStats.completed" :value-style="{ color: '#52c41a' }" />
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card :bordered="false" class="stat-card partial">
          <a-statistic title="部分成功" :value="taskStats.partial" :value-style="{ color: '#fa8c16' }" />
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card :bordered="false" class="stat-card failed">
          <a-statistic title="失败" :value="taskStats.failed" :value-style="{ color: '#ff4d4f' }" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 筛选区域 -->
    <a-card :bordered="false" class="filter-card">
      <a-space>
        <span>任务类型：</span>
        <a-select v-model:value="filterType" style="width: 150px">
          <a-select-option value="all">全部类型</a-select-option>
          <a-select-option v-for="(name, type) in taskTypeNames" :key="type" :value="type">
            {{ name }}
          </a-select-option>
        </a-select>
        
        <span>状态：</span>
        <a-select v-model:value="filterStatus" style="width: 120px">
          <a-select-option value="all">全部状态</a-select-option>
          <a-select-option v-for="(name, status) in statusNames" :key="status" :value="status">
            {{ name }}
          </a-select-option>
        </a-select>
      </a-space>
    </a-card>

    <!-- 任务列表 -->
    <a-card :bordered="false" class="task-list-card">
      <a-table
        :dataSource="filteredTasks"
        :columns="[
          { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
          { title: '类型', dataIndex: 'type', key: 'type', width: 120 },
          { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
          { title: '关联小说', key: 'novel', width: 150 },
          { title: '进度', key: 'progress', width: 180 },
          { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
          { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 160 },
          { title: '操作', key: 'actions', width: 200 }
        ]"
        :loading="loading"
        :pagination="{ pageSize: 20 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <span>{{ taskTypeNames[record.type] || record.type }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[record.status]">
              {{ statusNames[record.status] }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'novel'">
            <a v-if="record.novelId" @click="goToNovel(record.novelId)">
              小说 #{{ record.novelId }}
            </a>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'progress'">
            <template v-if="record.type === TASK_TYPES.FULL_NOVEL_GENERATION && record.data?.progress">
              <a-progress
                :percent="record.data.progress.percent"
                :status="record.status === 'failed' ? 'exception' : (record.status === 'completed' ? 'success' : 'active')"
                size="small"
                :format="() => `${record.data.progress.completedChapters}/${record.data.progress.totalChapters}章`"
                style="width: 140px"
              />
            </template>
            <template v-else-if="record.chapterNumber">
              <a @click="goToChapter(record.novelId, record.chapterNumber)">
                第{{ record.chapterNumber }}章
              </a>
            </template>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'createdAt' || column.key === 'updatedAt'">
            {{ formatTime(record[column.dataIndex]) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button
                v-if="record.status === TASK_STATUS.PENDING"
                type="link"
                size="small"
                :loading="isTaskRunning(record.id)"
                @click="executeTask(record)"
              >
                执行
              </a-button>
              <a-button
                v-if="record.status === TASK_STATUS.FAILED"
                type="link"
                size="small"
                :loading="isTaskRunning(record.id)"
                @click="executeTask(record)"
              >
                重试
              </a-button>
              <a-popconfirm
                title="确定要删除此任务吗？"
                @confirm="handleDeleteTask(record.id)"
              >
                <a-button type="link" danger size="small">删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
.task-center-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.stats-row {
  margin-bottom: var(--spacing-md);
}

.stat-card {
  text-align: center;
}

.stat-card.pending {
  background: linear-gradient(135deg, #fffbe6 0%, #fff7cc 100%);
}

.stat-card.running {
  background: linear-gradient(135deg, #e6f7ff 0%, #cceeff 100%);
}

.stat-card.completed {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
}

.stat-card.partial {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
}

.stat-card.failed {
  background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
}

.filter-card {
  margin-bottom: var(--spacing-md);
}

.task-list-card {
  flex: 1;
}

.pending-tasks-info {
  max-height: 300px;
  overflow-y: auto;
}

.pending-tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pending-task-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.task-type {
  font-weight: 500;
}

.task-time {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
