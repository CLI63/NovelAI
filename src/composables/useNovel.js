import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { novelDao, chapterDao, characterDao, foreshadowingDao, characterRelationDao, bookmarkDao, annotationDao, plotLineDao, outlineEventDao } from '@/utils/dao'
import db from '@/utils/db'
import { useAppStore } from '@/stores/app'

/**
 * 小说数据操作相关的组合式函数
 * 提供小说的CRUD操作和数据管理
 */
export function useNovel() {
  const router = useRouter()
  const appStore = useAppStore()

  const novel = ref(null)
  const novels = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * 加载单个小说
   * @param {number} id - 小说ID
   */
  const loadNovel = async (id) => {
    loading.value = true
    error.value = null

    try {
      const data = await novelDao.getById(id)
      if (!data) {
        message.error('小说不存在')
        router.push('/')
        return null
      }
      novel.value = data
      appStore.setCurrentNovel(data)
      return data
    } catch (err) {
      error.value = err.message
      message.error('加载小说失败')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载所有小说列表
   */
  const loadNovels = async () => {
    loading.value = true
    error.value = null

    try {
      const list = await novelDao.getAll()
      // 加载每本小说的章节数和字数
      for (const item of list) {
        const chapters = await chapterDao.getByNovelId(item.id)
        item.chapterCount = chapters.length
        item.totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
      }
      novels.value = list
      return list
    } catch (err) {
      error.value = err.message
      message.error('加载小说列表失败')
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新小说
   * @param {Object} novelData - 小说数据
   */
  const createNovel = async (novelData) => {
    loading.value = true
    error.value = null

    try {
      const novel = {
        ...novelData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const id = await novelDao.add(novel)
      message.success('保存成功！')
      return id
    } catch (err) {
      error.value = err.message
      message.error('保存失败：' + err.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新小说
   * @param {number} id - 小说ID
   * @param {Object} novelData - 更新的数据
   */
  const updateNovel = async (id, novelData) => {
    loading.value = true
    error.value = null

    try {
      await novelDao.update(id, {
        ...novelData,
        updatedAt: new Date().toISOString(),
      })
      message.success('保存成功！')
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
   * 删除小说（带确认）
   * @param {number} id - 小说ID
   * @param {Function} onSuccess - 删除成功回调
   */
  const deleteNovel = (id, onSuccess) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这部小说及其所有章节吗？删除后将无法恢复。',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          // 删除所有章节
          const chapters = await chapterDao.getByNovelId(id)
          const chapterIds = chapters.map(ch => ch.id)
          if (chapterIds.length > 0) {
            await db.chapters.bulkDelete(chapterIds)
          }

          // 级联删除关联数据
          const deletePromises = [
            // 角色及角色关系
            characterDao.getByNovelId(id).then(chars => {
              const charIds = chars.map(c => c.id)
              if (charIds.length > 0) {
                return Promise.all([
                  db.characters.bulkDelete(charIds),
                  characterRelationDao.deleteByNovelId(id)
                ])
              }
            }),
            // 伏笔
            foreshadowingDao.getByNovelId(id).then(items => {
              const ids = items.map(i => i.id)
              if (ids.length > 0) return db.foreshadowing.bulkDelete(ids)
            }),
            // 时间线事件
            db.timelineEvents.where('novelId').equals(id).delete(),
            // 生成任务
            db.generationTasks.where('novelId').equals(id).delete(),
            // 剧情分支
            db.plotBranches.where('novelId').equals(id).delete(),
            // 书签
            bookmarkDao.deleteByNovelId(id),
            // 批注
            annotationDao.deleteByNovelId(id),
            // 剧情线关联事件(先删事件再删剧情线)
            plotLineDao.getByNovelId(id).then(plotLines => {
              const plotLineIds = plotLines.map(pl => pl.id)
              if (plotLineIds.length > 0) {
                return Promise.all([
                  db.outlineEvents.where('plotLineId').anyOf(plotLineIds).delete(),
                  db.plotLines.bulkDelete(plotLineIds)
                ])
              }
            }),
            // 大纲
            db.outlines.where('novelId').equals(id).delete(),
            // 后台任务
            db.backgroundTasks.where('novelId').equals(id).delete(),
            // 小说圣经
            db.novelBibles.where('novelId').equals(id).delete(),
          ]

          await Promise.all(deletePromises)

          // 最后删除小说本体
          await novelDao.delete(id)
          message.success('删除成功')
          onSuccess?.()
        } catch (err) {
          message.error('删除失败：' + err.message)
        }
      },
    })
  }

  /**
   * 深度清理对象，确保可以被IndexedDB克隆
   * @param {Object} obj - 要清理的对象
   */
  const sanitizeForDB = (obj) => {
    if (obj === null || obj === undefined) return null
    try {
      return JSON.parse(JSON.stringify(obj))
    } catch {
      return null
    }
  }

  /**
   * 跳转到小说详情页
   * @param {number} id - 小说ID
   */
  const goToDetail = (id) => {
    router.push(`/novel/${id}`)
  }

  /**
   * 跳转到编辑页
   * @param {number} id - 小说ID
   */
  const goToEdit = (id) => {
    router.push(`/novel/${id}/edit`)
  }

  /**
   * 跳转到创建页
   */
  const goToCreate = () => {
    router.push('/novel/create')
  }

  return {
    novel,
    novels,
    loading,
    error,
    loadNovel,
    loadNovels,
    createNovel,
    updateNovel,
    deleteNovel,
    sanitizeForDB,
    goToDetail,
    goToEdit,
    goToCreate,
  }
}

/**
 * 小说统计信息的组合式函数
 */
export function useNovelStats(novel, chapters) {
  const totalWordCount = computed(() => {
    return chapters.value?.reduce((sum, ch) => sum + (ch.wordCount || 0), 0) || 0
  })

  const progress = computed(() => {
    if (!novel.value?.chapterStructure?.totalChapters) return 0
    return Math.round((chapters.value?.length || 0) / novel.value.chapterStructure.totalChapters * 100)
  })

  const chapterCount = computed(() => chapters.value?.length || 0)

  return {
    totalWordCount,
    progress,
    chapterCount,
  }
}
