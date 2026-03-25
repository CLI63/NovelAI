<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { useNovel } from '@/composables/useNovel'
import { useChapter, useChapterExport } from '@/composables/useChapter'
import { useAI } from '@/composables/useAI'
import { buildChapterRegenerationPrompt } from '@/utils/prompts'
import PageHeader from '@/components/common/PageHeader.vue'

const router = useRouter()
const route = useRoute()

const { novel, loadNovel } = useNovel()
const { chapter, chapters, loading: chapterLoading, loadChapter, loadChapters, updateChapter, deleteChapter, getPrevNextChapter } = useChapter()
const { exportChapter } = useChapterExport()
const { generate, loading: generating, checkApiKey } = useAI()

const editing = ref(false)
const feedback = ref('')

// 上一章/下一章
const { prev: prevChapter, next: nextChapter } = computed(() => {
  if (!chapter.value || !chapters.value?.length) return { prev: null, next: null }
  return getPrevNextChapter(chapter.value.chapterNumber)
})

// 加载数据
const loadData = async () => {
  const novelId = parseInt(route.params.id)
  await loadNovel(novelId)
  if (novel.value) {
    await loadChapters(novel.value.id)
    await loadChapter(novel.value.id, parseInt(route.params.num))
  }
}

// 监听路由变化
watch(
  () => route.params.num,
  (newNum, oldNum) => {
    if (newNum !== oldNum && novel.value) {
      loadChapter(novel.value.id, parseInt(newNum))
    }
  }
)

// 编辑
const handleEdit = () => {
  editing.value = true
}

// 取消编辑
const handleCancel = () => {
  editing.value = false
  loadChapter(novel.value.id, chapter.value.chapterNumber)
}

// 保存
const handleSave = async () => {
  const success = await updateChapter(chapter.value.id, {
    title: chapter.value.title,
    content: chapter.value.content,
    summary: chapter.value.summary,
    wordCount: chapter.value.content.length,
  })
  if (success) {
    editing.value = false
  }
}

// 重新生成
const handleRegenerate = async () => {
  if (!feedback.value.trim()) {
    message.warning('请输入修改意见')
    return
  }

  if (!checkApiKey()) return

  const messages = buildChapterRegenerationPrompt(novel.value, chapter.value, feedback.value)
  const response = await generate(messages)

  if (response) {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const newChapter = JSON.parse(jsonMatch[0])
      chapter.value.title = newChapter.title
      chapter.value.content = newChapter.content
      chapter.value.summary = newChapter.summary
      chapter.value.wordCount = newChapter.content.length
      message.success('重新生成成功！')
      feedback.value = ''
      editing.value = true
    } else {
      message.error('AI返回格式错误，请重试')
    }
  }
}

// 删除
const handleDelete = () => {
  deleteChapter(chapter.value.id, () => router.push(`/novel/${novel.value.id}`))
}

// 导出
const handleExport = () => {
  exportChapter(chapter.value)
}

// 导航
const handlePrev = () => {
  if (prevChapter.value) {
    router.push(`/novel/${novel.value.id}/chapter/${prevChapter.value}`)
  }
}

const handleNext = () => {
  if (nextChapter.value) {
    router.push(`/novel/${novel.value.id}/chapter/${nextChapter.value}`)
  }
}

const handleBack = () => {
  router.push(`/novel/${novel.value.id}`)
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="chapter-detail-page">
    <a-spin :spinning="chapterLoading" size="large">
      <template v-if="chapter">
        <!-- 页面头部 -->
        <PageHeader
          :title="`第${chapter.chapterNumber}章 ${chapter.title}`"
          :subtitle="`${chapter.wordCount?.toLocaleString() || 0} 字`"
          icon="📄"
          show-back
          @back="handleBack"
        >
          <template #actions>
            <a-button-group>
              <a-button :disabled="!prevChapter" @click="handlePrev">
                上一章
              </a-button>
              <a-button :disabled="!nextChapter" @click="handleNext">
                下一章
              </a-button>
            </a-button-group>
            <a-button v-if="!editing" @click="handleEdit">编辑</a-button>
            <a-button v-if="!editing" @click="handleExport">导出</a-button>
            <a-button v-if="!editing" danger @click="handleDelete">删除</a-button>
          </template>
        </PageHeader>

        <!-- 内容区域 -->
        <a-card :bordered="false" class="content-card">
          <!-- 查看模式 -->
          <template v-if="!editing">
            <div class="chapter-content">
              <h2 class="chapter-title">{{ chapter.title }}</h2>
              <div class="content-text">{{ chapter.content }}</div>
            </div>

            <!-- AI修改区域 -->
            <div class="ai-modify-section">
              <div class="section-title">
                <span class="section-icon">🤖</span>
                <span>AI辅助修改</span>
              </div>
              <a-textarea
                v-model:value="feedback"
                :rows="3"
                placeholder="输入修改意见，AI将根据您的反馈重新生成章节..."
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
          </template>

          <!-- 编辑模式 -->
          <template v-else>
            <div class="edit-form">
              <a-form-item label="章节标题">
                <a-input v-model:value="chapter.title" size="large" />
              </a-form-item>
              <a-form-item label="章节内容">
                <a-textarea
                  v-model:value="chapter.content"
                  :auto-size="{ minRows: 15, maxRows: 30 }"
                />
              </a-form-item>
              <a-form-item label="章节总结">
                <a-textarea v-model:value="chapter.summary" :rows="3" />
              </a-form-item>
              <div class="edit-actions">
                <a-button @click="handleCancel">取消</a-button>
                <a-button type="primary" :loading="chapterLoading" @click="handleSave">
                  保存
                </a-button>
              </div>
            </div>
          </template>
        </a-card>

        <!-- 章节导航 -->
        <div class="chapter-nav">
          <a-button
            v-if="prevChapter"
            type="text"
            class="nav-btn prev"
            @click="handlePrev"
          >
            ← 上一章
          </a-button>
          <a-button
            v-if="nextChapter"
            type="text"
            class="nav-btn next"
            @click="handleNext"
          >
            下一章 →
          </a-button>
        </div>
      </template>
    </a-spin>
  </div>
</template>

<style scoped>
.chapter-detail-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.content-card {
  background: var(--bg-primary);
}

.chapter-content {
  margin-bottom: var(--spacing-lg);
}

.chapter-title {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

.content-text {
  font-size: 16px;
  line-height: 2;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-modify-section {
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-top: var(--spacing-lg);
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

.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.chapter-nav {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-md);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
}

.nav-btn {
  font-size: 15px;
}
</style>
