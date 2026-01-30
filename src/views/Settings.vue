<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '../stores/app'
import { message, Modal } from 'ant-design-vue'

const appStore = useAppStore()

const form = ref({
  aiProvider: 'kimi',
  kimiApiKey: '',
  qianwenApiKey: '',
  kimiModel: 'kimi-k2-turbo-preview',
  qianwenModel: 'qwen3-max',
  timeout: 180000,
})

// 当前模型
const currentModel = computed({
  get: () => (form.value.aiProvider === 'kimi' ? form.value.kimiModel : form.value.qianwenModel),
  set: (val) => {
    if (form.value.aiProvider === 'kimi') {
      form.value.kimiModel = val
    } else {
      form.value.qianwenModel = val
    }
  },
})

const loading = ref(false)
const activeTab = ref('api')

const currentApiKey = computed({
  get: () => (form.value.aiProvider === 'kimi' ? form.value.kimiApiKey : form.value.qianwenApiKey),
  set: (val) => {
    if (form.value.aiProvider === 'kimi') {
      form.value.kimiApiKey = val
    } else {
      form.value.qianwenApiKey = val
    }
  },
})

const loadSettings = () => {
  form.value = { ...appStore.settings }
}

const handleSave = () => {
  if (form.value.aiProvider === 'kimi' && !form.value.kimiApiKey) {
    message.warning('请输入Kimi API Key')
    return
  }

  if (form.value.aiProvider === 'qianwen' && !form.value.qianwenApiKey) {
    message.warning('请输入千问API Key')
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

const handleTest = async () => {
  const apiKey = form.value.aiProvider === 'kimi' ? form.value.kimiApiKey : form.value.qianwenApiKey

  if (!apiKey) {
    message.warning('请先输入API Key')
    return
  }

  const model = form.value.aiProvider === 'kimi' ? form.value.kimiModel : form.value.qianwenModel

  loading.value = true
  try {
    const { callAI } = await import('../utils/api')
    const response = await callAI(
      [{ role: 'user', content: '你好，请回复"测试成功"' }],
      form.value.aiProvider,
      apiKey,
      model,
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

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="settings-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">⚙️ 系统设置</h1>
        <p class="page-subtitle">配置AI提供商、API密钥和其他系统参数</p>
      </div>
    </div>

    <!-- 设置内容 -->
    <a-card :bordered="false" class="settings-card">
      <a-tabs v-model:activeKey="activeTab" class="settings-tabs">
        <!-- API设置 -->
        <a-tab-pane key="api" tab="🔑 API设置">
          <div class="tab-content">
            <div class="section-header">
              <h3 class="section-title">AI 提供商配置</h3>
              <p class="section-desc">选择您偏好的AI服务提供商并配置API密钥</p>
            </div>

            <a-form layout="vertical" class="settings-form">
              <a-form-item label="AI提供商" class="form-item">
                <a-radio-group v-model:value="form.aiProvider" class="provider-radio">
                  <a-radio-button value="kimi" class="provider-option">
                    <span class="provider-icon">🌙</span>
                    <div class="provider-info">
                      <span class="provider-name">Kimi</span>
                      <span class="provider-desc">月之暗面</span>
                    </div>
                  </a-radio-button>
                  <a-radio-button value="qianwen" class="provider-option">
                    <span class="provider-icon">☁️</span>
                    <div class="provider-info">
                      <span class="provider-name">千问</span>
                      <span class="provider-desc">阿里云</span>
                    </div>
                  </a-radio-button>
                </a-radio-group>
              </a-form-item>

              <a-form-item
                :label="form.aiProvider === 'kimi' ? 'Kimi API Key' : '千问 API Key'"
                class="form-item"
              >
                <a-input-password
                  v-model:value="currentApiKey"
                  placeholder="请输入API Key"
                  size="large"
                  class="api-key-input"
                />
                <div class="input-hint">
                  <a
                    :href="
                      form.aiProvider === 'kimi'
                        ? 'https://platform.moonshot.cn/'
                        : 'https://dashscope.aliyuncs.com/'
                    "
                    target="_blank"
                    class="hint-link"
                  >
                    <span class="link-icon">🔗</span>
                    {{
                      form.aiProvider === 'kimi'
                        ? '访问 Kimi 平台获取 API Key'
                        : '访问千问平台获取 API Key'
                    }}
                  </a>
                </div>
              </a-form-item>

              <a-form-item label="模型名称" class="form-item">
                <a-input
                  v-model:value="currentModel"
                  size="large"
                  class="model-input"
                  :placeholder="
                    form.aiProvider === 'kimi' ? '例如：kimi-k2-turbo-preview' : '例如：qwen3-max'
                  "
                />
                <div class="input-hint">
                  {{
                    form.aiProvider === 'kimi'
                      ? 'Kimi模型名称，默认：kimi-k2-turbo-preview'
                      : '千问模型名称，默认：qwen3-max'
                  }}
                </div>
              </a-form-item>

              <a-form-item label="请求超时时间" class="form-item">
                <a-input-number
                  v-model:value="form.timeout"
                  :min="10000"
                  :max="300000"
                  :step="10000"
                  size="large"
                  class="timeout-input"
                >
                  <template #addonAfter>毫秒</template>
                </a-input-number>
                <div class="input-hint">建议设置在 30-120 秒之间，根据网络情况调整</div>
              </a-form-item>

              <div class="form-actions">
                <a-space size="large">
                  <a-button
                    type="primary"
                    @click="handleSave"
                    :loading="loading"
                    size="large"
                    class="save-btn"
                  >
                    <template #icon>
                      <span class="btn-icon">💾</span>
                    </template>
                    保存设置
                  </a-button>
                  <a-button @click="handleTest" :loading="loading" size="large" class="test-btn">
                    <template #icon>
                      <span class="btn-icon">🔌</span>
                    </template>
                    测试连接
                  </a-button>
                </a-space>
              </div>
            </a-form>

            <!-- API说明卡片 -->
            <a-alert message="📋 API Key 使用说明" type="info" show-icon class="info-alert">
              <template #description>
                <ul class="info-list">
                  <li>
                    <strong>Kimi API：</strong>访问
                    <a href="https://platform.moonshot.cn/" target="_blank" class="alert-link"
                      >https://platform.moonshot.cn/</a
                    >
                    注册账号并创建API Key
                  </li>
                  <li>
                    <strong>千问API：</strong>访问
                    <a href="https://dashscope.aliyuncs.com/" target="_blank" class="alert-link"
                      >https://dashscope.aliyuncs.com/</a
                    >
                    开通服务并获取API Key
                  </li>
                  <li>
                    <strong>安全提示：</strong>API
                    Key仅保存在本地浏览器中，不会上传到任何服务器，请放心使用
                  </li>
                </ul>
              </template>
            </a-alert>
          </div>
        </a-tab-pane>

        <!-- 数据管理 -->
        <a-tab-pane key="data" tab="💾 数据管理">
          <div class="tab-content">
            <div class="section-header warning">
              <h3 class="section-title">⚠️ 危险操作区域</h3>
              <p class="section-desc">以下操作可能会删除您的数据，请谨慎操作</p>
            </div>

            <div class="danger-zone">
              <div class="danger-card">
                <div class="danger-icon">🗑️</div>
                <div class="danger-content">
                  <h4 class="danger-title">清除所有数据</h4>
                  <p class="danger-desc">此操作将永久删除所有小说、章节和设置数据，包括：</p>
                  <ul class="danger-list">
                    <li>所有已创建的小说和章节内容</li>
                    <li>所有API配置和系统设置</li>
                    <li>此操作不可撤销，请提前备份重要数据</li>
                  </ul>
                </div>
                <a-button danger size="large" @click="handleClearData" class="danger-btn">
                  <template #icon>
                    <span class="btn-icon">⚠️</span>
                  </template>
                  清除所有数据
                </a-button>
              </div>
            </div>

            <a-alert message="💡 数据备份建议" type="warning" show-icon class="warning-alert">
              <template #description>
                <p>
                  建议定期导出重要的小说内容进行备份。您可以在小说详情页使用"导出"功能保存作品。
                </p>
              </template>
            </a-alert>
          </div>
        </a-tab-pane>

        <!-- 关于 -->
        <a-tab-pane key="about" tab="ℹ️ 关于">
          <div class="tab-content about-content">
            <div class="about-logo">
              <span class="logo-icon">📚</span>
              <h2 class="logo-title">Novel AI</h2>
              <p class="logo-subtitle">AI 辅助小说创作工具</p>
            </div>

            <div class="about-info">
              <div class="info-item">
                <span class="info-label">版本</span>
                <span class="info-value">v1.0.0</span>
              </div>
              <div class="info-item">
                <span class="info-label">技术栈</span>
                <span class="info-value">Vue 3 + Ant Design Vue + IndexedDB</span>
              </div>
              <div class="info-item">
                <span class="info-label">数据存储</span>
                <span class="info-value">本地浏览器（IndexedDB）</span>
              </div>
            </div>

            <div class="about-features">
              <h4 class="features-title">✨ 主要功能</h4>
              <div class="features-grid">
                <div class="feature-item">
                  <span class="feature-icon">🤖</span>
                  <span class="feature-text">AI智能生成小说概览</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✍️</span>
                  <span class="feature-text">自动创作小说章节</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">📖</span>
                  <span class="feature-text">章节管理与编辑</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">💾</span>
                  <span class="feature-text">本地数据存储</span>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

/* 页面头部 */
.page-header {
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
  text-align: center;
}

.header-content {
  color: white;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-subtitle {
  font-size: 15px;
  opacity: 0.9;
  margin: 0;
}

/* 设置卡片 */
.settings-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.settings-tabs :deep(.ant-tabs-nav) {
  padding: 0 24px;
  margin-bottom: 0;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.settings-tabs :deep(.ant-tabs-tab) {
  padding: 16px 24px;
  font-size: 15px;
  font-weight: 500;
}

.settings-tabs :deep(.ant-tabs-tab-active) {
  font-weight: 600;
}

.settings-tabs :deep(.ant-tabs-content) {
  padding: 0;
}

/* 标签内容 */
.tab-content {
  padding: 32px;
}

.section-header {
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.section-header.warning {
  border-bottom-color: #ffd591;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.section-header.warning .section-title {
  color: #d48806;
}

.section-desc {
  font-size: 14px;
  color: #999;
  margin: 0;
}

/* 表单样式 */
.settings-form {
  max-width: 600px;
}

.form-item {
  margin-bottom: 28px;
}

.form-item :deep(.ant-form-item-label) {
  font-weight: 600;
  font-size: 15px;
  color: #333;
  padding-bottom: 10px;
}

/* 提供商选择 */
.provider-radio {
  display: flex;
  gap: 16px;
}

.provider-option {
  height: auto;
  padding: 20px 28px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.provider-option:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.provider-option :deep(.ant-radio-button-checked) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
}

.provider-icon {
  font-size: 32px;
}

.provider-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.provider-name {
  font-size: 17px;
  font-weight: 600;
}

.provider-desc {
  font-size: 13px;
  color: #999;
}

/* 输入框样式 */
.api-key-input,
.timeout-input,
.model-input :deep(input) {
  border-radius: 10px;
}

.input-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #999;
}

.hint-link {
  color: #667eea;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
}

.hint-link:hover {
  color: #764ba2;
}

.link-icon {
  font-size: 12px;
}

/* 按钮样式 */
.form-actions {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.save-btn {
  height: 48px;
  padding: 0 32px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(82, 196, 26, 0.3);
  transition: all 0.3s ease;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(82, 196, 26, 0.4);
}

.test-btn {
  height: 48px;
  padding: 0 28px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
}

.btn-icon {
  margin-right: 6px;
}

/* 信息提示 */
.info-alert {
  margin-top: 32px;
  border-radius: 12px;
}

.info-alert :deep(.ant-alert-message) {
  font-weight: 600;
  font-size: 15px;
}

.info-list {
  margin: 12px 0;
  padding-left: 20px;
}

.info-list li {
  margin-bottom: 8px;
  line-height: 1.6;
}

.alert-link {
  color: #667eea;
  text-decoration: none;
}

.alert-link:hover {
  text-decoration: underline;
}

/* 危险区域 */
.danger-zone {
  margin-bottom: 24px;
}

.danger-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 28px;
  background: linear-gradient(135deg, #fff2f0 0%, #fff5f5 100%);
  border: 1px solid #ffccc7;
  border-radius: 12px;
}

.danger-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.danger-content {
  flex: 1;
}

.danger-title {
  font-size: 17px;
  font-weight: 600;
  color: #cf1322;
  margin: 0 0 8px 0;
}

.danger-desc {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px 0;
}

.danger-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: #999;
}

.danger-list li {
  margin-bottom: 4px;
}

.danger-btn {
  height: 48px;
  padding: 0 28px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
}

.warning-alert {
  border-radius: 12px;
}

/* 关于页面 */
.about-content {
  text-align: center;
}

.about-logo {
  margin-bottom: 40px;
}

.logo-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.logo-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.logo-subtitle {
  font-size: 15px;
  color: #999;
  margin: 0;
}

.about-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
  margin: 0 auto 40px;
  padding: 24px;
  background: #fafafa;
  border-radius: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.info-label {
  color: #999;
  font-weight: 500;
}

.info-value {
  color: #333;
  font-weight: 500;
}

.about-features {
  margin-top: 40px;
}

.features-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 24px 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.feature-icon {
  font-size: 24px;
}

.feature-text {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }

  .page-header {
    padding: 24px;
  }

  .page-title {
    font-size: 24px;
  }

  .tab-content {
    padding: 20px;
  }

  .provider-radio {
    flex-direction: column;
  }

  .danger-card {
    flex-direction: column;
    text-align: center;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
