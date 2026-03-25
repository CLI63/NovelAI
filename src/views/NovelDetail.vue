<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useNovel, useNovelStats } from '@/composables/useNovel'
import { useChapter, useChapterExport } from '@/composables/useChapter'
import { useCharacter } from '@/composables/useCharacter'
import { useForeshadowing } from '@/composables/useForeshadowing'
import { useGenerationQueue } from '@/composables/useGenerationQueue'
import PageHeader from '@/components/common/PageHeader.vue'
import NovelInfo from '@/components/novel/NovelInfo.vue'
import ChapterList from '@/components/chapter/ChapterList.vue'

const router = useRouter()
const route = useRoute()

const { novel, loading: novelLoading, loadNovel, deleteNovel, goToEdit } = useNovel()
const { chapters, loading: chaptersLoading, loadChapters, goToChapter, goToCreate, deleteChapter } = useChapter()
const { exportNovel } = useChapterExport()

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
  foreshadowingList,
  loading: foreshadowingLoading,
  loadForeshadowing,
  createForeshadowing,
  updateForeshadowing,
  deleteForeshadowing,
  pendingForeshadowing,
  resolvedForeshadowing
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

const activeTab = ref('chapters')

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

// 加载数据
const loadData = async () => {
  const id = parseInt(route.params.id)
  await loadNovel(id)
  if (novel.value) {
    await Promise.all([
      loadChapters(novel.value.id),
      loadCharacters(novel.value.id),
      loadForeshadowing(novel.value.id),
      loadTasks(novel.value.id)
    ])
  }
}

// 处理删除小说
const handleDeleteNovel = () => {
  deleteNovel(novel.value.id, () => router.push('/'))
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
  router.push('/')
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
  await updateForeshadowing(foreshadowing.id, {
    status: 'resolved',
    resolvedIn: chapters.value.length + 1
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
            <a-button @click="handleExport">
              导出
            </a-button>
            <a-button type="primary" @click="goToCreate(novel.id)">
              生成章节
            </a-button>
          </template>
        </PageHeader>

        <!-- 标签页 -->
        <a-card :bordered="false" class="content-card">
          <a-tabs v-model:activeKey="activeTab">
            <!-- 章节列表 -->
            <a-tab-pane key="chapters" tab="章节列表">
              <div class="tab-header">
                <span class="chapter-count">共 {{ chapters.length }} 章</span>
                <a-button type="primary" @click="goToCreate(novel.id)">
                  生成新章节
                </a-button>
              </div>
              <ChapterList
                :chapters="chapters"
                :novel-id="novel.id"
                :loading="chaptersLoading"
                @view="handleViewChapter"
                @delete="handleDeleteChapter"
              />
            </a-tab-pane>

            <!-- 小说信息 -->
            <a-tab-pane key="info" tab="小说信息">
              <NovelInfo :novel="novel" :chapters="chapters" />
            </a-tab-pane>

            <!-- 角色管理 -->
            <a-tab-pane key="characters" tab="角色管理">
              <div class="tab-header">
                <span class="chapter-count">共 {{ characters.length }} 个角色</span>
                <a-button type="primary" @click="openCharacterModal()">
                  添加角色
                </a-button>
              </div>
              
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
            </a-tab-pane>

            <!-- 伏笔管理 -->
            <a-tab-pane key="foreshadowing" tab="伏笔管理">
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
                <div v-else class="foreshadowing-list">
                  <a-card 
                    v-for="item in foreshadowingList" 
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
                    
                    <p v-if="item.notes" class="foreshadowing-notes">
                      <strong>备注：</strong>{{ item.notes }}
                    </p>
                  </a-card>
                </div>
              </a-spin>
            </a-tab-pane>

            <!-- 生成任务队列 -->
            <a-tab-pane key="tasks" tab="生成任务">
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
  </div>
</template>

<style scoped>
.novel-detail-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.content-card {
  background: var(--bg-primary);
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.chapter-count {
  color: var(--text-secondary);
  font-size: 14px;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

/* 角色卡片样式 */
.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.character-card {
  height: fit-content;
}

.character-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.character-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.character-info p {
  margin: 4px 0;
}

/* 伏笔卡片样式 */
.foreshadowing-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.foreshadowing-card {
  border-left: 3px solid var(--ant-warning);
}

.foreshadowing-card.foreshadowing-resolved {
  border-left-color: var(--ant-success);
  opacity: 0.7;
}

.foreshadowing-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.foreshadowing-notes {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.foreshadowing-stats {
  display: flex;
  gap: 8px;
}

/* 任务卡片样式 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  border-left: 3px solid var(--ant-primary);
}

.task-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-info {
  font-size: 13px;
}

.task-info p {
  margin: 4px 0;
}

.task-stats {
  display: flex;
  gap: 8px;
}

:deep(.ant-tabs-tab) {
  font-size: 15px;
}

:deep(.ant-tabs-tab-active) {
  font-weight: 600;
}
</style>
