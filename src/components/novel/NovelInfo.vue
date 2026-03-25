<script setup>
import { computed } from 'vue'

/**
 * 小说信息展示组件
 * 用于在详情页展示小说的完整信息
 */
const props = defineProps({
  novel: {
    type: Object,
    required: true,
  },
  chapters: {
    type: Array,
    default: () => [],
  },
})

const totalWordCount = computed(() => {
  return props.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
})

const progress = computed(() => {
  if (!props.novel?.chapterStructure?.totalChapters) return 0
  return Math.round((props.chapters.length / props.novel.chapterStructure.totalChapters) * 100)
})

const progressStatus = computed(() => {
  if (progress.value >= 100) return 'success'
  if (progress.value >= 50) return 'normal'
  return 'active'
})
</script>

<template>
  <div class="novel-info">
    <!-- 基本信息 -->
    <div class="info-header">
      <h2 class="novel-title">{{ novel.title }}</h2>
      <div class="novel-meta">
        <a-tag v-for="style in novel.style" :key="style" color="blue">
          {{ style }}
        </a-tag>
        <span class="meta-item">{{ novel.estimatedWords }}</span>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="progress-section">
      <div class="progress-header">
        <span>创作进度</span>
        <span class="progress-text">
          {{ chapters.length }} / {{ novel.chapterStructure?.totalChapters || 0 }} 章
        </span>
      </div>
      <a-progress
        :percent="progress"
        :status="progressStatus"
        :stroke-color="{
          '0%': '#667eea',
          '100%': '#764ba2',
        }"
      />
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ totalWordCount.toLocaleString() }}</span>
          <span class="stat-label">已生成字数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ chapters.length }}</span>
          <span class="stat-label">已生成章节</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ novel.chapterStructure?.totalChapters || 0 }}</span>
          <span class="stat-label">计划章节</span>
        </div>
      </div>
    </div>

    <!-- 简介 -->
    <div class="info-section">
      <h3 class="section-title">📖 简介</h3>
      <p class="description">{{ novel.description }}</p>
    </div>

    <!-- 世界观 -->
    <div v-if="novel.worldSetting" class="info-section">
      <h3 class="section-title">🌍 世界观</h3>
      <div class="world-setting">
        <div class="setting-item">
          <span class="setting-label">时代背景</span>
          <span class="setting-value">{{ novel.worldSetting.era }}</span>
        </div>
        <div class="setting-item">
          <span class="setting-label">主要地点</span>
          <span class="setting-value">{{ novel.worldSetting.location }}</span>
        </div>
        <div class="setting-item">
          <span class="setting-label">力量体系</span>
          <span class="setting-value">{{ novel.worldSetting.powerSystem }}</span>
        </div>
        <div class="setting-item">
          <span class="setting-label">社会结构</span>
          <span class="setting-value">{{ novel.worldSetting.socialStructure }}</span>
        </div>
      </div>
    </div>

    <!-- 主角信息 -->
    <div v-if="novel.characters?.protagonist" class="info-section">
      <h3 class="section-title">👤 主角</h3>
      <div class="protagonist-card">
        <div class="protagonist-header">
          <span class="protagonist-name">{{ novel.characters.protagonist.name }}</span>
          <span class="protagonist-identity">{{ novel.characters.protagonist.identity }}</span>
        </div>
        <div class="protagonist-details">
          <p><strong>年龄：</strong>{{ novel.characters.protagonist.age }}</p>
          <p><strong>性格：</strong>{{ novel.characters.protagonist.personality }}</p>
          <p><strong>背景：</strong>{{ novel.characters.protagonist.background }}</p>
          <p><strong>目标：</strong>{{ novel.characters.protagonist.goal }}</p>
          <p v-if="novel.characters.protagonist.specialAbility !== '无'">
            <strong>特殊能力：</strong>{{ novel.characters.protagonist.specialAbility }}
          </p>
        </div>
      </div>
    </div>

    <!-- 剧情线 -->
    <div v-if="novel.plotLines" class="info-section">
      <h3 class="section-title">📖 剧情线</h3>
      <div class="plot-lines">
        <div class="main-plot">
          <span class="plot-label">主线</span>
          <p>{{ novel.plotLines.main }}</p>
        </div>
        <div v-if="novel.plotLines.sub?.length" class="sub-plots">
          <span class="plot-label">支线</span>
          <ul>
            <li v-for="(sub, index) in novel.plotLines.sub" :key="index">{{ sub }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 大纲 -->
    <div v-if="novel.outline?.length" class="info-section">
      <h3 class="section-title">📚 卷册大纲</h3>
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
.novel-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.info-header {
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.novel-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.novel-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.meta-item {
  color: var(--text-secondary);
  font-size: 14px;
}

.progress-section {
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.progress-text {
  color: var(--text-secondary);
}

.stats-row {
  display: flex;
  justify-content: space-around;
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.info-section {
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.section-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.description {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.8;
  white-space: pre-wrap;
}

.world-setting {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.setting-value {
  color: var(--text-primary);
}

.protagonist-card {
  padding: var(--spacing-md);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.protagonist-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-color);
}

.protagonist-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.protagonist-identity {
  color: var(--text-secondary);
  font-size: 14px;
}

.protagonist-details p {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
  line-height: 1.6;
}

.protagonist-details p:last-child {
  margin-bottom: 0;
}

.plot-lines {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.plot-label {
  display: inline-block;
  padding: 2px 8px;
  background: var(--primary-gradient);
  color: var(--text-white);
  font-size: 12px;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
}

.main-plot p,
.sub-plots p {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.6;
}

.sub-plots ul {
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
