<script setup>
/**
 * 章节列表组件
 * 用于展示小说的章节列表，支持分页、操作和批量后处理
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useBackgroundTask } from '@/composables/useBackgroundTask'
import { eventBus, EVENTS } from '@/utils/eventBus'

const props = defineProps({
  chapters: {
    type: Array,
    required: true,
  },
  novelId: {
    type: [Number, String],
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['view', 'delete'])

const { 
  TASK_TYPES, 
  TASK_STATUS,
  createTask,
  getChapterPostProcessStatus
} = useBackgroundTask()

// 选中的章节
const selectedRowKeys = ref([])
// 后处理状态映射
const postProcessStatusMap = ref({})
// 批量处理中
const batchProcessing = ref(false)

// 行选择配置
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
}))

// 是否有选中的章节
const hasSelection = computed(() => selectedRowKeys.value.length > 0)

// 统计后处理状态
const postProcessStats = computed(() => {
  const stats = {
    total: props.chapters.length,
    completed: 0,
    pending: 0,
    failed: 0,
    notStarted: 0
  }
  
  for (const chapter of props.chapters) {
    const status = postProcessStatusMap.value[chapter.id]
    if (!status) {
      stats.notStarted++
    } else if (status.status === 'completed') {
      stats.completed++
    } else if (status.status === 'failed' || status.status === 'partial') {
      stats.failed++
    } else {
      stats.pending++
    }
  }
  
  return stats
})

const columns = [
  {
    title: '章节',
    dataIndex: 'chapterNumber',
    key: 'chapterNumber',
    width: 80,
    align: 'center',
  },
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
  },
  {
    title: '字数',
    dataIndex: 'wordCount',
    key: 'wordCount',
    width: 100,
    align: 'center',
  },
  {
    title: '后处理状态',
    key: 'postProcessStatus',
    width: 120,
    align: 'center',
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    align: 'center',
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
    align: 'center',
  },
]

// 加载章节后处理状态
const loadPostProcessStatus = async () => {
  for (const chapter of props.chapters) {
    try {
      const status = await getChapterPostProcessStatus(chapter.id)
      postProcessStatusMap.value[chapter.id] = status
    } catch (err) {
      console.warn(`获取章节 ${chapter.id} 后处理状态失败:`, err)
    }
  }
}

// 批量触发后处理
const handleBatchPostProcess = async () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要处理的章节')
    return
  }
  
  batchProcessing.value = true
  
  try {
    // 创建批量处理任务
    const taskData = {
      type: TASK_TYPES.BATCH_CHAPTER_PROCESS,
      novelId: props.novelId,
      data: {
        novelId: props.novelId,
        chapterIds: selectedRowKeys.value
      }
    }
    const taskId = await createTask(taskData)
    
    // 发送事件通知自动执行
    eventBus.emit(EVENTS.TASK_CREATED, { id: taskId, ...taskData })
    
    message.success(`已创建批量后处理任务，共 ${selectedRowKeys.value.length} 章`)
    
    // 清空选择
    selectedRowKeys.value = []
    
    // 刷新状态
    await loadPostProcessStatus()
  } catch (err) {
    console.error('创建批量任务失败:', err)
    message.error('创建任务失败：' + err.message)
  } finally {
    batchProcessing.value = false
  }
}

// 单个章节触发后处理
const handlePostProcess = async (record) => {
  try {
    const taskData = {
      type: TASK_TYPES.CHAPTER_POST_PROCESS,
      novelId: props.novelId,
      chapterId: record.id,
      chapterNumber: record.chapterNumber,
      data: {
        novelId: props.novelId,
        chapterId: record.id,
        chapterNumber: record.chapterNumber
      }
    }
    const taskId = await createTask(taskData)
    
    // 发送事件通知自动执行
    eventBus.emit(EVENTS.TASK_CREATED, { id: taskId, ...taskData })
    
    message.success(`已为第${record.chapterNumber}章创建后处理任务`)
    
    // 刷新状态
    const status = await getChapterPostProcessStatus(record.id)
    postProcessStatusMap.value[record.id] = status
  } catch (err) {
    console.error('创建任务失败:', err)
    message.error('创建任务失败：' + err.message)
  }
}

const handleView = (record) => {
  emit('view', record)
}

const handleDelete = (record) => {
  emit('delete', record)
}

function handleTaskStatusEvent(task) {
  if (!task?.chapterId) return
  if (!props.chapters.some(chapter => chapter.id === task.chapterId)) return
  loadPostProcessStatus()
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 获取状态标签颜色
const getStatusColor = (status) => {
  switch (status) {
    case 'completed': return 'success'
    case 'pending': return 'processing'
    case 'running': return 'processing'
    case 'failed': return 'error'
    case 'partial': return 'warning'
    default: return 'default'
  }
}

// 获取状态显示文字
const getStatusText = (status) => {
  if (!status) return '未触发'
  return status.message || '未知'
}

// 监听章节列表变化
watch(() => props.chapters, () => {
  loadPostProcessStatus()
}, { immediate: true })

onMounted(() => {
  loadPostProcessStatus()
  eventBus.on(EVENTS.TASK_CREATED, handleTaskStatusEvent)
  eventBus.on(EVENTS.TASK_STATUS_CHANGED, handleTaskStatusEvent)
  eventBus.on(EVENTS.TASK_EXECUTED, handleTaskStatusEvent)
  eventBus.on(EVENTS.TASK_FAILED, handleTaskStatusEvent)
})

onUnmounted(() => {
  eventBus.off(EVENTS.TASK_CREATED, handleTaskStatusEvent)
  eventBus.off(EVENTS.TASK_STATUS_CHANGED, handleTaskStatusEvent)
  eventBus.off(EVENTS.TASK_EXECUTED, handleTaskStatusEvent)
  eventBus.off(EVENTS.TASK_FAILED, handleTaskStatusEvent)
})
</script>

<template>
  <div class="chapter-list">
    <!-- 批量操作栏 -->
    <div class="batch-actions" v-if="hasSelection">
      <div class="selection-info">
        已选择 <strong>{{ selectedRowKeys.length }}</strong> 章
      </div>
      <a-space>
        <a-button 
          type="primary" 
          :loading="batchProcessing"
          @click="handleBatchPostProcess"
        >
          批量后处理
        </a-button>
        <a-button @click="selectedRowKeys = []">取消选择</a-button>
      </a-space>
    </div>

    <!-- 后处理统计 -->
    <div class="post-process-stats">
      <a-space :size="16">
        <span>后处理统计：</span>
        <a-tag color="success">已完成 {{ postProcessStats.completed }}</a-tag>
        <a-tag color="processing">处理中 {{ postProcessStats.pending }}</a-tag>
        <a-tag color="error">失败 {{ postProcessStats.failed }}</a-tag>
        <a-tag color="default">未触发 {{ postProcessStats.notStarted }}</a-tag>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="chapters"
      :loading="loading"
      :pagination="{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 章`,
      }"
      :row-selection="rowSelection"
      row-key="id"
      class="chapter-table"
    >
      <template #bodyCell="{ column, record }">
        <!-- 章节序号 -->
        <template v-if="column.key === 'chapterNumber'">
          <span class="chapter-number">第{{ record.chapterNumber }}章</span>
        </template>

        <!-- 标题 -->
        <template v-else-if="column.key === 'title'">
          <span class="chapter-title">{{ record.title }}</span>
        </template>

        <!-- 字数 -->
        <template v-else-if="column.key === 'wordCount'">
          <span class="word-count">{{ record.wordCount?.toLocaleString() || 0 }} 字</span>
        </template>

        <!-- 后处理状态 -->
        <template v-else-if="column.key === 'postProcessStatus'">
          <a-tooltip 
            v-if="postProcessStatusMap[record.id]" 
            :title="postProcessStatusMap[record.id].message"
          >
            <a-tag :color="getStatusColor(postProcessStatusMap[record.id]?.status)">
              {{ getStatusText(postProcessStatusMap[record.id]) }}
            </a-tag>
          </a-tooltip>
          <a-tag v-else color="default">未触发</a-tag>
        </template>

        <!-- 创建时间 -->
        <template v-else-if="column.key === 'createdAt'">
          <span class="create-time">{{ formatDate(record.createdAt) }}</span>
        </template>

        <!-- 操作 -->
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="handleView(record)">
              查看
            </a-button>
            <a-button 
              type="link" 
              size="small" 
              @click="handlePostProcess(record)"
              :disabled="postProcessStatusMap[record.id]?.status === 'running'"
            >
              后处理
            </a-button>
            <a-button type="link" size="small" danger @click="handleDelete(record)">
              删除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<style scoped>
.chapter-list {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  border-bottom: 1px solid var(--border-color);
}

.selection-info {
  color: var(--text-secondary);
}

.selection-info strong {
  color: var(--primary-color);
  font-size: 16px;
}

.post-process-stats {
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.chapter-table :deep(.ant-table-thead > tr > th) {
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 600;
}

.chapter-number {
  font-weight: 500;
  color: var(--primary-color);
}

.chapter-title {
  color: var(--text-primary);
}

.word-count {
  color: var(--text-secondary);
}

.create-time {
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
