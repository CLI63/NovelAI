<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useNovel } from '@/composables/useNovel'
import { useAI } from '@/composables/useAI'
import { buildNovelOverviewPrompt } from '@/utils/prompts'
import PageHeader from '@/components/common/PageHeader.vue'
import NovelForm from '@/components/novel/NovelForm.vue'

const router = useRouter()

const { createNovel, sanitizeForDB } = useNovel()
const { generate, loading: generating, checkApiKey } = useAI()

const idea = ref('')
const generatedOverview = ref(null)
const feedback = ref('')
const currentStep = ref(0)

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
    router.push(`/novel/${id}`)
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

      <!-- 操作按钮 -->
      <div class="bottom-actions">
        <a-button size="large" @click="handleBack">返回修改</a-button>
        <a-button type="primary" size="large" @click="handleSave">
          保存小说
        </a-button>
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
</style>
