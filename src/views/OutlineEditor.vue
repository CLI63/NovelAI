<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useOutline } from '@/composables/useOutline'
import { useNovel } from '@/composables/useNovel'
import { useCharacter } from '@/composables/useCharacter'
import PageHeader from '@/components/common/PageHeader.vue'
import PlotLineView from '@/components/outline/PlotLineView.vue'
import TimelineEditor from '@/components/outline/TimelineEditor.vue'
import ChapterPlanner from '@/components/outline/ChapterPlanner.vue'
import ConflictDetector from '@/components/outline/ConflictDetector.vue'

const router = useRouter()
const route = useRoute()

const { novel, loadNovel } = useNovel()
const { characters, loadCharacters } = useCharacter()
const {
  plotLines,
  loading,
  loadPlotLines,
  createPlotLine,
  updatePlotLine,
  deletePlotLine,
  createEvent,
  updateEvent,
  deleteEvent,
  generateChapterPlan,
  detectConflicts,
  getOutlineStats
} = useOutline()

const activeTab = ref('plotLines')
const conflicts = ref([])
const chapterPlan = ref(null)

// 剧情线表单
const plotLineModalVisible = ref(false)
const editingPlotLine = ref(null)
const plotLineForm = ref({
  name: '',
  type: 'main',
  description: '',
  color: '#1890ff',
  status: 'active'
})

// 事件表单
const eventModalVisible = ref(false)
const editingEvent = ref(null)
const currentPlotLineId = ref(null)
const eventForm = ref({
  title: '',
  description: '',
  plannedChapter: null,
  chapterId: null,
  characterIds: [],
  foreshadowingIds: [],
  importance: 'medium',
  isResolution: false,
  notes: ''
})

// 颜色选择
const colorOptions = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'
]

// 类型选项
const plotLineTypes = [
  { value: 'main', label: '主线', color: 'blue' },
  { value: 'sub', label: '支线', color: 'green' }
]

// 状态选项
const plotLineStatuses = [
  { value: 'active', label: '进行中', color: 'processing' },
  { value: 'completed', label: '已完成', color: 'success' },
  { value: 'paused', label: '暂停', color: 'warning' }
]

// 重要性选项
const importanceOptions = [
  { value: 'high', label: '高', color: 'red' },
  { value: 'medium', label: '中', color: 'orange' },
  { value: 'low', label: '低', color: 'default' }
]

// 加载数据
const loadData = async () => {
  const id = parseInt(route.params.id)
  await loadNovel(id)
  if (novel.value) {
    await Promise.all([
      loadPlotLines(novel.value.id),
      loadCharacters(novel.value.id)
    ])
  }
}

// ============ 剧情线操作 ============
const openPlotLineModal = (plotLine = null) => {
  if (plotLine) {
    editingPlotLine.value = plotLine
    plotLineForm.value = {
      name: plotLine.name,
      type: plotLine.type,
      description: plotLine.description || '',
      color: plotLine.color || '#1890ff',
      status: plotLine.status || 'active'
    }
  } else {
    editingPlotLine.value = null
    plotLineForm.value = {
      name: '',
      type: 'main',
      description: '',
      color: '#1890ff',
      status: 'active'
    }
  }
  plotLineModalVisible.value = true
}

const handleSavePlotLine = async () => {
  if (!plotLineForm.value.name) {
    message.warning('请输入剧情线名称')
    return
  }

  try {
    if (editingPlotLine.value) {
      await updatePlotLine(editingPlotLine.value.id, plotLineForm.value)
      message.success('剧情线更新成功')
    } else {
      await createPlotLine({
        ...plotLineForm.value,
        novelId: novel.value.id
      })
      message.success('剧情线创建成功')
    }
    plotLineModalVisible.value = false
    loadPlotLines(novel.value.id)
  } catch (error) {
    message.error('操作失败：' + error.message)
  }
}

const handleDeletePlotLine = (plotLine) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除剧情线「${plotLine.name}」吗？关联的事件也会一并删除。`,
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      await deletePlotLine(plotLine.id)
      message.success('剧情线已删除')
      loadPlotLines(novel.value.id)
    }
  })
}

// ============ 事件操作 ============
const openEventModal = (plotLineId, event = null) => {
  currentPlotLineId.value = plotLineId
  if (event) {
    editingEvent.value = event
    eventForm.value = {
      title: event.title,
      description: event.description || '',
      plannedChapter: event.plannedChapter,
      chapterId: event.chapterId,
      characterIds: event.characterIds || [],
      foreshadowingIds: event.foreshadowingIds || [],
      importance: event.importance || 'medium',
      isResolution: event.isResolution || false,
      notes: event.notes || ''
    }
  } else {
    editingEvent.value = null
    eventForm.value = {
      title: '',
      description: '',
      plannedChapter: null,
      chapterId: null,
      characterIds: [],
      foreshadowingIds: [],
      importance: 'medium',
      isResolution: false,
      notes: ''
    }
  }
  eventModalVisible.value = true
}

const handleSaveEvent = async () => {
  if (!eventForm.value.title) {
    message.warning('请输入事件标题')
    return
  }

  try {
    const eventData = {
      ...eventForm.value,
      plotLineId: currentPlotLineId.value,
      novelId: novel.value.id
    }

    if (editingEvent.value) {
      await updateEvent(editingEvent.value.id, eventData)
      message.success('事件更新成功')
    } else {
      await createEvent(eventData)
      message.success('事件创建成功')
    }
    eventModalVisible.value = false
    loadPlotLines(novel.value.id)
  } catch (error) {
    message.error('操作失败：' + error.message)
  }
}

const handleDeleteEvent = (event) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除事件「${event.title}」吗？`,
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      await deleteEvent(event.id)
      message.success('事件已删除')
      loadPlotLines(novel.value.id)
    }
  })
}

// ============ 章节规划 ============
const handleGenerateChapterPlan = async () => {
  Modal.confirm({
    title: '生成章节规划',
    content: '将根据现有剧情线自动规划章节分配，确定继续吗？',
    onOk: async () => {
      const config = {
        totalChapters: novel.value.chapterStructure?.totalChapters || 50,
        targetWords: parseInt(novel.value.estimatedWords) || 1000000
      }
      chapterPlan.value = await generateChapterPlan(novel.value.id, config)
      if (chapterPlan.value) {
        activeTab.value = 'planner'
        message.success('章节规划生成成功')
      }
    }
  })
}

// ============ 冲突检测 ============
const handleDetectConflicts = async () => {
  conflicts.value = await detectConflicts(novel.value.id)
  if (conflicts.value.length === 0) {
    message.success('未检测到冲突')
  } else {
    activeTab.value = 'conflicts'
    message.warning(`检测到 ${conflicts.value.length} 个潜在问题`)
  }
}

// 返回
const handleBack = () => {
  router.push(`/novel/${novel.value.id}`)
}

// 统计信息
const stats = computed(() => getOutlineStats.value)

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="outline-editor-page">
    <a-spin :spinning="loading" size="large">
      <template v-if="novel">
        <!-- 页面头部 -->
        <PageHeader
          :title="`${novel.title} - 大纲编辑器`"
          subtitle="智能大纲管理与剧情规划"
          icon="📝"
          show-back
          @back="handleBack"
        >
          <template #actions>
            <a-button @click="handleDetectConflicts">
              冲突检测
            </a-button>
            <a-button type="primary" @click="handleGenerateChapterPlan">
              生成章节规划
            </a-button>
          </template>
        </PageHeader>

        <!-- 统计卡片 -->
        <a-row :gutter="16" class="stats-row">
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="剧情线总数" :value="stats.totalPlotLines">
                <template #suffix>
                  <span class="stat-detail">
                    (主线 {{ stats.mainPlotLines }} / 支线 {{ stats.subPlotLines }})
                  </span>
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="事件总数" :value="stats.totalEvents" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic title="角色数量" :value="characters.length" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic
                title="冲突问题"
                :value="conflicts.length"
                :value-style="{ color: conflicts.length > 0 ? '#f5222d' : '#52c41a' }"
              />
            </a-card>
          </a-col>
        </a-row>

        <!-- 标签页 -->
        <a-card :bordered="false" class="content-card">
          <a-tabs v-model:activeKey="activeTab">
            <!-- 剧情线管理 -->
            <a-tab-pane key="plotLines" tab="剧情线管理">
              <PlotLineView
                :plot-lines="plotLines"
                :characters="characters"
                @add-plot-line="openPlotLineModal()"
                @edit-plot-line="openPlotLineModal"
                @delete-plot-line="handleDeletePlotLine"
                @add-event="openEventModal"
                @edit-event="openEventModal"
                @delete-event="handleDeleteEvent"
              />
            </a-tab-pane>

            <!-- 时间线编辑器 -->
            <a-tab-pane key="timeline" tab="时间线">
              <TimelineEditor
                :plot-lines="plotLines"
                :novel-id="novel.id"
                @edit-event="openEventModal"
              />
            </a-tab-pane>

            <!-- 章节规划器 -->
            <a-tab-pane key="planner" tab="章节规划">
              <ChapterPlanner
                :novel="novel"
                :plan="chapterPlan"
                :plot-lines="plotLines"
                @generate="handleGenerateChapterPlan"
              />
            </a-tab-pane>

            <!-- 冲突检测 -->
            <a-tab-pane key="conflicts" tab="冲突检测">
              <ConflictDetector
                :conflicts="conflicts"
                @refresh="handleDetectConflicts"
              />
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </template>
    </a-spin>

    <!-- 剧情线编辑弹窗 -->
    <a-modal
      v-model:open="plotLineModalVisible"
      :title="editingPlotLine ? '编辑剧情线' : '创建剧情线'"
      @ok="handleSavePlotLine"
      :confirmLoading="loading"
      width="600px"
    >
      <a-form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <a-form-item label="名称" required>
          <a-input v-model:value="plotLineForm.name" placeholder="请输入剧情线名称" />
        </a-form-item>
        <a-form-item label="类型">
          <a-radio-group v-model:value="plotLineForm.type">
            <a-radio
              v-for="type in plotLineTypes"
              :key="type.value"
              :value="type.value"
            >
              <a-tag :color="type.color">{{ type.label }}</a-tag>
            </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="plotLineForm.status">
            <a-select-option
              v-for="status in plotLineStatuses"
              :key="status.value"
              :value="status.value"
            >
              <a-tag :color="status.color">{{ status.label }}</a-tag>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="颜色">
          <div class="color-picker">
            <div
              v-for="color in colorOptions"
              :key="color"
              class="color-item"
              :class="{ active: plotLineForm.color === color }"
              :style="{ backgroundColor: color }"
              @click="plotLineForm.color = color"
            />
          </div>
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea
            v-model:value="plotLineForm.description"
            placeholder="剧情线描述（可选）"
            :rows="4"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 事件编辑弹窗 -->
    <a-modal
      v-model:open="eventModalVisible"
      :title="editingEvent ? '编辑事件' : '创建事件'"
      @ok="handleSaveEvent"
      :confirmLoading="loading"
      width="700px"
    >
      <a-form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <a-form-item label="事件标题" required>
          <a-input v-model:value="eventForm.title" placeholder="请输入事件标题" />
        </a-form-item>
        <a-form-item label="计划章节">
          <a-input-number
            v-model:value="eventForm.plannedChapter"
            :min="1"
            :max="9999"
            placeholder="预计发生的章节"
            style="width: 150px"
          />
          <span class="form-hint">事件预计发生的章节位置</span>
        </a-form-item>
        <a-form-item label="重要性">
          <a-radio-group v-model:value="eventForm.importance">
            <a-radio
              v-for="imp in importanceOptions"
              :key="imp.value"
              :value="imp.value"
            >
              <a-tag :color="imp.color">{{ imp.label }}</a-tag>
            </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="涉及角色">
          <a-select
            v-model:value="eventForm.characterIds"
            mode="multiple"
            placeholder="选择事件涉及的角色"
            :options="characters.map(c => ({ value: c.id, label: c.name }))"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="事件描述">
          <a-textarea
            v-model:value="eventForm.description"
            placeholder="详细描述事件内容"
            :rows="4"
          />
        </a-form-item>
        <a-form-item label="是否结局">
          <a-switch v-model:checked="eventForm.isResolution" />
          <span class="form-hint">标记为剧情线的结局事件</span>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea
            v-model:value="eventForm.notes"
            placeholder="备注信息（可选）"
            :rows="2"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.outline-editor-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.stats-row {
  margin-bottom: var(--spacing-md);
}

.stat-detail {
  font-size: 12px;
  color: var(--text-secondary);
}

.content-card {
  background: var(--bg-primary);
}

.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-item {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
  border: 2px solid transparent;
}

.color-item:hover {
  transform: scale(1.1);
}

.color-item.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
}

.form-hint {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}

:deep(.ant-tabs-tab) {
  font-size: 15px;
}

:deep(.ant-tabs-tab-active) {
  font-weight: 600;
}
</style>
