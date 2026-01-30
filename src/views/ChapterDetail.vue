<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { callAI } from '../utils/api'
import { buildChapterRegenerationPrompt } from '../utils/prompts'
import { novelDao, chapterDao } from '../utils/dao'
import { message, Modal } from 'ant-design-vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

const novel = ref(null)
const chapter = ref(null)
const allChapters = ref([])
const loading = ref(false)
const editing = ref(false)
const feedback = ref('')

const prevChapter = computed(() => {
  if (!chapter.value || !allChapters.value.length) return null
  const currentIndex = allChapters.value.findIndex(
    (ch) => ch.chapterNumber === chapter.value.chapterNumber,
  )
  if (currentIndex <= 0) return null
  return allChapters.value[currentIndex - 1].chapterNumber
})

const nextChapter = computed(() => {
  if (!chapter.value || !allChapters.value.length) return null
  const currentIndex = allChapters.value.findIndex(
    (ch) => ch.chapterNumber === chapter.value.chapterNumber,
  )
  if (currentIndex === -1 || currentIndex >= allChapters.value.length - 1) return null
  return allChapters.value[currentIndex + 1].chapterNumber
})

const loadNovel = async () => {
  try {
    novel.value = await novelDao.getById(parseInt(route.params.id))
    if (!novel.value) {
      message.error('小说不存在')
      router.push('/')
      return
    }
    await loadAllChapters()
    await loadChapter()
  } catch (error) {
    message.error('加载小说失败')
  }
}

const loadAllChapters = async () => {
  try {
    const chapters = await chapterDao.getByNovelId(novel.value.id)
    allChapters.value = chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)
  } catch (error) {
    console.error('加载章节列表失败:', error)
  }
}

const loadChapter = async () => {
  loading.value = true
  try {
    chapter.value = await chapterDao.getByNovelIdAndChapterNumber(
      novel.value.id,
      parseInt(route.params.num),
    )
    if (!chapter.value) {
      message.error('章节不存在')
      router.push(`/novel/${novel.value.id}`)
    }
  } catch (error) {
    message.error('加载章节失败')
  } finally {
    loading.value = false
  }
}

const handleEdit = () => {
  editing.value = true
}

const handleCancel = () => {
  editing.value = false
  loadChapter()
}

const handleSave = async () => {
  try {
    await chapterDao.update(chapter.value.id, {
      title: chapter.value.title,
      content: chapter.value.content,
      summary: chapter.value.summary,
      wordCount: chapter.value.content.length,
      updatedAt: new Date().toISOString(),
    })
    message.success('保存成功')
    editing.value = false
  } catch (error) {
    message.error('保存失败：' + error.message)
  }
}

const handleRegenerate = async () => {
  if (!feedback.value.trim()) {
    message.warning('请输入修改意见')
    return
  }

  const apiKey = appStore.getCurrentApiKey()
  if (!apiKey) {
    message.warning('请先在设置中配置API Key')
    router.push('/settings')
    return
  }

  loading.value = true
  try {
    const messages = buildChapterRegenerationPrompt(novel.value, chapter.value, feedback.value)
    const model =
      appStore.settings.aiProvider === 'kimi'
        ? appStore.settings.kimiModel
        : appStore.settings.qianwenModel
    const response = await callAI(messages, appStore.settings.aiProvider, apiKey, model)

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
  } catch (error) {
    message.error('生成失败：' + error.message)
  } finally {
    loading.value = false
  }
}

const handleDelete = () => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这一章吗？删除后将无法恢复。',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await chapterDao.delete(chapter.value.id)
        message.success('删除成功')
        router.push(`/novel/${novel.value.id}`)
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handleExport = () => {
  const content = `第${chapter.value.chapterNumber}章 ${chapter.value.title}\n\n${chapter.value.content}`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `第${chapter.value.chapterNumber}章_${chapter.value.title}.txt`
  a.click()
  URL.revokeObjectURL(url)
  message.success('导出成功')
}

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
  loadNovel()
})

// 监听路由变化，当章节号变化时重新加载章节
watch(
  () => route.params.num,
  (newNum, oldNum) => {
    if (newNum !== oldNum && novel.value) {
      loadChapter()
    }
  },
)
</script>

<template>
  <div class="chapter-detail-page">
    <a-spin :spinning="loading" size="large">
      <template v-if="chapter">
        <!-- 页面头部 -->
        <div class="page-header">
          <div class="header-left">
            <a-button type="text" class="back-btn" @click="handleBack">
              <template #icon>
                <span class="back-icon">←</span>
              </template>
            </a-button>
            <div class="header-info">
              <div class="breadcrumb">
                <span class="novel-title">{{ novel?.title }}</span>
                <span class="divider">/</span>
                <span class="chapter-number">第{{ chapter.chapterNumber }}章</span>
              </div>
              <h1 class="chapter-title">{{ chapter.title }}</h1>
            </div>
          </div>
          <div class="header-right">
            <a-space>
              <a-button class="nav-btn" @click="handlePrev" :disabled="!prevChapter">
                <span class="nav-icon">←</span>
                上一章
              </a-button>
              <a-button class="nav-btn" @click="handleNext" :disabled="!nextChapter">
                下一章
                <span class="nav-icon">→</span>
              </a-button>
            </a-space>
          </div>
        </div>

        <!-- 工具栏 -->
        <div class="toolbar" v-if="!editing">
          <a-space>
            <a-button class="action-btn" @click="handleEdit">
              <template #icon>
                <span class="btn-icon edit-icon">✏️</span>
              </template>
              编辑
            </a-button>
            <a-button class="action-btn" @click="handleExport">
              <template #icon>
                <span class="btn-icon export-icon">📥</span>
              </template>
              导出
            </a-button>
            <a-popconfirm
              title="确定要删除这一章吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleDelete"
            >
              <a-button class="action-btn delete-btn" danger>
                <template #icon>
                  <span class="btn-icon delete-icon">🗑️</span>
                </template>
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </div>

        <div class="toolbar" v-else>
          <a-space>
            <a-button type="primary" class="save-btn" @click="handleSave">
              <template #icon>
                <span class="btn-icon save-icon">💾</span>
              </template>
              保存
            </a-button>
            <a-button class="action-btn" @click="handleCancel">取消</a-button>
          </a-space>
        </div>

        <!-- 阅读模式 -->
        <a-card v-if="!editing" :bordered="false" class="content-card">
          <div class="chapter-content">
            {{ chapter.content }}
          </div>

          <a-divider class="content-divider" />

          <!-- 章节信息 -->
          <div class="chapter-info-section">
            <div class="info-header">
              <span class="info-icon">📋</span>
              <span class="info-title">章节信息</span>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">章节总结</span>
                <span class="info-value summary">{{ chapter.summary }}</span>
              </div>
              <div class="info-row">
                <div class="info-item">
                  <span class="info-label">字数</span>
                  <span class="info-value highlight"
                    >{{ chapter.wordCount.toLocaleString() }} 字</span
                  >
                </div>
                <div class="info-item">
                  <span class="info-label">创建时间</span>
                  <span class="info-value">{{ new Date(chapter.createdAt).toLocaleString() }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">更新时间</span>
                  <span class="info-value">{{ new Date(chapter.updatedAt).toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </a-card>

        <!-- 编辑模式 -->
        <a-card v-else :bordered="false" class="edit-card">
          <a-form layout="vertical" class="edit-form">
            <a-form-item label="章节标题">
              <a-input v-model:value="chapter.title" size="large" class="title-input" />
            </a-form-item>

            <a-form-item label="章节内容">
              <a-textarea
                v-model:value="chapter.content"
                :rows="25"
                class="content-textarea"
                placeholder="在此输入章节内容..."
              />
            </a-form-item>

            <a-form-item label="章节总结">
              <a-textarea
                v-model:value="chapter.summary"
                :rows="3"
                placeholder="请输入章节总结（50-100字，精炼概括本章主要情节）"
                class="summary-textarea"
              />
            </a-form-item>

            <a-divider class="section-divider">
              <span class="divider-text">
                <span class="divider-icon">🤖</span>
                AI 辅助生成
              </span>
            </a-divider>

            <a-form-item label="重新生成（可选）">
              <a-textarea
                v-model:value="feedback"
                placeholder="如果不满意，可以输入修改意见，让AI重新生成..."
                :rows="3"
                class="feedback-textarea"
              />
              <div class="quick-actions">
                <span class="quick-label">快速建议：</span>
                <a-space wrap>
                  <a-tag class="quick-tag" @click="feedback += '增加更多对话内容，丰富人物互动'">
                    💬 增加对话
                  </a-tag>
                  <a-tag class="quick-tag" @click="feedback += '增加环境描写和氛围渲染'">
                    🌄 环境描写
                  </a-tag>
                  <a-tag class="quick-tag" @click="feedback += '增加人物心理活动和内心独白'">
                    💭 心理描写
                  </a-tag>
                  <a-tag
                    class="quick-tag"
                    @click="feedback += '增加背景故事和细节描述，确保内容充实'"
                  >
                    📖 丰富内容
                  </a-tag>
                </a-space>
              </div>
            </a-form-item>

            <a-form-item>
              <a-button
                type="primary"
                @click="handleRegenerate"
                :loading="loading"
                size="large"
                class="regenerate-btn"
              >
                <template #icon>
                  <span class="btn-icon">🔄</span>
                </template>
                AI重新生成
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>

        <!-- 底部导航 -->
        <div class="chapter-navigation" v-if="!editing">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-button
                block
                size="large"
                @click="handlePrev"
                :disabled="!prevChapter"
                class="nav-btn-large prev-btn"
              >
                <span class="nav-arrow">←</span>
                <div class="nav-content">
                  <span class="nav-label">上一章</span>
                  <span class="nav-hint" v-if="prevChapter">第{{ prevChapter }}章</span>
                </div>
              </a-button>
            </a-col>
            <a-col :span="12">
              <a-button
                block
                size="large"
                @click="handleNext"
                :disabled="!nextChapter"
                class="nav-btn-large next-btn"
              >
                <div class="nav-content">
                  <span class="nav-label">下一章</span>
                  <span class="nav-hint" v-if="nextChapter">第{{ nextChapter }}章</span>
                </div>
                <span class="nav-arrow">→</span>
              </a-button>
            </a-col>
          </a-row>
        </div>
      </template>
    </a-spin>
  </div>
</template>

<style scoped>
.chapter-detail-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: none;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-3px);
}

.back-icon {
  font-size: 20px;
  color: white;
}

.header-info {
  color: white;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.novel-title {
  font-weight: 500;
}

.divider {
  opacity: 0.6;
}

.chapter-number {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
}

.chapter-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 500;
  transition: all 0.3s ease;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.nav-btn:disabled {
  opacity: 0.4;
  background: rgba(255, 255, 255, 0.1);
}

.nav-icon {
  margin: 0 4px;
}

/* 工具栏 */
.toolbar {
  margin-bottom: 24px;
  padding: 16px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-icon {
  margin-right: 6px;
}

.save-btn {
  height: 40px;
  padding: 0 24px;
  border-radius: 10px;
  font-weight: 600;
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
  transition: all 0.3s ease;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(82, 196, 26, 0.4);
}

.delete-btn:hover {
  background: #ff4d4f;
  border-color: #ff4d4f;
  color: white;
}

/* 内容卡片 */
.content-card,
.edit-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.chapter-content {
  font-size: 17px;
  line-height: 2;
  color: #333;
  padding: 32px;
  background: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);
  border-radius: 12px;
  min-height: 400px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif;
}

.content-divider {
  margin: 32px 0;
  border-color: #f0f0f0;
}

/* 章节信息 */
.chapter-info-section {
  padding: 0 24px 24px;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.info-icon {
  font-size: 20px;
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item:first-child {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: #333;
}

.info-value.summary {
  font-size: 15px;
  line-height: 1.6;
  color: #555;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.info-value.highlight {
  font-size: 18px;
  font-weight: 600;
  color: #667eea;
}

/* 编辑表单 */
.edit-form {
  padding: 24px;
}

.title-input {
  border-radius: 10px;
  font-size: 16px;
}

.content-textarea {
  border-radius: 10px;
  font-size: 15px;
  line-height: 1.8;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif;
  resize: vertical;
}

.summary-textarea,
.feedback-textarea {
  border-radius: 10px;
  font-size: 14px;
  resize: vertical;
}

.section-divider {
  margin: 32px 0;
}

.divider-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  background: white;
  padding: 0 16px;
}

.divider-icon {
  font-size: 16px;
}

.quick-actions {
  margin-top: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 10px;
}

.quick-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
  font-weight: 500;
}

.quick-tag {
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 4px 12px;
}

.quick-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.regenerate-btn {
  height: 48px;
  padding: 0 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.regenerate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

/* 底部导航 */
.chapter-navigation {
  margin-top: 32px;
}

.nav-btn-large {
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: white;
  border: 2px solid #e8e8e8;
  transition: all 0.3s ease;
}

.nav-btn-large:hover:not(:disabled) {
  border-color: #667eea;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
}

.nav-btn-large:disabled {
  opacity: 0.4;
  background: #f5f5f5;
}

.nav-arrow {
  font-size: 20px;
  color: #667eea;
  font-weight: bold;
}

.nav-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.next-btn .nav-content {
  align-items: flex-end;
}

.nav-label {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.nav-hint {
  font-size: 12px;
  color: #999;
}

/* 响应式 */
@media (max-width: 768px) {
  .chapter-detail-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .header-left {
    flex-direction: column;
  }

  .chapter-title {
    font-size: 20px;
  }

  .info-row {
    grid-template-columns: 1fr;
  }

  .chapter-content {
    padding: 20px;
    font-size: 16px;
  }
}
</style>
