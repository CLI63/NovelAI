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
 * 深度清理对象，确保可以被 IndexedDB 克隆
 */
const sanitizeForDB = (obj) => {
  if (obj === null || obj === undefined) return null
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch {
    return null
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const id = await novelDao.add(novel)
    message.success('保存成功！')
    router.push(`/novel/${id}`)
  } catch (error) {
    console.error('保存失败详情:', error)
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
                <div class="chapter-structure-card">
                  <a-row :gutter="16">
                    <a-col :span="8">
                      <div class="structure-item">
                        <span class="structure-label">📚 总章节数</span>
                        <a-input-number
                          v-model:value="generatedOverview.chapterStructure.totalChapters"
                          placeholder="如100"
                          size="large"
                          class="form-number"
                          :min="1"
                        >
                          <template #addonAfter>章</template>
                        </a-input-number>
                      </div>
                    </a-col>
                    <a-col :span="8">
                      <div class="structure-item">
                        <span class="structure-label">📝 每章最小字数</span>
                        <a-input-number
                          v-model:value="generatedOverview.chapterStructure.minWordsPerChapter"
                          placeholder="如2000"
                          size="large"
                          class="form-number"
                          :min="500"
                          :step="100"
                        >
                          <template #addonAfter>字</template>
                        </a-input-number>
                      </div>
                    </a-col>
                    <a-col :span="8">
                      <div class="structure-item">
                        <span class="structure-label">📏 每章最大字数</span>
                        <a-input-number
                          v-model:value="generatedOverview.chapterStructure.maxWordsPerChapter"
                          placeholder="如3000"
                          size="large"
                          class="form-number"
                          :min="500"
                          :step="100"
                        >
                          <template #addonAfter>字</template>
                        </a-input-number>
                      </div>
                    </a-col>
                  </a-row>
                  <div class="structure-hint">
                    💡 建议：短篇10-30万字，中篇30-80万字，长篇80万字以上。每章2000-4000字为宜。
                  </div>
                </div>
              </a-form-item>
            </a-col>
          </a-row>

          <a-divider class="section-divider" />

          <!-- 世界观设定 -->
          <a-form-item v-if="generatedOverview.worldSetting">
            <template #label>
              <span class="section-label">🌍 世界观设定</span>
            </template>
            <div class="world-setting-card">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="时代背景">
                    <a-input
                      v-model:value="generatedOverview.worldSetting.era"
                      placeholder="故事发生的时代"
                      class="compact-input"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="主要地点">
                    <a-input
                      v-model:value="generatedOverview.worldSetting.location"
                      placeholder="主要故事发生地点"
                      class="compact-input"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="力量体系">
                    <a-input
                      v-model:value="generatedOverview.worldSetting.powerSystem"
                      placeholder="等级设定/力量体系"
                      class="compact-input"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="社会结构">
                    <a-input
                      v-model:value="generatedOverview.worldSetting.socialStructure"
                      placeholder="势力分布/社会阶层"
                      class="compact-input"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="特殊设定">
                <a-textarea
                  v-model:value="generatedOverview.worldSetting.specialElements"
                  :rows="2"
                  placeholder="独特的世界观元素"
                  class="compact-textarea"
                />
              </a-form-item>
            </div>
          </a-form-item>

          <!-- 人物角色 -->
          <a-form-item v-if="generatedOverview.characters">
            <template #label>
              <span class="section-label">👥 人物角色</span>
            </template>
            <div class="characters-section">
              <!-- 主角信息 -->
              <div v-if="generatedOverview.characters.protagonist" class="protagonist-card">
                <div class="character-header">
                  <span class="character-badge protagonist-badge">主角</span>
                  <span class="character-name">{{ generatedOverview.characters.protagonist.name }}</span>
                </div>
                <a-row :gutter="16">
                  <a-col :span="8">
                    <a-form-item label="姓名">
                      <a-input
                        v-model:value="generatedOverview.characters.protagonist.name"
                        class="compact-input"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="年龄">
                      <a-input
                        v-model:value="generatedOverview.characters.protagonist.age"
                        class="compact-input"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="身份">
                      <a-input
                        v-model:value="generatedOverview.characters.protagonist.identity"
                        class="compact-input"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item label="性格特点">
                      <a-input
                        v-model:value="generatedOverview.characters.protagonist.personality"
                        class="compact-input"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="核心目标">
                      <a-input
                        v-model:value="generatedOverview.characters.protagonist.goal"
                        class="compact-input"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-form-item label="背景故事">
                  <a-textarea
                    v-model:value="generatedOverview.characters.protagonist.background"
                    :rows="2"
                    class="compact-textarea"
                  />
                </a-form-item>
                <a-form-item label="特殊能力">
                  <a-input
                    v-model:value="generatedOverview.characters.protagonist.specialAbility"
                    placeholder="金手指/特殊能力（无则留空）"
                    class="compact-input"
                  />
                </a-form-item>
              </div>

              <!-- 配角列表 -->
              <div v-if="generatedOverview.characters.supportingCharacters" class="supporting-characters">
                <div class="sub-section-title">重要配角</div>
                <div
                  v-for="(character, index) in generatedOverview.characters.supportingCharacters"
                  :key="index"
                  class="supporting-character-card"
                >
                  <div class="character-header">
                    <span class="character-badge supporting-badge">配角</span>
                    <a-input
                      v-model:value="character.name"
                      placeholder="姓名"
                      class="character-name-input"
                    />
                  </div>
                  <a-row :gutter="12">
                    <a-col :span="8">
                      <a-form-item label="身份">
                        <a-input v-model:value="character.identity" class="compact-input-sm" />
                      </a-form-item>
                    </a-col>
                    <a-col :span="8">
                      <a-form-item label="性格">
                        <a-input v-model:value="character.personality" class="compact-input-sm" />
                      </a-form-item>
                    </a-col>
                    <a-col :span="8">
                      <a-form-item label="作用">
                        <a-input v-model:value="character.role" class="compact-input-sm" />
                      </a-form-item>
                    </a-col>
                  </a-row>
                </div>
              </div>
            </div>
          </a-form-item>

          <!-- 核心冲突 -->
          <a-form-item v-if="generatedOverview.conflicts">
            <template #label>
              <span class="section-label">⚔️ 核心冲突</span>
            </template>
            <div class="conflicts-card">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="外部冲突">
                    <a-textarea
                      v-model:value="generatedOverview.conflicts.external"
                      :rows="3"
                      placeholder="主角面对的外部障碍/敌人"
                      class="compact-textarea"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="内部冲突">
                    <a-textarea
                      v-model:value="generatedOverview.conflicts.internal"
                      :rows="3"
                      placeholder="主角内心的矛盾/成长"
                      class="compact-textarea"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </div>
          </a-form-item>

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

/* 新增要素样式 */
.section-label {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.world-setting-card,
.conflicts-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  margin-top: 8px;
}

.compact-input {
  border-radius: 8px;
}

.compact-textarea {
  border-radius: 8px;
}

.compact-input-sm {
  border-radius: 6px;
}

.characters-section {
  margin-top: 8px;
}

.protagonist-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  border-left: 4px solid #3b82f6;
}

.character-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.character-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.protagonist-badge {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.supporting-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.character-name {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.character-name-input {
  flex: 1;
  max-width: 200px;
  border-radius: 6px;
}

.supporting-characters {
  margin-top: 16px;
}

.sub-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
}

.supporting-character-card {
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 3px solid #10b981;
}

.supporting-character-card:last-child {
  margin-bottom: 0;
}

/* 章节结构样式 */
.chapter-structure-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  margin-top: 8px;
}

.structure-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.structure-label {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.form-number {
  width: 100%;
  border-radius: 8px;
}

.form-number :deep(.ant-input-number-group-addon) {
  background: #f1f5f9;
  color: #64748b;
  font-size: 13px;
}

.structure-hint {
  margin-top: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
}
</style>
