<script setup>
import { computed } from 'vue'

/**
 * 小说表单组件
 * 用于创建和编辑小说概览信息
 */
const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  mode: {
    type: String,
    default: 'edit', // 'edit' | 'view'
    validator: (v) => ['edit', 'view'].includes(v),
  },
})

const emit = defineEmits(['update:modelValue'])

// 双向绑定
const novel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// 支线剧情文本
const subPlotLines = computed({
  get: () => novel.value?.plotLines?.sub?.join('\n') || '',
  set: (val) => {
    if (!novel.value.plotLines) {
      novel.value.plotLines = { main: '', sub: [] }
    }
    novel.value.plotLines.sub = val.split('\n').filter((line) => line.trim())
  },
})

const isViewMode = computed(() => props.mode === 'view')
</script>

<template>
  <div class="novel-form">
    <!-- 基本信息 -->
    <div class="form-section">
      <div class="section-title">
        <span class="section-icon">📋</span>
        <span>基本信息</span>
      </div>
      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item label="书名">
            <a-input
              v-if="!isViewMode"
              v-model:value="novel.title"
              size="large"
              placeholder="请输入书名"
            />
            <span v-else class="view-value">{{ novel.title }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="预估字数">
            <a-input
              v-if="!isViewMode"
              v-model:value="novel.estimatedWords"
              size="large"
              placeholder="例如：100万字"
            />
            <span v-else class="view-value">{{ novel.estimatedWords }}</span>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="24">
        <a-col :span="24">
          <a-form-item label="风格标签">
            <a-select
              v-if="!isViewMode"
              v-model:value="novel.style"
              mode="tags"
              size="large"
              placeholder="选择或输入风格标签"
              :options="[
                { value: '玄幻' },
                { value: '仙侠' },
                { value: '都市' },
                { value: '科幻' },
                { value: '历史' },
                { value: '言情' },
                { value: '悬疑' },
                { value: '武侠' },
                { value: '奇幻' },
                { value: '末世' },
                { value: '系统流' },
                { value: '重生流' },
                { value: '穿越流' },
              ]"
            />
            <div v-else class="style-tags">
              <a-tag v-for="style in novel.style" :key="style" color="blue">
                {{ style }}
              </a-tag>
            </div>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="24">
        <a-col :span="24">
          <a-form-item label="简介">
            <a-textarea
              v-if="!isViewMode"
              v-model:value="novel.description"
              :rows="4"
              placeholder="请输入小说简介"
            />
            <p v-else class="view-value description">{{ novel.description }}</p>
          </a-form-item>
        </a-col>
      </a-row>
    </div>

    <!-- 世界观设定 -->
    <div v-if="novel.worldSetting" class="form-section">
      <div class="section-title">
        <span class="section-icon">🌍</span>
        <span>世界观设定</span>
      </div>
      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item label="时代背景">
            <a-input
              v-if="!isViewMode"
              v-model:value="novel.worldSetting.era"
              placeholder="故事发生的时代"
            />
            <span v-else class="view-value">{{ novel.worldSetting.era }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="主要地点">
            <a-input
              v-if="!isViewMode"
              v-model:value="novel.worldSetting.location"
              placeholder="故事主要发生地点"
            />
            <span v-else class="view-value">{{ novel.worldSetting.location }}</span>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item label="力量体系">
            <a-input
              v-if="!isViewMode"
              v-model:value="novel.worldSetting.powerSystem"
              placeholder="如：修仙等级、魔法体系"
            />
            <span v-else class="view-value">{{ novel.worldSetting.powerSystem }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="社会结构">
            <a-input
              v-if="!isViewMode"
              v-model:value="novel.worldSetting.socialStructure"
              placeholder="势力分布、社会阶层"
            />
            <span v-else class="view-value">{{ novel.worldSetting.socialStructure }}</span>
          </a-form-item>
        </a-col>
      </a-row>
    </div>

    <!-- 剧情线 -->
    <div v-if="novel.plotLines" class="form-section">
      <div class="section-title">
        <span class="section-icon">📖</span>
        <span>剧情线</span>
      </div>
      <a-form-item label="主线剧情">
        <a-textarea
          v-if="!isViewMode"
          v-model:value="novel.plotLines.main"
          :rows="3"
          placeholder="主线剧情描述"
        />
        <p v-else class="view-value">{{ novel.plotLines.main }}</p>
      </a-form-item>
      <a-form-item label="支线剧情">
        <a-textarea
          v-if="!isViewMode"
          v-model:value="subPlotLines"
          :rows="3"
          placeholder="每行一条支线剧情"
        />
        <ul v-else class="sub-plots">
          <li v-for="(sub, index) in novel.plotLines.sub" :key="index">
            {{ sub }}
          </li>
        </ul>
      </a-form-item>
    </div>

    <!-- 章节结构 -->
    <div v-if="novel.chapterStructure" class="form-section">
      <div class="section-title">
        <span class="section-icon">📑</span>
        <span>章节结构</span>
      </div>
      <a-row :gutter="24">
        <a-col :span="8">
          <a-form-item label="总章节数">
            <a-input-number
              v-if="!isViewMode"
              v-model:value="novel.chapterStructure.totalChapters"
              :min="1"
              style="width: 100%"
            />
            <span v-else class="view-value">{{ novel.chapterStructure.totalChapters }} 章</span>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="每章最小字数">
            <a-input-number
              v-if="!isViewMode"
              v-model:value="novel.chapterStructure.minWordsPerChapter"
              :min="500"
              :step="100"
              style="width: 100%"
            />
            <span v-else class="view-value">{{ novel.chapterStructure.minWordsPerChapter }} 字</span>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="每章最大字数">
            <a-input-number
              v-if="!isViewMode"
              v-model:value="novel.chapterStructure.maxWordsPerChapter"
              :min="1000"
              :step="100"
              style="width: 100%"
            />
            <span v-else class="view-value">{{ novel.chapterStructure.maxWordsPerChapter }} 字</span>
          </a-form-item>
        </a-col>
      </a-row>
    </div>

    <!-- 大纲 -->
    <div v-if="novel.outline?.length" class="form-section">
      <div class="section-title">
        <span class="section-icon">📚</span>
        <span>卷册大纲</span>
      </div>
      <div class="outline-list">
        <div v-for="(vol, index) in novel.outline" :key="index" class="outline-item">
          <div class="outline-header">
            <span class="volume-name">{{ vol.volume }}</span>
            <a-tag color="blue">{{ vol.chapters }} 章</a-tag>
          </div>
          <p class="outline-summary">{{ vol.summary }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.novel-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-section {
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-icon {
  font-size: 20px;
}

.view-value {
  color: var(--text-primary);
  font-size: 14px;
}

.view-value.description {
  line-height: 1.8;
  white-space: pre-wrap;
}

.style-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.sub-plots {
  margin: 0;
  padding-left: var(--spacing-lg);
  color: var(--text-primary);
}

.sub-plots li {
  margin-bottom: var(--spacing-xs);
}

.outline-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.outline-item {
  padding: var(--spacing-md);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.outline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.volume-name {
  font-weight: 600;
  color: var(--text-primary);
}

.outline-summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}
</style>
