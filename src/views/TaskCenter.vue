<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useBackgroundTask } from '@/composables/useBackgroundTask'
import { useNovel } from '@/composables/useNovel'
import { useChapter } from '@/composables/useChapter'
import { useAI } from '@/composables/useAI'
import { useStructuredSummary } from '@/composables/useStructuredSummary'
import { useCharacter } from '@/composables/useCharacter'
import { useForeshadowing } from '@/composables/useForeshadowing'
import { useOutline } from '@/composables/useOutline'
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
  [TASK_TYPES.TIMELINE_RECORD]: '时间线记录'
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
    
    // 根据任务类型执行不同逻辑
    let result = null
    
    switch (task.type) {
      case TASK_TYPES.CHAPTER_POST_PROCESS:
        result = await executeChapterPostProcess(task)
        break
      case TASK_TYPES.BATCH_CHAPTER_PROCESS:
        result = await executeBatchChapterProcess(task)
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
    await loadTasks()
  }
}

// 执行章节后处理
const executeChapterPostProcess = async (task) => {
  try {
    const { novelId, chapterId, chapterNumber } = task.data
    
    // 加载小说和章节数据
    await loadNovel(novelId)
    await loadChapter(novelId, chapterNumber)
    
    if (!chapter.value || !novel.value) {
      return { success: false, error: '找不到章节或小说数据' }
    }
    
    const content = chapter.value.content
    const results = {
      structuredSummary: { success: false, error: null },
      foreshadowing: { success: false, error: null, count: 0 },
      characterAppearance: { success: false, error: null, count: 0 },
      characterStatus: { success: false, error: null },
      foreshadowingResolution: { success: false, error: null, count: 0 },
      timeline: { success: false, error: null, count: 0 }
    }
    
    // 1. 生成结构化摘要
    try {
      const { generateStructuredSummary } = useStructuredSummary()
      const structuredSummary = await generateStructuredSummary(
        { content, chapterNumber },
        novel.value,
        generate
      )
      if (structuredSummary) {
        results.structuredSummary.success = true
      }
    } catch (err) {
      results.structuredSummary.error = err.message
    }
    
    // 2. 提取伏笔
    try {
      const { extractFromChapter } = useForeshadowing()
      const newForeshadowings = await extractFromChapter(content, chapterId, novelId)
      if (newForeshadowings && newForeshadowings.length > 0) {
        results.foreshadowing.success = true
        results.foreshadowing.count = newForeshadowings.length
      } else {
        results.foreshadowing.success = true
      }
    } catch (err) {
      results.foreshadowing.error = err.message
    }
    
    // 3. 更新角色出场
    try {
      const { updateAppearancesFromContent } = useCharacter()
      const appearedCharacters = await updateAppearancesFromContent(content, chapterId, novelId)
      if (appearedCharacters && appearedCharacters.length > 0) {
        results.characterAppearance.success = true
        results.characterAppearance.count = appearedCharacters.length
      } else {
        results.characterAppearance.success = true
      }
    } catch (err) {
      results.characterAppearance.error = err.message
    }
    
    // 4. 更新角色状态
    try {
      const { updateStatusesFromContent } = useCharacter()
      await updateStatusesFromContent(content, chapterId, novelId)
      results.characterStatus.success = true
    } catch (err) {
      results.characterStatus.error = err.message
    }
    
    // 5. 检查伏笔回收
    try {
      const { checkForeshadowingResolution } = useForeshadowing()
      const resolvedForeshadowings = await checkForeshadowingResolution(content, novelId, chapterId)
      if (resolvedForeshadowings && resolvedForeshadowings.length > 0) {
        results.foreshadowingResolution.success = true
        results.foreshadowingResolution.count = resolvedForeshadowings.length
      } else {
        results.foreshadowingResolution.success = true
      }
    } catch (err) {
      results.foreshadowingResolution.error = err.message
    }
    
    // 6. 记录时间线事件
    try {
      const { recordTimelineEvents } = useOutline()
      const eventCount = await recordTimelineEvents(content, chapterId, novelId)
      if (eventCount && eventCount > 0) {
        results.timeline.success = true
        results.timeline.count = eventCount
      } else {
        results.timeline.success = true
      }
    } catch (err) {
      results.timeline.error = err.message
    }
    
    // 判断整体结果
    const successCount = Object.values(results).filter(r => r.success).length
    const totalCount = Object.values(results).length
    
    if (successCount === totalCount) {
      return { success: true, data: results }
    } else if (successCount > 0) {
      return { success: true, data: results } // 部分成功也算成功
    } else {
      return { success: false, error: '所有处理项都失败', data: results }
    }
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
    
    const results = []
    
    for (const chapterId of chapterIds) {
      // 创建单个章节后处理任务
      const subTaskId = await useBackgroundTask().createTask({
        type: TASK_TYPES.CHAPTER_POST_PROCESS,
        novelId,
        chapterId,
        data: { novelId, chapterId }
      })
      
      results.push({ chapterId, taskId: subTaskId })
    }
    
    return { success: true, data: { processedCount: results.length, tasks: results } }
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
          { title: '关联章节', key: 'chapter', width: 100 },
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
          <template v-else-if="column.key === 'chapter'">
            <a v-if="record.chapterNumber" @click="goToChapter(record.novelId, record.chapterNumber)">
              第{{ record.chapterNumber }}章
            </a>
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
