import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { chapterDao } from '@/utils/dao'
import { getVolumeContext } from '@/utils/prompts'

/**
 * 章节数据操作相关的组合式函数
 * 提供章节的CRUD操作和数据管理
 */
export function useChapter() {
  const router = useRouter()

  const chapter = ref(null)
  const chapters = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * 加载单个章节
   * @param {number} novelId - 小说ID
   * @param {number} chapterNumber - 章节序号
   */
  const loadChapter = async (novelId, chapterNumber) => {
    loading.value = true
    error.value = null

    try {
      const data = await chapterDao.getByNovelIdAndChapterNumber(novelId, chapterNumber)
      if (!data) {
        message.error('章节不存在')
        return null
      }
      chapter.value = data
      return data
    } catch (err) {
      error.value = err.message
      message.error('加载章节失败')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载小说的所有章节
   * @param {number} novelId - 小说ID
   */
  const loadChapters = async (novelId) => {
    loading.value = true
    error.value = null

    try {
      const list = await chapterDao.getByNovelId(novelId)
      chapters.value = list.sort((a, b) => a.chapterNumber - b.chapterNumber)
      return chapters.value
    } catch (err) {
      error.value = err.message
      message.error('加载章节失败')
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取最近的章节
   * @param {number} novelId - 小说ID
   * @param {number} count - 获取数量
   */
  const getRecentChapters = async (novelId, count = 3) => {
    try {
      return await chapterDao.getRecentChapters(novelId, count)
    } catch (err) {
      console.error('获取最近章节失败:', err)
      return []
    }
  }

  /**
   * 获取章节摘要
   * @param {number} novelId - 小说ID
   * @param {number} limit - 限制数量
   */
  const getChapterSummaries = async (novelId, limit = 100) => {
    try {
      return await chapterDao.getChapterSummaries(novelId, limit)
    } catch (err) {
      console.error('获取章节摘要失败:', err)
      return []
    }
  }

  /**
   * 创建新章节
   * @param {Object} chapterData - 章节数据
   */
  const createChapter = async (chapterData, outline = null) => {
    loading.value = true
    error.value = null

    try {
      const chapter = {
        ...chapterData,
        volumeName: chapterData.volumeName || (outline ? getVolumeContext(chapterData.chapterNumber, outline)?.name || '' : ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const id = await chapterDao.add(chapter)
      message.success('章节保存成功！')
      return id
    } catch (err) {
      error.value = err.message
      message.error('保存章节失败：' + err.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新章节
   * @param {number} id - 章节ID
   * @param {Object} chapterData - 更新的数据
   */
  const updateChapter = async (id, chapterData) => {
    loading.value = true
    error.value = null

    try {
      await chapterDao.update(id, {
        ...chapterData,
        updatedAt: new Date().toISOString(),
      })
      message.success('保存成功')
      return true
    } catch (err) {
      error.value = err.message
      message.error('保存失败：' + err.message)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除章节（带确认）
   * @param {number} id - 章节ID
   * @param {Function} onSuccess - 删除成功回调
   */
  const deleteChapter = (id, onSuccess) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这一章吗？删除后将无法恢复。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await chapterDao.deleteCascade(id)
          message.success('删除成功')
          onSuccess?.()
        } catch (err) {
          message.error('删除失败')
        }
      },
    })
  }

  /**
   * 计算下一个章节序号
   */
  const nextChapterNumber = computed(() => {
    if (!chapters.value?.length) return 1
    return Math.max(...chapters.value.map(ch => Number(ch.chapterNumber) || 0)) + 1
  })

  /**
   * 获取上一章/下一章
   * @param {number} currentNumber - 当前章节序号
   */
  const getPrevNextChapter = (currentNumber) => {
    if (!chapters.value?.length) return { prev: null, next: null }

    const currentIndex = chapters.value.findIndex(
      (ch) => ch.chapterNumber === currentNumber
    )

    return {
      prev: currentIndex > 0 ? chapters.value[currentIndex - 1].chapterNumber : null,
      next: currentIndex >= 0 && currentIndex < chapters.value.length - 1
        ? chapters.value[currentIndex + 1].chapterNumber
        : null,
    }
  }

  /**
   * 跳转到章节详情
   * @param {number} novelId - 小说ID
   * @param {number} chapterNumber - 章节序号
   */
  const goToChapter = (novelId, chapterNumber) => {
    router.push(`/novel/${novelId}/chapter/${chapterNumber}`)
  }

  /**
   * 跳转到创建章节页面
   * @param {number} novelId - 小说ID
   */
  const goToCreate = (novelId) => {
    router.push(`/novel/${novelId}/chapter/create`)
  }

  return {
    chapter,
    chapters,
    loading,
    error,
    nextChapterNumber,
    loadChapter,
    loadChapters,
    getRecentChapters,
    getChapterSummaries,
    createChapter,
    updateChapter,
    deleteChapter,
    getPrevNextChapter,
    goToChapter,
    goToCreate,
  }
}

/**
 * 章节导出功能
 */
export function useChapterExport() {
  /**
   * 导出单个章节
   * @param {Object} chapter - 章节对象
   */
  const exportChapter = (chapter) => {
    const content = `第${chapter.chapterNumber}章 ${chapter.title}\n\n${chapter.content}`
    downloadFile(content, `第${chapter.chapterNumber}章_${chapter.title}.txt`)
    message.success('导出成功')
  }

  /**
   * 导出整本小说
   * @param {Object} novel - 小说对象
   * @param {Array} chapters - 章节列表
   * @param {string} format - 导出格式 (txt/md)
   */
  const exportNovel = (novel, chapters, format = 'txt') => {
    let content = `${novel.title}\n\n`
    content += `${novel.description}\n\n`
    content += `风格：${novel.style?.join('、') || ''}\n\n`
    content += `---\n\n`

    chapters.forEach((ch) => {
      content += `第${ch.chapterNumber}章 ${ch.title}\n\n`
      content += `${ch.content}\n\n`
      content += `---\n\n`
    })

    downloadFile(content, `${novel.title}.${format}`)
    message.success('导出成功')
  }

  /**
   * 下载文件
   * @param {string} content - 文件内容
   * @param {string} filename - 文件名
   */
  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    exportChapter,
    exportNovel,
    downloadFile,
  }
}
