<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useNovel } from '@/composables/useNovel'
import { useAI } from '@/composables/useAI'
import { useCharacter } from '@/composables/useCharacter'
import { useForeshadowing } from '@/composables/useForeshadowing'
import { useCharacterRelation } from '@/composables/useCharacterRelation'
import { inspirationDao } from '@/utils/dao'
import { buildNovelOverviewPrompt } from '@/utils/prompts'
import {
  INSPIRATION_BATCH_SIZE,
  INSPIRATION_HISTORY_LIMIT,
  buildNovelInspirationPrompt,
  createInspirationConstraints,
  filterUniqueInspirations,
  parseInspirationResponse,
  summarizeInspirationBatch,
} from '@/utils/novelInspiration'
import PageHeader from '@/components/common/PageHeader.vue'
import NovelForm from '@/components/novel/NovelForm.vue'
import { useGlobalFullNovelGeneration } from '@/composables/useGlobalFullNovelGeneration'

const router = useRouter()

const { createNovel, sanitizeForDB } = useNovel()
const { generate, loading: generating, checkApiKey } = useAI()
const { generate: generateInspiration } = useAI()

const idea = ref('')
const generatedOverview = ref(null)
const feedback = ref('')
const currentStep = ref(0)
const pendingInspirationSourceIds = ref([])

// AI 随机灵感
const inspirations = ref([])
const loadingInspirations = ref(false)
const recentInspirationBatches = ref([])

const generateInspirations = async () => {
  if (!checkApiKey()) return
  loadingInspirations.value = true
  try {
    const nextBatch = []
    const historyItems = recentInspirationBatches.value.flat()
    const recentSummaries = recentInspirationBatches.value
      .flatMap(batch => summarizeInspirationBatch(batch))

    // 最多补齐 3 轮，避免 AI 偶发重复或返回数量不足时污染卡片列表。
    for (let attempt = 0; attempt < 3 && nextBatch.length < INSPIRATION_BATCH_SIZE; attempt += 1) {
      const remainingCount = INSPIRATION_BATCH_SIZE - nextBatch.length
      const messages = buildNovelInspirationPrompt({
        constraints: createInspirationConstraints(remainingCount),
        recentSummaries,
        count: remainingCount,
      })
      // 灵感生成使用独立 AI 实例，避免联动“生成概览”的加载状态。
      const response = await generateInspiration(messages, { temperature: 1.25 })
      const parsed = parseInspirationResponse(response)
      const uniqueItems = filterUniqueInspirations(parsed, [...historyItems, ...nextBatch])

      if (uniqueItems.length > 0) {
        nextBatch.push(...uniqueItems.slice(0, remainingCount))
      }
    }

    if (nextBatch.length < INSPIRATION_BATCH_SIZE) {
      message.error('AI返回的灵感数量不足，请重试')
      return
    }

    inspirations.value = nextBatch.slice(0, INSPIRATION_BATCH_SIZE)
    recentInspirationBatches.value = [
      [...inspirations.value],
      ...recentInspirationBatches.value,
    ].slice(0, INSPIRATION_HISTORY_LIMIT)
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

const loadPendingNovelOverview = () => {
  const pending = sessionStorage.getItem('pendingNovelOverview')
  if (!pending) return false

  try {
    const parsed = JSON.parse(pending)
    if (!parsed?.overview) return false

    // 从灵感工作台跳转过来时，直接进入概览编辑页继续创建小说。
    generatedOverview.value = parsed.overview
    pendingInspirationSourceIds.value = Array.isArray(parsed.sourceIds) ? parsed.sourceIds : []
    currentStep.value = 1
    message.success('已载入灵感生成的小说概览')
    return true
  } catch {
    message.warning('灵感概览数据读取失败，请重新生成')
    return false
  } finally {
    sessionStorage.removeItem('pendingNovelOverview')
  }
}

// 进入页面时自动加载灵感
onMounted(() => {
  if (loadPendingNovelOverview()) return
  generateInspirations()
})

onActivated(() => {
  loadPendingNovelOverview()
})

const markPendingInspirationsCompleted = async () => {
  const ids = pendingInspirationSourceIds.value.filter(Boolean)
  if (!ids.length) return

  // 从灵感工作台创建小说后，同步把来源灵感标记为已完成。
  await Promise.all(ids.map(id => inspirationDao.markAsCompleted(id)))
  pendingInspirationSourceIds.value = []
}

// 全本一键生成
const fullGenPrompt = ref('')  // 全本生成自定义提示词
const {
  start: startFullGeneration,
  isRunning: isFullGenRunning
} = useGlobalFullNovelGeneration()

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
    await markPendingInspirationsCompleted()

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

  await markPendingInspirationsCompleted()

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

  message.info('全本生成已在后台开始，您可以继续使用页面其他功能')

  try {
    await startFullGeneration(id, fullGenPrompt.value)
  } catch (error) {
    console.error('全本生成失败:', error)
    message.error('全本生成失败：' + error.message)
  }
}

// 取消创建
const handleCancel = () => {
  router.push('/novels')
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
          :loading="loadingInspirations"
          @click="generateInspirations"
        >
          <template v-if="loadingInspirations">加载中</template>
          <template v-else>🔄 换一批</template>
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
            :disabled="isFullGenRunning"
            @click="handleSaveAndFullGenerate"
          >
            {{ isFullGenRunning ? '全本生成中' : '保存并一键生成全本' }}
          </a-button>
        </a-space>
      </div>
    </template>
  </div>
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
  min-width: 128px;
  color: var(--primary-color);
  border-color: var(--primary-color);
  background: #ffffff;
  font-weight: 500;
}

.inspire-btn :deep(span),
.inspire-btn :deep(.anticon) {
  color: inherit;
}

.inspire-btn:hover,
.inspire-btn:focus-visible {
  color: var(--primary-color-dark);
  border-color: var(--primary-color-dark);
  background: rgba(102, 126, 234, 0.06);
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

</style>
