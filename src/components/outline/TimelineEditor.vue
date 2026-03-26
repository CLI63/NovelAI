<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  plotLines: {
    type: Array,
    default: () => []
  },
  novelId: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['editEvent'])

// 时间线配置
const timelineRef = ref(null)
const zoomLevel = ref(1)
const scrollPosition = ref(0)
const selectedEvent = ref(null)

// 计算所有事件
const allEvents = computed(() => {
  const events = []
  props.plotLines.forEach(pl => {
    if (pl.events) {
      pl.events.forEach(e => {
        events.push({
          ...e,
          plotLineId: pl.id,
          plotLineName: pl.name,
          plotLineColor: pl.color,
          plotLineType: pl.type
        })
      })
    }
  })
  return events.sort((a, b) => (a.plannedChapter || 0) - (b.plannedChapter || 0))
})

// 计算章节范围
const chapterRange = computed(() => {
  if (allEvents.value.length === 0) return { min: 1, max: 50 }
  const chapters = allEvents.value.map(e => e.plannedChapter).filter(Boolean)
  if (chapters.length === 0) return { min: 1, max: 50 }
  return {
    min: Math.max(1, Math.min(...chapters) - 5),
    max: Math.max(...chapters) + 10
  }
})

// 计算时间线宽度
const timelineWidth = computed(() => {
  const totalChapters = chapterRange.value.max - chapterRange.value.min + 1
  return totalChapters * 80 * zoomLevel.value
})

// 获取事件的左侧位置
const getEventLeft = (chapter) => {
  const chapterIndex = (chapter || chapterRange.value.min) - chapterRange.value.min
  return chapterIndex * 80 * zoomLevel.value
}

// 获取事件的垂直位置（避免重叠）
const getEventTop = (event, index) => {
  // 按章节分组，同一章节的事件垂直排列
  const sameChapterEvents = allEvents.value.filter(
    e => e.plannedChapter === event.plannedChapter
  )
  const eventIndex = sameChapterEvents.findIndex(e => e.id === event.id)
  return eventIndex * 70
}

// 缩放控制
const handleZoomIn = () => {
  zoomLevel.value = Math.min(2, zoomLevel.value + 0.2)
}

const handleZoomOut = () => {
  zoomLevel.value = Math.max(0.5, zoomLevel.value - 0.2)
}

const handleZoomReset = () => {
  zoomLevel.value = 1
}

// 滚动到指定章节
const scrollToChapter = (chapter) => {
  if (!timelineRef.value) return
  const left = getEventLeft(chapter) - timelineRef.value.clientWidth / 2
  timelineRef.value.scrollLeft = Math.max(0, left)
}

// 点击事件
const handleEventClick = (event) => {
  selectedEvent.value = selectedEvent.value?.id === event.id ? null : event
}

// 获取事件类型图标
const getEventTypeIcon = (event) => {
  if (event.isResolution) return '🏁'
  if (event.importance === 'high') return '⭐'
  return '📍'
}

// 导航到上一章/下一章
const navigateChapter = (direction) => {
  const chapters = Array.from(
    { length: chapterRange.value.max - chapterRange.value.min + 1 },
    (_, i) => chapterRange.value.min + i
  )
  const currentChapter = Math.round(
    scrollPosition.value / (80 * zoomLevel.value) + chapterRange.value.min
  )
  const currentIndex = chapters.indexOf(currentChapter)
  const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
  if (targetIndex >= 0 && targetIndex < chapters.length) {
    scrollToChapter(chapters[targetIndex])
  }
}

// 监听滚动
const handleScroll = (e) => {
  scrollPosition.value = e.target.scrollLeft
}

// 按剧情线分组的事件（用于泳道视图）
const eventsByPlotLine = computed(() => {
  const grouped = {}
  props.plotLines.forEach(pl => {
    grouped[pl.id] = {
      ...pl,
      events: pl.events || []
    }
  })
  return grouped
})
</script>

<template>
  <div class="timeline-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <a-button-group>
          <a-button @click="handleZoomOut" :disabled="zoomLevel <= 0.5">
            缩小
          </a-button>
          <a-button @click="handleZoomReset">
            {{ Math.round(zoomLevel * 100) }}%
          </a-button>
          <a-button @click="handleZoomIn" :disabled="zoomLevel >= 2">
            放大
          </a-button>
        </a-button-group>
      </div>
      <div class="toolbar-right">
        <a-button-group>
          <a-button @click="navigateChapter('prev')">上一章</a-button>
          <a-button @click="navigateChapter('next')">下一章</a-button>
        </a-button-group>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="allEvents.length === 0" class="empty-state">
      <a-empty description="暂无事件，请先在剧情线中添加事件节点" />
    </div>

    <!-- 时间线容器 -->
    <div v-else class="timeline-container" ref="timelineRef" @scroll="handleScroll">
      <div class="timeline-content" :style="{ width: timelineWidth + 'px' }">
        <!-- 章节标尺 -->
        <div class="chapter-ruler">
          <div
            v-for="chapter in (chapterRange.max - chapterRange.min + 1)"
            :key="chapter"
            class="chapter-marker"
            :style="{ width: 80 * zoomLevel + 'px' }"
          >
            <span class="chapter-number">第{{ chapterRange.min + chapter - 1 }}章</span>
          </div>
        </div>

        <!-- 剧情线泳道 -->
        <div class="plot-line-lanes">
          <div
            v-for="plotLine in plotLines"
            :key="plotLine.id"
            class="lane"
            :style="{ borderColor: plotLine.color }"
          >
            <!-- 剧情线名称 -->
            <div class="lane-header" :style="{ backgroundColor: plotLine.color + '20' }">
              <span class="lane-name">{{ plotLine.name }}</span>
              <a-tag size="small" :color="plotLine.type === 'main' ? 'blue' : 'green'">
                {{ plotLine.type === 'main' ? '主线' : '支线' }}
              </a-tag>
            </div>

            <!-- 事件节点 -->
            <div class="lane-content">
              <div
                v-for="event in plotLine.events"
                :key="event.id"
                class="event-node"
                :class="{
                  selected: selectedEvent?.id === event.id,
                  'is-resolution': event.isResolution,
                  'high-importance': event.importance === 'high'
                }"
                :style="{
                  left: getEventLeft(event.plannedChapter) + 'px',
                  borderColor: plotLine.color,
                  backgroundColor: plotLine.color + '15'
                }"
                @click="handleEventClick({ ...event, plotLineId: plotLine.id, plotLineName: plotLine.name, plotLineColor: plotLine.color })"
              >
                <div class="event-icon">{{ getEventTypeIcon(event) }}</div>
                <div class="event-title">{{ event.title }}</div>
                <div v-if="event.plannedChapter" class="event-chapter">
                  第{{ event.plannedChapter }}章
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 事件详情面板 -->
    <div v-if="selectedEvent" class="event-detail-panel">
      <div class="panel-header">
        <span class="panel-title">事件详情</span>
        <a-button type="link" size="small" @click="selectedEvent = null">
          关闭
        </a-button>
      </div>
      <div class="panel-content">
        <div class="detail-item">
          <span class="label">标题：</span>
          <span class="value">{{ selectedEvent.title }}</span>
        </div>
        <div class="detail-item">
          <span class="label">剧情线：</span>
          <a-tag :color="selectedEvent.plotLineColor">{{ selectedEvent.plotLineName }}</a-tag>
        </div>
        <div class="detail-item">
          <span class="label">章节：</span>
          <span class="value">第{{ selectedEvent.plannedChapter || '未指定' }}章</span>
        </div>
        <div class="detail-item">
          <span class="label">重要性：</span>
          <a-tag :color="selectedEvent.importance === 'high' ? 'red' : selectedEvent.importance === 'medium' ? 'orange' : 'default'">
            {{ selectedEvent.importance === 'high' ? '高' : selectedEvent.importance === 'medium' ? '中' : '低' }}
          </a-tag>
        </div>
        <div v-if="selectedEvent.description" class="detail-item">
          <span class="label">描述：</span>
          <p class="description">{{ selectedEvent.description }}</p>
        </div>
        <div v-if="selectedEvent.notes" class="detail-item">
          <span class="label">备注：</span>
          <p class="notes">{{ selectedEvent.notes }}</p>
        </div>
        <div class="detail-actions">
          <a-button type="primary" size="small" @click="emit('editEvent', selectedEvent.plotLineId, selectedEvent)">
            编辑事件
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 600px;
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  background: var(--bg-secondary);
  border-radius: 8px;
  position: relative;
}

.timeline-content {
  min-width: 100%;
  position: relative;
}

.chapter-ruler {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  background: var(--bg-primary);
  border-bottom: 2px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chapter-marker {
  flex-shrink: 0;
  padding: 8px 4px;
  text-align: center;
  border-right: 1px solid var(--border-color);
}

.chapter-number {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.plot-line-lanes {
  display: flex;
  flex-direction: column;
}

.lane {
  position: relative;
  min-height: 80px;
  border-left: 4px solid;
  border-bottom: 1px solid var(--border-color);
}

.lane-header {
  position: sticky;
  left: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
}

.lane-name {
  font-weight: 500;
  font-size: 13px;
}

.lane-content {
  position: relative;
  height: 60px;
}

.event-node {
  position: absolute;
  top: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 2px solid;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  min-width: 60px;
  max-width: 120px;
}

.event-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.event-node.selected {
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.3);
}

.event-node.is-resolution {
  border-style: dashed;
}

.event-node.high-importance {
  border-width: 3px;
}

.event-icon {
  font-size: 12px;
  margin-bottom: 2px;
}

.event-title {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-chapter {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.event-detail-panel {
  position: absolute;
  right: 16px;
  top: 80px;
  width: 280px;
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 20;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-weight: 600;
}

.panel-content {
  padding: 16px;
}

.detail-item {
  margin-bottom: 12px;
}

.detail-item .label {
  color: var(--text-secondary);
  font-size: 12px;
  display: block;
  margin-bottom: 4px;
}

.detail-item .value {
  font-size: 14px;
}

.detail-item .description,
.detail-item .notes {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
  line-height: 1.5;
}

.detail-actions {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}
</style>
