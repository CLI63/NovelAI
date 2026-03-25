<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAI } from '@/composables/useAI'
import { message, Modal } from 'ant-design-vue'
import db from '@/utils/db'
import PageHeader from '@/components/common/PageHeader.vue'

const appStore = useAppStore()
const { testConnection, loading: aiLoading } = useAI()

const form = ref({
  aiProvider: 'kimi',
  kimiApiKey: '',
  qianwenApiKey: '',
  deepseekApiKey: '',
  doubaoApiKey: '',
  kimiModel: 'kimi-k2-turbo-preview',
  qianwenModel: 'qwen3-max',
  deepseekModel: 'deepseek-chat',
  doubaoModel: 'doubao-pro-32k-chat',
  timeout: 180000,
})

const loading = ref(false)
const activeTab = ref('api')

// 提供商配置
const providerConfig = {
  kimi: {
    name: 'Kimi',
    icon: '🌙',
    company: '月之暗面',
    apiKeyLabel: 'Kimi API Key',
    modelPlaceholder: '例如：kimi-k2-turbo-preview',
    modelHint: 'Kimi模型名称，默认：kimi-k2-turbo-preview',
    platformUrl: 'https://platform.moonshot.cn/',
    platformText: '访问 Kimi 平台获取 API Key',
  },
  qianwen: {
    name: '千问',
    icon: '☁️',
    company: '阿里云',
    apiKeyLabel: '千问 API Key',
    modelPlaceholder: '例如：qwen3-max',
    modelHint: '千问模型名称，默认：qwen3-max',
    platformUrl: 'https://dashscope.aliyuncs.com/',
    platformText: '访问千问平台获取 API Key',
  },
  deepseek: {
    name: 'DeepSeek',
    icon: '🤖',
    company: '深度求索',
    apiKeyLabel: 'DeepSeek API Key',
    modelPlaceholder: '例如：deepseek-chat',
    modelHint: 'DeepSeek模型名称，默认：deepseek-chat，也支持：deepseek-reasoner',
    platformUrl: 'https://platform.deepseek.com/',
    platformText: '访问 DeepSeek 平台获取 API Key',
  },
  doubao: {
    name: '豆包',
    icon: '🫛',
    company: '字节跳动',
    apiKeyLabel: '豆包 API Key',
    modelPlaceholder: '例如：doubao-pro-32k-chat',
    modelHint: '豆包模型名称，默认：doubao-pro-32k-chat',
    platformUrl: 'https://console.volcengine.com/ark',
    platformText: '访问火山引擎控制台获取 API Key',
  },
}

// 当前提供商配置
const currentProviderConfig = computed(() => providerConfig[form.value.aiProvider] || providerConfig.kimi)

// 当前API Key
const currentApiKey = computed({
  get: () => {
    const provider = form.value.aiProvider
    return form.value[`${provider}ApiKey`] || ''
  },
  set: (val) => {
    const provider = form.value.aiProvider
    form.value[`${provider}ApiKey`] = val
  },
})

// 当前模型
const currentModel = computed({
  get: () => {
    const provider = form.value.aiProvider
    return form.value[`${provider}Model`] || ''
  },
  set: (val) => {
    const provider = form.value.aiProvider
    form.value[`${provider}Model`] = val
  },
})

// 加载设置
const loadSettings = () => {
  form.value = { ...appStore.settings }
}

// 保存设置
const handleSave = () => {
  if (!currentApiKey.value) {
    message.warning(`请输入${currentProviderConfig.value.name} API Key`)
    return
  }

  loading.value = true
  try {
    appStore.updateSettings(form.value)
    message.success('保存成功')
  } catch (error) {
    message.error('保存失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 测试连接
const handleTest = async () => {
  if (!currentApiKey.value) {
    message.warning('请先输入API Key')
    return
  }

  loading.value = true
  try {
    const { callAI } = await import('@/utils/api')
    const response = await callAI(
      [{ role: 'user', content: '你好，请回复"测试成功"' }],
      form.value.aiProvider,
      currentApiKey.value,
      currentModel.value
    )
    if (response.includes('测试成功')) {
      message.success('API连接测试成功！')
    } else {
      message.warning('API连接测试完成，但响应异常')
    }
  } catch (error) {
    message.error('API连接测试失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 清除数据
const handleClearData = () => {
  Modal.confirm({
    title: '⚠️ 危险操作确认',
    content: '确定要清除所有数据吗？此操作将删除所有小说和章节，不可恢复！',
    okText: '确认清除',
    cancelText: '取消',
    okType: 'danger',
    centered: true,
    onOk: () => {
      indexedDB.deleteDatabase('NovelAIDB')
      localStorage.removeItem('novelAISettings')
      message.success('数据已清除，请刷新页面')
    },
  })
}

// 导出数据
const handleExportData = async () => {
  loading.value = true
  try {
    const novels = await db.novels.toArray()
    const chapters = await db.chapters.toArray()
    const settings = localStorage.getItem('novelAISettings')

    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      data: { novels, chapters, settings: settings ? JSON.parse(settings) : null },
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `novel-ai-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    message.success(`导出成功：${novels.length} 部小说，${chapters.length} 个章节`)
  } catch (error) {
    message.error('导出失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 导入数据
const importInputRef = ref(null)

const triggerImport = () => {
  importInputRef.value?.click()
}

const handleImportData = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  event.target.value = ''

  loading.value = true
  try {
    const text = await file.text()
    const importData = JSON.parse(text)

    if (!importData.version || !importData.data) {
      throw new Error('无效的备份文件格式')
    }

    const { novels = [], chapters = [], settings = null } = importData.data

    Modal.confirm({
      title: '📦 导入数据确认',
      content: `即将导入 ${novels.length} 部小说和 ${chapters.length} 个章节。现有数据将被覆盖，是否继续？`,
      okText: '确认导入',
      cancelText: '取消',
      centered: true,
      onOk: async () => {
        try {
          await db.novels.clear()
          await db.chapters.clear()

          if (novels.length > 0) await db.novels.bulkPut(novels)
          if (chapters.length > 0) await db.chapters.bulkPut(chapters)

          if (settings) {
            localStorage.setItem('novelAISettings', JSON.stringify(settings))
            loadSettings()
          }

          message.success('导入成功，请刷新页面查看')
        } catch (err) {
          message.error('导入数据时出错：' + err.message)
        }
      },
    })
  } catch (error) {
    message.error('解析文件失败：' + error.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="settings-page">
    <!-- 页面头部 -->
    <PageHeader
      title="系统设置"
      subtitle="配置AI提供商、API密钥和其他系统参数"
      icon="⚙️"
    />

    <!-- 设置内容 -->
    <a-card :bordered="false" class="settings-card">
      <a-tabs v-model:activeKey="activeTab">
        <!-- API设置 -->
        <a-tab-pane key="api" tab="🔑 API设置">
          <div class="section-header">
            <h3 class="section-title">AI 提供商配置</h3>
            <p class="section-desc">选择您偏好的AI服务提供商并配置API密钥</p>
          </div>

          <a-form layout="vertical" class="settings-form">
            <!-- 提供商选择 -->
            <a-form-item label="AI提供商">
              <div class="provider-grid">
                <div
                  v-for="(config, key) in providerConfig"
                  :key="key"
                  class="provider-card"
                  :class="{ active: form.aiProvider === key }"
                  @click="form.aiProvider = key"
                >
                  <div v-if="form.aiProvider === key" class="provider-check">✓</div>
                  <span class="provider-icon">{{ config.icon }}</span>
                  <div class="provider-info">
                    <span class="provider-name">{{ config.name }}</span>
                    <span class="provider-desc">{{ config.company }}</span>
                  </div>
                </div>
              </div>
            </a-form-item>

            <!-- API Key -->
            <a-form-item :label="currentProviderConfig.apiKeyLabel">
              <a-input-password
                v-model:value="currentApiKey"
                placeholder="请输入API Key"
                size="large"
              />
              <div class="input-hint">
                <a :href="currentProviderConfig.platformUrl" target="_blank" class="hint-link">
                  <span class="link-icon">🔗</span>
                  {{ currentProviderConfig.platformText }}
                </a>
              </div>
            </a-form-item>

            <!-- 模型名称 -->
            <a-form-item label="模型名称">
              <a-input
                v-model:value="currentModel"
                size="large"
                :placeholder="currentProviderConfig.modelPlaceholder"
              />
              <div class="input-hint">{{ currentProviderConfig.modelHint }}</div>
            </a-form-item>

            <!-- 超时时间 -->
            <a-form-item label="请求超时时间">
              <a-input-number
                v-model:value="form.timeout"
                :min="10000"
                :max="300000"
                :step="10000"
                size="large"
                style="width: 200px"
              >
                <template #addonAfter>毫秒</template>
              </a-input-number>
              <div class="input-hint">建议设置在 30-120 秒之间</div>
            </a-form-item>

            <!-- 操作按钮 -->
            <div class="form-actions">
              <a-space size="large">
                <a-button type="primary" :loading="loading" size="large" @click="handleSave">
                  保存设置
                </a-button>
                <a-button :loading="loading" size="large" @click="handleTest">
                  测试连接
                </a-button>
              </a-space>
            </div>
          </a-form>
        </a-tab-pane>

        <!-- 数据管理 -->
        <a-tab-pane key="data" tab="💾 数据管理">
          <div class="section-header">
            <h3 class="section-title">数据备份与恢复</h3>
            <p class="section-desc">导出或导入您的小说数据</p>
          </div>

          <div class="data-actions">
            <div class="action-item">
              <div class="action-info">
                <h4>📤 导出数据</h4>
                <p>将所有小说、章节和设置导出为JSON文件</p>
              </div>
              <a-button type="primary" :loading="loading" @click="handleExportData">
                导出备份
              </a-button>
            </div>

            <div class="action-item">
              <div class="action-info">
                <h4>📥 导入数据</h4>
                <p>从备份文件恢复数据（将覆盖现有数据）</p>
              </div>
              <a-button :loading="loading" @click="triggerImport">
                选择文件
              </a-button>
              <input
                ref="importInputRef"
                type="file"
                accept=".json"
                style="display: none"
                @change="handleImportData"
              />
            </div>

            <div class="action-item danger">
              <div class="action-info">
                <h4>🗑️ 清除数据</h4>
                <p>删除所有小说、章节和设置（不可恢复）</p>
              </div>
              <a-button danger :loading="loading" @click="handleClearData">
                清除所有数据
              </a-button>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.settings-card {
  background: var(--bg-primary);
}

.section-header {
  margin-bottom: var(--spacing-lg);
}

.section-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.settings-form {
  max-width: 600px;
}

.provider-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.provider-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-fast);
}

.provider-card:hover {
  border-color: var(--primary-color);
}

.provider-card.active {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.provider-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  background: var(--primary-gradient);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.provider-icon {
  font-size: 32px;
}

.provider-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-name {
  font-weight: 600;
  color: var(--text-primary);
}

.provider-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.input-hint {
  margin-top: var(--spacing-xs);
  font-size: 12px;
  color: var(--text-secondary);
}

.hint-link {
  color: var(--primary-color);
  text-decoration: none;
}

.hint-link:hover {
  text-decoration: underline;
}

.link-icon {
  margin-right: 4px;
}

.form-actions {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.data-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-width: 600px;
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.action-item.danger {
  background: rgba(239, 68, 68, 0.1);
}

.action-info h4 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
}

.action-info p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
