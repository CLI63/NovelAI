<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useNovel } from '@/composables/useNovel'
import { useAI } from '@/composables/useAI'
import { useCharacter } from '@/composables/useCharacter'
import { useForeshadowing } from '@/composables/useForeshadowing'
import { useCharacterRelation } from '@/composables/useCharacterRelation'
import { buildNovelOverviewPrompt } from '@/utils/prompts'
import PageHeader from '@/components/common/PageHeader.vue'
import NovelForm from '@/components/novel/NovelForm.vue'
import FullGenerationProgress from '@/components/chapter/FullGenerationProgress.vue'
import { useFullNovelGeneration } from '@/composables/useFullNovelGeneration'

const router = useRouter()

const { createNovel, sanitizeForDB } = useNovel()
const { generate, loading: generating, checkApiKey } = useAI()

const idea = ref('')
const generatedOverview = ref(null)
const feedback = ref('')
const currentStep = ref(0)

// AI 随机灵感
const inspirations = ref([])
const loadingInspirations = ref(false)

const generateInspirations = async () => {
  if (!checkApiKey()) return
  loadingInspirations.value = true
  try {
    const messages = [
      {
        role: 'system',
        content: '你是一个创意写作助手。根据用户可能感兴趣的主题，生成小说创作灵感。每个灵感包含简洁标题和50字左右的描述，风格多样。直接返回JSON数组，不要用markdown代码块包裹。'
      },
      {
        role: 'user',
        content: '请生成6个不同风格的小说创作灵感，涵盖修仙、科幻、都市、奇幻、悬疑、历史等不同题材。每个灵感包含 title（标题，2-8字）和 description（描述，30-60字）。返回格式：[{"title": "灵感标题", "description": "灵感描述"}]'
      }
    ]
    const response = await generate(messages)
    if (response) {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        inspirations.value = JSON.parse(jsonMatch[0])
      }
    }
  } catch (e) {
    console.error('生成灵感失败:', e)
    message.error('生成灵感失败，请重试')
  } finally {
    loadingInspirations.value = false
  }
}

const selectInspiration = (insp) => {
  idea.value = `${insp.title}：${insp.description}`
}

// 进入页面时自动加载灵感
onMounted(() => {
  generateInspirations()
})

// 全本一键生成
const showFullGenModal = ref(false)
const fullGen = reactive(useFullNovelGeneration())
const fullGenPrompt = ref('')  // 全本生成自定义提示词

// 支线剧情计算属性
const subPlotLines = computed({
  get: () => generatedOverview.value?.plotLines?.sub?.join('\n') || '',
  set: (val) => {
    if (!generatedOverview.value) return
    if (!generatedOverview.value.plotLines) {
      generatedOverview.value.plotLines = { main: '', sub: [] }
    }
    generatedOverview.value.plotLines.sub = val.split('\n').filter((line) => line.trim())
  },
})

// 生成小说概览
const handleGenerate = async () => {
  if (!idea.value.trim()) {
    message.warning('请输入小说灵感')
    return
  }

  if (!checkApiKey()) return

  const messages = buildNovelOverviewPrompt(idea.value)
  const response = await generate(messages)

  if (response) {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      generatedOverview.value = JSON.parse(jsonMatch[0])
      currentStep.value = 1
      message.success('生成成功！')
    } else {
      message.error('AI返回格式错误，请重试')
    }
  }
}

// 重新生成
const handleRegenerate = async () => {
  if (!feedback.value.trim()) {
    message.warning('请输入修改意见')
    return
  }

  if (!checkApiKey()) return

  const messages = [
    {
      role: 'system',
      content: '你是一位专业的小说创作助手，擅长根据用户反馈重新生成小说概览。',
    },
    {
      role: 'user',
      content: `用户对之前的小说概览有以下反馈：${feedback.value}`,
    },
    {
      role: 'user',
      content: `原始灵感：${idea.value}`,
    },
    {
      role: 'user',
      content: '请根据用户反馈重新生成小说概览，保持原有格式要求。',
    },
  ]

  const response = await generate(messages)
  if (response) {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      generatedOverview.value = JSON.parse(jsonMatch[0])
      message.success('重新生成成功！')
      feedback.value = ''
    } else {
      message.error('AI返回格式错误，请重试')
    }
  }
}

// 保存小说
const handleSave = async () => {
  if (!generatedOverview.value) {
    message.warning('请先生成小说概览')
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
      maxWordsPerChapter: Number(generatedOverview.value.chapterStructure?.maxWordsPerChapter) || 0,
    },
  }

  const id = await createNovel(novel)
  if (id) {
    // 自动创建角色
    const { createFromNovelOverview } = useCharacter()
    const characterCount = await createFromNovelOverview(id, generatedOverview.value)
    if (characterCount > 0) {
      message.success(`已自动创建 ${characterCount} 个角色`)
    }

    // 从概览中提取潜在伏笔
    const { extractFromNovelOverview } = useForeshadowing()
    const foreshadowingCount = await extractFromNovelOverview(
      id,
      generatedOverview.value.plotLines,
      generatedOverview.value.outline
    )
    if (foreshadowingCount > 0) {
      message.success(`已从概览中提取 ${foreshadowingCount} 个潜在伏笔`)
    }

    // 提取角色关系
    const { createRelationsFromNovelOverview } = useCharacterRelation()
    const relationCount = await createRelationsFromNovelOverview(
      id,
      generatedOverview.value.characters
    )
    if (relationCount > 0) {
      message.success(`已自动创建 ${relationCount} 个角色关系`)
    }

    router.push(`/novel/${id}`)
  }
}

// 保存并一键生成全本
const handleSaveAndFullGenerate = async () => {
  if (!generatedOverview.value) {
    message.warning('请先生成小说概览')
    return
  }

  if (!fullGen.checkApiKeySetup()) {
    message.warning('请先在设置中配置 API Key')
    router.push('/settings')
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
  if (!id) return

  // 自动创建角色
  const { createFromNovelOverview } = useCharacter()
  const characterCount = await createFromNovelOverview(id, generatedOverview.value)
  if (characterCount > 0) {
    message.success(`已自动创建 ${characterCount} 个角色`)
  }

  // 从概览中提取潜在伏笔
  const { extractFromNovelOverview } = useForeshadowing()
  const foreshadowingCount = await extractFromNovelOverview(
    id,
    generatedOverview.value.plotLines,
    generatedOverview.value.outline
  )
  if (foreshadowingCount > 0) {
    message.success(`已从概览中提取 ${foreshadowingCount} 个潜在伏笔`)
  }

  // 提取角色关系
  const { createRelationsFromNovelOverview } = useCharacterRelation()
  const relationCount = await createRelationsFromNovelOverview(
    id,
    generatedOverview.value.characters
  )
  if (relationCount > 0) {
    message.success(`已自动创建 ${relationCount} 个角色关系`)
  }

  // 打开进度弹窗，开始全本生成
  showFullGenModal.value = true

  try {
    await fullGen.start(id, fullGenPrompt.value)
    // 生成完成后自动跳转到阅读器
    if (fullGen.phase.value === 'completed') {
      message.success(`全本生成完成，章节后处理将在后台继续执行。共 ${fullGen.results.value.length} 章`)
      showFullGenModal.value = false
      fullGen.reset()
      router.push(`/reader/${id}`)
    }
  } catch (error) {
    console.error('全本生成失败:', error)
    message.error('全本生成失败：' + error.message)
  }
}

// 取消创建
const handleCancel = () => {
  router.push('/')
}

// 返回第一步
const handleBack = () => {
  generatedOverview.value = null
  currentStep.value = 0
}
</script>

<template>
  <div class="novel-create-page">
    <!-- 页面头部 -->
    <PageHeader
      title="创建小说"
      subtitle="输入灵感，AI将为您生成完整的小说概览"
      icon="✨"
      show-back
      @back="handleCancel"
    />

    <!-- 步骤一：输入灵感 -->
    <a-card v-if="currentStep === 0" :bordered="false" class="input-card">
      <div class="input-section">
        <h3 class="section-title">💡 输入您的小说灵感</h3>
        <p class="section-desc">
          描述您想要创作的小说类型、主题、背景或任何想法，AI将为您生成完整的小说概览。
        </p>
        <a-button
          class="inspire-btn"
          ghost
          :loading="loadingInspirations"
          @click="generateInspirations"
        >
          🔄 换一批
        </a-button>

        <div v-if="inspirations.length > 0" class="inspirations-grid">
          <div
            v-for="(insp, index) in inspirations"
            :key="index"
            class="inspiration-card"
            @click="selectInspiration(insp)"
          >
            <div class="insp-title">{{ insp.title }}</div>
            <div class="insp-desc">{{ insp.description }}</div>
          </div>
        </div>

        <a-textarea
          v-model:value="idea"
          :rows="6"
          placeholder="例如：我想写一部修仙小说，主角是一个现代程序员穿越到修仙世界，利用编程思维修炼功法..."
          class="idea-input"
        />
        <div class="action-row">
          <a-button @click="handleCancel">取消</a-button>
          <a-button
            type="primary"
            :loading="generating"
            @click="handleGenerate"
          >
            生成概览
          </a-button>
        </div>
      </div>
    </a-card>

    <!-- 步骤二：预览和编辑 -->
    <template v-else>
      <a-card :bordered="false" class="preview-card">
        <div class="preview-header">
          <h3 class="preview-title">📋 生成结果预览</h3>
          <a-button @click="handleBack">重新输入</a-button>
        </div>

        <NovelForm v-model="generatedOverview" mode="edit" />

        <!-- AI修改区域 -->
        <div class="ai-modify-section">
          <div class="section-title">
            <span class="section-icon">🤖</span>
            <span>AI辅助修改</span>
          </div>
          <a-textarea
            v-model:value="feedback"
            :rows="3"
            placeholder="输入修改意见，AI将根据您的反馈重新生成..."
          />
          <div class="action-row">
            <a-button
              type="primary"
              :loading="generating"
              @click="handleRegenerate"
            >
              重新生成
            </a-button>
          </div>
        </div>
      </a-card>

      <!-- 全本生成自定义提示词 -->
      <a-card :bordered="false" class="input-card" style="margin-bottom: 16px">
        <a-textarea
          v-model:value="fullGenPrompt"
          :rows="2"
          placeholder="全本生成额外要求（可选）：如保持轻松幽默风格、每章结尾设置悬念等..."
        />
      </a-card>

      <!-- 操作按钮 -->
      <div class="bottom-actions">
        <a-button size="large" @click="handleBack">返回修改</a-button>
        <a-space>
          <a-button type="primary" size="large" @click="handleSave">
            保存小说
          </a-button>
          <a-button
            type="primary"
            size="large"
            ghost
            class="btn-full-gen"
            @click="handleSaveAndFullGenerate"
          >
            🚀 保存并一键生成全本
          </a-button>
        </a-space>
      </div>
    </template>
  </div>

  <!-- 全本生成进度弹窗 -->
  <a-modal
    v-model:open="showFullGenModal"
    title="🚀 全本自动生成"
    :footer="null"
    :closable="fullGen.phase === 'completed' || fullGen.phase === 'error' || fullGen.phase === 'cancelled'"
    :mask-closable="false"
    :destroy-on-close="true"
    width="720px"
    class="full-gen-modal"
  >
    <FullGenerationProgress
      :phase="fullGen.phase"
      :progress="fullGen.progress"
      :errors="fullGen.errors"
      :results="fullGen.results"
      :paused="fullGen.paused"
      @pause="fullGen.pause"
      @resume="fullGen.resume"
      @cancel="fullGen.cancel"
    />

    <!-- 关闭按钮（仅在完成后显示） -->
    <div
      v-if="fullGen.phase === 'completed' || fullGen.phase === 'error' || fullGen.phase === 'cancelled'"
      class="modal-footer-actions"
    >
      <a-button
        type="primary"
        @click="showFullGenModal = false; fullGen.reset()"
      >
        {{ fullGen.phase === 'completed' ? '完成' : '关闭' }}
      </a-button>
    </div>
  </a-modal>
</template>

<style scoped>
.novel-create-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.input-card,
.preview-card {
  background: var(--bg-primary);
}

.input-section {
  max-width: 800px;
  margin: 0 auto;
}

.section-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  margin: 0 0 var(--spacing-lg) 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.idea-input {
  font-size: 15px;
}

.inspire-btn {
  margin-bottom: var(--spacing-md);
}

.inspirations-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: var(--spacing-md);
}

.inspiration-card {
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-secondary);
}

.inspiration-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  transform: translateY(-1px);
}

.insp-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.insp-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.preview-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.ai-modify-section {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.section-icon {
  font-size: 20px;
}

.bottom-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
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

.full-gen-modal :deep(.ant-modal-body) {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
