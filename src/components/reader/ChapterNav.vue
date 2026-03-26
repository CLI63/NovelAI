<script setup>
import { computed } from 'vue'

const props = defineProps({
  chapters: {
    type: Array,
    default: () => []
  },
  currentChapter: {
    type: Number,
    default: 1
  },
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'toggle'])

const handleSelect = (chapter) => {
  emit('select', chapter)
}

const handleToggle = () => {
  emit('toggle')
}

// 当前章节标题
const currentChapterTitle = computed(() => {
  const chapter = props.chapters.find(c => c.chapterNumber === props.currentChapter)
  return chapter?.title || ''
})
</script>

<template>
  <div class="chapter-nav" :class="{ collapsed }">
    <!-- 折叠状态 -->
    <template v-if="collapsed">
      <div class="collapsed-header" @click="handleToggle">
        <span class="expand-icon">☰</span>
      </div>
      <div class="collapsed-current">
        <span class="chapter-num">{{ currentChapter }}</span>
      </div>
    </template>

    <!-- 展开状态 -->
    <template v-else>
      <div class="nav-header">
        <span class="nav-title">目录</span>
        <a-button type="text" size="small" class="collapse-btn" @click="handleToggle">
          <template #icon>
            <span>✕</span>
          </template>
        </a-button>
      </div>

      <div class="chapter-list">
        <div
          v-for="chapter in chapters"
          :key="chapter.id"
          class="chapter-item"
          :class="{ active: chapter.chapterNumber === currentChapter }"
          @click="handleSelect(chapter)"
        >
          <span class="chapter-number">第{{ chapter.chapterNumber }}章</span>
          <span class="chapter-title">{{ chapter.title }}</span>
        </div>
      </div>

      <div class="nav-footer">
        <span class="chapter-count">共 {{ chapters.length }} 章</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.chapter-nav {
  width: 280px;
  height: 100vh;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow: hidden;
}

.chapter-nav.collapsed {
  width: 50px;
}

/* 折叠状态样式 */
.collapsed-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
}

.expand-icon {
  font-size: 18px;
  color: var(--text-secondary);
}

.collapsed-current {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chapter-num {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 展开状态样式 */
.nav-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
}

.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.collapse-btn {
  color: var(--text-secondary);
}

.chapter-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.chapter-item {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.chapter-item:hover {
  background: var(--bg-secondary);
}

.chapter-item.active {
  background: var(--bg-secondary);
  border-left-color: var(--ant-primary);
}

.chapter-number {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.chapter-item.active .chapter-number {
  color: var(--ant-primary);
}

.chapter-title {
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.chapter-count {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 滚动条样式 */
.chapter-list::-webkit-scrollbar {
  width: 4px;
}

.chapter-list::-webkit-scrollbar-track {
  background: transparent;
}

.chapter-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.chapter-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
