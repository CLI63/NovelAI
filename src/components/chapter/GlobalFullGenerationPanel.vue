<script setup>
import { computed, onBeforeUnmount, onMounted, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useGlobalFullNovelGeneration } from '@/composables/useGlobalFullNovelGeneration'
import { useBackgroundTaskPanel } from '@/composables/useBackgroundTaskPanel'
import { eventBus, EVENTS } from '@/utils/eventBus'

const router = useRouter()
const { fullGen, visible, expanded, novelId, canClose, close, restoreLatestTask, syncFromTask } = useGlobalFullNovelGeneration()
const {
  taskTypeNames,
  TASK_STATUS,
  loading: taskLoading,
  recentTasks,
  taskStats,
  statusNames,
  pendingTasks,
  runningTaskIds,
  refreshTasks,
  recoverInterruptedAutoRunnableTasks,
  resumePendingAutoRunnableTasks,
  executeTask,
  executeAllPending,
  scheduleAutoRun,
  removeTask,
  cleanupTasks
} = useBackgroundTaskPanel()

const panelPosition = reactive({
  x: 0,
  y: 0
})

const dragState = reactive({
  dragging: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0
})

const phaseLabel = computed(() => {
  const map = {
    idle: '准备就绪',
    chapters: '生成中',
    completed: '已完成',
    error: '出错',
    paused: '已暂停',
    cancelled: '已取消'
  }
  return map[fullGen.phase] || fullGen.phase
})

const subPhaseLabel = computed(() => {
  const map = {
    generating: 'AI 创作中',
    saving: '保存章节',
    postprocessing: '后处理'
  }
  return map[fullGen.progress.currentPhase] || ''
})

const totalWords = computed(() =>
  fullGen.results.reduce((sum, item) => sum + (item.wordCount || 0), 0)
)

const recentTaskItems = computed(() => recentTasks.value.slice(0, 4))
const hasTaskActivity = computed(() =>
  taskStats.value.pending > 0 || taskStats.value.running > 0 || taskStats.value.failed > 0
)
const panelVisible = computed(() => visible.value || hasTaskActivity.value)
const hasFullGenerationState = computed(() =>
  ['chapters', 'paused', 'completed', 'error', 'cancelled'].includes(fullGen.phase)
)

const summaryText = computed(() => {
  if (taskStats.value.running > 0) return `后台执行中 ${taskStats.value.running} 项`
  if (taskStats.value.pending > 0) return `待处理 ${taskStats.value.pending} 项`
  return '后台任务空闲'
})

const collapsedSummary = computed(() => {
  if (hasFullGenerationState.value) {
    return `${phaseLabel.value} ${fullGen.progress.completedChapters}/${fullGen.progress.totalChapters} 章`
  }
  return summaryText.value
})

const recentChapterSuccessCount = computed(() =>
  fullGen.results.filter(item => item.success).length
)

function clampPosition() {
  const panelWidth = expanded.value ? 388 : 300
  const panelHeight = expanded.value ? 560 : 112
  const minOffset = 12
  const maxX = Math.max(minOffset, window.innerWidth - panelWidth - minOffset)
  const maxY = Math.max(minOffset, window.innerHeight - panelHeight - minOffset)
  panelPosition.x = Math.min(Math.max(minOffset, panelPosition.x), maxX)
  panelPosition.y = Math.min(Math.max(minOffset, panelPosition.y), maxY)
}

function resetPosition() {
  const panelWidth = expanded.value ? 388 : 300
  panelPosition.x = Math.max(12, window.innerWidth - panelWidth - 20)
  panelPosition.y = Math.max(12, window.innerHeight - 140)
  clampPosition()
}

function startDrag(event) {
  if (event.button !== 0) return
  dragState.dragging = true
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  dragState.originX = panelPosition.x
  dragState.originY = panelPosition.y
  window.addEventListener('mousemove', handleDrag)
  window.addEventListener('mouseup', stopDrag)
}

function handleDrag(event) {
  if (!dragState.dragging) return
  panelPosition.x = dragState.originX + event.clientX - dragState.startX
  panelPosition.y = dragState.originY + event.clientY - dragState.startY
  clampPosition()
}

function stopDrag() {
  dragState.dragging = false
  window.removeEventListener('mousemove', handleDrag)
  window.removeEventListener('mouseup', stopDrag)
}

function toggleExpanded() {
  expanded.value = !expanded.value
  clampPosition()
}

function goToReader() {
  if (!novelId.value) return
  router.push(`/reader/${novelId.value}`)
}

async function handleCleanupTasks() {
  const count = await cleanupTasks(7)
  message.success(`已清理 ${count} 个任务`)
}

async function handleRemoveTask(taskId) {
  await removeTask(taskId)
  message.success('任务已删除')
}

async function handleTaskCreated(task) {
  if (task?.type === 'full_novel_generation') {
    syncFromTask(task)
  }
  await refreshTasks()
  scheduleAutoRun(task)
}

async function handleTaskLifecycle(task) {
  await refreshTasks()
  if (task?.type !== 'full_novel_generation') return
  const latestTask = recentTasks.value.find(item => item.id === task.id) || task
  syncFromTask(latestTask)
  await restoreLatestTask()
}

onMounted(async () => {
  resetPosition()
  await recoverInterruptedAutoRunnableTasks()
  await refreshTasks()
  await resumePendingAutoRunnableTasks()
  await restoreLatestTask()
  window.addEventListener('resize', clampPosition)
  eventBus.on(EVENTS.TASK_CREATED, handleTaskCreated)
  eventBus.on(EVENTS.TASK_STATUS_CHANGED, handleTaskLifecycle)
  eventBus.on(EVENTS.TASK_EXECUTED, handleTaskLifecycle)
  eventBus.on(EVENTS.TASK_FAILED, handleTaskLifecycle)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', clampPosition)
  stopDrag()
})

onUnmounted(() => {
  eventBus.off(EVENTS.TASK_CREATED, handleTaskCreated)
  eventBus.off(EVENTS.TASK_STATUS_CHANGED, handleTaskLifecycle)
  eventBus.off(EVENTS.TASK_EXECUTED, handleTaskLifecycle)
  eventBus.off(EVENTS.TASK_FAILED, handleTaskLifecycle)
})
</script>

<template>
  <section
    v-if="panelVisible"
    class="full-gen-global-panel"
    :class="{ expanded, dragging: dragState.dragging }"
    :style="{ left: `${panelPosition.x}px`, top: `${panelPosition.y}px` }"
  >
    <div class="panel-header" @mousedown="startDrag">
      <div class="panel-title">
        <span class="status-dot" :class="fullGen.phase"></span>
        <div class="title-stack">
          <span class="title-text">后台面板</span>
          <span class="title-subtext">{{ collapsedSummary }}</span>
        </div>
        <a-tag
          v-if="hasFullGenerationState"
          class="phase-tag"
          :color="fullGen.phase === 'completed' ? 'success' : fullGen.phase === 'error' ? 'error' : fullGen.phase === 'paused' ? 'warning' : 'processing'"
        >
          {{ phaseLabel }}
        </a-tag>
      </div>
      <div class="panel-actions" @mousedown.stop>
        <a-button type="text" size="small" @click="toggleExpanded">
          {{ expanded ? '收起' : '详情' }}
        </a-button>
        <a-button
          v-if="visible && canClose"
          type="text"
          size="small"
          @click="close"
        >
          关闭
        </a-button>
      </div>
    </div>

    <a-progress
      v-if="hasFullGenerationState"
      class="hero-progress"
      :percent="fullGen.progress.percent"
      size="small"
      :status="fullGen.phase === 'error' ? 'exception' : fullGen.phase === 'completed' ? 'success' : 'active'"
      :format="() => `${fullGen.progress.completedChapters}/${fullGen.progress.totalChapters}章`"
    />

    <div v-if="expanded" class="panel-body">
      <template v-if="hasFullGenerationState">
        <section class="panel-card panel-card-primary">
          <div class="section-header">
            <span class="section-title">全本生成</span>
            <span class="section-caption">{{ subPhaseLabel || phaseLabel }}</span>
          </div>

          <div class="current-line">
            <span>第 {{ fullGen.progress.currentNumber || '-' }} 章</span>
            <span>成功 {{ fullGen.results.filter(item => item.success).length }} 章</span>
          </div>

          <div v-if="fullGen.progress.currentTitle" class="chapter-title">
            {{ fullGen.progress.currentTitle }}
          </div>

          <div v-if="fullGen.progress.currentContent" class="content-preview">
            {{ fullGen.progress.currentContent }}
          </div>

          <div class="metric-grid">
            <div class="metric-card">
              <span class="metric-label">完成进度</span>
              <strong class="metric-value">{{ fullGen.progress.completedChapters }}/{{ fullGen.progress.totalChapters }}</strong>
            </div>
            <div class="metric-card">
              <span class="metric-label">累计字数</span>
              <strong class="metric-value">{{ totalWords.toLocaleString() }}</strong>
            </div>
            <div class="metric-card">
              <span class="metric-label">成功章节</span>
              <strong class="metric-value">{{ recentChapterSuccessCount }}</strong>
            </div>
          </div>

          <a-alert
            v-if="fullGen.phase === 'error' && fullGen.errors.length > 0"
            type="error"
            show-icon
            :message="fullGen.errors[fullGen.errors.length - 1]?.error || '生成失败'"
          />

          <div class="control-row">
            <template v-if="fullGen.phase === 'chapters'">
              <a-button size="small" @click="fullGen.pause">暂停</a-button>
              <a-button size="small" danger @click="fullGen.cancel">取消</a-button>
            </template>
            <template v-else-if="fullGen.phase === 'paused'">
              <a-button size="small" type="primary" @click="fullGen.resume">继续</a-button>
              <a-button size="small" danger @click="fullGen.cancel">取消</a-button>
            </template>
            <a-button
              v-if="fullGen.phase === 'completed'"
              size="small"
              type="primary"
              @click="goToReader"
            >
              去阅读
            </a-button>
          </div>
        </section>
      </template>

      <section class="panel-card task-section">
        <div class="task-section-header">
          <span class="task-section-title">后台任务</span>
          <span class="task-summary">{{ summaryText }}</span>
        </div>

        <div class="task-chips">
          <span class="task-chip pending">待执行 {{ taskStats.pending }}</span>
          <span class="task-chip running">执行中 {{ taskStats.running }}</span>
          <span class="task-chip failed">失败 {{ taskStats.failed }}</span>
        </div>

        <div class="task-actions">
          <a-button size="small" @click="refreshTasks">刷新</a-button>
          <a-button size="small" :disabled="pendingTasks.length === 0" @click="executeAllPending">
            执行待处理
          </a-button>
          <a-button size="small" @click="handleCleanupTasks">
            清理历史
          </a-button>
        </div>

        <a-spin :spinning="taskLoading">
          <div v-if="recentTaskItems.length > 0" class="task-list">
            <div v-for="task in recentTaskItems" :key="task.id" class="task-item">
              <div class="task-main">
                <div class="task-name">{{ taskTypeNames[task.type] || task.type }}</div>
                <div class="task-meta">
                  <span>#{{ task.id }}</span>
                  <span v-if="task.chapterNumber">第{{ task.chapterNumber }}章</span>
                </div>
              </div>
              <div class="task-side">
                <a-tag :color="task.status === TASK_STATUS.COMPLETED ? 'success' : task.status === TASK_STATUS.FAILED ? 'error' : task.status === TASK_STATUS.RUNNING ? 'processing' : 'default'">
                  {{ statusNames[task.status] || task.status }}
                </a-tag>
                <a-button
                  v-if="[TASK_STATUS.PENDING, TASK_STATUS.FAILED].includes(task.status)"
                  type="link"
                  size="small"
                  :loading="runningTaskIds.has(task.id)"
                  @click="executeTask(task)"
                >
                  {{ task.status === TASK_STATUS.FAILED ? '重试' : '执行' }}
                </a-button>
                <a-popconfirm
                  title="确定删除此任务吗？"
                  ok-text="删除"
                  cancel-text="取消"
                  @confirm="handleRemoveTask(task.id)"
                >
                  <a-button
                    v-if="[TASK_STATUS.COMPLETED, TASK_STATUS.FAILED].includes(task.status)"
                    type="link"
                    size="small"
                    danger
                  >
                    删除
                  </a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>
          <div v-else class="task-empty">暂无后台任务</div>
        </a-spin>
      </section>
    </div>
  </section>
</template>

<style scoped>
.full-gen-global-panel {
  position: fixed;
  z-index: 1200;
  width: 300px;
  padding: 12px;
  box-sizing: border-box;
  overflow-x: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.16),
    0 2px 10px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(14px);
  user-select: none;
}

.full-gen-global-panel.expanded {
  width: 388px;
  max-height: 560px;
  overflow-y: auto;
}

.full-gen-global-panel.dragging {
  cursor: grabbing;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  cursor: grab;
}

.panel-title,
.panel-actions,
.current-line,
.control-row {
  display: flex;
  align-items: center;
}

.panel-title {
  min-width: 0;
  gap: 8px;
}

.panel-actions {
  flex-shrink: 0;
  gap: 4px;
}

.title-stack {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.title-text {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
}

.title-subtext {
  max-width: 170px;
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phase-tag {
  margin-inline-end: 0;
  border-radius: 999px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #64748b;
  flex-shrink: 0;
}

.status-dot.chapters {
  background: #0f766e;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.14);
}

.status-dot.paused {
  background: #ca8a04;
}

.status-dot.completed {
  background: #15803d;
}

.status-dot.error,
.status-dot.cancelled {
  background: #dc2626;
}

.hero-progress {
width: 90%;
  margin-bottom: 10px;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
}

.panel-card-primary {
  background:
    linear-gradient(180deg, rgba(236, 253, 245, 0.92) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.section-header,
.metric-grid,
.task-section-header,
.task-actions,
.task-item,
.task-main,
.task-side,
.task-meta,
.task-chips {
  display: flex;
  align-items: center;
}

.section-header,
.task-section-header,
.task-item {
  justify-content: space-between;
}

.section-header,
.task-section-header {
  gap: 8px;
}

.section-title,
.task-section-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.section-caption {
  font-size: 11px;
  color: #64748b;
  text-align: right;
}

.current-line {
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}

.chapter-title {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-preview {
  max-height: 84px;
  overflow: hidden;
  padding: 10px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 10px;
  color: #334155;
  font-size: 12px;
  line-height: 1.6;
}

.metric-grid {
  gap: 8px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-card {
  min-width: 0;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.metric-label {
  display: block;
  margin-bottom: 4px;
  color: #64748b;
  font-size: 11px;
}

.metric-value {
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.control-row {
  justify-content: flex-end;
  gap: 8px;
}

.task-section {
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.92) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.task-summary {
  font-size: 12px;
  color: #64748b;
}

.task-chips {
  gap: 6px;
  flex-wrap: wrap;
}

.task-chip {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.task-chip.pending {
  background: #fff7ed;
  color: #c2410c;
}

.task-chip.running {
  background: #ecfeff;
  color: #0f766e;
}

.task-chip.failed {
  background: #fef2f2;
  color: #b91c1c;
}

.task-actions {
  gap: 6px;
  flex-wrap: wrap;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-item {
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(255, 255, 255, 0.78);
  align-items: flex-start;
}

.task-main {
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.task-name {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
}

.task-meta {
  gap: 8px;
  font-size: 11px;
  color: #64748b;
  flex-wrap: wrap;
}

.task-side {
  gap: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.task-empty {
  padding: 12px 10px;
  border-radius: 10px;
  border: 1px dashed rgba(148, 163, 184, 0.32);
  background: rgba(255, 255, 255, 0.7);
  color: #64748b;
  font-size: 12px;
  text-align: center;
}

@media (max-width: 768px) {
  .full-gen-global-panel,
  .full-gen-global-panel.expanded {
    width: min(356px, calc(100vw - 24px));
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .task-item,
  .task-section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .task-side {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
