import { ref, computed, watch } from 'vue'
import { bookmarkDao, annotationDao } from '@/utils/dao'

/**
 * 阅读器 Composable
 * 管理阅读设置、书签、批注等功能
 */
export function useReader(novelId) {
  const loading = ref(false)
  const bookmarks = ref([])
  const annotations = ref([])

  // 阅读设置
  const settings = ref({
    fontSize: 18,
    lineHeight: 2,
    theme: 'light', // light, sepia, dark
    fontFamily: 'serif', // serif, sans-serif
    width: 'medium' // narrow, medium, wide
  })

  // 从本地存储加载设置
  const loadSettings = () => {
    const saved = localStorage.getItem('reader-settings')
    if (saved) {
      try {
        settings.value = { ...settings.value, ...JSON.parse(saved) }
      } catch (e) {
        console.error('Failed to load reader settings:', e)
      }
    }
  }

  // 保存设置到本地存储
  const saveSettings = () => {
    localStorage.setItem('reader-settings', JSON.stringify(settings.value))
  }

  // 监听设置变化自动保存
  watch(settings, saveSettings, { deep: true })

  // 更新设置
  const updateSettings = (newSettings) => {
    settings.value = { ...settings.value, ...newSettings }
  }

  // 加载书签
  const loadBookmarks = async () => {
    if (!novelId.value) return
    loading.value = true
    try {
      bookmarks.value = await bookmarkDao.getByNovelId(novelId.value)
    } catch (e) {
      console.error('Failed to load bookmarks:', e)
    } finally {
      loading.value = false
    }
  }

  // 添加书签
  const addBookmark = async (chapterId, position, note = '') => {
    try {
      const id = await bookmarkDao.add({
        novelId: novelId.value,
        chapterId,
        position,
        note
      })
      await loadBookmarks()
      return id
    } catch (e) {
      console.error('Failed to add bookmark:', e)
      return null
    }
  }

  // 删除书签
  const deleteBookmark = async (id) => {
    try {
      await bookmarkDao.delete(id)
      await loadBookmarks()
      return true
    } catch (e) {
      console.error('Failed to delete bookmark:', e)
      return false
    }
  }

  // 更新书签备注
  const updateBookmarkNote = async (id, note) => {
    try {
      await bookmarkDao.updateNote(id, note)
      await loadBookmarks()
      return true
    } catch (e) {
      console.error('Failed to update bookmark:', e)
      return false
    }
  }

  // 加载批注
  const loadAnnotations = async () => {
    if (!novelId.value) return
    loading.value = true
    try {
      annotations.value = await annotationDao.getByNovelId(novelId.value)
    } catch (e) {
      console.error('Failed to load annotations:', e)
    } finally {
      loading.value = false
    }
  }

  // 添加批注
  const addAnnotation = async (chapterId, content, selectedText = '', position = null) => {
    try {
      const id = await annotationDao.add({
        novelId: novelId.value,
        chapterId,
        content,
        selectedText,
        position
      })
      await loadAnnotations()
      return id
    } catch (e) {
      console.error('Failed to add annotation:', e)
      return null
    }
  }

  // 更新批注
  const updateAnnotation = async (id, content) => {
    try {
      await annotationDao.update(id, { content })
      await loadAnnotations()
      return true
    } catch (e) {
      console.error('Failed to update annotation:', e)
      return false
    }
  }

  // 删除批注
  const deleteAnnotation = async (id) => {
    try {
      await annotationDao.delete(id)
      await loadAnnotations()
      return true
    } catch (e) {
      console.error('Failed to delete annotation:', e)
      return false
    }
  }

  // 获取指定章节的书签
  const getChapterBookmarks = (chapterId) => {
    return bookmarks.value.filter(b => b.chapterId === chapterId)
  }

  // 获取指定章节的批注
  const getChapterAnnotations = (chapterId) => {
    return annotations.value.filter(a => a.chapterId === chapterId)
  }

  // 主题样式映射
  const themeStyles = computed(() => {
    const themes = {
      light: {
        background: '#ffffff',
        textColor: '#1a1a1a',
        secondaryColor: '#6b7280'
      },
      sepia: {
        background: '#f4ecd8',
        textColor: '#3d3529',
        secondaryColor: '#7d7465'
      },
      dark: {
        background: '#1a1a1a',
        textColor: '#e5e5e5',
        secondaryColor: '#9ca3af'
      }
    }
    return themes[settings.value.theme] || themes.light
  })

  // 内容宽度映射
  const contentWidth = computed(() => {
    const widths = {
      narrow: '600px',
      medium: '800px',
      wide: '1000px'
    }
    return widths[settings.value.width] || widths.medium
  })

  return {
    loading,
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
    updateBookmarkNote,
    loadAnnotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    getChapterBookmarks,
    getChapterAnnotations
  }
}

/**
 * 阅读进度管理
 */
export function useReadingProgress(novelId, chapters) {
  const progressKey = computed(() => `reading-progress-${novelId.value}`)

  // 当前阅读位置
  const currentProgress = ref({
    chapterId: null,
    chapterNumber: 1,
    position: 0 // 滚动位置或百分比
  })

  // 加载进度
  const loadProgress = () => {
    const saved = localStorage.getItem(progressKey.value)
    if (saved) {
      try {
        currentProgress.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load reading progress:', e)
      }
    }
  }

  // 保存进度
  const saveProgress = (chapterId, chapterNumber, position = 0) => {
    currentProgress.value = { chapterId, chapterNumber, position }
    localStorage.setItem(progressKey.value, JSON.stringify(currentProgress.value))
  }

  // 计算阅读百分比
  const readingPercent = computed(() => {
    if (!chapters.value?.length) return 0
    const sortedChapters = [...chapters.value].sort((left, right) =>
      Number(left.chapterNumber || 0) - Number(right.chapterNumber || 0)
    )
    const currentIndex = sortedChapters.findIndex(chapter =>
      Number(chapter.chapterNumber) === Number(currentProgress.value.chapterNumber)
    )
    // 按章节列表索引计算阅读进度，避免章节号不连续时超过 100%。
    if (currentIndex < 0) return 0
    return Math.min(100, Math.max(0, Math.round(((currentIndex + 1) / sortedChapters.length) * 100)))
  })

  return {
    currentProgress,
    readingPercent,
    loadProgress,
    saveProgress
  }
}
