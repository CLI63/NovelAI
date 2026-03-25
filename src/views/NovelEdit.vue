<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { useNovel } from '@/composables/useNovel'
import { useAI } from '@/composables/useAI'
import { buildNovelOverviewPrompt } from '@/utils/prompts'
import PageHeader from '@/components/common/PageHeader.vue'
import NovelForm from '@/components/novel/NovelForm.vue'

const router = useRouter()
const route = useRoute()

const { novel, loading, loadNovel, updateNovel } = useNovel()
const { generate, checkApiKey } = useAI()

const feedback = ref('')
const regenerating = ref(false)

// 支线剧情计算属性
const subPlotLines = computed({
  get: () => novel.value?.plotLines?.sub?.join('\n') || '',
  set: (val) => {
    if (!novel.value) return
    if (!novel.value.plotLines) {
      novel.value.plotLines = { main: '', sub: [] }
    }
    novel.value.plotLines.sub = val.split('\n').filter((line) => line.trim())
  },
})

// 加载小说
onMounted(async () => {
  await loadNovel(parseInt(route.params.id))
})

// 重新生成概览
const handleRegenerate = async () => {
  if (!feedback.value.trim()) {
    message.warning('请输入修改意见')
    return
  }

  if (!checkApiKey()) return

  regenerating.value = true
  try {
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
        content: '请根据用户反馈重新生成小说概览，保持原有格式要求。',
      },
    ]

    const response = await generate(messages)
    if (response) {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const newOverview = JSON.parse(jsonMatch[0])
        novel.value = { ...novel.value, ...newOverview }
        message.success('重新生成成功！')
        feedback.value = ''
      } else {
        message.error('AI返回格式错误，请重试')
      }
    }
  } catch (error) {
    message.error('生成失败：' + error.message)
  } finally {
    regenerating.value = false
  }
}

// 保存修改
const handleSave = async () => {
  const success = await updateNovel(novel.value.id, {
    title: novel.value.title || '',
    description: novel.value.description || '',
    style: Array.isArray(novel.value.style) ? [...novel.value.style] : [],
    estimatedWords: novel.value.estimatedWords || '',
    plotLines: {
      main: novel.value.plotLines?.main || '',
      sub: Array.isArray(novel.value.plotLines?.sub) ? [...novel.value.plotLines.sub] : [],
    },
    outline: Array.isArray(novel.value.outline)
      ? novel.value.outline.map((vol) => ({
          volume: vol.volume || '',
          chapters: vol.chapters || '',
          summary: vol.summary || '',
        }))
      : [],
    chapterStructure: {
      totalChapters: novel.value.chapterStructure?.totalChapters || 0,
      minWordsPerChapter: novel.value.chapterStructure?.minWordsPerChapter || 0,
      maxWordsPerChapter: novel.value.chapterStructure?.maxWordsPerChapter || 0,
    },
  })

  if (success) {
    router.push(`/novel/${novel.value.id}`)
  }
}

// 取消编辑
const handleCancel = () => {
  router.push(`/novel/${novel.value.id}`)
}
</script>

<template>
  <div class="novel-edit-page">
    <a-spin :spinning="loading" size="large">
      <template v-if="novel">
        <!-- 页面头部 -->
        <PageHeader
          title="编辑小说"
          subtitle="修改小说概览信息"
          icon="✏️"
          show-back
          @back="handleCancel"
        />

        <!-- 编辑表单 -->
        <a-card :bordered="false" class="form-card">
          <a-form layout="vertical" class="edit-form">
            <NovelForm v-model="novel" mode="edit" />
          </a-form>

          <!-- AI重新生成区域 -->
          <div class="regenerate-section">
            <div class="section-title">
              <span class="section-icon">🤖</span>
              <span>AI辅助修改</span>
            </div>
            <a-textarea
              v-model:value="feedback"
              :rows="3"
              placeholder="输入修改意见，AI将根据您的反馈重新生成概览..."
            />
            <div class="action-row">
              <a-button
                type="primary"
                :loading="regenerating"
                @click="handleRegenerate"
              >
                重新生成
              </a-button>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="form-actions">
            <a-button @click="handleCancel">取消</a-button>
            <a-button type="primary" :loading="loading" @click="handleSave">
              保存修改
            </a-button>
          </div>
        </a-card>
      </template>
    </a-spin>
  </div>
</template>

<style scoped>
.novel-edit-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-card {
  background: var(--bg-primary);
}

.edit-form {
  margin-bottom: var(--spacing-lg);
}

.regenerate-section {
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-icon {
  font-size: 20px;
}

.action-row {
  margin-top: var(--spacing-md);
  display: flex;
  justify-content: flex-end;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}
</style>
