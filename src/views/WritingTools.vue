<script setup>
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter, useRoute } from 'vue-router'
import {
  BookOutlined,
  EditOutlined,
  SyncOutlined,
  SafetyOutlined,
  BarChartOutlined,
  ToolOutlined,
  FireOutlined,
  MessageOutlined,
  TeamOutlined,
  FileTextOutlined,
  SettingOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { novelDao, chapterDao } from '@/utils/dao'

// 导入工具函数
import {
  sceneCategories,
  getTemplatesByCategory,
  fillTemplate,
  extractTemplateVariables
} from '@/utils/sceneTemplates'
import { useRhetoricAssistant } from '@/composables/useRhetoricAssistant'
import { useBatchRename } from '@/composables/useBatchRename'
import { useSensitiveWords } from '@/composables/useSensitiveWords'
import { useWordStats } from '@/composables/useWordStats'

const router = useRouter()
const route = useRoute()

// 当前选中的工具Tab
const activeTool = ref('templates')

// ==================== 场景模板工具 ====================
const selectedCategory = ref('combat')
const selectedTemplate = ref(null)
const templateVariables = ref({})
const filledContent = ref('')
const templatePreview = computed(() => {
  if (!selectedTemplate.value) return ''
  return fillTemplate(selectedTemplate.value.template, templateVariables.value)
})

const selectTemplate = (template) => {
  selectedTemplate.value = template
  // 提取变量并初始化
  const vars = extractTemplateVariables(template.template)
  const initVars = {}
  vars.forEach(v => {
    initVars[v] = ''
  })
  templateVariables.value = initVars
}

// 获取分类图标组件
const getCategoryIcon = (key) => {
  const iconMap = {
    combat: FireOutlined,
    dialogue: MessageOutlined,
    description: FileTextOutlined,
    emotion: TeamOutlined,
    transition: SyncOutlined
  }
  return iconMap[key] || FileTextOutlined
}

// ==================== 修辞助手工具 ====================
const rhetoric = useRhetoricAssistant()
const rhetoricContent = ref('')
const rhetoricStyle = ref('')
const rhetoricFocus = ref('')

const handleAnalyzeRhetoric = async () => {
  if (!rhetoricContent.value.trim()) {
    message.warning('请输入要分析的内容')
    return
  }
  await rhetoric.analyzeParagraph(rhetoricContent.value, rhetoricStyle.value, rhetoricFocus.value)
}

const quickTips = computed(() => {
  if (!rhetoricContent.value.trim()) return []
  return rhetoric.getQuickSuggestions(rhetoricContent.value)
})

// ==================== 批量改名工具 ====================
const batchRename = useBatchRename()
const novels = ref([])
const selectedNovelId = ref(null)
const searchKeyword = ref('')
const replaceKeyword = ref('')
const renameOptions = ref({
  scope: 'all',
  useRegex: false,
  caseSensitive: false,
  renameCharacterName: true
})
const previewStats = ref(null)

const loadNovels = async () => {
  novels.value = await novelDao.getAll()
}

const handlePreviewRename = async () => {
  if (!selectedNovelId.value || !searchKeyword.value) {
    message.warning('请选择小说并输入搜索内容')
    return
  }
  previewStats.value = await batchRename.getReplaceStats(
    selectedNovelId.value,
    searchKeyword.value,
    renameOptions.value
  )
}

const handleExecuteRename = async () => {
  if (!selectedNovelId.value || !searchKeyword.value) {
    message.warning('请选择小说并输入搜索内容')
    return
  }
  const result = await batchRename.executeBatchRename(
    selectedNovelId.value,
    searchKeyword.value,
    replaceKeyword.value,
    renameOptions.value
  )
  if (result?.success) {
    message.success(`替换完成，共修改 ${result.totalChanges} 处`)
    previewStats.value = null
  }
}

// ==================== 敏感词管理工具 ====================
const sensitiveWords = useSensitiveWords()
const newSensitiveWord = ref('')
const newSensitiveNote = ref('')
const testContent = ref('')

const handleAddSensitiveWord = () => {
  if (sensitiveWords.addCustomWord(newSensitiveWord.value, newSensitiveNote.value)) {
    message.success('添加成功')
    newSensitiveWord.value = ''
    newSensitiveNote.value = ''
  } else {
    message.warning('该敏感词已存在或输入为空')
  }
}

const handleDetectSensitive = () => {
  const result = sensitiveWords.detectSensitiveWords(testContent.value)
  if (result?.hasSensitiveWords) {
    message.warning(`发现 ${result.totalCount} 个敏感词`)
  } else {
    message.success('未发现敏感词')
  }
}

// ==================== 字数统计工具 ====================
const wordStats = useWordStats()
const statsNovelId = ref(null)
const novelStats = ref(null)

const handleAnalyzeNovel = async () => {
  if (!statsNovelId.value) {
    message.warning('请选择要分析的小说')
    return
  }
  novelStats.value = await wordStats.analyzeNovel(statsNovelId.value)
}

// 初始化
onMounted(() => {
  loadNovels()
  // 如果有路由参数指定小说ID
  if (route.query.novelId) {
    selectedNovelId.value = route.query.novelId
    statsNovelId.value = route.query.novelId
  }
})
</script>

<template>
  <div class="writing-tools-page">
    <PageHeader
      title="写作辅助工具"
      subtitle="场景模板、修辞助手、批量改名、敏感词管理、字数统计"
    >
      <template #icon>
        <ToolOutlined class="header-icon" />
      </template>
    </PageHeader>

    <a-card :bordered="false" class="tools-card">
      <a-tabs v-model:activeKey="activeTool" size="large">
        <!-- 场景模板库 -->
        <a-tab-pane key="templates">
          <template #tab>
            <span class="tab-item">
              <BookOutlined class="tab-icon" />
              场景模板
            </span>
          </template>
          <div class="tool-content">
            <div class="template-section">
              <h3 class="section-title">选择场景类型</h3>
              <div class="category-grid">
                <div
                  v-for="cat in sceneCategories"
                  :key="cat.key"
                  class="category-card"
                  :class="{ active: selectedCategory === cat.key }"
                  @click="selectedCategory = cat.key; selectedTemplate = null"
                >
                  <component :is="getCategoryIcon(cat.key)" class="cat-icon-svg" />
                  <span class="cat-name">{{ cat.name }}</span>
                </div>
              </div>
            </div>

            <div class="template-section" v-if="selectedCategory">
              <h3 class="section-title">选择模板</h3>
              <div class="template-grid">
                <div
                  v-for="tpl in getTemplatesByCategory(selectedCategory)"
                  :key="tpl.id"
                  class="template-card"
                  :class="{ active: selectedTemplate?.id === tpl.id }"
                  @click="selectTemplate(tpl)"
                >
                  <h4>{{ tpl.name }}</h4>
                  <p>{{ tpl.description }}</p>
                  <div class="template-elements">
                    <a-tag v-for="el in tpl.elements" :key="el" size="small">{{ el }}</a-tag>
                  </div>
                </div>
              </div>
            </div>

            <div class="template-section" v-if="selectedTemplate">
              <h3 class="section-title">填充模板变量</h3>
              <div class="variables-form">
                <a-form layout="vertical">
                  <a-row :gutter="16">
                    <a-col :span="12" v-for="varName in Object.keys(templateVariables)" :key="varName">
                      <a-form-item :label="varName">
                        <a-input v-model:value="templateVariables[varName]" :placeholder="`输入${varName}`" />
                      </a-form-item>
                    </a-col>
                  </a-row>
                </a-form>
              </div>

              <div class="template-result">
                <h4>生成结果</h4>
                <div class="result-content">
                  <pre>{{ templatePreview || '请填充变量...' }}</pre>
                </div>
                <div class="template-tips" v-if="selectedTemplate.tips">
                  <h5>写作技巧：</h5>
                  <ul>
                    <li v-for="tip in selectedTemplate.tips" :key="tip">{{ tip }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- 修辞助手 -->
        <a-tab-pane key="rhetoric">
          <template #tab>
            <span class="tab-item">
              <EditOutlined class="tab-icon" />
              修辞助手
            </span>
          </template>
          <div class="tool-content">
            <div class="rhetoric-input">
              <a-textarea
                v-model:value="rhetoricContent"
                placeholder="输入要分析的段落内容..."
                :rows="8"
                show-count
              />
              <div class="rhetoric-options">
                <a-input v-model:value="rhetoricStyle" placeholder="小说风格（可选）" style="width: 200px" />
                <a-input v-model:value="rhetoricFocus" placeholder="优化重点（可选）" style="width: 200px" />
                <a-button type="primary" :loading="rhetoric.analyzing.value" @click="handleAnalyzeRhetoric">
                  AI分析优化
                </a-button>
              </div>
            </div>

            <!-- 快速建议 -->
            <div class="quick-tips" v-if="quickTips.length > 0">
              <h4>快速检测</h4>
              <div class="tips-list">
                <div v-for="tip in quickTips" :key="tip.type" class="tip-item" :class="tip.severity">
                  <span class="tip-title">{{ tip.title }}</span>
                  <span class="tip-desc">{{ tip.description }}</span>
                </div>
              </div>
            </div>

            <!-- AI分析结果 -->
            <div class="analysis-result" v-if="rhetoric.suggestions.value">
              <a-collapse default-active-key="1">
                <a-collapse-panel key="1" header="分析结果">
                  <div v-if="rhetoric.suggestions.value.analysis">
                    <div class="result-section">
                      <h5>优点</h5>
                      <ul>
                        <li v-for="s in rhetoric.suggestions.value.analysis.strengths" :key="s">{{ s }}</li>
                      </ul>
                    </div>
                    <div class="result-section">
                      <h5>不足</h5>
                      <ul>
                        <li v-for="w in rhetoric.suggestions.value.analysis.weaknesses" :key="w">{{ w }}</li>
                      </ul>
                    </div>
                    <div class="result-section">
                      <h5>改进建议</h5>
                      <ul>
                        <li v-for="s in rhetoric.suggestions.value.analysis.suggestions" :key="s">{{ s }}</li>
                      </ul>
                    </div>
                  </div>
                </a-collapse-panel>
                <a-collapse-panel key="2" header="优化版本" v-if="rhetoric.suggestions.value.rewrittenVersions?.length">
                  <div v-for="(ver, idx) in rhetoric.suggestions.value.rewrittenVersions" :key="idx" class="version-item">
                    <h5>{{ ver.style }}</h5>
                    <p>{{ ver.content }}</p>
                  </div>
                </a-collapse-panel>
              </a-collapse>
            </div>
          </div>
        </a-tab-pane>

        <!-- 批量改名 -->
        <a-tab-pane key="rename">
          <template #tab>
            <span class="tab-item">
              <SyncOutlined class="tab-icon" />
              批量改名
            </span>
          </template>
          <div class="tool-content">
            <div class="rename-form">
              <a-form layout="vertical">
                <a-form-item label="选择小说">
                  <a-select
                    v-model:value="selectedNovelId"
                    placeholder="选择要操作的小说"
                    style="width: 300px"
                    show-search
                    :filter-option="(input, option) => option.label?.toLowerCase().includes(input.toLowerCase())"
                  >
                    <a-select-option v-for="novel in novels" :key="novel.id" :value="novel.id" :label="novel.title">
                      {{ novel.title }}
                    </a-select-option>
                  </a-select>
                </a-form-item>

                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item label="搜索内容">
                      <a-input v-model:value="searchKeyword" placeholder="要查找的内容" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="替换为">
                      <a-input v-model:value="replaceKeyword" placeholder="替换后的内容" />
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-form-item label="选项">
                  <a-space>
                    <a-checkbox v-model:checked="renameOptions.useRegex">使用正则表达式</a-checkbox>
                    <a-checkbox v-model:checked="renameOptions.caseSensitive">区分大小写</a-checkbox>
                    <a-checkbox v-model:checked="renameOptions.renameCharacterName">替换角色名称本身</a-checkbox>
                  </a-space>
                </a-form-item>

                <a-form-item label="替换范围">
                  <a-radio-group v-model:value="renameOptions.scope">
                    <a-radio value="all">全部内容</a-radio>
                    <a-radio value="chapters">仅章节</a-radio>
                    <a-radio value="characters">仅角色</a-radio>
                    <a-radio value="novelInfo">仅小说信息</a-radio>
                  </a-radio-group>
                </a-form-item>

                <a-form-item>
                  <a-space>
                    <a-button @click="handlePreviewRename" :disabled="!selectedNovelId || !searchKeyword">
                      预览统计
                    </a-button>
                    <a-button type="primary" :loading="batchRename.processing.value"
                      :disabled="!selectedNovelId || !searchKeyword" @click="handleExecuteRename">
                      执行替换
                    </a-button>
                  </a-space>
                </a-form-item>
              </a-form>
            </div>

            <!-- 预览统计 -->
            <div class="preview-stats" v-if="previewStats">
              <a-alert type="info" show-icon>
                <template #message>
                  共找到 <strong>{{ previewStats.totalMatches }}</strong> 处匹配
                </template>
              </a-alert>
              <div class="stats-detail">
                <div v-if="previewStats.novelInfo.count > 0">
                  小说信息: {{ previewStats.novelInfo.count }} 处
                </div>
                <div v-if="previewStats.chapters.count > 0">
                  章节内容: {{ previewStats.chapters.count }} 处
                </div>
                <div v-if="previewStats.characters.count > 0">
                  角色信息: {{ previewStats.characters.count }} 处
                </div>
              </div>
            </div>

            <!-- 执行结果 -->
            <div class="rename-result" v-if="batchRename.results.value">
              <a-alert :type="batchRename.results.value.success ? 'success' : 'error'" show-icon>
                <template #message>
                  {{ batchRename.results.value.success
                    ? `替换完成，共修改 ${batchRename.results.value.totalChanges} 处`
                    : batchRename.results.value.error }}
                </template>
              </a-alert>
            </div>
          </div>
        </a-tab-pane>

        <!-- 敏感词管理 -->
        <a-tab-pane key="sensitive">
          <template #tab>
            <span class="tab-item">
              <SafetyOutlined class="tab-icon" />
              敏感词管理
            </span>
          </template>
          <div class="tool-content">
            <div class="sensitive-section">
              <h4>敏感词分类</h4>
              <div class="category-list">
                <div v-for="cat in sensitiveWords.categories.value" :key="cat.key" class="sensitive-cat-item">
                  <span class="cat-name">{{ cat.name }}</span>
                  <a-switch :checked="cat.enabled" @change="(val) => sensitiveWords.setCategoryEnabled(cat.key, val)" />
                </div>
              </div>
            </div>

            <div class="sensitive-section">
              <h4>添加自定义敏感词</h4>
              <div class="add-word-form">
                <a-input v-model:value="newSensitiveWord" placeholder="敏感词" style="width: 200px" />
                <a-input v-model:value="newSensitiveNote" placeholder="备注（可选）" style="width: 200px" />
                <a-button type="primary" @click="handleAddSensitiveWord">添加</a-button>
              </div>
            </div>

            <div class="sensitive-section">
              <h4>自定义敏感词列表 ({{ sensitiveWords.customWords.value.length }})</h4>
              <div class="word-list">
                <a-tag
                  v-for="word in sensitiveWords.customWords.value"
                  :key="word.word"
                  closable
                  @close="sensitiveWords.removeCustomWord(word.word)"
                >
                  {{ word.word }}
                  <span v-if="word.note" class="word-note">({{ word.note }})</span>
                </a-tag>
                <span v-if="sensitiveWords.customWords.value.length === 0" class="empty-tip">
                  暂无自定义敏感词
                </span>
              </div>
            </div>

            <div class="sensitive-section">
              <h4>检测测试</h4>
              <a-textarea
                v-model:value="testContent"
                placeholder="输入内容测试敏感词检测..."
                :rows="4"
              />
              <a-button style="margin-top: 8px" @click="handleDetectSensitive">检测敏感词</a-button>

              <div class="detect-result" v-if="sensitiveWords.detectionResult.value">
                <a-alert
                  :type="sensitiveWords.detectionResult.value.hasSensitiveWords ? 'warning' : 'success'"
                  show-icon
                >
                  <template #message>
                    {{ sensitiveWords.detectionResult.value.hasSensitiveWords
                      ? `发现 ${sensitiveWords.detectionResult.value.totalCount} 个敏感词`
                      : '未发现敏感词' }}
                  </template>
                </a-alert>
                <div v-if="sensitiveWords.detectionResult.value.hasSensitiveWords" class="found-words">
                  <a-tag v-for="detail in sensitiveWords.detectionResult.value.details" :key="detail.word" color="red">
                    {{ detail.word }}
                  </a-tag>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- 字数统计 -->
        <a-tab-pane key="stats">
          <template #tab>
            <span class="tab-item">
              <BarChartOutlined class="tab-icon" />
              字数统计
            </span>
          </template>
          <div class="tool-content">
            <div class="stats-form">
              <a-form layout="inline">
                <a-form-item label="选择小说">
                  <a-select
                    v-model:value="statsNovelId"
                    placeholder="选择要分析的小说"
                    style="width: 300px"
                    show-search
                    :filter-option="(input, option) => option.label?.toLowerCase().includes(input.toLowerCase())"
                  >
                    <a-select-option v-for="novel in novels" :key="novel.id" :value="novel.id" :label="novel.title">
                      {{ novel.title }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item>
                  <a-button type="primary" :loading="wordStats.loading.value" @click="handleAnalyzeNovel">
                    开始统计
                  </a-button>
                </a-form-item>
              </a-form>
            </div>

            <!-- 统计结果 -->
            <div class="stats-result" v-if="novelStats">
              <a-row :gutter="16">
                <a-col :span="6">
                  <a-statistic title="总字数" :value="novelStats.wordStats.totalWords" suffix="字">
                    <template #formatter>
                      <span class="stat-value">{{ novelStats.wordStats.totalWords.toLocaleString() }}</span>
                    </template>
                  </a-statistic>
                </a-col>
                <a-col :span="6">
                  <a-statistic title="章节数" :value="novelStats.chapterStats.generated" suffix="章" />
                </a-col>
                <a-col :span="6">
                  <a-statistic title="平均每章" :value="novelStats.wordStats.avgPerChapter || 0" suffix="字" />
                </a-col>
                <a-col :span="6">
                  <a-statistic title="阅读时间" :value="novelStats.totalReadingTime" suffix="分钟" />
                </a-col>
              </a-row>

              <a-divider />

              <a-descriptions title="详细统计" bordered :column="2">
                <a-descriptions-item label="中文字符">{{ novelStats.wordStats.chineseChars.toLocaleString() }}</a-descriptions-item>
                <a-descriptions-item label="英文单词">{{ novelStats.wordStats.englishWords.toLocaleString() }}</a-descriptions-item>
                <a-descriptions-item label="总段落数">{{ novelStats.paragraphStats.total }}</a-descriptions-item>
                <a-descriptions-item label="平均段落长度">{{ novelStats.paragraphStats.avgLength }} 字</a-descriptions-item>
                <a-descriptions-item label="总句子数">{{ novelStats.sentenceStats.total }}</a-descriptions-item>
                <a-descriptions-item label="平均句长">{{ novelStats.sentenceStats.avgLength }} 字</a-descriptions-item>
              </a-descriptions>

              <!-- 与预期对比 -->
              <div v-if="novelStats.comparison" class="comparison-section">
                <h4>与预期对比</h4>
                <a-progress
                  :percent="Math.min(novelStats.comparison.percentage, 100)"
                  :status="novelStats.comparison.percentage >= 100 ? 'success' : 'active'"
                />
                <p>
                  预期字数: {{ novelStats.comparison.estimated.toLocaleString() }} 字，
                  已完成: {{ novelStats.comparison.percentage }}%，
                  剩余: {{ novelStats.comparison.remaining?.toLocaleString() || 0 }} 字
                </p>
              </div>

              <!-- 趋势分析 -->
              <div v-if="novelStats.trends" class="trends-section">
                <h4>趋势分析</h4>
                <a-row :gutter="16">
                  <a-col :span="6">
                    <a-statistic title="最长章节" :value="novelStats.trends.longestChapter.wordCount" suffix="字">
                      <template #title>
                        最长章节: 第{{ novelStats.trends.longestChapter.chapterNumber }}章
                      </template>
                    </a-statistic>
                  </a-col>
                  <a-col :span="6">
                    <a-statistic title="最短章节" :value="novelStats.trends.shortestChapter.wordCount" suffix="字">
                      <template #title>
                        最短章节: 第{{ novelStats.trends.shortestChapter.chapterNumber }}章
                      </template>
                    </a-statistic>
                  </a-col>
                  <a-col :span="6">
                    <a-statistic title="字数稳定性" :value="novelStats.trends.isConsistent ? '较稳定' : '波动较大'" />
                  </a-col>
                  <a-col :span="6">
                    <a-statistic title="趋势" :value="{
                      increasing: '上升',
                      decreasing: '下降',
                      stable: '稳定'
                    }[novelStats.trends.trend]" />
                  </a-col>
                </a-row>
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<style scoped>
.writing-tools-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.header-icon {
  font-size: 24px;
  color: var(--primary-color);
}

.tools-card {
  background: var(--bg-primary);
}

.tool-content {
  padding: var(--spacing-md) 0;
}

/* Tab 样式 */
.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-icon {
  font-size: 16px;
}

.section-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 模板样式 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-fast);
}

.category-card:hover,
.category-card.active {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.cat-icon-svg {
  font-size: 28px;
  color: var(--primary-color);
}

.cat-name {
  font-size: 14px;
  font-weight: 500;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.template-card {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-fast);
}

.template-card:hover,
.template-card.active {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.template-card h4 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
}

.template-card p {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.template-elements {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.variables-form {
  margin-bottom: var(--spacing-lg);
}

.template-result {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

.result-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  line-height: 1.8;
}

.template-tips {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.template-tips h5 {
  margin: 0 0 var(--spacing-sm) 0;
}

.template-tips ul {
  margin: 0;
  padding-left: var(--spacing-lg);
  color: var(--text-secondary);
  font-size: 13px;
}

/* 修辞助手样式 */
.rhetoric-input {
  margin-bottom: var(--spacing-lg);
}

.rhetoric-options {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.quick-tips {
  margin-bottom: var(--spacing-lg);
}

.quick-tips h4 {
  margin: 0 0 var(--spacing-sm) 0;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.tip-item {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--text-secondary);
}

.tip-item.warning {
  border-left-color: #faad14;
}

.tip-item.info {
  border-left-color: var(--primary-color);
}

.tip-title {
  font-weight: 500;
  margin-right: var(--spacing-sm);
}

.tip-desc {
  color: var(--text-secondary);
  font-size: 13px;
}

.analysis-result {
  margin-top: var(--spacing-lg);
}

.result-section {
  margin-bottom: var(--spacing-md);
}

.result-section h5 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-secondary);
}

.result-section ul {
  margin: 0;
  padding-left: var(--spacing-lg);
}

.version-item {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.version-item h5 {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--primary-color);
}

/* 批量改名样式 */
.rename-form {
  max-width: 600px;
}

.preview-stats {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.stats-detail {
  margin-top: var(--spacing-md);
  display: flex;
  gap: var(--spacing-lg);
}

.rename-result {
  margin-top: var(--spacing-lg);
}

/* 敏感词管理样式 */
.sensitive-section {
  margin-bottom: var(--spacing-xl);
}

.sensitive-section h4 {
  margin: 0 0 var(--spacing-md) 0;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.sensitive-cat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.add-word-form {
  display: flex;
  gap: var(--spacing-md);
}

.word-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.word-note {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-tip {
  color: var(--text-secondary);
  font-size: 13px;
}

.detect-result {
  margin-top: var(--spacing-md);
}

.found-words {
  margin-top: var(--spacing-sm);
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

/* 字数统计样式 */
.stats-form {
  margin-bottom: var(--spacing-lg);
}

.stats-result {
  margin-top: var(--spacing-lg);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--primary-color);
}

.comparison-section {
  margin-top: var(--spacing-lg);
}

.trends-section {
  margin-top: var(--spacing-lg);
}
</style>
