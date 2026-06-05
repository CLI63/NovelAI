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
  // 字数补偿配置
  wordCountCompensation: true,
  compensationThreshold: 0.8,
  maxExpandAttempts: 2,
  expansionStrategy: 'paragraph',
})

const loading = ref(false)
const activeTab = ref('api')
const BACKUP_VERSION = '2.0'

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

// 补偿阈值百分比（用于滑块）
const thresholdPercent = computed({
  get: () => Math.round(form.value.compensationThreshold * 100),
  set: (val) => { form.value.compensationThreshold = val / 100 }
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
      currentModel.value,
      { timeout: form.value.timeout }
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
    content: '确定要清除所有数据吗？此操作将删除全部业务数据和设置，不可恢复！',
    okText: '确认清除',
    cancelText: '取消',
    okType: 'danger',
    centered: true,
    onOk: () => {
      // 删除 IndexedDB 前先关闭 Dexie 连接，避免浏览器阻塞删除请求。
      db.close()
      indexedDB.deleteDatabase('NovelAIDB')
      localStorage.removeItem('novelAISettings')
      message.success('数据已清除，请刷新页面')
    },
  })
}

const exportAllTables = async () => {
  const tables = {}
  for (const table of db.tables) {
    tables[table.name] = await table.toArray()
  }
  return tables
}

const normalizeImportTables = (importData) => {
  if (importData.tables && typeof importData.tables === 'object') {
    return importData.tables
  }

  const legacyData = importData.data || {}
  // 兼容旧备份格式：旧版本只包含 novels/chapters/settings。
  return {
    novels: Array.isArray(legacyData.novels) ? legacyData.novels : [],
    chapters: Array.isArray(legacyData.chapters) ? legacyData.chapters : []
  }
}

const normalizeImportSettings = (importData) => {
  if ('settings' in importData) return importData.settings
  return importData.data?.settings ?? null
}

// 导出数据
const handleExportData = async () => {
  loading.value = true
  try {
    const tables = await exportAllTables()
    const settings = localStorage.getItem('novelAISettings')
    const tableCount = Object.values(tables).reduce((sum, rows) => sum + rows.length, 0)

    const exportData = {
      version: BACKUP_VERSION,
      exportTime: new Date().toISOString(),
      tables,
      settings: settings ? JSON.parse(settings) : null,
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

    message.success(`导出成功：${db.tables.length} 张表，共 ${tableCount} 条数据`)
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

    if (!importData || (!importData.tables && !importData.data)) {
      throw new Error('无效的备份文件格式')
    }

    const tables = normalizeImportTables(importData)
    const settings = normalizeImportSettings(importData)
    const tableNames = db.tables.map(table => table.name)
    const importTableNames = Object.keys(tables).filter(name => tableNames.includes(name))
    const importCount = importTableNames.reduce((sum, name) => sum + (Array.isArray(tables[name]) ? tables[name].length : 0), 0)

    if (importTableNames.length === 0) {
      throw new Error('无效的备份文件格式')
    }

    // 确认前只是预解析文件，先结束解析态；真正导入时再进入完整 loading。
    loading.value = false

    Modal.confirm({
      title: '📦 导入数据确认',
      content: `即将导入 ${importTableNames.length} 张表、${importCount} 条数据。现有数据将被覆盖，是否继续？`,
      okText: '确认导入',
      cancelText: '取消',
      centered: true,
      onOk: async () => {
        loading.value = true
        try {
          // 只处理当前数据库实际存在的表，保证旧备份和未来多余字段都能安全跳过。
          for (const table of db.tables) {
            await table.clear()
          }

          for (const tableName of importTableNames) {
            const rows = Array.isArray(tables[tableName]) ? tables[tableName] : []
            if (rows.length > 0) {
              await db.table(tableName).bulkPut(rows)
            }
          }

          if (settings) {
            // 导入设置时同步 Pinia 和 localStorage，避免页面仍显示旧配置。
            appStore.updateSettings(settings)
            loadSettings()
          }

          message.success('导入成功，请刷新页面查看')
        } catch (err) {
          message.error('导入数据时出错：' + err.message)
        } finally {
          loading.value = false
        }
      },
      onCancel: () => {
        // 取消导入时显式清理状态，避免按钮残留忙碌样式。
        loading.value = false
      }
    })
  } catch (error) {
    message.error('解析文件失败：' + error.message)
  } finally {
    if (loading.value) {
      loading.value = false
    }
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
      <a-tabs v-model:activeKey="activeTab" size="large">
        <!-- API设置 -->
        <a-tab-pane key="api">
          <template #tab>
            <span class="tab-label">
              <span class="tab-icon">🔑</span>
              API设置
            </span>
          </template>
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
        <a-tab-pane key="data">
          <template #tab>
            <span class="tab-label">
              <span class="tab-icon">💾</span>
              数据管理
            </span>
          </template>
          <div class="section-header">
            <h3 class="section-title">数据备份与恢复</h3>
            <p class="section-desc">导出或导入您的小说数据，确保创作成果安全</p>
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

        <!-- 生成设置 -->
        <a-tab-pane key="generation">
          <template #tab>
            <span class="tab-label">
              <span class="tab-icon">📝</span>
              生成设置
            </span>
          </template>
          <div class="section-header">
            <h3 class="section-title">字数补偿机制</h3>
            <p class="section-desc">当生成的章节字数不足时，自动进行内容扩写</p>
          </div>

          <a-form layout="vertical" class="settings-form">
            <!-- 启用字数补偿 -->
            <a-form-item label="启用字数补偿">
              <a-switch v-model:checked="form.wordCountCompensation" />
              <div class="input-hint">开启后，当章节字数不足时会自动触发扩写</div>
            </a-form-item>

            <!-- 补偿阈值 -->
            <a-form-item label="补偿阈值">
              <a-slider
                v-model:value="thresholdPercent"
                :min="50"
                :max="100"
                :disabled="!form.wordCountCompensation"
                :marks="{ 50: '50%', 70: '70%', 80: '80%', 90: '90%', 100: '100%' }"
              />
              <div class="input-hint">
                当章节字数低于目标字数的 {{ Math.round(form.compensationThreshold * 100) }}% 时触发补偿
              </div>
            </a-form-item>

            <!-- 扩写策略 -->
            <a-form-item label="扩写策略">
              <a-radio-group v-model:value="form.expansionStrategy" :disabled="!form.wordCountCompensation">
                <a-radio value="paragraph">段落扩写（推荐）</a-radio>
                <a-radio value="whole">整章扩写</a-radio>
              </a-radio-group>
              <div class="input-hint">
                段落扩写：选择关键段落进行针对性扩写，效率更高；整章扩写：重新生成整章内容
              </div>
            </a-form-item>

            <!-- 最大尝试次数 -->
            <a-form-item label="最大扩写尝试次数">
              <a-input-number
                v-model:value="form.maxExpandAttempts"
                :min="1"
                :max="5"
                :disabled="!form.wordCountCompensation"
                size="large"
                style="width: 150px"
              />
              <div class="input-hint">每次扩写的最大尝试次数，避免过度消耗API额度</div>
            </a-form-item>

            <!-- 操作按钮 -->
            <div class="form-actions">
              <a-button type="primary" :loading="loading" size="large" @click="handleSave">
                保存设置
              </a-button>
            </div>
          </a-form>
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
  max-width: 900px;
  margin: 0 auto;
}

.settings-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.settings-card :deep(.ant-card-body) {
  padding: 0;
}

.settings-card :deep(.ant-tabs-nav) {
  margin: 0;
  padding: 0 var(--spacing-lg);
  background: linear-gradient(180deg, var(--bg-secondary) 0%, transparent 100%);
}

.settings-card :deep(.ant-tabs-content) {
  padding: var(--spacing-xl);
}

.section-header {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.section-title::before {
  content: '';
  width: 4px;
  height: 18px;
  background: var(--primary-gradient);
  border-radius: 2px;
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
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.provider-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.provider-card.active {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.provider-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  background: var(--primary-gradient);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.provider-icon {
  font-size: 36px;
  line-height: 1;
}

.provider-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-name {
  font-weight: 600;
  font-size: 15px;
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.hint-link {
  color: var(--primary-color);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.hint-link:hover {
  text-decoration: underline;
  color: #40a9ff;
}

.link-icon {
  font-size: 14px;
}

.form-actions {
  margin-top: var(--spacing-xl);
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: center;
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
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.action-item:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.action-item.danger {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.1) 100%);
  border-color: rgba(239, 68, 68, 0.2);
}

.action-item.danger:hover {
  border-color: #ef4444;
}

.action-info h4 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.action-info p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* 生成设置样式增强 */
.settings-form :deep(.ant-form-item-label > label) {
  font-weight: 500;
}

.settings-form :deep(.ant-slider-mark-text) {
  font-size: 12px;
}

.settings-form :deep(.ant-radio-wrapper) {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.settings-form :deep(.ant-radio-wrapper:hover) {
  background: var(--bg-primary);
}

.settings-form :deep(.ant-radio-wrapper-checked) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

/* 响应式 */
@media (max-width: 768px) {
  .provider-grid {
    grid-template-columns: 1fr;
  }

  .settings-page {
    padding: 0 var(--spacing-md);
  }
}

/* Tab 标签样式 */
.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}

.tab-icon {
  font-size: 16px;
}
</style>
