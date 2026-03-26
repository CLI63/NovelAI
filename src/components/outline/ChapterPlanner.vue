<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  novel: {
    type: Object,
    default: () => ({})
  },
  plan: {
    type: Object,
    default: null
  },
  plotLines: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['generate'])

// 规划配置
const configVisible = ref(false)
const config = ref({
  totalChapters: 50,
  targetWords: 1000000,
  wordsPerChapter: 2000
})

// 选中的章节
const selectedChapter = ref(null)

// 计算预估字数
const estimatedWords = computed(() => {
  if (!props.plan) return 0
  return props.plan.chapters?.reduce((sum, ch) => sum + (ch.estimatedWords || 0), 0) || 0
})

// 打开配置弹窗
const openConfig = () => {
  config.value = {
    totalChapters: props.novel.chapterStructure?.totalChapters || 50,
    targetWords: parseInt(props.novel.estimatedWords) || 1000000,
    wordsPerChapter: props.novel.chapterStructure?.minWordsPerChapter || 2000
  }
  configVisible.value = true
}

// 应用配置
const applyConfig = () => {
  configVisible.value = false
  emit('generate', config.value)
}

// 获取章节的事件统计
const getChapterEventStats = (chapter) => {
  const mainEvents = chapter.events?.filter(e => e.plotLineType === 'main') || []
  const subEvents = chapter.events?.filter(e => e.plotLineType === 'sub') || []
  return { mainEvents, subEvents }
}

// 导出规划
const exportPlan = () => {
  if (!props.plan) return
  const content = JSON.stringify(props.plan, null, 2)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.novel.title}_章节规划.json`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="chapter-planner">
    <!-- 无规划时的提示 -->
    <div v-if="!plan" class="empty-state">
      <a-empty description="尚未生成章节规划">
        <template #description>
          <p>点击下方按钮根据剧情线自动生成章节规划</p>
        </template>
        <a-space>
          <a-button @click="openConfig">自定义配置</a-button>
          <a-button type="primary" @click="emit('generate')">
            生成章节规划
          </a-button>
        </a-space>
      </a-empty>
    </div>

    <!-- 规划概览 -->
    <template v-else>
      <div class="plan-overview">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic title="总章节数" :value="plan.totalChapters" suffix="章" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="目标字数" :value="plan.targetWords" suffix="字" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="预估字数" :value="estimatedWords" suffix="字" />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="平均每章"
              :value="Math.round(estimatedWords / plan.totalChapters)"
              suffix="字"
            />
          </a-col>
        </a-row>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="generated-time">
            生成时间：{{ new Date(plan.generatedAt).toLocaleString() }}
          </span>
        </div>
        <div class="toolbar-right">
          <a-button @click="openConfig">重新规划</a-button>
          <a-button type="primary" @click="exportPlan">导出规划</a-button>
        </div>
      </div>

      <!-- 章节列表 -->
      <div class="chapter-list">
        <div
          v-for="chapter in plan.chapters"
          :key="chapter.chapterNumber"
          class="chapter-card"
          :class="{ selected: selectedChapter === chapter.chapterNumber }"
          @click="selectedChapter = selectedChapter === chapter.chapterNumber ? null : chapter.chapterNumber"
        >
          <div class="chapter-header">
            <span class="chapter-number">第{{ chapter.chapterNumber }}章</span>
            <span class="chapter-title">{{ chapter.title }}</span>
            <a-tag color="blue">{{ chapter.estimatedWords }}字</a-tag>
          </div>

          <div v-if="selectedChapter === chapter.chapterNumber" class="chapter-detail">
            <!-- 事件列表 -->
            <div v-if="chapter.events?.length > 0" class="events-section">
              <div class="section-title">剧情事件</div>
              <div class="events-list">
                <div
                  v-for="event in chapter.events"
                  :key="event.id"
                  class="event-item"
                >
                  <a-tag :color="event.plotLineType === 'main' ? 'blue' : 'green'">
                    {{ event.plotLineName }}
                  </a-tag>
                  <span class="event-title">{{ event.title }}</span>
                </div>
              </div>
            </div>

            <!-- 涉及角色 -->
            <div v-if="chapter.involvedCharacters?.length > 0" class="characters-section">
              <div class="section-title">涉及角色</div>
              <div class="characters-list">
                <a-tag v-for="char in chapter.involvedCharacters" :key="char.id">
                  {{ char.name }}
                </a-tag>
              </div>
            </div>

            <!-- 伏笔提示 -->
            <div v-if="chapter.foreshadowingHints?.length > 0" class="foreshadowing-section">
              <div class="section-title">伏笔提示</div>
              <div class="foreshadowing-list">
                <div
                  v-for="hint in chapter.foreshadowingHints"
                  :key="hint.id"
                  class="hint-item"
                >
                  <a-tag :color="hint.importance === 'high' ? 'red' : 'orange'">
                    {{ hint.importance === 'high' ? '重要' : '一般' }}
                  </a-tag>
                  <span>{{ hint.content }}</span>
                </div>
              </div>
            </div>

            <!-- 无事件提示 -->
            <div v-if="!chapter.events?.length" class="no-events">
              <a-empty description="本章暂无规划事件" :image="null" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 配置弹窗 -->
    <a-modal
      v-model:open="configVisible"
      title="章节规划配置"
      @ok="applyConfig"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="总章节数">
          <a-input-number
            v-model:value="config.totalChapters"
            :min="1"
            :max="9999"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="目标字数">
          <a-input-number
            v-model:value="config.targetWords"
            :min="1000"
            :max="100000000"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="每章字数">
          <a-input-number
            v-model:value="config.wordsPerChapter"
            :min="500"
            :max="50000"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.chapter-planner {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
}

.plan-overview {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.generated-time {
  color: var(--text-secondary);
  font-size: 13px;
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 500px;
  overflow-y: auto;
}

.chapter-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.chapter-card:hover {
  border-color: var(--ant-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chapter-card.selected {
  border-color: var(--ant-primary);
  background: rgba(24, 144, 255, 0.05);
}

.chapter-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chapter-number {
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 60px;
}

.chapter-title {
  flex: 1;
  font-weight: 500;
}

.chapter-detail {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.events-section,
.characters-section,
.foreshadowing-section {
  margin-bottom: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.event-title {
  font-size: 13px;
}

.characters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.foreshadowing-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(250, 173, 20, 0.1);
  border-radius: 4px;
  font-size: 13px;
}

.no-events {
  padding: 20px 0;
}
</style>
