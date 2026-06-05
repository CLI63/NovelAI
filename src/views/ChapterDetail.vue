<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { useNovel } from '@/composables/useNovel'
import { useChapter, useChapterExport } from '@/composables/useChapter'
import { useAI } from '@/composables/useAI'
import { useCoherenceScore } from '@/composables/useCoherenceScore'
import { processChapter } from '@/utils/chapterPostProcessor'
import { buildChapterRegenerationPrompt } from '@/utils/prompts'
import PageHeader from '@/components/common/PageHeader.vue'

const router = useRouter()
const route = useRoute()

const { novel, loadNovel } = useNovel()
const { chapter, chapters, loading: chapterLoading, loadChapter, loadChapters, updateChapter, deleteChapter, getPrevNextChapter } = useChapter()
const { exportChapter } = useChapterExport()
const { generate, loading: generating, checkApiKey } = useAI()
const {
  scoring,
  scoreResult,
  suggestions,
  runCoherenceScore
} = useCoherenceScore()

const scoreLevelText = computed(() => {
  const level = scoreResult.value?.level
  return typeof level === 'object' ? level.text : level
})

const scoreLevelColor = computed(() => {
  const level = scoreResult.value?.level
  return typeof level === 'object' ? level.color : (scoreResult.value?.passed ? 'success' : 'error')
})

// 后处理状态
const postProcessing = ref(false)
const postProcessResults = ref(null)

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

// 执行连贯性评分
const handleCoherenceScore = async () => {
  if (!checkApiKey()) return
  
  // 获取上一章
  const prevChapterNum = chapter.value.chapterNumber - 1
  const prevChapterData = chapters.value?.find(c => c.chapterNumber === prevChapterNum)
  
  if (!prevChapterData) {
    message.warning('没有上一章数据，无法进行连贯性评分')
    return
  }
  
  await runCoherenceScore(chapter.value, prevChapterData, novel.value, generate)
}

/**
 * 重新触发章节后处理（摘要、伏笔、角色、时间线等）
 */
const handleReprocess = async () => {
  if (!chapter.value || !novel.value) return

  postProcessing.value = true
  postProcessResults.value = null

  try {
    const results = await processChapter({
      novel: novel.value,
      chapter: {
        id: chapter.value.id,
        content: chapter.value.content,
        chapterNumber: chapter.value.chapterNumber,
        title: chapter.value.title || ''
      },
      callAI: generate
    })

    postProcessResults.value = results

    const successCount = Object.values(results).filter(r => r.success).length
    const failedCount = Object.values(results).filter(r => !r.success).length

    if (failedCount === 0) {
      message.success(`后处理完成，全部 ${successCount} 项成功`)
    } else {
      message.warning(`后处理完成：${successCount} 项成功，${failedCount} 项失败`)
    }
  } catch (err) {
    console.error('后处理失败:', err)
    message.error('后处理失败：' + err.message)
  } finally {
    postProcessing.value = false
  }
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
            <a-button v-if="!editing" type="default" :loading="postProcessing" @click="handleReprocess">
              {{ postProcessing ? '处理中...' : '🔄 重新处理' }}
            </a-button>
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

            <!-- 连贯性评分面板 -->
            <a-card title="📊 章节连贯性评分" :bordered="false" class="coherence-card">
              <template #extra>
                <a-button
                  type="primary"
                  :loading="scoring"
                  :disabled="chapter.chapterNumber <= 1"
                  @click="handleCoherenceScore"
                >
                  开始评分
                </a-button>
              </template>
              
              <a-empty v-if="!scoreResult && !scoring" description="点击开始评分，AI将分析本章与上一章的连贯性" />
              
              <a-spin :spinning="scoring">
                <div v-if="scoreResult" class="score-result">
                  <!-- 总分 -->
                  <div class="overall-score">
                    <a-progress
                      type="circle"
                      :percent="scoreResult.overallScore"
                      :status="scoreResult.passed ? 'success' : 'exception'"
                    />
                    <div class="score-level">
                      <a-tag :color="scoreLevelColor" size="large">
                        {{ scoreLevelText }}
                      </a-tag>
                    </div>
                  </div>
                  
                  <!-- 各维度评分 -->
                  <div class="dimension-scores">
                    <div
                      v-for="dim in scoreResult.dimensions"
                      :key="dim.key"
                      class="dimension-item"
                    >
                      <div class="dimension-header">
                        <span class="dimension-name">{{ dim.name }}</span>
                        <span class="dimension-score">{{ dim.score }}分</span>
                      </div>
                      <a-progress
                        :percent="dim.score"
                        :show-info="false"
                        :status="dim.score >= 60 ? 'success' : 'exception'"
                      />
                      <div class="dimension-analysis">{{ dim.analysis }}</div>
                    </div>
                  </div>
                  
                  <!-- 修改建议 -->
                  <div v-if="suggestions.length > 0" class="suggestions">
                    <div class="suggestions-title">📝 修改建议</div>
                    <a-list :data-source="suggestions" size="small">
                      <template #renderItem="{ item }">
                        <a-list-item>
                          <a-list-item-meta :description="item" />
                        </a-list-item>
                      </template>
                    </a-list>
                  </div>
                </div>
              </a-spin>
            </a-card>

            <!-- 后处理结果面板 -->
            <a-card v-if="postProcessResults" title="📊 后处理结果" :bordered="false" class="post-process-card">
              <div class="process-results">
                <div class="result-item" :class="{ success: postProcessResults.structuredSummary.success, failed: !postProcessResults.structuredSummary.success }">
                  <span class="result-name">结构化摘要</span>
                  <a-tag :color="postProcessResults.structuredSummary.success ? 'success' : 'error'">
                    {{ postProcessResults.structuredSummary.success ? '成功' : '失败' }}
                  </a-tag>
                </div>
                <div class="result-item" :class="{ success: postProcessResults.foreshadowingExtract.success, failed: !postProcessResults.foreshadowingExtract.success }">
                  <span class="result-name">伏笔提取</span>
                  <a-tag :color="postProcessResults.foreshadowingExtract.success ? 'success' : 'error'">
                    {{ postProcessResults.foreshadowingExtract.success ? `成功 (${postProcessResults.foreshadowingExtract.count}个)` : '失败' }}
                  </a-tag>
                </div>
                <div class="result-item" :class="{ success: postProcessResults.characterAppearance.success, failed: !postProcessResults.characterAppearance.success }">
                  <span class="result-name">角色出场</span>
                  <a-tag :color="postProcessResults.characterAppearance.success ? 'success' : 'error'">
                    {{ postProcessResults.characterAppearance.success ? `成功 (${postProcessResults.characterAppearance.count}个)` : '失败' }}
                  </a-tag>
                </div>
                <div class="result-item" :class="{ success: postProcessResults.characterStatus.success, failed: !postProcessResults.characterStatus.success }">
                  <span class="result-name">角色状态</span>
                  <a-tag :color="postProcessResults.characterStatus.success ? 'success' : 'error'">
                    {{ postProcessResults.characterStatus.success ? '成功' : '失败' }}
                  </a-tag>
                </div>
                <div class="result-item" :class="{ success: postProcessResults.foreshadowingResolution.success, failed: !postProcessResults.foreshadowingResolution.success }">
                  <span class="result-name">伏笔回收</span>
                  <a-tag :color="postProcessResults.foreshadowingResolution.success ? 'success' : 'error'">
                    {{ postProcessResults.foreshadowingResolution.success ? `成功 (${postProcessResults.foreshadowingResolution.count}个)` : '失败' }}
                  </a-tag>
                </div>
                <div class="result-item" :class="{ success: postProcessResults.timeline.success, failed: !postProcessResults.timeline.success }">
                  <span class="result-name">时间线事件</span>
                  <a-tag :color="postProcessResults.timeline.success ? 'success' : 'error'">
                    {{ postProcessResults.timeline.success ? `成功 (${postProcessResults.timeline.count}个)` : '失败' }}
                  </a-tag>
                </div>
              </div>
            </a-card>
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

/* 连贯性评分样式 */
.coherence-card {
  margin-top: var(--spacing-lg);
}

.score-result {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.overall-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.score-level {
  font-size: 16px;
  font-weight: 600;
}

.dimension-scores {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.dimension-item {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.dimension-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
}

.dimension-name {
  font-weight: 500;
  color: var(--text-primary);
}

.dimension-score {
  font-weight: 600;
  color: var(--text-secondary);
}

.dimension-analysis {
  margin-top: var(--spacing-xs);
  font-size: 13px;
  color: var(--text-secondary);
}

/* 后处理结果样式 */
.post-process-card {
  margin-top: var(--spacing-lg);
}

.process-results {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border-left: 3px solid transparent;
}

.result-item.success {
  border-left-color: var(--success-color, #52c41a);
}

.result-item.failed {
  border-left-color: var(--error-color, #ff4d4f);
}

.result-name {
  font-size: 14px;
  color: var(--text-primary);
}

.suggestions {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.suggestions-title {
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}
</style>
