<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { callAI } from '../utils/api'
import { novelDao } from '../utils/dao'
import { message } from 'ant-design-vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

const novel = ref(null)
const loading = ref(false)
const feedback = ref('')

/**
 * 计算支线剧情文本
 */
const subPlotLines = computed({
  get: () => {
    if (!novel.value || !novel.value.plotLines || !novel.value.plotLines.sub) {
      return ''
    }
    return novel.value.plotLines.sub.join('\n')
  },
  set: (val) => {
    if (!novel.value) return
    if (!novel.value.plotLines) {
      novel.value.plotLines = { main: '', sub: [] }
    }
    novel.value.plotLines.sub = val.split('\n').filter((line) => line.trim())
  },
})

/**
 * 加载小说数据
 */
const loadNovel = async () => {
  loading.value = true
  try {
    novel.value = await novelDao.getById(parseInt(route.params.id))
    if (!novel.value) {
      message.error('小说不存在')
      router.push('/')
    }
  } catch (error) {
    message.error('加载小说失败')
    router.push('/')
  } finally {
    loading.value = false
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

  loading.value = true
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
      content: '请根据用户反馈重新生成小说概览，保持原有格式要求。',
    })

    const model =
      appStore.settings.aiProvider === 'kimi'
        ? appStore.settings.kimiModel
        : appStore.settings.qianwenModel
    const response = await callAI(messages, appStore.settings.aiProvider, apiKey, model)

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const newOverview = JSON.parse(jsonMatch[0])
      novel.value = { ...novel.value, ...newOverview }
      message.success('重新生成成功！')
      feedback.value = ''
    } else {
      message.error('AI返回格式错误，请重试')
    }
  } catch (error) {
    message.error('生成失败：' + error.message)
  } finally {
    loading.value = false
  }
}

/**
 * 保存小说修改
 */
const handleSave = async () => {
  try {
    const updatedNovel = {
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
      updatedAt: new Date().toISOString(),
    }
    await novelDao.update(novel.value.id, updatedNovel)
    message.success('保存成功！')
    router.push(`/novel/${novel.value.id}`)
  } catch (error) {
    message.error('保存失败：' + error.message)
  }
}

/**
 * 取消编辑
 */
const handleCancel = () => {
  router.push(`/novel/${novel.value.id}`)
}

onMounted(() => {
  loadNovel()
})
</script>

<template>
  <div class="novel-edit-page">
    <a-spin :spinning="loading" size="large">
      <template v-if="novel">
        <!-- 页面头部 -->
        <div class="page-header">
          <div class="header-left">
            <a-button type="text" class="back-btn" @click="handleCancel">
              <template #icon>
                <span class="back-icon">←</span>
              </template>
            </a-button>
            <div class="header-info">
              <h1 class="page-title">✏️ 编辑小说</h1>
              <p class="page-subtitle">修改小说概览信息</p>
            </div>
          </div>
        </div>

        <!-- 编辑表单 -->
        <a-card :bordered="false" class="form-card">
          <a-form layout="vertical" class="edit-form">
            <!-- 基本信息区域 -->
            <div class="section-title">
              <span class="section-icon">📋</span>
              <span>基本信息</span>
            </div>
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="书名">
                  <a-input
                    v-model:value="novel.title"
                    size="large"
                    placeholder="请输入书名"
                    class="form-input"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="预估字数">
                  <a-input
                    v-model:value="novel.estimatedWords"
                    size="large"
                    placeholder="例如：100万字"
                    class="form-input"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="24">
              <a-col :span="24">
                <a-form-item label="简介">
                  <a-textarea
                    v-model:value="novel.description"
                    :rows="4"
                    placeholder="请输入小说简介"
                    class="form-textarea"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="24">
              <a-col :span="24">
                <a-form-item label="风格标签">
                  <a-select
                    v-model:value="novel.style"
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
              </a-col>
            </a-row>

            <a-divider class="section-divider" />

            <!-- 剧情设定区域 -->
            <div class="section-title">
              <span class="section-icon">🎭</span>
              <span>剧情设定</span>
            </div>
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="主线剧情">
                  <a-textarea
                    v-model:value="novel.plotLines.main"
                    :rows="5"
                    placeholder="请输入主线剧情"
                    class="form-textarea"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="支线剧情">
                  <a-textarea
                    v-model:value="subPlotLines"
                    :rows="5"
                    placeholder="每行一个支线"
                    class="form-textarea"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="24">
              <a-col :span="24">
                <a-form-item label="章节结构">
                  <a-row :gutter="16">
                    <a-col :span="8">
                      <div class="structure-item">
                        <span class="structure-label">预计章节总数</span>
                        <a-input-number
                          v-model:value="novel.chapterStructure.totalChapters"
                          placeholder="例如：300"
                          size="large"
                          class="form-number"
                          :min="1"
                        />
                      </div>
                    </a-col>
                    <a-col :span="8">
                      <div class="structure-item">
                        <span class="structure-label">每章最低字数</span>
                        <a-input-number
                          v-model:value="novel.chapterStructure.minWordsPerChapter"
                          placeholder="例如：3000"
                          size="large"
                          class="form-number"
                          :min="500"
                          :step="100"
                        />
                      </div>
                    </a-col>
                    <a-col :span="8">
                      <div class="structure-item">
                        <span class="structure-label">每章最高字数</span>
                        <a-input-number
                          v-model:value="novel.chapterStructure.maxWordsPerChapter"
                          placeholder="例如：5000"
                          size="large"
                          class="form-number"
                          :min="500"
                          :step="100"
                        />
                      </div>
                    </a-col>
                  </a-row>
                </a-form-item>
              </a-col>
            </a-row>

            <a-divider class="section-divider" />

            <a-form-item label="剧情大纲">
              <div class="outline-list">
                <a-card
                  v-for="(volume, index) in novel.outline"
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
                  保存修改
                </a-button>
                <a-button
                  size="large"
                  class="regenerate-btn"
                  :loading="loading"
                  @click="handleRegenerate"
                >
                  <template #icon>
                    <span class="btn-icon">🔄</span>
                  </template>
                  AI重新生成
                </a-button>
                <a-button size="large" class="cancel-btn" @click="handleCancel"> 取消 </a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </a-card>
      </template>
    </a-spin>
  </div>
</template>

<style scoped>
.novel-edit-page {
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

.form-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  background: #ffffff;
  padding: 32px;
}

.edit-form {
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

/* 分区标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e2e8f0;
}

.section-icon {
  font-size: 18px;
}

.form-input,
.form-textarea,
.form-select,
.form-number,
.feedback-input {
  border-radius: 10px;
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

/* 章节结构 */
.structure-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.structure-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
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

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.btn-icon {
  font-size: 18px;
  margin-right: 4px;
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

.cancel-btn {
  height: 48px;
  padding: 0 28px;
  font-size: 15px;
  border-radius: 12px;
}

:deep(.ant-spin-dot-item) {
  background-color: #667eea;
}
</style>
