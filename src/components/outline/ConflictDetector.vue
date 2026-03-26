<script setup>
import { computed } from 'vue'
import {
  WarningOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  conflicts: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['refresh'])

// 按严重程度分组
const conflictsBySeverity = computed(() => {
  const high = props.conflicts.filter(c => c.severity === 'high')
  const medium = props.conflicts.filter(c => c.severity === 'medium')
  const low = props.conflicts.filter(c => c.severity === 'low')
  return { high, medium, low }
})

// 按类型分组
const conflictsByType = computed(() => {
  const grouped = {}
  props.conflicts.forEach(c => {
    if (!grouped[c.type]) {
      grouped[c.type] = []
    }
    grouped[c.type].push(c)
  })
  return grouped
})

// 获取严重程度标签
const getSeverityTag = (severity) => {
  const tags = {
    high: { color: 'red', text: '严重', icon: ExclamationCircleOutlined },
    medium: { color: 'orange', text: '中等', icon: WarningOutlined },
    low: { color: 'default', text: '轻微', icon: InfoCircleOutlined }
  }
  return tags[severity] || tags.low
}

// 获取类型标签
const getTypeTag = (type) => {
  const tags = {
    timeline: { color: 'blue', text: '时间线冲突' },
    character: { color: 'green', text: '角色冲突' },
    plot: { color: 'purple', text: '剧情冲突' },
    chapter: { color: 'cyan', text: '章节冲突' }
  }
  return tags[type] || { color: 'default', text: '未知类型' }
}

// 获取严重程度图标
const getSeverityIcon = (severity) => {
  const tag = getSeverityTag(severity)
  return tag.icon
}
</script>

<template>
  <div class="conflict-detector">
    <!-- 概览 -->
    <div class="overview">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-card size="small" :class="['stat-card', { warning: conflictsBySeverity.high.length > 0 }]">
            <a-statistic title="严重问题" :value="conflictsBySeverity.high.length">
              <template #prefix>
                <ExclamationCircleOutlined />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small" class="stat-card">
            <a-statistic title="中等问题" :value="conflictsBySeverity.medium.length">
              <template #prefix>
                <WarningOutlined />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small" class="stat-card">
            <a-statistic title="轻微问题" :value="conflictsBySeverity.low.length">
              <template #prefix>
                <InfoCircleOutlined />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small" class="stat-card">
            <a-statistic title="总计" :value="conflicts.length" />
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span v-if="conflicts.length === 0" class="success-message">
          未检测到冲突问题
        </span>
        <span v-else class="warning-message">
          检测到 {{ conflicts.length }} 个潜在问题
        </span>
      </div>
      <div class="toolbar-right">
        <a-button @click="emit('refresh')">
          <template #icon><ReloadOutlined /></template>
          重新检测
        </a-button>
      </div>
    </div>

    <!-- 冲突列表 -->
    <div v-if="conflicts.length === 0" class="empty-state">
      <a-result
        status="success"
        title="未检测到冲突"
        sub-title="您的大纲结构完整，没有发现明显的逻辑矛盾"
      />
    </div>

    <template v-else>
      <!-- 按类型分组显示 -->
      <div class="conflict-groups">
        <div
          v-for="(typeConflicts, type) in conflictsByType"
          :key="type"
          class="conflict-group"
        >
          <div class="group-header">
            <a-tag :color="getTypeTag(type).color" class="type-tag">
              {{ getTypeTag(type).text }}
            </a-tag>
            <span class="count">{{ typeConflicts.length }} 个问题</span>
          </div>

          <div class="conflict-list">
            <div
              v-for="(conflict, index) in typeConflicts"
              :key="index"
              class="conflict-item"
              :class="['severity-' + conflict.severity]"
            >
              <div class="conflict-header">
                <component
                  :is="getSeverityIcon(conflict.severity)"
                  class="severity-icon"
                  :class="'severity-' + conflict.severity"
                />
                <span class="conflict-message">{{ conflict.message }}</span>
                <a-tag :color="getSeverityTag(conflict.severity).color" size="small">
                  {{ getSeverityTag(conflict.severity).text }}
                </a-tag>
              </div>

              <div v-if="conflict.details" class="conflict-details">
                <!-- 建议信息 -->
                <p v-if="conflict.details.suggestion" class="suggestion">
                  <strong>建议：</strong>{{ conflict.details.suggestion }}
                </p>

                <!-- 涉及的事件 -->
                <p v-if="conflict.details.event1 && conflict.details.event2" class="events">
                  <strong>涉及事件：</strong>
                  {{ conflict.details.event1 }} → {{ conflict.details.event2 }}
                </p>

                <!-- 涉及的角色 -->
                <p v-if="conflict.details.characterId" class="character">
                  <strong>涉及角色ID：</strong>{{ conflict.details.characterId }}
                </p>

                <!-- 章节信息 -->
                <p v-if="conflict.details.chapter" class="chapter">
                  <strong>章节：</strong>第{{ conflict.details.chapter }}章
                </p>

                <!-- 事件数量 -->
                <p v-if="conflict.details.eventCount" class="event-count">
                  <strong>事件数量：</strong>{{ conflict.details.eventCount }}
                  <span v-if="conflict.details.average">
                    （平均：{{ conflict.details.average }}）
                  </span>
                </p>

                <!-- 其他详情 -->
                <div v-if="conflict.details.events" class="related-events">
                  <strong>相关事件ID：</strong>
                  <span>{{ conflict.details.events.join(', ') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 帮助提示 -->
    <div class="help-section">
      <a-alert
        type="info"
        show-icon
      >
        <template #message>
          <strong>冲突检测说明</strong>
        </template>
        <template #description>
          <ul>
            <li><strong>时间线冲突</strong>：检测事件顺序与章节分配不一致、角色状态冲突等问题</li>
            <li><strong>角色冲突</strong>：检测角色引用缺失、角色事件过于集中等问题</li>
            <li><strong>剧情冲突</strong>：检测主线缺失、支线未闭合、事件依赖错误等问题</li>
            <li><strong>章节冲突</strong>：检测章节事件分配不均、事件分配到未创建章节等问题</li>
          </ul>
        </template>
      </a-alert>
    </div>
  </div>
</template>

<style scoped>
.conflict-detector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview {
  margin-bottom: 8px;
}

.stat-card {
  text-align: center;
}

.stat-card.warning {
  border: 1px solid #f5222d;
  background: rgba(245, 34, 45, 0.05);
}

.stat-card :deep(.ant-statistic-title) {
  font-size: 13px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.success-message {
  color: #52c41a;
  font-weight: 500;
}

.warning-message {
  color: #faad14;
  font-weight: 500;
}

.empty-state {
  padding: 40px 0;
}

.conflict-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.conflict-group {
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.type-tag {
  font-size: 13px;
}

.count {
  color: var(--text-secondary);
  font-size: 13px;
}

.conflict-list {
  padding: 8px;
}

.conflict-item {
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 3px solid;
}

.conflict-item:last-child {
  margin-bottom: 0;
}

.conflict-item.severity-high {
  background: rgba(245, 34, 45, 0.05);
  border-left-color: #f5222d;
}

.conflict-item.severity-medium {
  background: rgba(250, 173, 20, 0.05);
  border-left-color: #faad14;
}

.conflict-item.severity-low {
  background: rgba(0, 0, 0, 0.02);
  border-left-color: #d9d9d9;
}

.conflict-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.severity-icon {
  font-size: 16px;
}

.severity-icon.severity-high {
  color: #f5222d;
}

.severity-icon.severity-medium {
  color: #faad14;
}

.severity-icon.severity-low {
  color: #8c8c8c;
}

.conflict-message {
  flex: 1;
  font-weight: 500;
}

.conflict-details {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color);
  font-size: 13px;
  color: var(--text-secondary);
}

.conflict-details p {
  margin: 4px 0;
}

.suggestion {
  color: var(--text-primary);
}

.help-section {
  margin-top: 8px;
}

.help-section ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.help-section li {
  margin-bottom: 4px;
}
</style>
