<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { novelDao, chapterDao } from '../utils/dao'
import { message, Modal } from 'ant-design-vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

const novel = ref(null)
const chapters = ref([])
const loading = ref(false)
const activeTab = ref('chapters')

/**
 * 计算总字数
 */
const totalWordCount = computed(() => {
  return chapters.value.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
})

/**
 * 计算完成进度百分比
 */
const progress = computed(() => {
  if (!novel.value || !novel.value.chapterStructure.totalChapters) return 0
  return Math.round((chapters.value.length / novel.value.chapterStructure.totalChapters) * 100)
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
      return
    }
    appStore.setCurrentNovel(novel.value)
    await loadChapters()
  } catch (error) {
    message.error('加载小说失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载章节列表
 */
const loadChapters = async () => {
  try {
    chapters.value = await chapterDao.getByNovelId(novel.value.id)
  } catch (error) {
    message.error('加载章节失败')
  }
}

/**
 * 跳转到创建章节页面
 */
const handleCreateChapter = () => {
  router.push(`/novel/${novel.value.id}/chapter/create`)
}

/**
 * 查看章节详情
 * @param {number} chapterNumber - 章节序号
 */
const handleViewChapter = (chapterNumber) => {
  router.push(`/novel/${novel.value.id}/chapter/${chapterNumber}`)
}

/**
 * 编辑小说
 */
const handleEditNovel = () => {
  router.push(`/novel/${novel.value.id}/edit`)
}

/**
 * 删除小说
 */
const handleDeleteNovel = () => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这部小说及其所有章节吗？删除后将无法恢复。',
    okText: '确定',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        await novelDao.delete(novel.value.id)
        message.success('删除成功')
        router.push('/')
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

/**
 * 导出小说
 */
const handleExport = () => {
  Modal.confirm({
    title: '导出小说',
    content: '选择导出格式',
    okText: 'TXT',
    cancelText: 'Markdown',
    onOk: () => exportNovel('txt'),
    onCancel: () => exportNovel('md'),
  })
}

/**
 * 执行导出操作
 * @param {string} format - 导出格式
 */
const exportNovel = (format) => {
  let content = `${novel.value.title}\n\n`
  content += `${novel.value.description}\n\n`
  content += `风格：${novel.value.style.join('、')}\n\n`
  content += `---\n\n`

  chapters.value.forEach((ch) => {
    content += `第${ch.chapterNumber}章 ${ch.title}\n\n`
    content += `${ch.content}\n\n`
    content += `---\n\n`
  })

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${novel.value.title}.${format}`
  a.click()
  URL.revokeObjectURL(url)

  message.success('导出成功')
}

/**
 * 章节表格列配置
 */
const chapterColumns = [
  {
    title: '章节',
    dataIndex: 'chapterNumber',
    key: 'chapterNumber',
    width: 100,
    align: 'center',
  },
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
  },
  {
    title: '字数',
    dataIndex: 'wordCount',
    key: 'wordCount',
    width: 100,
    align: 'center',
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    align: 'center',
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    align: 'center',
  },
]

onMounted(() => {
  loadNovel()
})
</script>

<template>
  <div class="novel-detail-page">
    <a-spin :spinning="loading" size="large">
      <template v-if="novel">
        <!-- 页面头部 -->
        <div class="page-header">
          <div class="header-left">
            <a-button type="text" class="back-btn" @click="router.push('/')">
              <template #icon>
                <span class="back-icon">←</span>
              </template>
            </a-button>
            <div class="header-info">
              <h1 class="novel-title">{{ novel.title }}</h1>
              <div class="novel-meta">
                <a-tag v-for="style in novel.style" :key="style" color="blue" class="style-tag">
                  {{ style }}
                </a-tag>
                <span class="meta-divider">|</span>
                <span class="meta-item"
                  >{{ chapters.length }} / {{ novel.chapterStructure.totalChapters }} 章</span
                >
                <span class="meta-divider">|</span>
                <span class="meta-item">{{ totalWordCount.toLocaleString() }} 字</span>
              </div>
            </div>
          </div>
          <div class="header-actions">
            <a-button type="primary" class="action-btn primary-btn" @click="handleCreateChapter">
              <template #icon>
                <span>✍️</span>
              </template>
              生成章节
            </a-button>
            <a-button class="action-btn" @click="handleExport" :disabled="chapters.length === 0">
              <template #icon>
                <span>📥</span>
              </template>
              导出
            </a-button>
            <a-dropdown>
              <a-button class="action-btn">
                <template #icon>
                  <span>⋮</span>
                </template>
                更多
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item @click="handleEditNovel">
                    <span class="menu-item-icon">✏️</span>
                    编辑小说
                  </a-menu-item>
                  <a-menu-item danger @click="handleDeleteNovel">
                    <span class="menu-item-icon">🗑️</span>
                    删除小说
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>

        <!-- 统计卡片 -->
        <a-row :gutter="16" class="stats-row">
          <a-col :span="6">
            <div class="stat-card">
              <div class="stat-icon purple">📖</div>
              <div class="stat-info">
                <div class="stat-value">{{ chapters.length }}</div>
                <div class="stat-label">已生成章节</div>
              </div>
            </div>
          </a-col>
          <a-col :span="6">
            <div class="stat-card">
              <div class="stat-icon blue">📝</div>
              <div class="stat-info">
                <div class="stat-value">{{ totalWordCount.toLocaleString() }}</div>
                <div class="stat-label">总字数</div>
              </div>
            </div>
          </a-col>
          <a-col :span="6">
            <div class="stat-card">
              <div class="stat-icon green">📊</div>
              <div class="stat-info">
                <div class="stat-value">{{ progress }}%</div>
                <div class="stat-label">完成进度</div>
              </div>
            </div>
          </a-col>
          <a-col :span="6">
            <div class="stat-card">
              <div class="stat-icon orange">🎯</div>
              <div class="stat-info">
                <div class="stat-value">{{ novel.estimatedWords }}</div>
                <div class="stat-label">预估字数</div>
              </div>
            </div>
          </a-col>
        </a-row>

        <!-- 进度条 -->
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-title">创作进度</span>
            <span class="progress-text"
              >{{ chapters.length }} / {{ novel.chapterStructure.totalChapters }} 章</span
            >
          </div>
          <a-progress
            :percent="progress"
            :stroke-color="{ from: '#667eea', to: '#764ba2' }"
            :stroke-width="12"
            class="novel-progress"
          />
        </div>

        <!-- 内容标签页 -->
        <a-card :bordered="false" class="content-card">
          <a-tabs v-model:activeKey="activeTab" class="content-tabs">
            <!-- 章节列表 -->
            <a-tab-pane key="chapters" tab="📚 章节列表">
              <a-empty
                v-if="chapters.length === 0"
                class="empty-state"
                description="暂无章节，点击上方按钮生成"
              >
                <a-button type="primary" @click="handleCreateChapter">生成章节</a-button>
              </a-empty>

              <a-table
                v-else
                :columns="chapterColumns"
                :data-source="chapters"
                :pagination="{ pageSize: 15, showSizeChanger: true }"
                row-key="id"
                class="chapter-table"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'chapterNumber'">
                    <a-tag color="purple" class="chapter-tag">
                      第{{ record.chapterNumber }}章
                    </a-tag>
                  </template>

                  <template v-else-if="column.key === 'title'">
                    <a class="chapter-title" @click="handleViewChapter(record.chapterNumber)">
                      {{ record.title }}
                    </a>
                  </template>

                  <template v-else-if="column.key === 'wordCount'">
                    <span class="word-count">{{ record.wordCount.toLocaleString() }} 字</span>
                  </template>

                  <template v-else-if="column.key === 'createdAt'">
                    <span class="time-text">{{ new Date(record.createdAt).toLocaleString() }}</span>
                  </template>

                  <template v-else-if="column.key === 'action'">
                    <a-button
                      type="link"
                      class="view-chapter-btn"
                      @click="handleViewChapter(record.chapterNumber)"
                    >
                      查看
                    </a-button>
                  </template>
                </template>
              </a-table>
            </a-tab-pane>

            <!-- 剧情大纲 -->
            <a-tab-pane key="outline" tab="📋 剧情大纲">
              <div class="outline-content">
                <div class="outline-section">
                  <h3 class="section-title">📖 简介</h3>
                  <p class="outline-text">{{ novel.description }}</p>
                </div>

                <div class="outline-section">
                  <h3 class="section-title">🎭 主线剧情</h3>
                  <p class="outline-text">{{ novel.plotLines.main }}</p>
                </div>

                <div
                  v-if="novel.plotLines.sub && novel.plotLines.sub.length > 0"
                  class="outline-section"
                >
                  <h3 class="section-title">🎪 支线剧情</h3>
                  <ul class="sub-plot-list">
                    <li
                      v-for="(plot, index) in novel.plotLines.sub"
                      :key="index"
                      class="sub-plot-item"
                    >
                      {{ plot }}
                    </li>
                  </ul>
                </div>

                <div class="outline-section">
                  <h3 class="section-title">📚 分卷大纲</h3>
                  <a-timeline class="volume-timeline">
                    <a-timeline-item
                      v-for="(volume, index) in novel.outline"
                      :key="index"
                      :color="['blue', 'green', 'purple', 'orange'][index % 4]"
                    >
                      <div class="volume-card">
                        <div class="volume-header">
                          <span class="volume-name">{{ volume.volume }}</span>
                          <a-tag size="small" class="volume-chapters">
                            {{ volume.chapters }} 章
                          </a-tag>
                        </div>
                        <p class="volume-summary">{{ volume.summary }}</p>
                      </div>
                    </a-timeline-item>
                  </a-timeline>
                </div>
              </div>
            </a-tab-pane>

            <!-- 章节结构 -->
            <a-tab-pane key="structure" tab="🏗️ 章节结构">
              <div class="structure-content">
                <a-descriptions bordered :column="2" class="structure-descriptions">
                  <a-descriptions-item label="总章节数">
                    {{ novel.chapterStructure.totalChapters }} 章
                  </a-descriptions-item>
                  <a-descriptions-item label="预估字数">
                    {{ novel.estimatedWords }}
                  </a-descriptions-item>
                  <a-descriptions-item label="每章最小字数">
                    {{ novel.chapterStructure.minWordsPerChapter }} 字
                  </a-descriptions-item>
                  <a-descriptions-item label="每章最大字数">
                    {{ novel.chapterStructure.maxWordsPerChapter }} 字
                  </a-descriptions-item>
                </a-descriptions>
              </div>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </template>
    </a-spin>
  </div>
</template>

<style scoped>
.novel-detail-page {
  padding: 8px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  gap: 8px;
}

.novel-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.novel-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
}

.style-tag {
  border-radius: 6px;
  font-size: 12px;
}

.meta-divider {
  color: #cbd5e1;
}

.meta-item {
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.menu-item-icon {
  margin-right: 8px;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-icon.purple {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}

.stat-icon.blue {
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
}

.stat-icon.green {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
}

.stat-icon.orange {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.progress-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.progress-text {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.novel-progress :deep(.ant-progress-bg) {
  border-radius: 6px;
}

.content-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  background: #ffffff;
}

.content-tabs :deep(.ant-tabs-nav) {
  padding: 0 16px;
  margin-bottom: 0;
}

.content-tabs :deep(.ant-tabs-tab) {
  font-size: 14px;
  font-weight: 500;
  padding: 16px 20px;
}

.content-tabs :deep(.ant-tabs-tab-active) {
  color: #667eea;
}

.content-tabs :deep(.ant-tabs-ink-bar) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  height: 3px;
  border-radius: 3px;
}

.empty-state {
  padding: 60px 0;
}

.chapter-table {
  font-size: 14px;
}

:deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  padding: 16px;
  border-bottom: 2px solid #e2e8f0;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: #f8fafc;
}

.chapter-tag {
  border-radius: 6px;
  font-size: 12px;
  padding: 2px 10px;
}

.chapter-title {
  font-weight: 600;
  color: #667eea;
  font-size: 14px;
  transition: color 0.3s ease;
}

.chapter-title:hover {
  color: #764ba2;
}

.word-count {
  color: #64748b;
  font-size: 13px;
}

.time-text {
  color: #94a3b8;
  font-size: 13px;
}

.view-chapter-btn {
  color: #667eea;
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.view-chapter-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

.outline-content {
  padding: 24px;
}

.outline-section {
  margin-bottom: 32px;
}

.outline-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.outline-text {
  color: #475569;
  line-height: 1.8;
  font-size: 14px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border-left: 4px solid #667eea;
}

.sub-plot-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sub-plot-item {
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 10px;
  margin-bottom: 8px;
  color: #475569;
  font-size: 14px;
  border-left: 4px solid #10b981;
}

.sub-plot-item:last-child {
  margin-bottom: 0;
}

.volume-timeline {
  padding: 16px 0;
}

.volume-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
}

.volume-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.volume-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 15px;
}

.volume-chapters {
  border-radius: 6px;
  font-size: 12px;
}

.volume-summary {
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.structure-content {
  padding: 24px;
}

.structure-descriptions :deep(.ant-descriptions-item-label) {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  width: 150px;
}

.structure-descriptions :deep(.ant-descriptions-item-content) {
  color: #64748b;
}

:deep(.ant-spin-dot-item) {
  background-color: #667eea;
}
</style>
