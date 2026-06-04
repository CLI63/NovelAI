<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useNovel, useNovelStats } from '@/composables/useNovel'
import { useChapter, useChapterExport } from '@/composables/useChapter'
import { useCharacter } from '@/composables/useCharacter'
import { useForeshadowing } from '@/composables/useForeshadowing'
import { useGenerationQueue } from '@/composables/useGenerationQueue'
import { usePlotBranch } from '@/composables/usePlotBranch'
import { useAppStore } from '@/stores/app'
import PageHeader from '@/components/common/PageHeader.vue'
import NovelInfo from '@/components/novel/NovelInfo.vue'
import ChapterList from '@/components/chapter/ChapterList.vue'
import RelationshipGraph from '@/components/character/RelationshipGraph.vue'
import { useFullNovelQualityCheck } from '@/composables/useFullNovelQualityCheck'
import { useAI } from '@/composables/useAI'
import { useGlobalFullNovelGeneration } from '@/composables/useGlobalFullNovelGeneration'

const router = useRouter()
const route = useRoute()

const { novel, loading: novelLoading, loadNovel, deleteNovel, goToEdit } = useNovel()
const { chapters, loading: chaptersLoading, loadChapters, goToChapter, goToCreate, deleteChapter } = useChapter()
const { exportNovel } = useChapterExport()
const { generate: aiGenerate } = useAI()
const { scanResults, scanning, runFullScan } = useFullNovelQualityCheck()

const fullGenPrompt = ref('')
const {
  fullGen,
  start: startFullGeneration,
  isRunning: isFullGenRunning
} = useGlobalFullNovelGeneration()

// 角色管理
const {
  characters,
  loading: charactersLoading,
  loadCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter
} = useCharacter()

// 伏笔管理
const {
  foreshadowings: foreshadowingList,
  loading: foreshadowingLoading,
  loadForeshadowings: loadForeshadowing,
  createForeshadowing,
  updateForeshadowing,
  deleteForeshadowing,
  pendingForeshadowings: pendingForeshadowing,
  resolvedForeshadowings: resolvedForeshadowing
} = useForeshadowing()

// 生成任务队列
const {
  tasks,
  loading: tasksLoading,
  loadTasks,
  createTask,
  pauseTask,
  resumeTask,
  cancelTask,
  runningTask,
  taskStats
} = useGenerationQueue()

// 全本一键生成
const handleStartFullGeneration = async () => {
  const store = useAppStore()
  if (!store.getCurrentApiKey()) {
    message.warning('请先在设置中配置 API Key')
    router.push('/settings')
    return
  }

  message.info('全本生成已在后台开始，您可以继续使用页面其他功能')

  try {
    await startFullGeneration(novel.value.id, fullGenPrompt.value)

    if (fullGen.phase === 'completed') {
      message.success(`全本生成完成，章节后处理将在后台继续执行。共 ${fullGen.results.length} 章`)
    }
  } catch (error) {
    console.error('全本生成失败:', error)
    message.error('全本生成失败：' + error.message)
  }
}

// 全本质量扫描
const showQualityModal = ref(false)

const handleQualityScan = async () => {
  const hasAi = !!useAppStore().getCurrentApiKey()
  if (!hasAi) {
    message.warning('配置 API Key 后可启用 AI 深度检查')
  }

  showQualityModal.value = true
  await runFullScan(novel.value.id, {
    callAI: hasAi ? aiGenerate : null
  })
}

const qualityRatingColor = (rating) => ({
  excellent: '#52c41a',
  good: '#1890ff',
  fair: '#faad14',
  poor: '#ff4d4f'
})[rating] || '#999'

const checkLabels = {
  wordCount: '📏 字数均衡',
  characterPresence: '👤 角色出场',
  foreshadowing: '🎯 伏笔回收',
  timeline: '📅 时间线连贯性',
  characterConsistency: '👥 角色一致性（AI）',
  plotHoles: '🔍 情节漏洞（AI）',
  styleConsistency: '✍️ 风格一致性（AI）'
}

const qualityRatingText = (rating) => ({
  excellent: '优秀',
  good: '良好',
  fair: '一般',
  poor: '需改进'
})[rating] || '未知'

// 剧情分支管理
const {
  branches,
  loading: branchesLoading,
  loadBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  mergeBranch
} = usePlotBranch()

const chapterSortOrder = ref('desc') // 'asc' | 'desc'

const sortedChapters = computed(() => {
  const list = [...chapters.value]
  list.sort((a, b) => chapterSortOrder.value === 'desc' ? b.chapterNumber - a.chapterNumber : a.chapterNumber - b.chapterNumber)
  return list
})

const toggleChapterSort = () => {
  chapterSortOrder.value = chapterSortOrder.value === 'desc' ? 'asc' : 'desc'
}

const activeTab = ref('chapters')
const characterViewMode = ref('cards') // 'cards' | 'graph'

// 统计信息
const { totalWordCount, progress } = useNovelStats(novel, chapters)

// 角色相关
const characterModalVisible = ref(false)
const editingCharacter = ref(null)
const characterForm = ref({
  name: '',
  type: 'protagonist',
  basicInfo: {
    age: '',
    identity: '',
    appearance: '',
    personality: ''
  },
  background: '',
  goals: [],
  abilities: []
})

// 伏笔相关
const foreshadowingModalVisible = ref(false)
const editingForeshadowing = ref(null)
const foreshadowingForm = ref({
  content: '',
  importance: 'medium',
  relatedCharacters: [],
  notes: ''
})

// 伏笔分页
const foreshadowingPagination = ref({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (total) => `共 ${total} 条`
})

// 伏笔分页数据
const paginatedForeshadowingList = computed(() => {
  const start = (foreshadowingPagination.value.current - 1) * foreshadowingPagination.value.pageSize
  const end = start + foreshadowingPagination.value.pageSize
  return foreshadowingList.value.slice(start, end)
})

// 伏笔分页变化处理
const handleForeshadowingPageChange = (page, pageSize) => {
  foreshadowingPagination.value.current = page
  foreshadowingPagination.value.pageSize = pageSize
}

// 加载数据
const loadData = async () => {
  const id = parseInt(route.params.id)
  await loadNovel(id)
  if (novel.value) {
    await Promise.all([
      loadChapters(novel.value.id),
      loadCharacters(novel.value.id),
      loadForeshadowing(novel.value.id),
      loadTasks(novel.value.id),
      loadBranches(novel.value.id)
    ])
  }
}

// 处理删除小说
const handleDeleteNovel = () => {
  deleteNovel(novel.value.id, () => router.push('/novels'))
}

// 处理导出
const handleExport = () => {
  Modal.confirm({
    title: '导出小说',
    content: '选择导出格式',
    okText: 'TXT',
    cancelText: 'Markdown',
    onOk: () => exportNovel(novel.value, chapters.value, 'txt'),
    onCancel: () => exportNovel(novel.value, chapters.value, 'md'),
  })
}

// 处理查看章节
const handleViewChapter = (chapter) => {
  goToChapter(novel.value.id, chapter.chapterNumber)
}

// 处理删除章节
const handleDeleteChapter = (chapter) => {
  deleteChapter(chapter.id, () => loadChapters(novel.value.id))
}

// 返回列表
const handleBack = () => {
  router.push('/novels')
}

// 开始阅读
const handleStartReading = () => {
  router.push(`/reader/${novel.value.id}`)
}

// 打开大纲编辑器
const handleOpenOutline = () => {
  router.push(`/novel/${novel.value.id}/outline`)
}

// ============ 角色管理方法 ============
const openCharacterModal = (character = null) => {
  if (character) {
    editingCharacter.value = character
    characterForm.value = {
      name: character.name,
      type: character.type,
      basicInfo: { ...character.basicInfo },
      background: character.background || '',
      goals: character.goals || [],
      abilities: character.abilities || []
    }
  } else {
    editingCharacter.value = null
    characterForm.value = {
      name: '',
      type: 'protagonist',
      basicInfo: { age: '', identity: '', appearance: '', personality: '' },
      background: '',
      goals: [],
      abilities: []
    }
  }
  characterModalVisible.value = true
}

const handleSaveCharacter = async () => {
  if (!characterForm.value.name) {
    message.warning('请输入角色名称')
    return
  }
  
  try {
    if (editingCharacter.value) {
      await updateCharacter(editingCharacter.value.id, characterForm.value)
      message.success('角色更新成功')
    } else {
      await createCharacter({
        ...characterForm.value,
        novelId: novel.value.id
      })
      message.success('角色创建成功')
    }
    characterModalVisible.value = false
    loadCharacters(novel.value.id)
  } catch (error) {
    message.error('操作失败：' + error.message)
  }
}

const handleDeleteCharacterConfirm = (character) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除角色「${character.name}」吗？`,
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      await deleteCharacter(character.id)
      message.success('角色已删除')
      loadCharacters(novel.value.id)
    }
  })
}

// ============ 辅助方法 ============
const getChapterTitle = (chapterRef) => {
  if (!chapterRef) return ''

  const chapter = chapters.value.find(c => c.id === chapterRef || c.chapterNumber === chapterRef)
  return chapter ? chapter.title : `章节 ${chapterRef}`
}

const goToForeshadowingChapter = (chapterRef, fallbackChapterNumber = null) => {
  if (!chapterRef || !novel.value) return

  const targetChapter = chapters.value.find(c => c.id === chapterRef || c.chapterNumber === chapterRef)
  if (targetChapter) {
    goToChapter(novel.value.id, targetChapter.chapterNumber)
    return
  }

  if (fallbackChapterNumber) {
    goToChapter(novel.value.id, fallbackChapterNumber)
  }
}

// ============ 伏笔管理方法 ============
const openForeshadowingModal = (foreshadowing = null) => {
  if (foreshadowing) {
    editingForeshadowing.value = foreshadowing
    foreshadowingForm.value = {
      content: foreshadowing.content,
      importance: foreshadowing.importance,
      relatedCharacters: foreshadowing.relatedCharacters || [],
      notes: foreshadowing.notes || ''
    }
  } else {
    editingForeshadowing.value = null
    foreshadowingForm.value = {
      content: '',
      importance: 'medium',
      relatedCharacters: [],
      notes: ''
    }
  }
  foreshadowingModalVisible.value = true
}

const handleSaveForeshadowing = async () => {
  if (!foreshadowingForm.value.content) {
    message.warning('请输入伏笔内容')
    return
  }
  
  try {
    if (editingForeshadowing.value) {
      await updateForeshadowing(editingForeshadowing.value.id, foreshadowingForm.value)
      message.success('伏笔更新成功')
    } else {
      await createForeshadowing({
        ...foreshadowingForm.value,
        novelId: novel.value.id,
        type: 'planted',
        status: 'pending'
      })
      message.success('伏笔创建成功')
    }
    foreshadowingModalVisible.value = false
    loadForeshadowing(novel.value.id)
  } catch (error) {
    message.error('操作失败：' + error.message)
  }
}

const handleResolveForeshadowing = async (foreshadowing) => {
  const nextChapterNumber = chapters.value.length > 0
    ? Math.max(...chapters.value.map(ch => Number(ch.chapterNumber) || 0)) + 1
    : 1

  await updateForeshadowing(foreshadowing.id, {
    status: 'resolved',
    resolvedIn: null,
    resolvedInChapterNumber: nextChapterNumber
  })
  message.success('伏笔已标记为回收')
  loadForeshadowing(novel.value.id)
}

const handleDeleteForeshadowingConfirm = (foreshadowing) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这个伏笔吗？',
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      await deleteForeshadowing(foreshadowing.id)
      message.success('伏笔已删除')
      loadForeshadowing(novel.value.id)
    }
  })
}

// ============ 任务队列方法 ============
const handlePauseTask = async (taskId) => {
  await pauseTask(taskId)
  message.info('任务已暂停')
  loadTasks(novel.value.id)
}

const handleResumeTask = async (taskId) => {
  await resumeTask(taskId)
  message.success('任务已恢复')
  loadTasks(novel.value.id)
}

const handleCancelTask = async (taskId) => {
  Modal.confirm({
    title: '取消任务',
    content: '确定要取消这个生成任务吗？',
    okText: '取消任务',
    okType: 'danger',
    onOk: async () => {
      await cancelTask(taskId)
      message.success('任务已取消')
      loadTasks(novel.value.id)
    }
  })
}

// ============ 剧情分支方法 ============
const branchModalVisible = ref(false)
const editingBranch = ref(null)
const branchForm = ref({
  name: '',
  type: 'sub',
  description: '',
  status: 'active'
})

const handleCreateBranch = () => {
  editingBranch.value = null
  branchForm.value = {
    name: '',
    type: 'sub',
    description: '',
    status: 'active'
  }
  branchModalVisible.value = true
}

const handleEditBranch = (branch) => {
  editingBranch.value = branch
  branchForm.value = {
    name: branch.name,
    type: branch.type,
    description: branch.description,
    status: branch.status
  }
  branchModalVisible.value = true
}

const handleSaveBranch = async () => {
  if (!branchForm.value.name) {
    message.warning('请输入分支名称')
    return
  }
  
  if (editingBranch.value) {
    await updateBranch(editingBranch.value.id, branchForm.value)
    message.success('分支已更新')
  } else {
    await createBranch({
      ...branchForm.value,
      novelId: novel.value.id
    })
    message.success('分支已创建')
  }
  
  branchModalVisible.value = false
  loadBranches(novel.value.id)
}

const handleDeleteBranch = (branchId) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这个剧情分支吗？',
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      await deleteBranch(branchId)
      message.success('分支已删除')
      loadBranches(novel.value.id)
    }
  })
}

const getTaskStatusColor = (status) => {
  const colors = {
    pending: 'default',
    running: 'processing',
    paused: 'warning',
    completed: 'success',
    failed: 'error'
  }
  return colors[status] || 'default'
}

const getTaskStatusText = (status) => {
  const texts = {
    pending: '等待中',
    running: '生成中',
    paused: '已暂停',
    completed: '已完成',
    failed: '失败'
  }
  return texts[status] || status
}

// 角色类型映射
const characterTypeMap = {
  protagonist: { text: '主角', color: 'blue' },
  supporting: { text: '配角', color: 'green' },
  antagonist: { text: '反派', color: 'red' },
  minor: { text: '次要角色', color: 'default' }
}

// 伏笔重要性映射
const importanceMap = {
  high: { text: '高', color: 'red' },
  medium: { text: '中', color: 'orange' },
  low: { text: '低', color: 'default' }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="novel-detail-page">
    <a-spin :spinning="novelLoading" size="large">
      <template v-if="novel">
        <!-- 页面头部 -->
        <PageHeader
          :title="novel.title"
          :subtitle="`预估 ${novel.estimatedWords}`"
          icon="📖"
          show-back
          @back="handleBack"
        >
          <template #actions>
            <a-button @click="goToEdit(novel.id)">
              编辑
            </a-button>
            <a-button @click="handleOpenOutline">
              大纲编辑器
            </a-button>
            <a-button @click="handleExport">
              导出
            </a-button>
            <a-button
              v-if="chapters.length > 0"
              type="default"
              @click="handleStartReading"
            >
              开始阅读
            </a-button>
            <a-button type="primary" @click="goToCreate(novel.id)">
              生成章节
            </a-button>
            <a-button
              type="primary"
              ghost
              class="btn-full-gen"
              :disabled="isFullGenRunning"
              @click="handleStartFullGeneration"
            >
              {{ isFullGenRunning ? '全本生成中' : '生成全本' }}
            </a-button>
            <a-textarea
              v-model:value="fullGenPrompt"
              :rows="1"
              style="width: 260px"
              placeholder="全本生成额外要求（可选）"
            />
            <a-button
              :loading="scanning"
              @click="handleQualityScan"
            >
              质量扫描
            </a-button>
          </template>
        </PageHeader>

        <!-- 标签页 -->
        <a-card :bordered="false" class="content-card">
          <a-tabs v-model:activeKey="activeTab" size="large">
            <!-- 章节列表 -->
            <a-tab-pane key="chapters">
              <template #tab>
                <span class="tab-label">
                  <span class="tab-icon">📚</span>
                  章节列表
                </span>
              </template>
              <div class="tab-header">
                <span class="chapter-count">{{ chapters.length }} 章</span>
                <a-space>
                  <a-button size="small" @click="toggleChapterSort">
                    <template #icon>
                      <span>{{ chapterSortOrder === 'desc' ? '⬇️' : '⬆️' }}</span>
                    </template>
                    {{ chapterSortOrder === 'desc' ? '最新优先' : '最早优先' }}
                  </a-button>
                  <a-button type="primary" @click="goToCreate(novel.id)">
                    生成新章节
                  </a-button>
                </a-space>
              </div>
              <ChapterList
                :chapters="sortedChapters"
                :novel-id="novel.id"
                :loading="chaptersLoading"
                @view="handleViewChapter"
                @delete="handleDeleteChapter"
              />
            </a-tab-pane>

            <!-- 小说信息 -->
            <a-tab-pane key="info">
              <template #tab>
                <span class="tab-label">
                  <span class="tab-icon">📖</span>
                  小说信息
                </span>
              </template>
              <NovelInfo :novel="novel" :chapters="chapters" />
            </a-tab-pane>

            <!-- 角色管理 -->
            <a-tab-pane key="characters">
              <template #tab>
                <span class="tab-label">
                  <span class="tab-icon">👥</span>
                  角色管理
                </span>
              </template>
              <div class="tab-header">
                <span class="chapter-count">{{ characters.length }} 个角色</span>
                <a-space>
                  <a-radio-group v-model:value="characterViewMode" button-style="solid">
                    <a-radio-button value="cards">卡片视图</a-radio-button>
                    <a-radio-button value="graph">关系图谱</a-radio-button>
                  </a-radio-group>
                  <a-button type="primary" @click="openCharacterModal()">
                    添加角色
                  </a-button>
                </a-space>
              </div>

              <!-- 卡片视图 -->
              <div v-if="characterViewMode === 'cards'">
                <a-spin :spinning="charactersLoading">
                  <div v-if="characters.length === 0" class="empty-state">
                    <a-empty description="暂无角色，点击上方按钮添加" />
                  </div>
                  <div v-else class="character-grid">
                    <a-card
                      v-for="character in characters"
                      :key="character.id"
                      class="character-card"
                      size="small"
                    >
                      <template #title>
                        <div class="character-title">
                          <span>{{ character.name }}</span>
                          <a-tag :color="characterTypeMap[character.type]?.color">
                            {{ characterTypeMap[character.type]?.text }}
                          </a-tag>
                        </div>
                      </template>
                      <template #extra>
                        <a-space>
                          <a-button type="link" size="small" @click="openCharacterModal(character)">
                            编辑
                          </a-button>
                          <a-button type="link" size="small" danger @click="handleDeleteCharacterConfirm(character)">
                            删除
                          </a-button>
                        </a-space>
                      </template>

                      <div class="character-info">
                        <p v-if="character.basicInfo?.identity">
                          <strong>身份：</strong>{{ character.basicInfo.identity }}
                        </p>
                        <p v-if="character.basicInfo?.personality">
                          <strong>性格：</strong>{{ character.basicInfo.personality }}
                        </p>
                        <p v-if="character.background">
                          <strong>背景：</strong>{{ character.background }}
                        </p>
                      </div>
                    </a-card>
                  </div>
                </a-spin>
              </div>

              <!-- 关系图谱视图 -->
              <div v-else class="relationship-graph-container">
                <RelationshipGraph
                  v-if="novel"
                  :novel-id="novel.id"
                  :characters="characters"
                />
              </div>
            </a-tab-pane>

            <!-- 伏笔管理 -->
            <a-tab-pane key="foreshadowing">
              <template #tab>
                <span class="tab-label">
                  <span class="tab-icon">🎯</span>
                  伏笔管理
                </span>
              </template>
              <div class="tab-header">
                <div class="foreshadowing-stats">
                  <a-tag color="orange">待回收: {{ pendingForeshadowing.length }}</a-tag>
                  <a-tag color="green">已回收: {{ resolvedForeshadowing.length }}</a-tag>
                </div>
                <a-button type="primary" @click="openForeshadowingModal()">
                  添加伏笔
                </a-button>
              </div>
              
              <a-spin :spinning="foreshadowingLoading">
                <div v-if="foreshadowingList.length === 0" class="empty-state">
                  <a-empty description="暂无伏笔，点击上方按钮添加" />
                </div>
                <div v-else>
                  <div class="foreshadowing-list">
                    <a-card
                      v-for="item in paginatedForeshadowingList"
                      :key="item.id"
                      class="foreshadowing-card"
                      :class="{ 'foreshadowing-resolved': item.status === 'resolved' }"
                      size="small"
                    >
                      <template #title>
                        <div class="foreshadowing-title">
                          <span>{{ item.content }}</span>
                          <a-space>
                            <a-tag :color="importanceMap[item.importance]?.color">
                              {{ importanceMap[item.importance]?.text }}优先级
                            </a-tag>
                            <a-tag :color="item.status === 'resolved' ? 'success' : 'warning'">
                              {{ item.status === 'resolved' ? '已回收' : '待回收' }}
                            </a-tag>
                          </a-space>
                        </div>
                      </template>
                      <template #extra>
                        <a-space>
                          <a-button
                            v-if="item.status === 'pending'"
                            type="link"
                            size="small"
                            @click="handleResolveForeshadowing(item)"
                          >
                            标记回收
                          </a-button>
                          <a-button type="link" size="small" @click="openForeshadowingModal(item)">
                            编辑
                          </a-button>
                          <a-button type="link" size="small" danger @click="handleDeleteForeshadowingConfirm(item)">
                            删除
                          </a-button>
                        </a-space>
                      </template>
                      
                      <div class="foreshadowing-meta">
                        <span v-if="item.chapterId" class="foreshadowing-chapter">
                          <strong>产生章节：</strong>
                          <a-button type="link" size="small" @click="goToForeshadowingChapter(item.chapterId, item.plantedInChapter)">
                            {{ getChapterTitle(item.chapterId || item.plantedInChapter) }}
                          </a-button>
                        </span>
                        <span v-if="item.resolvedIn" class="foreshadowing-resolved-chapter">
                          <strong>回收章节：</strong>
                          <a-button type="link" size="small" @click="goToForeshadowingChapter(item.resolvedIn, item.resolvedInChapterNumber)">
                            {{ getChapterTitle(item.resolvedIn || item.resolvedInChapterNumber) }}
                          </a-button>
                        </span>
                      </div>
                      <p v-if="item.notes" class="foreshadowing-notes">
                        <strong>备注：</strong>{{ item.notes }}
                      </p>
                    </a-card>
                  </div>
                  <div class="pagination-container">
                    <a-pagination
                      v-model:current="foreshadowingPagination.current"
                      v-model:pageSize="foreshadowingPagination.pageSize"
                      :total="foreshadowingList.length"
                      :showSizeChanger="foreshadowingPagination.showSizeChanger"
                      :showQuickJumper="foreshadowingPagination.showQuickJumper"
                      :pageSizeOptions="foreshadowingPagination.pageSizeOptions"
                      :showTotal="foreshadowingPagination.showTotal"
                      @change="handleForeshadowingPageChange"
                    />
                  </div>
                </div>
              </a-spin>
            </a-tab-pane>

            <!-- 生成任务队列 -->
            <a-tab-pane key="tasks">
              <template #tab>
                <span class="tab-label">
                  <span class="tab-icon">⚡</span>
                  生成任务
                </span>
              </template>
              <div class="tab-header">
                <div class="task-stats">
                  <a-tag v-if="taskStats.running > 0" color="processing">运行中: {{ taskStats.running }}</a-tag>
                  <a-tag v-if="taskStats.pending > 0" color="default">等待中: {{ taskStats.pending }}</a-tag>
                  <a-tag v-if="taskStats.completed > 0" color="success">已完成: {{ taskStats.completed }}</a-tag>
                </div>
              </div>
              
              <a-spin :spinning="tasksLoading">
                <div v-if="tasks.length === 0" class="empty-state">
                  <a-empty description="暂无生成任务" />
                </div>
                <div v-else class="task-list">
                  <a-card 
                    v-for="task in tasks" 
                    :key="task.id" 
                    class="task-card"
                    size="small"
                  >
                    <template #title>
                      <div class="task-title">
                        <span>{{ task.type === 'batch' ? '批量生成' : '单章生成' }}</span>
                        <a-tag :color="getTaskStatusColor(task.status)">
                          {{ getTaskStatusText(task.status) }}
                        </a-tag>
                      </div>
                    </template>
                    <template #extra>
                      <a-space>
                        <a-button 
                          v-if="task.status === 'running'"
                          type="link" 
                          size="small" 
                          @click="handlePauseTask(task.id)"
                        >
                          暂停
                        </a-button>
                        <a-button 
                          v-if="task.status === 'paused'"
                          type="link" 
                          size="small" 
                          @click="handleResumeTask(task.id)"
                        >
                          继续
                        </a-button>
                        <a-button 
                          v-if="['pending', 'paused'].includes(task.status)"
                          type="link" 
                          size="small" 
                          danger
                          @click="handleCancelTask(task.id)"
                        >
                          取消
                        </a-button>
                      </a-space>
                    </template>
                    
                    <div class="task-info">
                      <p><strong>章节范围：</strong>第 {{ task.chapters?.[0]?.number }} - {{ task.chapters?.[task.chapters.length - 1]?.number }} 章</p>
                      <p><strong>进度：</strong>{{ task.progress }}%</p>
                      <a-progress :percent="task.progress" :status="task.status === 'failed' ? 'exception' : 'active'" />
                    </div>
                  </a-card>
                </div>
              </a-spin>
            </a-tab-pane>

            <!-- 剧情分支 -->
            <a-tab-pane key="branches">
              <template #tab>
                <span>
                  <span class="tab-icon">🌳</span>
                  剧情分支
                </span>
              </template>
              
              <a-spin :spinning="branchesLoading">
                <div class="branches-section">
                  <!-- 分支列表 -->
                  <div class="branch-list">
                    <a-card
                      v-for="branch in branches"
                      :key="branch.id"
                      class="branch-card"
                      :class="{ 'main-branch': branch.type === 'main' }"
                    >
                      <template #title>
                        <div class="branch-header">
                          <span class="branch-name">
                            <a-tag :color="branch.type === 'main' ? 'blue' : 'green'">
                              {{ branch.type === 'main' ? '主线' : '支线' }}
                            </a-tag>
                            {{ branch.name }}
                          </span>
                          <a-tag v-if="branch.status === 'active'" color="processing">进行中</a-tag>
                          <a-tag v-else-if="branch.status === 'ended'" color="default">已结束</a-tag>
                          <a-tag v-else-if="branch.status === 'merged'" color="success">已合并</a-tag>
                        </div>
                      </template>
                      
                      <p class="branch-description">{{ branch.description || '暂无描述' }}</p>
                      
                      <div class="branch-meta">
                        <span v-if="branch.chapters?.length">
                          关联章节：第 {{ branch.chapters.join('、') }} 章
                        </span>
                      </div>
                      
                      <div class="branch-actions">
                        <a-button size="small" @click="handleEditBranch(branch)">编辑</a-button>
                        <a-button
                          v-if="branch.type !== 'main'"
                          size="small"
                          danger
                          @click="handleDeleteBranch(branch.id)"
                        >
                          删除
                        </a-button>
                      </div>
                    </a-card>
                  </div>
                  
                  <!-- 添加分支按钮 -->
                  <a-button type="dashed" block @click="handleCreateBranch">
                    <template #icon>
                      <span>➕</span>
                    </template>
                    添加剧情分支
                  </a-button>
                </div>
              </a-spin>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </template>
    </a-spin>

    <!-- 角色编辑弹窗 -->
    <a-modal
      v-model:open="characterModalVisible"
      :title="editingCharacter ? '编辑角色' : '添加角色'"
      @ok="handleSaveCharacter"
      :confirmLoading="charactersLoading"
    >
      <a-form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <a-form-item label="名称" required>
          <a-input v-model:value="characterForm.name" placeholder="请输入角色名称" />
        </a-form-item>
        <a-form-item label="类型">
          <a-select v-model:value="characterForm.type">
            <a-select-option value="protagonist">主角</a-select-option>
            <a-select-option value="supporting">配角</a-select-option>
            <a-select-option value="antagonist">反派</a-select-option>
            <a-select-option value="minor">次要角色</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="身份">
          <a-input v-model:value="characterForm.basicInfo.identity" placeholder="角色身份" />
        </a-form-item>
        <a-form-item label="年龄">
          <a-input v-model:value="characterForm.basicInfo.age" placeholder="角色年龄" />
        </a-form-item>
        <a-form-item label="外貌">
          <a-textarea v-model:value="characterForm.basicInfo.appearance" placeholder="外貌描述" :rows="2" />
        </a-form-item>
        <a-form-item label="性格">
          <a-input v-model:value="characterForm.basicInfo.personality" placeholder="性格特点" />
        </a-form-item>
        <a-form-item label="背景">
          <a-textarea v-model:value="characterForm.background" placeholder="角色背景故事" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 伏笔编辑弹窗 -->
    <a-modal
      v-model:open="foreshadowingModalVisible"
      :title="editingForeshadowing ? '编辑伏笔' : '添加伏笔'"
      @ok="handleSaveForeshadowing"
      :confirmLoading="foreshadowingLoading"
    >
      <a-form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <a-form-item label="内容" required>
          <a-textarea v-model:value="foreshadowingForm.content" placeholder="伏笔内容描述" :rows="3" />
        </a-form-item>
        <a-form-item label="重要性">
          <a-radio-group v-model:value="foreshadowingForm.importance">
            <a-radio value="high">高</a-radio>
            <a-radio value="medium">中</a-radio>
            <a-radio value="low">低</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="foreshadowingForm.notes" placeholder="备注信息" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 剧情分支编辑弹窗 -->
    <a-modal
      v-model:open="branchModalVisible"
      :title="editingBranch ? '编辑剧情分支' : '添加剧情分支'"
      @ok="handleSaveBranch"
      :confirmLoading="branchesLoading"
    >
      <a-form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <a-form-item label="分支名称" required>
          <a-input v-model:value="branchForm.name" placeholder="请输入分支名称" />
        </a-form-item>
        <a-form-item label="类型">
          <a-radio-group v-model:value="branchForm.type">
            <a-radio value="main">主线</a-radio>
            <a-radio value="sub">支线</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="branchForm.description" placeholder="分支剧情描述" :rows="3" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="branchForm.status">
            <a-select-option value="active">进行中</a-select-option>
            <a-select-option value="ended">已结束</a-select-option>
            <a-select-option value="merged">已合并</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 全本质量扫描弹窗 -->
    <a-modal
      v-model:open="showQualityModal"
      title="📊 全本质量扫描"
      :footer="null"
      width="720px"
      :destroy-on-close="true"
    >
      <a-spin :spinning="scanning">
        <template v-if="scanResults && scanResults.summary">
          <!-- 总体评分 -->
          <a-card :bordered="false" class="quality-summary-card">
            <div class="quality-score">
              <a-progress
                type="circle"
                :percent="scanResults.summary.score"
                :stroke-color="qualityRatingColor(scanResults.summary.rating)"
                :format="() => qualityRatingText(scanResults.summary.rating)"
                size="80"
              />
            </div>
            <div class="quality-summary-detail">
              <p>章节：{{ scanResults.totalChapters }} 章</p>
              <p>角色：{{ scanResults.totalChars }} 个</p>
              <p>
                检查项通过：{{ scanResults.summary.passed }}/{{ scanResults.summary.total }}
                <a-tag v-if="scanResults.summary.highIssues > 0" color="red">
                  高优问题 {{ scanResults.summary.highIssues }} 个
                </a-tag>
              </p>
            </div>
          </a-card>

          <!-- 各检查项详情 -->
          <a-collapse class="quality-detail" :expand-icon-position="'right'">
            <a-collapse-panel
              v-for="(check, key) in scanResults.checks"
              :key="key"
            >
              <template #header>
                <span :style="{ color: check.passed !== false ? '#52c41a' : '#faad14' }">
                  {{ checkLabels[key] || key }}
                </span>
              </template>
              <p>{{ check.message }}</p>
              <ul v-if="check.outliers?.length > 0" class="quality-issue-list">
                <li v-for="item in check.outliers" :key="item.chapter">
                  第{{ item.chapter }}章 {{ item.title }}：{{ item.wordCount }}字（{{ item.diff > 0 ? '+' : '' }}{{ item.diff }}%）
                </li>
              </ul>
              <ul v-if="check.absentChapters?.length > 0" class="quality-issue-list">
                <li v-for="item in check.absentChapters" :key="item.chapter">
                  第{{ item.chapter }}章 {{ item.title }}
                </li>
              </ul>
              <ul v-if="check.highPendingItems?.length > 0" class="quality-issue-list">
                <li v-for="item in check.highPendingItems" :key="item.content">
                  {{ item.content }}（埋设于第{{ item.plantedIn }}章）
                </li>
              </ul>
              <ul v-if="check.issues?.length > 0" class="quality-issue-list">
                <li v-for="(issue, i) in check.issues" :key="i" :class="'severity-' + issue.severity">
                  <a-tag v-if="issue.severity === 'high'" color="red">高</a-tag>
                  <a-tag v-else-if="issue.severity === 'medium'" color="orange">中</a-tag>
                  <a-tag v-else color="blue">低</a-tag>
                  {{ issue.description }}
                  <span v-if="issue.suggestedFix" class="quality-fix">建议：{{ issue.suggestedFix }}</span>
                </li>
              </ul>
              <div v-if="!check.outliers?.length && !check.absentChapters?.length && !check.highPendingItems?.length && !check.issues?.length" class="quality-pass">
                ✅ 通过
              </div>
            </a-collapse-panel>
          </a-collapse>

          <!-- 关闭按钮 -->
          <div class="modal-footer-actions">
            <a-button type="primary" @click="showQualityModal = false">关闭</a-button>
          </div>
        </template>

        <template v-else-if="scanResults && scanResults.overall === 'no_data'">
          <a-empty description="小说不存在或尚无章节" />
        </template>

        <template v-else-if="!scanResults">
          <a-empty description="点击「质量扫描」按钮开始检查" />
        </template>
      </a-spin>
    </a-modal>
  </div>
</template>

<style scoped>
.novel-detail-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.content-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.content-card :deep(.ant-card-body) {
  padding: 0;
}

.content-card :deep(.ant-tabs-nav) {
  margin: 0;
  padding: 0 var(--spacing-lg);
  background: linear-gradient(180deg, var(--bg-secondary) 0%, transparent 100%);
}

.content-card :deep(.ant-tabs-content) {
  padding: var(--spacing-xl);
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.chapter-count {
  color: var(--text-secondary);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.chapter-count::before {
  content: '📚';
}

.empty-state {
  padding: 60px 0;
  text-align: center;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

/* 角色卡片样式 */
.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-lg);
}

.character-card {
  height: fit-content;
  border-radius: var(--radius-md);
  transition: all 0.3s;
  border: 1px solid var(--border-color);
}

.character-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.character-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.character-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.character-info p {
  margin: var(--spacing-xs) 0;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

/* 伏笔卡片样式 */
.foreshadowing-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.foreshadowing-card {
  border-left: 4px solid #faad14;
  border-radius: var(--radius-md);
  transition: all 0.3s;
}

.foreshadowing-card:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-sm);
}

.foreshadowing-card.foreshadowing-resolved {
  border-left-color: #52c41a;
  opacity: 0.8;
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.05) 0%, transparent 100%);
}

.foreshadowing-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.foreshadowing-meta {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  font-size: 13px;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.foreshadowing-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.foreshadowing-meta .ant-btn-link {
  padding: 0 4px;
  height: auto;
  font-size: 13px;
}

.foreshadowing-notes {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  padding: var(--spacing-sm);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.foreshadowing-stats {
  display: flex;
  gap: var(--spacing-sm);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

/* 任务卡片样式 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.task-card {
  border-left: 4px solid var(--primary-color);
  border-radius: var(--radius-md);
  transition: all 0.3s;
}

.task-card:hover {
  box-shadow: var(--shadow-sm);
}

.task-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.task-info {
  font-size: 13px;
}

.task-info p {
  margin: var(--spacing-xs) 0;
}

.task-stats {
  display: flex;
  gap: var(--spacing-sm);
}

:deep(.ant-tabs-tab) {
  font-size: 15px;
  padding: 12px 16px;
}

:deep(.ant-tabs-tab-active) {
  font-weight: 600;
}

/* Tab 标签样式增强 */
:deep(.ant-tabs-tab-btn) {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 关系图谱容器 */
.relationship-graph-container {
  min-height: 500px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-secondary);
}

/* 剧情分支样式 */
.branches-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.branch-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-md);
}

.branch-card {
  border-left: 4px solid var(--primary-color);
  transition: all 0.3s;
}

.branch-card.main-branch {
  border-left-color: #1890ff;
}

.branch-card:hover {
  box-shadow: var(--shadow-sm);
}

.branch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
}

.branch-name {
  font-weight: 600;
}

.branch-description {
  color: var(--text-secondary);
  font-size: 14px;
  margin: var(--spacing-sm) 0;
}

.branch-meta {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: var(--spacing-sm);
}

.branch-actions {
  display: flex;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
}

/* 模态框样式 */
:deep(.ant-modal-content) {
  border-radius: var(--radius-lg);
}

:deep(.ant-modal-header) {
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .character-grid {
    grid-template-columns: 1fr;
  }

  .tab-header {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .novel-detail-page {
    padding: 0 var(--spacing-md);
  }
}

/* Tab 标签样式 */
.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}

.tab-icon {
  font-size: 16px;
}

/* 质量扫描弹窗 */
.quality-summary-card {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
  background: var(--bg-secondary);
}

.quality-score {
  flex-shrink: 0;
}

.quality-summary-detail {
  flex: 1;
  font-size: 14px;
}

.quality-summary-detail p {
  margin: 4px 0;
}

.quality-detail {
  margin-bottom: 16px;
}

.quality-issue-list {
  padding-left: 20px;
  margin: 8px 0;
  list-style: none;
}

.quality-issue-list li {
  padding: 4px 0;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.quality-issue-list li:last-child {
  border-bottom: none;
}

.quality-issue-list .severity-high {
  color: #ff4d4f;
}

.quality-issue-list .severity-medium {
  color: #fa8c16;
}

.quality-fix {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: #52c41a;
}

.quality-pass {
  padding: 8px 0;
  color: #52c41a;
  font-weight: 500;
}

.btn-full-gen {
  border-color: #764ba2;
  color: #764ba2;
}

.btn-full-gen:hover {
  border-color: #667eea;
  color: #667eea;
}

.modal-footer-actions {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

</style>
