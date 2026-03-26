<script setup>
import { ref, computed } from 'vue'
import { DragOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  plotLines: {
    type: Array,
    default: () => []
  },
  characters: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'addPlotLine',
  'editPlotLine',
  'deletePlotLine',
  'addEvent',
  'editEvent',
  'deleteEvent'
])

// 拖拽排序状态
const localPlotLines = ref([])
const dragEnabled = ref(false)
const draggedIndex = ref(null)

// 监听props变化更新本地数据
const updateLocalPlotLines = () => {
  localPlotLines.value = [...props.plotLines]
}

// 拖拽开始
const handleDragStart = (index) => {
  if (!dragEnabled.value) return
  draggedIndex.value = index
}

// 拖拽结束
const handleDragEnd = () => {
  draggedIndex.value = null
}

// 拖拽经过
const handleDragOver = (e, index) => {
  if (!dragEnabled.value || draggedIndex.value === null) return
  e.preventDefault()
  if (draggedIndex.value !== index) {
    const items = [...localPlotLines.value]
    const draggedItem = items[draggedIndex.value]
    items.splice(draggedIndex.value, 1)
    items.splice(index, 0, draggedItem)
    localPlotLines.value = items
    draggedIndex.value = index
  }
}

// 类型标签颜色
const getTypeColor = (type) => {
  return type === 'main' ? 'blue' : 'green'
}

const getTypeLabel = (type) => {
  return type === 'main' ? '主线' : '支线'
}

// 状态标签颜色
const getStatusColor = (status) => {
  const colors = {
    active: 'processing',
    completed: 'success',
    paused: 'warning'
  }
  return colors[status] || 'default'
}

const getStatusLabel = (status) => {
  const labels = {
    active: '进行中',
    completed: '已完成',
    paused: '暂停'
  }
  return labels[status] || status
}

// 重要性颜色
const getImportanceColor = (importance) => {
  const colors = {
    high: 'red',
    medium: 'orange',
    low: 'default'
  }
  return colors[importance] || 'default'
}

// 获取角色名称
const getCharacterName = (characterId) => {
  const character = props.characters.find(c => c.id === characterId)
  return character?.name || '未知角色'
}

// 初始化
updateLocalPlotLines()

// 监听props变化
import { watch } from 'vue'
watch(() => props.plotLines, updateLocalPlotLines, { deep: true })
</script>

<template>
  <div class="plot-line-view">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <a-switch
          v-model:checked="dragEnabled"
          checked-children="拖拽模式"
          un-checked-children="查看模式"
        />
      </div>
      <div class="toolbar-right">
        <a-button type="primary" @click="emit('addPlotLine')">
          <template #icon><PlusOutlined /></template>
          添加剧情线
        </a-button>
      </div>
    </div>

    <!-- 剧情线列表 -->
    <div v-if="plotLines.length === 0" class="empty-state">
      <a-empty description="暂无剧情线，点击上方按钮添加">
        <a-button type="primary" @click="emit('addPlotLine')">
          创建第一条剧情线
        </a-button>
      </a-empty>
    </div>

    <div v-else class="plot-line-list">
      <div
        v-for="(plotLine, index) in localPlotLines"
        :key="plotLine.id"
        class="plot-line-card"
        :style="{ borderLeftColor: plotLine.color }"
        :draggable="dragEnabled"
        @dragstart="handleDragStart(index)"
        @dragend="handleDragEnd"
        @dragover="handleDragOver($event, index)"
      >
        <!-- 剧情线头部 -->
        <div class="plot-line-header">
          <div class="header-left">
            <DragOutlined v-if="dragEnabled" class="drag-handle" />
            <h3 class="plot-line-name">{{ plotLine.name }}</h3>
            <a-tag :color="getTypeColor(plotLine.type)">
              {{ getTypeLabel(plotLine.type) }}
            </a-tag>
            <a-tag :color="getStatusColor(plotLine.status)">
              {{ getStatusLabel(plotLine.status) }}
            </a-tag>
          </div>
          <div class="header-actions">
            <a-button type="link" size="small" @click="emit('editPlotLine', plotLine)">
              <EditOutlined /> 编辑
            </a-button>
            <a-button type="link" size="small" danger @click="emit('deletePlotLine', plotLine)">
              <DeleteOutlined /> 删除
            </a-button>
          </div>
        </div>

        <!-- 剧情线描述 -->
        <p v-if="plotLine.description" class="plot-line-description">
          {{ plotLine.description }}
        </p>

        <!-- 事件列表 -->
        <div class="events-section">
          <div class="events-header">
            <span class="events-title">事件节点 ({{ plotLine.events?.length || 0 }})</span>
            <a-button
              type="link"
              size="small"
              @click="emit('addEvent', plotLine.id)"
            >
              <PlusOutlined /> 添加事件
            </a-button>
          </div>

          <div v-if="!plotLine.events || plotLine.events.length === 0" class="no-events">
            暂无事件节点
          </div>

          <div v-else class="events-timeline">
            <div
              v-for="event in plotLine.events"
              :key="event.id"
              class="event-item"
              :class="{ 'is-resolution': event.isResolution }"
            >
              <div class="event-marker" :style="{ backgroundColor: plotLine.color }" />
              <div class="event-content">
                <div class="event-header">
                  <span class="event-title">{{ event.title }}</span>
                  <a-tag v-if="event.plannedChapter" color="blue">
                    第{{ event.plannedChapter }}章
                  </a-tag>
                  <a-tag :color="getImportanceColor(event.importance)">
                    {{ event.importance === 'high' ? '重要' : event.importance === 'medium' ? '一般' : '次要' }}
                  </a-tag>
                  <a-tag v-if="event.isResolution" color="purple">结局</a-tag>
                </div>
                <p v-if="event.description" class="event-description">
                  {{ event.description }}
                </p>
                <div v-if="event.characterIds?.length > 0" class="event-characters">
                  <span class="label">涉及角色：</span>
                  <a-tag v-for="id in event.characterIds" :key="id" size="small">
                    {{ getCharacterName(id) }}
                  </a-tag>
                </div>
                <div class="event-actions">
                  <a-button type="link" size="small" @click="emit('editEvent', plotLine.id, event)">
                    编辑
                  </a-button>
                  <a-button type="link" size="small" danger @click="emit('deleteEvent', event)">
                    删除
                  </a-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plot-line-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
}

.plot-line-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plot-line-card {
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  border-left-width: 4px;
  padding: 16px;
  transition: box-shadow 0.2s;
}

.plot-line-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.plot-line-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drag-handle {
  cursor: move;
  color: var(--text-secondary);
}

.plot-line-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.plot-line-description {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 16px 0;
}

.events-section {
  border-top: 1px solid var(--border-color);
  padding-top: 16px;
}

.events-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.events-title {
  font-weight: 500;
  color: var(--text-secondary);
}

.no-events {
  color: var(--text-tertiary);
  font-size: 14px;
  text-align: center;
  padding: 20px 0;
}

.events-timeline {
  position: relative;
  padding-left: 24px;
}

.events-timeline::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-color);
}

.event-item {
  position: relative;
  padding: 12px 0;
  padding-left: 16px;
}

.event-item.is-resolution {
  background: linear-gradient(to right, rgba(114, 46, 209, 0.1), transparent);
  border-radius: 4px;
}

.event-marker {
  position: absolute;
  left: -20px;
  top: 16px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 2px var(--bg-primary);
}

.event-content {
  background: var(--bg-secondary);
  border-radius: 6px;
  padding: 12px;
}

.event-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.event-title {
  font-weight: 500;
}

.event-description {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.event-characters {
  margin-top: 8px;
  font-size: 12px;
}

.event-characters .label {
  color: var(--text-tertiary);
  margin-right: 4px;
}

.event-actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color);
}
</style>
