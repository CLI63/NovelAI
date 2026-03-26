<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  DownOutlined,
  PlusOutlined,
  EditOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  BarChartOutlined,
  LinkOutlined,
  BookOutlined,
  SaveOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  ArrowLeftOutlined,
  BulbOutlined,
  ReloadOutlined,
  MergeCellsOutlined,
  StarOutlined,
  GlobalOutlined,
  TeamOutlined,
  UserOutlined,
  ReadOutlined,
  UnorderedListOutlined
} from '@ant-design/icons-vue'
import { useInspiration } from '@/composables/useInspiration'
import { useAI } from '@/composables/useAI'
import { useNovel } from '@/composables/useNovel'
import PageHeader from '@/components/common/PageHeader.vue'

const router = useRouter()

const {
  inspirations,
  loading,
  expandingContent,
  isExpanding,
  isScoring,
  loadInspirations,
  createInspiration,
  updateInspiration,
  deleteInspiration,
  expandInspiration,
  askQuestion,
  mergeInspirations,
  scoreInspiration,
  saveExpandedContent,
  updateStatus,
  batchDelete
} = useInspiration()

const { generate, loading: generating, checkApiKey } = useAI()
const { createNovel, sanitizeForDB } = useNovel()

// 当前步骤
const currentStep = ref(0)

// 新灵感表单
const newInspiration = ref({
  title: '',
  content: '',
  tags: [],
  style: ''
})

// 选中的灵感（用于融合）
const selectedInspirations = ref([])

// 当前编辑的灵感
const editingInspiration = ref(null)

// AI 问答结果
const qaResult = ref(null)

// 评分结果
const scoreResult = ref(null)

// 生成的概览
const generatedOverview = ref(null)

// 搜索关键词
const searchKeyword = ref('')

// 筛选状态
const filterStatus = ref('all')

// 标签输入
const tagInput = ref('')

// 筛选后的灵感列表
const filteredInspirations = computed(() => {
  let list = inspirations.value

  // 状态筛选
  if (filterStatus.value !== 'all') {
    list = list.filter(item => item.status === filterStatus.value)
  }

  // 关键词搜索
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    list = list.filter(item =>
      item.title?.toLowerCase().includes(keyword) ||
      item.content?.toLowerCase().includes(keyword) ||
      item.tags?.some(tag => tag.toLowerCase().includes(keyword))
    )
  }

  return list
})

// 可用于融合的灵感
const fusionCandidates = computed(() => {
  return inspirations.value.filter(item =>
    item.status !== 'archived' && item.content?.trim()
  )
})

// 加载数据
onMounted(async () => {
  await loadInspirations()
})

// 添加标签
const handleAddTag = () => {
  if (tagInput.value.trim() && !newInspiration.value.tags.includes(tagInput.value.trim())) {
    newInspiration.value.tags.push(tagInput.value.trim())
    tagInput.value = ''
  }
}

// 移除标签
const handleRemoveTag = (tag) => {
  newInspiration.value.tags = newInspiration.value.tags.filter(t => t !== tag)
}

// 保存新灵感
const handleSaveInspiration = async () => {
  if (!newInspiration.value.content?.trim()) {
    message.warning('请输入灵感内容')
    return
  }

  const id = await createInspiration({
    ...newInspiration.value,
    status: 'draft'
  })

  if (id) {
    // 重置表单
    newInspiration.value = {
      title: '',
      content: '',
      tags: [],
      style: ''
    }
  }
}

// 编辑灵感
const handleEdit = (inspiration) => {
  editingInspiration.value = { ...inspiration }
  currentStep.value = 1
}

// AI 扩写
const handleExpand = async (inspiration) => {
  if (!checkApiKey()) return

  editingInspiration.value = inspiration
  currentStep.value = 2

  await expandInspiration(inspiration, {
    provider: localStorage.getItem('aiProvider') || 'deepseek',
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('aiModel') || ''
  })
}

// 保存扩写结果
const handleSaveExpanded = async () => {
  if (!editingInspiration.value?.id) return

  const success = await saveExpandedContent(editingInspiration.value.id, expandingContent.value)
  if (success) {
    // 更新编辑中的灵感
    editingInspiration.value.expandedContent = expandingContent.value
  }
}

// AI 问答引导
const handleQA = async (inspiration) => {
  if (!checkApiKey()) return

  editingInspiration.value = inspiration
  currentStep.value = 3

  const result = await askQuestion(inspiration, {
    provider: localStorage.getItem('aiProvider') || 'deepseek',
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('aiModel') || ''
  })

  if (result) {
    qaResult.value = result
  }
}

// AI 评分
const handleScore = async (inspiration) => {
  if (!checkApiKey()) return

  editingInspiration.value = inspiration
  currentStep.value = 4

  const result = await scoreInspiration(inspiration, {
    provider: localStorage.getItem('aiProvider') || 'deepseek',
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('aiModel') || ''
  })

  if (result) {
    scoreResult.value = result
  }
}

// 选择融合灵感
const handleSelectForFusion = (inspiration) => {
  const index = selectedInspirations.value.findIndex(i => i.id === inspiration.id)
  if (index >= 0) {
    selectedInspirations.value.splice(index, 1)
  } else if (selectedInspirations.value.length < 5) {
    selectedInspirations.value.push(inspiration)
  } else {
    message.warning('最多选择5个灵感进行融合')
  }
}

// 执行融合
const handleMerge = async () => {
  if (selectedInspirations.value.length < 2) {
    message.warning('请至少选择2个灵感进行融合')
    return
  }

  if (!checkApiKey()) return

  currentStep.value = 5

  const result = await mergeInspirations(selectedInspirations.value, {
    provider: localStorage.getItem('aiProvider') || 'deepseek',
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('aiModel') || ''
  })

  if (result) {
    generatedOverview.value = result
    message.success('融合成功！')
  }
}

// 从灵感生成概览
const handleGenerateFromInspiration = async (inspiration) => {
  if (!checkApiKey()) return

  editingInspiration.value = inspiration
  currentStep.value = 5

  // 使用灵感融合功能（单个灵感也可以）
  const result = await mergeInspirations([inspiration], {
    provider: localStorage.getItem('aiProvider') || 'deepseek',
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('aiModel') || ''
  })

  if (result) {
    generatedOverview.value = result
    message.success('概览生成成功！')
  }
}

// 保存为小说
const handleSaveAsNovel = async () => {
  if (!generatedOverview.value) {
    message.warning('请先生成概览')
    return
  }

  const novel = {
    title: String(generatedOverview.value.title || ''),
    description: String(generatedOverview.value.description || ''),
    style: sanitizeForDB(generatedOverview.value.style) || [],
    estimatedWords: String(generatedOverview.value.estimatedWords || ''),
    worldSetting: sanitizeForDB(generatedOverview.value.worldSetting),
    characters: sanitizeForDB(generatedOverview.value.characters),
    plotLines: sanitizeForDB(generatedOverview.value.plotLines) || { main: '', sub: [] },
    conflicts: sanitizeForDB(generatedOverview.value.conflicts),
    outline: sanitizeForDB(generatedOverview.value.outline) || [],
    chapterStructure: {
      totalChapters: Number(generatedOverview.value.chapterStructure?.totalChapters) || 0,
      minWordsPerChapter: Number(generatedOverview.value.chapterStructure?.minWordsPerChapter) || 0,
      maxWordsPerChapter: Number(generatedOverview.value.chapterStructure?.maxWordsPerChapter) || 0
    }
  }

  const id = await createNovel(novel)
  if (id) {
    // 标记相关灵感为已完成
    if (selectedInspirations.value.length > 0) {
      for (const insp of selectedInspirations.value) {
        await updateStatus(insp.id, 'completed')
      }
    } else if (editingInspiration.value?.id) {
      await updateStatus(editingInspiration.value.id, 'completed')
    }

    router.push(`/novel/${id}`)
  }
}

// 删除灵感
const handleDelete = async (id) => {
  await deleteInspiration(id)
}

// 更新状态
const handleUpdateStatus = async (id, status) => {
  await updateStatus(id, status)
}

// 返回列表
const handleBack = () => {
  currentStep.value = 0
  editingInspiration.value = null
  expandingContent.value = ''
  qaResult.value = null
  scoreResult.value = null
  generatedOverview.value = null
  selectedInspirations.value = []
}

// 获取状态颜色
const getStatusColor = (status) => {
  const colors = {
    draft: 'blue',
    completed: 'green',
    archived: 'default'
  }
  return colors[status] || 'default'
}

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    draft: '草稿',
    completed: '已完成',
    archived: '已归档'
  }
  return texts[status] || status
}
</script>

<template>
  <div class="inspiration-workshop">
    <PageHeader
      title="灵感工作台"
      subtitle="捕捉灵感，AI助您将创意转化为完整的小说概览"
      :show-back="currentStep > 0"
      @back="handleBack"
    >
      <template #icon>
        <BulbOutlined class="header-icon" />
      </template>
    </PageHeader>

    <!-- 步骤 0：灵感列表和新建 -->
    <template v-if="currentStep === 0">
      <!-- 新建灵感区域 -->
      <a-card :bordered="false" class="create-card">
        <h3 class="card-title">
          <PlusOutlined class="title-icon" />
          记录新灵感
        </h3>
        <div class="create-form">
          <a-input
            v-model:value="newInspiration.title"
            placeholder="灵感标题（可选）"
            class="title-input"
          />
          <a-textarea
            v-model:value="newInspiration.content"
            :rows="4"
            placeholder="描述您的灵感，可以是一个场景、一个角色、一段剧情或任何创意..."
            class="content-input"
          />
          <div class="tags-section">
            <div class="tags-input">
              <a-tag
                v-for="tag in newInspiration.tags"
                :key="tag"
                closable
                @close="handleRemoveTag(tag)"
              >
                {{ tag }}
              </a-tag>
              <a-input
                v-model:value="tagInput"
                placeholder="添加标签"
                size="small"
                style="width: 100px"
                @pressEnter="handleAddTag"
                @blur="handleAddTag"
              />
            </div>
            <a-select
              v-model:value="newInspiration.style"
              placeholder="选择风格"
              style="width: 150px"
              allowClear
            >
              <a-select-option value="玄幻">玄幻</a-select-option>
              <a-select-option value="仙侠">仙侠</a-select-option>
              <a-select-option value="都市">都市</a-select-option>
              <a-select-option value="科幻">科幻</a-select-option>
              <a-select-option value="历史">历史</a-select-option>
              <a-select-option value="言情">言情</a-select-option>
              <a-select-option value="悬疑">悬疑</a-select-option>
            </a-select>
          </div>
          <div class="action-row">
            <a-button type="primary" @click="handleSaveInspiration">
              保存灵感
            </a-button>
          </div>
        </div>
      </a-card>

      <!-- 筛选和搜索 -->
      <a-card :bordered="false" class="filter-card">
        <div class="filter-row">
          <a-input-search
            v-model:value="searchKeyword"
            placeholder="搜索灵感..."
            style="width: 300px"
            allowClear
          />
          <a-radio-group v-model:value="filterStatus" button-style="solid">
            <a-radio-button value="all">全部</a-radio-button>
            <a-radio-button value="draft">草稿</a-radio-button>
            <a-radio-button value="completed">已完成</a-radio-button>
            <a-radio-button value="archived">已归档</a-radio-button>
          </a-radio-group>
        </div>
      </a-card>

      <!-- 多灵感融合区域 -->
      <a-card v-if="fusionCandidates.length >= 2" :bordered="false" class="fusion-card">
        <h3 class="card-title">
          <MergeCellsOutlined class="title-icon" />
          灵感融合
        </h3>
        <p class="card-desc">选择多个灵感，AI将为您融合创作一个完整的小说概览</p>
        <div class="fusion-list">
          <div
            v-for="insp in fusionCandidates"
            :key="insp.id"
            class="fusion-item"
            :class="{ selected: selectedInspirations.some(i => i.id === insp.id) }"
            @click="handleSelectForFusion(insp)"
          >
            <a-checkbox :checked="selectedInspirations.some(i => i.id === insp.id)" />
            <span class="fusion-item-title">{{ insp.title || '无标题灵感' }}</span>
            <a-tag v-if="insp.style" size="small">{{ insp.style }}</a-tag>
          </div>
        </div>
        <div class="fusion-action">
          <span class="selected-count">已选择 {{ selectedInspirations.length }} 个灵感</span>
          <a-button
            type="primary"
            :disabled="selectedInspirations.length < 2"
            :loading="generating"
            @click="handleMerge"
          >
            开始融合
          </a-button>
        </div>
      </a-card>

      <!-- 灵感列表 -->
      <a-card :bordered="false" class="list-card">
        <h3 class="card-title">
          <BookOutlined class="title-icon" />
          我的灵感库
        </h3>
        <div v-if="filteredInspirations.length === 0" class="empty-state">
          <InboxOutlined class="empty-icon" />
          <p>暂无灵感，快来记录您的第一个创意吧！</p>
        </div>
        <div v-else class="inspiration-grid">
          <div
            v-for="insp in filteredInspirations"
            :key="insp.id"
            class="inspiration-card"
          >
            <div class="card-header">
              <h4 class="insp-title">{{ insp.title || '无标题灵感' }}</h4>
              <a-tag :color="getStatusColor(insp.status)">
                {{ getStatusText(insp.status) }}
              </a-tag>
            </div>
            <p class="insp-content">{{ insp.content }}</p>
            <div class="card-tags">
              <a-tag v-for="tag in (insp.tags || [])" :key="tag" size="small">{{ tag }}</a-tag>
              <a-tag v-if="insp.style" size="small" color="blue">{{ insp.style }}</a-tag>
            </div>
            <!-- 评分显示 -->
            <div v-if="insp.score" class="score-display">
              <span class="score-label">AI评分:</span>
              <span class="score-value">{{ insp.score.totalScore }}</span>
              <span class="score-level">
                {{ insp.score.totalScore >= 80 ? '优秀' : insp.score.totalScore >= 60 ? '良好' : '待改进' }}
              </span>
            </div>
            <div class="card-actions">
              <a-space>
                <a-button size="small" @click="handleEdit(insp)">编辑</a-button>
                <a-button size="small" type="primary" ghost @click="handleExpand(insp)">
                  AI扩写
                </a-button>
                <a-button size="small" @click="handleQA(insp)">AI问答</a-button>
                <a-button size="small" @click="handleScore(insp)">AI评分</a-button>
              </a-space>
              <a-space>
                <a-dropdown>
                  <a-button size="small">
                    更多 <DownOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item @click="handleGenerateFromInspiration(insp)">
                        生成小说概览
                      </a-menu-item>
                      <a-menu-item @click="handleUpdateStatus(insp.id, 'completed')">
                        标记完成
                      </a-menu-item>
                      <a-menu-item @click="handleUpdateStatus(insp.id, 'archived')">
                        归档
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item danger @click="handleDelete(insp.id)">
                        删除
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </div>
          </div>
        </div>
      </a-card>
    </template>

    <!-- 步骤 1：编辑灵感 -->
    <a-card v-else-if="currentStep === 1" :bordered="false" class="edit-card">
      <h3 class="card-title">
        <EditOutlined class="title-icon" />
        编辑灵感
      </h3>
      <div class="edit-form">
        <a-input
          v-model:value="editingInspiration.title"
          placeholder="灵感标题"
          class="title-input"
        />
        <a-textarea
          v-model:value="editingInspiration.content"
          :rows="6"
          placeholder="灵感内容"
        />
        <div class="tags-section">
          <div class="tags-input">
            <a-tag
              v-for="tag in (editingInspiration.tags || [])"
              :key="tag"
              closable
              @close="editingInspiration.tags = (editingInspiration.tags || []).filter(t => t !== tag)"
            >
              {{ tag }}
            </a-tag>
          </div>
          <a-select
            v-model:value="editingInspiration.style"
            placeholder="选择风格"
            style="width: 150px"
            allowClear
          >
            <a-select-option value="玄幻">玄幻</a-select-option>
            <a-select-option value="仙侠">仙侠</a-select-option>
            <a-select-option value="都市">都市</a-select-option>
            <a-select-option value="科幻">科幻</a-select-option>
          </a-select>
        </div>
        <div class="action-row">
          <a-button @click="handleBack">取消</a-button>
          <a-button type="primary" @click="updateInspiration(editingInspiration.id, editingInspiration)">
            保存
          </a-button>
        </div>
      </div>
    </a-card>

    <!-- 步骤 2：AI 扩写 -->
    <a-card v-else-if="currentStep === 2" :bordered="false" class="expand-card">
      <h3 class="card-title">
        <ReloadOutlined class="title-icon" spin />
        AI 扩写
      </h3>
      <div class="original-content">
        <h4>原始灵感</h4>
        <p>{{ editingInspiration?.content }}</p>
      </div>
      <div class="expanded-content">
        <h4>扩写结果</h4>
        <a-spin :spinning="isExpanding">
          <div v-if="expandingContent" class="result-text">
            {{ expandingContent }}
          </div>
          <div v-else class="placeholder">
            AI 正在扩写您的灵感...
          </div>
        </a-spin>
      </div>
      <div class="action-row">
        <a-button @click="handleBack">返回</a-button>
        <a-button
          v-if="expandingContent"
          type="primary"
          @click="handleSaveExpanded"
        >
          保存扩写结果
        </a-button>
      </div>
    </a-card>

    <!-- 步骤 3：AI 问答引导 -->
    <a-card v-else-if="currentStep === 3" :bordered="false" class="qa-card">
      <h3 class="card-title">
        <QuestionCircleOutlined class="title-icon" />
        AI 引导问答
      </h3>
      <div class="original-content">
        <h4>您的灵感</h4>
        <p>{{ editingInspiration?.content }}</p>
      </div>
      <div v-if="qaResult" class="qa-result">
        <div v-if="qaResult.analysis" class="analysis-section">
          <h4><BulbOutlined class="section-icon" /> AI 分析</h4>
          <p>{{ qaResult.analysis }}</p>
        </div>
        <div v-if="qaResult.questions" class="questions-section">
          <h4><FileTextOutlined class="section-icon" /> 引导问题</h4>
          <div v-for="(q, index) in qaResult.questions" :key="index" class="question-item">
            <div class="question-text">{{ index + 1 }}. {{ q.question }}</div>
            <div class="question-purpose">目的: {{ q.purpose }}</div>
            <div v-if="q.suggestions" class="suggestions">
              <span>建议方向: </span>
              <a-tag v-for="s in q.suggestions" :key="s" size="small">{{ s }}</a-tag>
            </div>
          </div>
        </div>
      </div>
      <a-spin v-else :spinning="loading">
        <div class="placeholder">AI 正在分析您的灵感...</div>
      </a-spin>
      <div class="action-row">
        <a-button @click="handleBack">返回</a-button>
      </div>
    </a-card>

    <!-- 步骤 4：AI 评分 -->
    <a-card v-else-if="currentStep === 4" :bordered="false" class="score-card">
      <h3 class="card-title">
        <BarChartOutlined class="title-icon" />
        AI 灵感评分
      </h3>
      <div class="original-content">
        <h4>您的灵感</h4>
        <p>{{ editingInspiration?.content }}</p>
      </div>
      <div v-if="scoreResult" class="score-result">
        <div class="total-score">
          <span class="score-number">{{ scoreResult.totalScore }}</span>
          <span class="score-label">总分</span>
          <a-progress
            :percent="scoreResult.totalScore"
            :stroke-color="scoreResult.totalScore >= 80 ? '#52c41a' : scoreResult.totalScore >= 60 ? '#1890ff' : '#ff4d4f'"
            :show-info="false"
          />
        </div>
        <div class="dimensions">
          <div v-for="(dim, key) in scoreResult.dimensions" :key="key" class="dimension-item">
            <div class="dim-header">
              <span class="dim-name">
                {{ key === 'innovation' ? '创新性' : key === 'expandability' ? '可扩展性' : key === 'marketFit' ? '市场匹配' : '实现难度' }}
              </span>
              <span class="dim-score">{{ dim.score }}</span>
            </div>
            <a-progress :percent="dim.score" size="small" :show-info="false" />
            <p class="dim-comment">{{ dim.comment }}</p>
          </div>
        </div>
        <div v-if="scoreResult.strengths" class="section">
          <h4><StarOutlined class="section-icon" /> 优点</h4>
          <ul>
            <li v-for="s in scoreResult.strengths" :key="s">{{ s }}</li>
          </ul>
        </div>
        <div v-if="scoreResult.weaknesses" class="section">
          <h4><EditOutlined class="section-icon" /> 不足</h4>
          <ul>
            <li v-for="w in scoreResult.weaknesses" :key="w">{{ w }}</li>
          </ul>
        </div>
        <div v-if="scoreResult.suggestions" class="section">
          <h4><BulbOutlined class="section-icon" /> 改进建议</h4>
          <ul>
            <li v-for="s in scoreResult.suggestions" :key="s">{{ s }}</li>
          </ul>
        </div>
        <div v-if="scoreResult.comparableWorks" class="section">
          <h4><BookOutlined class="section-icon" /> 类似作品参考</h4>
          <div class="reference-list">
            <a-tag v-for="work in scoreResult.comparableWorks" :key="work">{{ work }}</a-tag>
          </div>
        </div>
      </div>
      <a-spin v-else :spinning="isScoring">
        <div class="placeholder">AI 正在评分...</div>
      </a-spin>
      <div class="action-row">
        <a-button @click="handleBack">返回</a-button>
        <a-button
          v-if="scoreResult"
          type="primary"
          @click="handleGenerateFromInspiration(editingInspiration)"
        >
          生成小说概览
        </a-button>
      </div>
    </a-card>

    <!-- 步骤 5：生成概览 -->
    <a-card v-else-if="currentStep === 5" :bordered="false" class="overview-card">
      <h3 class="card-title">
        <FileTextOutlined class="title-icon" />
        小说概览
      </h3>
      <div v-if="generatedOverview" class="overview-content">
        <div class="overview-header">
          <h2>{{ generatedOverview.title }}</h2>
          <p class="description">{{ generatedOverview.description }}</p>
          <div class="tags">
            <a-tag v-for="style in generatedOverview.style" :key="style">{{ style }}</a-tag>
          </div>
        </div>

        <a-divider />

        <!-- 世界观 -->
        <div v-if="generatedOverview.worldSetting" class="section">
          <h3><GlobalOutlined class="section-icon" /> 世界观设定</h3>
          <div class="world-info">
            <p><strong>时代背景:</strong> {{ generatedOverview.worldSetting.era }}</p>
            <p><strong>主要地点:</strong> {{ generatedOverview.worldSetting.location }}</p>
            <p v-if="generatedOverview.worldSetting.powerSystem">
              <strong>力量体系:</strong> {{ generatedOverview.worldSetting.powerSystem }}
            </p>
            <p v-if="generatedOverview.worldSetting.socialStructure">
              <strong>社会结构:</strong> {{ generatedOverview.worldSetting.socialStructure }}
            </p>
          </div>
        </div>

        <!-- 角色 -->
        <div v-if="generatedOverview.characters" class="section">
          <h3><TeamOutlined class="section-icon" /> 主要角色</h3>
          <div v-if="generatedOverview.characters.protagonist" class="character-card protagonist">
            <h4><UserOutlined class="character-icon" /> 主角: {{ generatedOverview.characters.protagonist.name }}</h4>
            <p><strong>身份:</strong> {{ generatedOverview.characters.protagonist.identity }}</p>
            <p><strong>性格:</strong> {{ generatedOverview.characters.protagonist.personality }}</p>
            <p><strong>背景:</strong> {{ generatedOverview.characters.protagonist.background }}</p>
            <p><strong>目标:</strong> {{ generatedOverview.characters.protagonist.goal }}</p>
          </div>
          <div v-if="generatedOverview.characters.supportingCharacters?.length" class="supporting-list">
            <div v-for="char in generatedOverview.characters.supportingCharacters" :key="char.name" class="character-card">
              <h4>{{ char.name }}</h4>
              <p><strong>身份:</strong> {{ char.identity }}</p>
              <p><strong>性格:</strong> {{ char.personality }}</p>
            </div>
          </div>
        </div>

        <!-- 剧情 -->
        <div v-if="generatedOverview.plotLines" class="section">
          <h3><ReadOutlined class="section-icon" /> 剧情线</h3>
          <div class="main-plot">
            <strong>主线:</strong> {{ generatedOverview.plotLines.main }}
          </div>
          <div v-if="generatedOverview.plotLines.sub?.length" class="sub-plots">
            <strong>支线:</strong>
            <ul>
              <li v-for="sub in generatedOverview.plotLines.sub" :key="sub">{{ sub }}</li>
            </ul>
          </div>
        </div>

        <!-- 大纲 -->
        <div v-if="generatedOverview.outline?.length" class="section">
          <h3><UnorderedListOutlined class="section-icon" /> 章节大纲</h3>
          <div class="outline-list">
            <div v-for="(vol, index) in generatedOverview.outline" :key="index" class="volume-item">
              <h4>卷{{ index + 1 }}: {{ vol.volume }} ({{ vol.chapters }}章)</h4>
              <p>{{ vol.summary }}</p>
            </div>
          </div>
        </div>
      </div>
      <a-spin v-else :spinning="generating">
        <div class="placeholder">AI 正在生成概览...</div>
      </a-spin>
      <div class="action-row">
        <a-button @click="handleBack">返回</a-button>
        <a-button
          v-if="generatedOverview"
          type="primary"
          @click="handleSaveAsNovel"
        >
          保存为小说
        </a-button>
      </div>
    </a-card>
  </div>
</template>

<style scoped>
.inspiration-workshop {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.card-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.title-icon {
  font-size: 20px;
  color: var(--primary-color);
}

.section-icon {
  font-size: 16px;
  color: var(--primary-color);
  margin-right: var(--spacing-xs);
}

.empty-icon {
  font-size: 48px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.character-icon {
  font-size: 16px;
  color: #52c41a;
  margin-right: var(--spacing-xs);
}

.header-icon {
  font-size: 24px;
  color: var(--primary-color);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-desc {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-secondary);
}

.create-card,
.filter-card,
.fusion-card,
.list-card,
.edit-card,
.expand-card,
.qa-card,
.score-card,
.overview-card {
  background: var(--bg-primary);
}

/* 创建表单 */
.create-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.title-input {
  font-size: 16px;
  font-weight: 500;
}

.content-input {
  font-size: 15px;
}

.tags-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.tags-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-xs);
  flex: 1;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

/* 筛选栏 */
.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 融合区域 */
.fusion-card {
  background: linear-gradient(135deg, var(--bg-primary) 0%, #f0f5ff 100%);
}

.fusion-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.fusion-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.fusion-item:hover {
  border-color: var(--primary-color);
}

.fusion-item.selected {
  border-color: var(--primary-color);
  background: #e6f7ff;
}

.fusion-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-count {
  color: var(--text-secondary);
}

/* 灵感列表 */
.inspiration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-md);
}

.inspiration-card {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.inspiration-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
}

.insp-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.insp-content {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: var(--spacing-sm);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}

.score-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f6ffed;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-sm);
}

.score-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.score-value {
  font-size: 18px;
  font-weight: 600;
  color: #52c41a;
}

.score-level {
  font-size: 12px;
  color: #52c41a;
}

.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-color);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
}

/* 编辑卡片 */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* 扩写卡片 */
.original-content,
.expanded-content {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.original-content h4,
.expanded-content h4 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.result-text {
  white-space: pre-wrap;
  line-height: 1.8;
}

.placeholder {
  color: var(--text-secondary);
  text-align: center;
  padding: var(--spacing-lg);
}

/* 问答卡片 */
.qa-result {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.analysis-section {
  padding: var(--spacing-md);
  background: #e6f7ff;
  border-radius: var(--radius-md);
}

.question-item {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-sm);
}

.question-text {
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

.question-purpose {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.suggestions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
  font-size: 13px;
}

/* 评分卡片 */
.score-result {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.total-score {
  text-align: center;
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.score-number {
  font-size: 48px;
  font-weight: 700;
  color: var(--primary-color);
}

.total-score .score-label {
  display: block;
  font-size: 16px;
  margin: var(--spacing-sm) 0;
}

.dimensions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.dimension-item {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.dim-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
}

.dim-name {
  font-weight: 500;
}

.dim-score {
  font-weight: 600;
  color: var(--primary-color);
}

.dim-comment {
  margin: var(--spacing-sm) 0 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.section {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.section h4 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 14px;
  color: var(--text-primary);
}

.section ul {
  margin: 0;
  padding-left: var(--spacing-lg);
}

.section li {
  margin-bottom: var(--spacing-xs);
  color: var(--text-secondary);
}

.reference-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

/* 概览卡片 */
.overview-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.overview-header {
  text-align: center;
}

.overview-header h2 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 24px;
  color: var(--text-primary);
}

.description {
  color: var(--text-secondary);
  line-height: 1.8;
}

.overview-header .tags {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
}

.section h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 16px;
  color: var(--text-primary);
}

.world-info p {
  margin: var(--spacing-xs) 0;
  color: var(--text-secondary);
}

.character-card {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-sm);
}

.character-card.protagonist {
  background: linear-gradient(135deg, #f6ffed 0%, var(--bg-secondary) 100%);
  border: 1px solid #b7eb8f;
}

.character-card h4 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
}

.character-card p {
  margin: var(--spacing-xs) 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.supporting-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-sm);
}

.main-plot {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
}

.sub-plots {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.sub-plots ul {
  margin: var(--spacing-sm) 0 0 0;
  padding-left: var(--spacing-lg);
}

.outline-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.volume-item {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.volume-item h4 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
}

.volume-item p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .inspiration-grid {
    grid-template-columns: 1fr;
  }

  .dimensions {
    grid-template-columns: 1fr;
  }

  .card-actions {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }
}
</style>
