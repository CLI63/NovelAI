<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 当前阶段: idle | chapters | completed | error | paused | cancelled */
  phase: { type: String, default: 'idle' },
  /** 进度详情 */
  progress: { type: Object, default: () => ({
    totalChapters: 0, completedChapters: 0, currentNumber: 0,
    currentTitle: '', currentContent: '', currentPhase: '', percent: 0
  }) },
  /** 错误列表 */
  errors: { type: Array, default: () => [] },
  /** 生成结果 */
  results: { type: Array, default: () => [] },
  /** 是否暂停 */
  paused: { type: Boolean, default: false }
})

const emit = defineEmits(['pause', 'resume', 'cancel'])

// ===== 计算属性 =====

/** 阶段显示文本 */
const phaseLabel = computed(() => {
  const map = {
    idle: '准备就绪',
    chapters: '逐章生成中',
    completed: '全本生成完成',
    error: '生成出错',
    paused: '已暂停',
    cancelled: '已取消'
  }
  return map[props.phase] || props.phase
})

/** 当前阶段子状态文本 */
const subPhaseLabel = computed(() => {
  const p = props.progress.currentPhase
  const map = {
    generating: 'AI 生成中...',
    saving: '保存章节中...',
    postprocessing: '后处理中...'
  }
  return map[p] || ''
})

/** 是否正在运行中 */
const isRunning = computed(() =>
  props.phase === 'chapters'
)

/** 是否已完成（包括取消/出错） */
const isFinished = computed(() =>
  ['completed', 'error', 'cancelled'].includes(props.phase)
)

/** 成功生成的章节数 */
const successCount = computed(() =>
  props.results.filter(r => r.success).length
)

/** 失败章节数 */
const failedCount = computed(() =>
  props.results.filter(r => !r.success).length
)

/** 总字数 */
const totalWords = computed(() =>
  props.results.reduce((sum, r) => sum + (r.wordCount || 0), 0)
)

/** 是否有错误可显示 */
const hasErrors = computed(() => props.errors.length > 0)

/** 最近的错误 */
const latestError = computed(() =>
  props.errors.length > 0 ? props.errors[props.errors.length - 1] : null
)
</script>

<template>
  <div class="full-generation-progress">
    <!-- 整体进度 -->
    <div class="section overall-progress">
      <div class="progress-header">
        <span class="phase-badge" :class="phase">
          {{ phaseLabel }}
        </span>
        <span class="progress-text">
          {{ progress.completedChapters }} / {{ progress.totalChapters }} 章
        </span>
      </div>
      <a-progress
        :percent="progress.percent"
        :stroke-color="{
          '0%': '#667eea',
          '100%': '#764ba2'
        }"
        :status="phase === 'error' ? 'exception' : phase === 'paused' ? 'normal' : 'active'"
      />
    </div>

    <!-- 当前章节生成状态 -->
    <template v-if="isRunning || phase === 'paused'">
      <div class="section current-chapter">
        <div class="section-title">当前章节</div>
        <div class="chapter-info">
          <a-tag color="blue">第 {{ progress.currentNumber }} 章</a-tag>
          <span v-if="progress.currentTitle" class="chapter-title">
            《{{ progress.currentTitle }}》
          </span>
          <span v-if="subPhaseLabel" class="sub-phase">{{ subPhaseLabel }}</span>
        </div>

        <!-- 内容预览 -->
        <a-textarea
          v-if="progress.currentContent"
          :value="progress.currentContent"
          :auto-size="{ minRows: 4, maxRows: 8 }"
          readonly
          class="content-preview"
          placeholder="内容生成中..."
        />

        <!-- 加载动画 -->
        <div v-if="!progress.currentContent && isRunning" class="generating-animation">
          <a-spin size="small" />
          <span class="generating-text">AI 正在创作第 {{ progress.currentNumber }} 章...</span>
        </div>
      </div>
    </template>

    <!-- 生成结果汇总 -->
    <template v-if="results.length > 0">
      <div class="section results-summary">
        <div class="section-title">
          生成结果
          <a-tag color="success" style="margin-left: 8px">
            {{ successCount }} 章成功
          </a-tag>
          <a-tag v-if="failedCount > 0" color="error">
            {{ failedCount }} 章失败
          </a-tag>
        </div>
        <a-table
          :data-source="results"
          :columns="[
            { title: '章节', dataIndex: 'chapter', key: 'chapter', width: 80 },
            { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
            { title: '字数', dataIndex: 'wordCount', key: 'wordCount', width: 100, align: 'right' },
            { title: '状态', dataIndex: 'success', key: 'success', width: 80 }
          ]"
          :pagination="false"
          size="small"
          :scroll="{ y: 200 }"
          row-key="chapter"
          class="results-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'wordCount'">
              {{ record.wordCount ? record.wordCount.toLocaleString() : '-' }}
            </template>
            <template v-else-if="column.key === 'success'">
              <a-tag v-if="record.success" color="success">成功</a-tag>
              <a-tag v-else color="error">失败</a-tag>
            </template>
          </template>
        </a-table>
      </div>
    </template>

    <!-- 错误信息 -->
    <a-alert
      v-if="hasErrors && isFinished"
      type="error"
      show-icon
      :message="`共 ${errors.length} 个错误`"
      :description="latestError ? `最近错误：第${latestError.chapter}章 - ${latestError.error}` : ''"
      class="error-alert"
    />

    <!-- 完成状态 -->
    <a-alert
      v-if="phase === 'completed'"
      type="success"
      show-icon
      message="全本生成完成！"
      :description="`共生成 ${successCount} 章，总字数 ${totalWords.toLocaleString()} 字`"
      class="complete-alert"
    />

    <!-- 总字数统计 -->
    <div v-if="totalWords > 0" class="total-stats">
      总字数：<strong>{{ totalWords.toLocaleString() }}</strong> 字 |
      平均每章：<strong>{{ Math.round(totalWords / Math.max(successCount, 1)).toLocaleString() }}</strong> 字
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <template v-if="isRunning">
        <a-button @click="emit('pause')">
          <template #icon><span>⏸</span></template>
          暂停
        </a-button>
        <a-button type="primary" danger @click="emit('cancel')">
          <template #icon><span>⏹</span></template>
          取消生成
        </a-button>
      </template>
      <template v-else-if="phase === 'paused'">
        <a-button type="primary" @click="emit('resume')">
          <template #icon><span>▶</span></template>
          继续生成
        </a-button>
        <a-button danger @click="emit('cancel')">
          <template #icon><span>⏹</span></template>
          取消
        </a-button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.full-generation-progress {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section {
  padding: 0;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.phase-badge {
  padding: 2px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.phase-badge.chapters {
  background: #e6f7ff;
  color: #1890ff;
}

.phase-badge.completed {
  background: #f6ffed;
  color: #52c41a;
}

.phase-badge.error {
  background: #fff2f0;
  color: #ff4d4f;
}

.phase-badge.paused {
  background: #fff7e6;
  color: #fa8c16;
}

.phase-badge.cancelled {
  background: #f5f5f5;
  color: #999;
}

.phase-badge.idle {
  background: #f0f0f0;
  color: #666;
}

.progress-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.current-chapter {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.chapter-title {
  font-weight: 500;
  color: var(--text-primary);
}

.sub-phase {
  font-size: 12px;
  color: var(--text-secondary);
}

.content-preview {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.generating-animation {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: var(--text-secondary);
}

.generating-text {
  font-size: 13px;
}

.results-table {
  margin-top: 8px;
}

.total-stats {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.error-alert,
.complete-alert {
  margin: 0;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 8px;
}
</style>
