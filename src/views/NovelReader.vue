<script setup>
import { ref, computed, onMounted, onUnmounted, watch, toRef } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useNovel } from '@/composables/useNovel'
import { useChapter } from '@/composables/useChapter'
import { useReader, useReadingProgress } from '@/composables/useReader'
import ChapterNav from '@/components/reader/ChapterNav.vue'
import ReaderSettings from '@/components/reader/ReaderSettings.vue'

const router = useRouter()
const route = useRoute()

const { novel, loading: novelLoading, loadNovel } = useNovel()
const { chapter, chapters, loading: chapterLoading, loadChapter, loadChapters, getPrevNextChapter } = useChapter()

const novelId = computed(() => novel.value?.id)

const {
  settings,
  bookmarks,
  annotations,
  themeStyles,
  contentWidth,
  loadSettings,
  updateSettings,
  loadBookmarks,
  addBookmark,
  deleteBookmark,
  loadAnnotations,
  addAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getChapterBookmarks,
  getChapterAnnotations
} = useReader(novelId)

const {
  currentProgress,
  readingPercent,
  loadProgress,
  saveProgress
} = useReadingProgress(novelId, chapters)

// UI状态
const navCollapsed = ref(false)
const settingsVisible = ref(false)
const bookmarkModalVisible = ref(false)
const annotationModalVisible = ref(false)
const bookmarkNote = ref('')
const annotationContent = ref('')
const editingAnnotation = ref(null)
const selectedText = ref('')

// 当前章节的书签和批注
const chapterBookmarks = computed(() => {
  if (!chapter.value) return []
  return getChapterBookmarks(chapter.value.id)
})

const chapterAnnotations = computed(() => {
  if (!chapter.value) return []
  return getChapterAnnotations(chapter.value.id)
})

// 上一章/下一章
const prevNextResult = computed(() => {
  if (!chapter.value || !chapters.value?.length) return { prev: null, next: null }
  return getPrevNextChapter(chapter.value.chapterNumber)
})
const prevChapter = computed(() => prevNextResult.value.prev)
const nextChapter = computed(() => prevNextResult.value.next)

// 阅读器内容样式
const readerStyle = computed(() => ({
  fontSize: `${settings.fontSize}px`,
  lineHeight: settings.lineHeight,
  fontFamily: settings.fontFamily === 'serif' ? 'Georgia, "Noto Serif SC", serif' : '"PingFang SC", "Microsoft YaHei", sans-serif',
  background: themeStyles.value.background,
  color: themeStyles.value.textColor,
  maxWidth: contentWidth.value
}))

// 加载数据
const loadData = async () => {
  const id = parseInt(route.params.id)
  await loadNovel(id)
  if (novel.value) {
    await loadChapters(novel.value.id)
    // 加载阅读进度或路由指定的章节
    loadProgress()
    const targetChapter = parseInt(route.params.chapter) || currentProgress.value.chapterNumber || 1
    await loadChapter(novel.value.id, targetChapter)
    // 加载书签和批注
    await loadBookmarks()
    await loadAnnotations()
  }
}

// 监听路由变化
watch(
  () => route.params.chapter,
  (newChapter) => {
    if (newChapter && novel.value) {
      loadChapter(novel.value.id, parseInt(newChapter))
    }
  }
)

// 监听章节变化保存进度
watch(chapter, (newChapter) => {
  if (newChapter) {
    saveProgress(newChapter.id, newChapter.chapterNumber)
  }
})

// 切换章节
const handleChapterSelect = (selectedChapter) => {
  router.push(`/reader/${novel.value.id}/chapter/${selectedChapter.chapterNumber}`)
}

// 上一章/下一章
const handlePrevChapter = () => {
  if (prevChapter.value) {
    router.push(`/reader/${novel.value.id}/chapter/${prevChapter.value}`)
  }
}

const handleNextChapter = () => {
  if (nextChapter.value) {
    router.push(`/reader/${novel.value.id}/chapter/${nextChapter.value}`)
  }
}

// 返回小说详情
const handleBack = () => {
  router.push(`/novel/${novel.value.id}`)
}

// 切换设置面板
const toggleSettings = () => {
  settingsVisible.value = !settingsVisible.value
}

// 添加书签
const handleAddBookmark = () => {
  bookmarkNote.value = ''
  bookmarkModalVisible.value = true
}

const handleSaveBookmark = async () => {
  if (!chapter.value) return
  const success = await addBookmark(chapter.value.id, 0, bookmarkNote.value)
  if (success) {
    message.success('书签添加成功')
    bookmarkModalVisible.value = false
  } else {
    message.error('添加书签失败')
  }
}

// 删除书签
const handleDeleteBookmark = (bookmark) => {
  Modal.confirm({
    title: '删除书签',
    content: '确定要删除这个书签吗？',
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      const success = await deleteBookmark(bookmark.id)
      if (success) {
        message.success('书签已删除')
      }
    }
  })
}

// 文本选择处理
const handleTextSelect = () => {
  const selection = window.getSelection()
  const text = selection?.toString().trim()
  if (text && text.length > 0) {
    selectedText.value = text
    annotationContent.value = ''
    editingAnnotation.value = null
    annotationModalVisible.value = true
  }
}

// 添加批注
const handleSaveAnnotation = async () => {
  if (!annotationContent.value.trim()) {
    message.warning('请输入批注内容')
    return
  }
  if (!chapter.value) return

  const success = await addAnnotation(
    chapter.value.id,
    annotationContent.value,
    selectedText.value
  )
  if (success) {
    message.success('批注添加成功')
    annotationModalVisible.value = false
  } else {
    message.error('添加批注失败')
  }
}

// 编辑批注
const handleEditAnnotation = (annotation) => {
  editingAnnotation.value = annotation
  annotationContent.value = annotation.content
  selectedText.value = annotation.selectedText || ''
  annotationModalVisible.value = true
}

const handleUpdateAnnotation = async () => {
  if (!editingAnnotation.value) return
  const success = await updateAnnotation(editingAnnotation.value.id, annotationContent.value)
  if (success) {
    message.success('批注更新成功')
    annotationModalVisible.value = false
  }
}

// 删除批注
const handleDeleteAnnotation = (annotation) => {
  Modal.confirm({
    title: '删除批注',
    content: '确定要删除这条批注吗？',
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      const success = await deleteAnnotation(annotation.id)
      if (success) {
        message.success('批注已删除')
      }
    }
  })
}

// 键盘导航
const handleKeydown = (e) => {
  if (e.key === 'ArrowLeft') {
    handlePrevChapter()
  } else if (e.key === 'ArrowRight') {
    handleNextChapter()
  } else if (e.key === 'Escape') {
    if (settingsVisible.value) {
      settingsVisible.value = false
    }
  }
}

onMounted(() => {
  loadSettings()
  loadData()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="reader-page" :style="{ background: themeStyles.background }">
    <a-spin :spinning="novelLoading || chapterLoading" size="large">
      <div class="reader-container">
        <!-- 左侧目录 -->
        <ChapterNav
          :chapters="chapters"
          :current-chapter="chapter?.chapterNumber || 1"
          :collapsed="navCollapsed"
          @select="handleChapterSelect"
          @toggle="navCollapsed = !navCollapsed"
        />

        <!-- 主内容区 -->
        <div class="reader-main">
          <!-- 顶部工具栏 -->
          <div class="reader-toolbar" :style="{ background: themeStyles.background }">
            <div class="toolbar-left">
              <a-button type="text" @click="handleBack">
                <template #icon><span>←</span></template>
                返回
              </a-button>
              <span class="novel-title">{{ novel?.title }}</span>
            </div>
            <div class="toolbar-center">
              <a-button-group>
                <a-button :disabled="!prevChapter" @click="handlePrevChapter">
                  上一章
                </a-button>
                <a-button :disabled="!nextChapter" @click="handleNextChapter">
                  下一章
                </a-button>
              </a-button-group>
            </div>
            <div class="toolbar-right">
              <a-badge :count="chapterBookmarks.length" :offset="[-5, 5]">
                <a-button type="text" @click="handleAddBookmark">
                  <template #icon><span>🔖</span></template>
                  书签
                </a-button>
              </a-badge>
              <a-badge :count="chapterAnnotations.length" :offset="[-5, 5]">
                <a-button type="text" @click="annotationModalVisible = true">
                  <template #icon><span>📝</span></template>
                  批注
                </a-button>
              </a-badge>
              <a-button type="text" @click="toggleSettings">
                <template #icon><span>⚙️</span></template>
                设置
              </a-button>
            </div>
          </div>

          <!-- 阅读进度 -->
          <div class="reading-progress">
            <a-progress
              :percent="readingPercent"
              :show-info="false"
              :stroke-color="themeStyles.textColor"
            />
          </div>

          <!-- 内容区域 -->
          <div class="content-area" @mouseup="handleTextSelect">
            <div v-if="chapter" class="chapter-content" :style="readerStyle">
              <h1 class="chapter-title">{{ chapter.title }}</h1>
              <div class="content-text">{{ chapter.content }}</div>
            </div>
          </div>

          <!-- 底部导航 -->
          <div class="reader-footer" :style="{ background: themeStyles.background }">
            <a-button
              v-if="prevChapter"
              type="text"
              class="nav-btn prev"
              @click="handlePrevChapter"
            >
              ← 上一章
            </a-button>
            <span class="chapter-info">
              第 {{ chapter?.chapterNumber || 1 }} 章 / 共 {{ chapters.length }} 章
            </span>
            <a-button
              v-if="nextChapter"
              type="text"
              class="nav-btn next"
              @click="handleNextChapter"
            >
              下一章 →
            </a-button>
          </div>
        </div>

        <!-- 右侧设置面板 -->
        <ReaderSettings
          v-if="settingsVisible"
          :settings="settings"
          @update="updateSettings"
          @close="settingsVisible = false"
        />
      </div>
    </a-spin>

    <!-- 书签弹窗 -->
    <a-modal
      v-model:open="bookmarkModalVisible"
      title="添加书签"
      @ok="handleSaveBookmark"
    >
      <a-form :label-col="{ span: 4 }">
        <a-form-item label="备注">
          <a-textarea
            v-model:value="bookmarkNote"
            placeholder="可选：为这个书签添加备注"
            :rows="3"
          />
        </a-form-item>
      </a-form>
      <div v-if="chapterBookmarks.length > 0" class="existing-bookmarks">
        <h4>本章已有书签</h4>
        <div v-for="b in chapterBookmarks" :key="b.id" class="bookmark-item">
          <span>{{ b.note || '无备注' }}</span>
          <a-button type="link" size="small" danger @click="handleDeleteBookmark(b)">
            删除
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- 批注弹窗 -->
    <a-modal
      v-model:open="annotationModalVisible"
      :title="editingAnnotation ? '编辑批注' : '添加批注'"
      @ok="editingAnnotation ? handleUpdateAnnotation() : handleSaveAnnotation()"
    >
      <a-form :label-col="{ span: 4 }">
        <a-form-item v-if="selectedText" label="选中文字">
          <div class="selected-text">"{{ selectedText }}"</div>
        </a-form-item>
        <a-form-item label="批注内容">
          <a-textarea
            v-model:value="annotationContent"
            placeholder="输入批注内容..."
            :rows="4"
          />
        </a-form-item>
      </a-form>
      <div v-if="chapterAnnotations.length > 0 && !editingAnnotation" class="existing-annotations">
        <h4>本章批注</h4>
        <div v-for="a in chapterAnnotations" :key="a.id" class="annotation-item">
          <p v-if="a.selectedText" class="annotation-quote">"{{ a.selectedText }}"</p>
          <p class="annotation-content">{{ a.content }}</p>
          <div class="annotation-actions">
            <a-button type="link" size="small" @click="handleEditAnnotation(a)">
              编辑
            </a-button>
            <a-button type="link" size="small" danger @click="handleDeleteAnnotation(a)">
              删除
            </a-button>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.reader-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  overflow: hidden;
}

.reader-page :deep(.ant-spin-nested-loading),
.reader-page :deep(.ant-spin-container) {
  height: 100%;
}

.reader-container {
  display: flex;
  height: 100%;
}

.reader-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 工具栏 */
.reader-toolbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.novel-title {
  font-size: 16px;
  font-weight: 600;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 阅读进度 */
.reading-progress {
  padding: 0 24px;
  flex-shrink: 0;
}

/* 内容区域 */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 32px 24px;
  display: flex;
  justify-content: center;
}

.chapter-content {
  width: 100%;
  padding: 20px 0;
}

.chapter-title {
  text-align: center;
  font-size: 1.5em;
  font-weight: 600;
  margin-bottom: 2em;
}

.content-text {
  white-space: pre-wrap;
  word-break: break-word;
  text-align: justify;
}

/* 底部导航 */
.reader-footer {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.chapter-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.nav-btn {
  font-size: 15px;
}

/* 弹窗内样式 */
.existing-bookmarks,
.existing-annotations {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.existing-bookmarks h4,
.existing-annotations h4 {
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.bookmark-item,
.annotation-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.bookmark-item:last-child,
.annotation-item:last-child {
  border-bottom: none;
}

.selected-text {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-style: italic;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.annotation-quote {
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
  margin: 0 0 4px 0;
}

.annotation-content {
  margin: 0;
  font-size: 14px;
}

.annotation-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

/* 滚动条样式 */
.content-area::-webkit-scrollbar {
  width: 6px;
}

.content-area::-webkit-scrollbar-track {
  background: transparent;
}

.content-area::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.content-area::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
