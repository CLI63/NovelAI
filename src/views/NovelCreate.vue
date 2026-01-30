<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { callAI } from '../utils/api'
import { buildNovelOverviewPrompt } from '../utils/prompts'
import { novelDao } from '../utils/dao'
import { message } from 'ant-design-vue'

const router = useRouter()
const appStore = useAppStore()

const idea = ref('')
const generating = ref(false)
const generatedOverview = ref(null)
const feedback = ref('')
const currentStep = ref(0)

/**
 * 计算支线剧情文本
 */
const subPlotLines = computed({
  get: () => {
    if (
      !generatedOverview.value ||
      !generatedOverview.value.plotLines ||
      !generatedOverview.value.plotLines.sub
    ) {
      return ''
    }
    return generatedOverview.value.plotLines.sub.join('\n')
  },
  set: (val) => {
    if (!generatedOverview.value) return
    if (!generatedOverview.value.plotLines) {
      generatedOverview.value.plotLines = { main: '', sub: [] }
    }
    generatedOverview.value.plotLines.sub = val.split('\n').filter((line) => line.trim())
  },
})

/**
 * 生成小说概览
 */
const handleGenerate = async () => {
  if (!idea.value.trim()) {
    message.warning('请输入小说灵感')
    return
  }

  const apiKey = appStore.getCurrentApiKey()
  if (!apiKey) {
    message.warning('请先在设置中配置API Key')
    router.push('/settings')
    return
  }

  generating.value = true
  try {
    const messages = buildNovelOverviewPrompt(idea.value)
    const model =
      appStore.settings.aiProvider === 'kimi'
        ? appStore.settings.kimiModel
        : appStore.settings.qianwenModel
    const response = await callAI(messages, appStore.settings.aiProvider, apiKey, model)

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      generatedOverview.value = JSON.parse(jsonMatch[0])
      currentStep.value = 1
      message.success('生成成功！')
    } else {
      message.error('AI返回格式错误，请重试')
    }
  } catch (error) {
    message.error('生成失败：' + error.message)
  } finally {
    generating.value = false
  }
}

/**
 * 重新生成小说概览
 */
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

  generating.value = true
  try {
    const messages = []
    messages.push({
      role: 'system',
      content: '你是一位专业的小说创作助手，擅长根据用户反馈重新生成小说概览。',
    })
    messages.push({
      role: 'user',
      content: `用户对之前的小说概览有以下反馈：${feedback.value}`,
    })
    messages.push({
      role: 'user',
      content: `原始灵感：${idea.value}`,
    })
    messages.push({
      role: 'user',
      content: '请根据用户反馈重新生成小说概览，保持原有格式要求。',
    })

    const model =
      appStore.settings.aiProvider === 'kimi'
        ? appStore.settings.kimiModel
        : appStore.settings.qianwenModel
    const response = await callAI(messages, appStore.settings.aiProvider, apiKey, model)

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      generatedOverview.value = JSON.parse(jsonMatch[0])
      message.success('重新生成成功！')
      feedback.value = ''
    } else {
      message.error('AI返回格式错误，请重试')
    }
  } catch (error) {
    message.error('生成失败：' + error.message)
  } finally {
    generating.value = false
  }
}

/**
 * 保存小说
 */
const handleSave = async () => {
  if (!generatedOverview.value) {
    message.warning('请先生成小说概览')
    return
  }

  try {
    const novel = {
      title: generatedOverview.value.title || '',
      description: generatedOverview.value.description || '',
      style: Array.isArray(generatedOverview.value.style) ? [...generatedOverview.value.style] : [],
      estimatedWords: generatedOverview.value.estimatedWords || '',
      plotLines: {
        main: generatedOverview.value.plotLines?.main || '',
        sub: Array.isArray(generatedOverview.value.plotLines?.sub)
          ? [...generatedOverview.value.plotLines.sub]
          : [],
      },
      outline: Array.isArray(generatedOverview.value.outline)
        ? generatedOverview.value.outline.map((vol) => ({
            volume: vol.volume || '',
            chapters: vol.chapters || '',
            summary: vol.summary || '',
          }))
        : [],
      chapterStructure: {
        totalChapters: generatedOverview.value.chapterStructure?.totalChapters || 0,
        minWordsPerChapter: generatedOverview.value.chapterStructure?.minWordsPerChapter || 0,
        maxWordsPerChapter: generatedOverview.value.chapterStructure?.maxWordsPerChapter || 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const id = await novelDao.add(novel)
    message.success('保存成功！')
    router.push(`/novel/${id}`)
  } catch (error) {
    message.error('保存失败：' + error.message)
  }
}

/**
 * 取消创建
 */
const handleCancel = () => {
  router.push('/')
}

/**
 * 返回第一步
 */
const handleBack = () => {
  generatedOverview.value = null
  currentStep.value = 0
}
</script>

<template>
  <div class="novel-create-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <a-button type="text" class="back-btn" @click="handleCancel">
          <template #icon>
            <span class="back-icon">←</span>
          </template>
        </a-button>
        <div class="header-info">
          <h1 class="page-title">✨ 创建新小说</h1>
          <p class="page-subtitle">让AI帮你生成完整的小说概览</p>
        </div>
      </div>
    </div>

    <!-- 步骤条 -->
    <div class="steps-section">
      <a-steps :current="currentStep" class="create-steps">
        <a-step title="输入灵感" description="描述你的小说创意" />
        <a-step title="确认概览" description="调整并保存小说信息" />
      </a-steps>
    </div>

    <!-- 第一步：输入灵感 -->
    <a-card v-if="!generatedOverview" :bordered="false" class="form-card">
      <a-alert
        message="AI智能生成"
        description="输入你的小说灵感，AI将自动生成完整的小说概览，包括书名、简介、风格、剧情线、大纲和章节结构。"
        type="info"
        show-icon
        class="info-alert"
      />

      <a-form layout="vertical" class="create-form">
        <a-form-item label="小说灵感">
          <a-textarea
            v-model:value="idea"
            placeholder="请输入你的小说创意、灵感或想法（例如：一个现代程序员穿越到古代，利用现代知识改变历史的故事）"
            :rows="12"
            show-count
            :maxlength="2000"
            class="idea-input"
          />
        </a-form-item>

        <a-form-item class="form-actions">
          <a-space size="large">
            <a-button
              type="primary"
              size="large"
              class="generate-btn"
              :loading="generating"
              @click="handleGenerate"
            >
              <template #icon>
                <span class="btn-icon">✨</span>
              </template>
              {{ generating ? '生成中...' : '生成小说概览' }}
            </a-button>
            <a-button size="large" class="cancel-btn" @click="handleCancel"> 取消 </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 第二步：确认概览 -->
    <template v-else>
      <a-card :bordered="false" class="form-card">
        <a-form layout="vertical" class="overview-form">
          <a-row :gutter="24">
            <a-col :span="12">
              <a-form-item label="书名">
                <a-input
                  v-model:value="generatedOverview.title"
                  size="large"
                  placeholder="请输入书名"
                  class="form-input"
                />
              </a-form-item>

              <a-form-item label="简介">
                <a-textarea
                  v-model:value="generatedOverview.description"
                  :rows="5"
                  placeholder="请输入小说简介"
                  class="form-textarea"
                />
              </a-form-item>

              <a-form-item label="风格">
                <a-select
                  v-model:value="generatedOverview.style"
                  mode="tags"
                  placeholder="选择或输入风格标签"
                  size="large"
                  class="form-select"
                >
                  <a-select-option value="玄幻">玄幻</a-select-option>
                  <a-select-option value="仙侠">仙侠</a-select-option>
                  <a-select-option value="都市">都市</a-select-option>
                  <a-select-option value="科幻">科幻</a-select-option>
                  <a-select-option value="历史">历史</a-select-option>
                  <a-select-option value="军事">军事</a-select-option>
                  <a-select-option value="言情">言情</a-select-option>
                  <a-select-option value="悬疑">悬疑</a-select-option>
                  <a-select-option value="恐怖">恐怖</a-select-option>
                  <a-select-option value="武侠">武侠</a-select-option>
                  <a-select-option value="游戏">游戏</a-select-option>
                  <a-select-option value="竞技">竞技</a-select-option>
                  <a-select-option value="灵异">灵异</a-select-option>
                  <a-select-option value="同人">同人</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="预估字数">
                <a-input
                  v-model:value="generatedOverview.estimatedWords"
                  size="large"
                  placeholder="例如：100万字"
                  class="form-input"
                />
              </a-form-item>
            </a-col>

            <a-col :span="12">
              <a-form-item label="主线剧情">
                <a-textarea
                  v-model:value="generatedOverview.plotLines.main"
                  :rows="5"
                  placeholder="请输入主线剧情"
                  class="form-textarea"
                />
              </a-form-item>

              <a-form-item label="支线剧情">
                <a-textarea
                  v-model:value="subPlotLines"
                  :rows="5"
                  placeholder="每行一个支线"
                  class="form-textarea"
                />
              </a-form-item>

              <a-form-item label="章节结构">
                <a-row :gutter="12">
                  <a-col :span="8">
                    <a-input-number
                      v-model:value="generatedOverview.chapterStructure.totalChapters"
                      placeholder="总章节数"
                      size="large"
                      class="form-number"
                      :min="1"
                    />
                  </a-col>
                  <a-col :span="8">
                    <a-input-number
                      v-model:value="generatedOverview.chapterStructure.minWordsPerChapter"
                      placeholder="最小字数"
                      size="large"
                      class="form-number"
                      :min="500"
                      :step="100"
                    />
                  </a-col>
                  <a-col :span="8">
                    <a-input-number
                      v-model:value="generatedOverview.chapterStructure.maxWordsPerChapter"
                      placeholder="最大字数"
                      size="large"
                      class="form-number"
                      :min="500"
                      :step="100"
                    />
                  </a-col>
                </a-row>
              </a-form-item>
            </a-col>
          </a-row>

          <a-divider class="section-divider" />

          <a-form-item label="剧情大纲">
            <div class="outline-list">
              <a-card
                v-for="(volume, index) in generatedOverview.outline"
                :key="index"
                size="small"
                :bordered="false"
                class="volume-card"
              >
                <div class="volume-inputs">
                  <a-input
                    v-model:value="volume.volume"
                    placeholder="卷名"
                    class="volume-name-input"
                  />
                  <a-input-number
                    v-model:value="volume.chapters"
                    placeholder="章节数"
                    class="volume-chapters-input"
                    :min="1"
                  />
                  <a-input
                    v-model:value="volume.summary"
                    placeholder="本卷概要"
                    class="volume-summary-input"
                  />
                </div>
              </a-card>
            </div>
          </a-form-item>

          <a-divider class="section-divider" />

          <a-form-item label="修改意见（可选）">
            <a-textarea
              v-model:value="feedback"
              placeholder="如果不满意，可以输入修改意见，让AI重新生成..."
              :rows="3"
              class="feedback-input"
            />
          </a-form-item>

          <a-form-item class="form-actions">
            <a-space size="large">
              <a-button type="primary" size="large" class="save-btn" @click="handleSave">
                <template #icon>
                  <span class="btn-icon">💾</span>
                </template>
                保存小说
              </a-button>
              <a-button
                size="large"
                class="regenerate-btn"
                :loading="generating"
                @click="handleRegenerate"
              >
                <template #icon>
                  <span class="btn-icon">🔄</span>
                </template>
                AI重新生成
              </a-button>
              <a-button size="large" class="back-btn-secondary" @click="handleBack">
                返回
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-card>
    </template>
  </div>
</template>

<style scoped>
.novel-create-page {
  padding: 8px;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: #e2e8f0;
  transform: translateX(-2px);
}

.back-icon {
  font-size: 18px;
  color: #64748b;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.steps-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px 48px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.create-steps :deep(.ant-steps-item-title) {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.create-steps :deep(.ant-steps-item-description) {
  font-size: 13px;
  color: #94a3b8;
}

.create-steps :deep(.ant-steps-item-process .ant-steps-item-icon) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
}

.create-steps :deep(.ant-steps-item-finish .ant-steps-item-icon) {
  background: #10b981;
  border-color: #10b981;
}

.create-steps :deep(.ant-steps-item-finish .ant-steps-item-tail::after) {
  background: #10b981;
}

.form-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  background: #ffffff;
  padding: 32px;
}

.info-alert {
  margin-bottom: 32px;
  border-radius: 12px;
}

.info-alert :deep(.ant-alert-message) {
  font-weight: 600;
  font-size: 16px;
}

.info-alert :deep(.ant-alert-description) {
  font-size: 14px;
  line-height: 1.6;
}

.create-form,
.overview-form {
  max-width: 1200px;
}

:deep(.ant-form-item-label) {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

:deep(.ant-form-item-label > label) {
  height: 32px;
}

.idea-input,
.form-input,
.form-textarea,
.form-select,
.form-number,
.feedback-input {
  border-radius: 10px;
}

.idea-input {
  font-size: 15px;
  line-height: 1.8;
}

.idea-input :deep(textarea) {
  border-radius: 10px;
  padding: 16px;
}

.form-input :deep(input) {
  border-radius: 10px;
  padding: 12px 16px;
}

.form-textarea :deep(textarea) {
  border-radius: 10px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
}

.form-select :deep(.ant-select-selector) {
  border-radius: 10px !important;
  padding: 8px 16px !important;
  min-height: 48px !important;
}

.form-number :deep(.ant-input-number-input) {
  border-radius: 10px;
  padding: 12px 16px;
  height: 48px;
}

.section-divider {
  margin: 32px 0;
  border-color: #e2e8f0;
}

.outline-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.volume-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
}

.volume-inputs {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.volume-name-input {
  width: 200px;
  border-radius: 8px;
}

.volume-chapters-input {
  width: 120px;
  border-radius: 8px;
}

.volume-summary-input {
  flex: 1;
  border-radius: 8px;
}

.form-actions {
  margin-top: 32px;
  margin-bottom: 0;
}

.generate-btn,
.save-btn {
  height: 48px;
  padding: 0 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.generate-btn:hover,
.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.btn-icon {
  font-size: 18px;
  margin-right: 4px;
}

.cancel-btn,
.back-btn-secondary {
  height: 48px;
  padding: 0 28px;
  font-size: 15px;
  border-radius: 12px;
}

.regenerate-btn {
  height: 48px;
  padding: 0 28px;
  font-size: 15px;
  border-radius: 12px;
  border-color: #667eea;
  color: #667eea;
}

.regenerate-btn:hover {
  background: rgba(102, 126, 234, 0.05);
  border-color: #764ba2;
  color: #764ba2;
}

:deep(.ant-spin-dot-item) {
  background-color: #667eea;
}
</style>
