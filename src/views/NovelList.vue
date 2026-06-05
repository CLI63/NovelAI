<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNovel } from '@/composables/useNovel'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import {
  PlusOutlined,
  BookOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReadOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const { novels, loading, loadNovels, deleteNovel, goToDetail, goToEdit, goToCreate } = useNovel()

// 视图模式：table | grid
const viewMode = ref('table')

const searchKeyword = computed(() => String(route.query.q || '').trim().toLowerCase())

const filteredNovels = computed(() => {
  if (!searchKeyword.value) return novels.value

  // 顶部搜索只做轻量本地过滤，避免额外引入全局搜索状态。
  return novels.value.filter(novel => {
    const searchableText = [
      novel.title,
      novel.description,
      Array.isArray(novel.style) ? novel.style.join(' ') : novel.style
    ].filter(Boolean).join(' ').toLowerCase()
    return searchableText.includes(searchKeyword.value)
  })
})

// 表格列配置
const columns = [
  {
    title: '书名',
    dataIndex: 'title',
    key: 'title',
    width: 200,
    ellipsis: true,
  },
  {
    title: '风格',
    dataIndex: 'style',
    key: 'style',
    width: 150,
  },
  {
    title: '简介',
    dataIndex: 'description',
    key: 'description',
    width: 250,
    ellipsis: true,
  },
  {
    title: '预估字数',
    dataIndex: 'estimatedWords',
    key: 'estimatedWords',
    width: 100,
    align: 'center',
  },
  {
    title: '已生成章节',
    dataIndex: 'chapterCount',
    key: 'chapterCount',
    width: 100,
    align: 'center',
  },
  {
    title: '已生成字数',
    dataIndex: 'totalWords',
    key: 'totalWords',
    width: 100,
    align: 'center',
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    align: 'center',
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
    align: 'center',
    fixed: 'right',
  },
]

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 格式化字数
const formatWordCount = (count) => {
  if (!count) return '0'
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  }
  return count.toLocaleString()
}

// 处理删除
const handleDelete = (id) => {
  deleteNovel(id, () => loadNovels())
}

onMounted(() => {
  loadNovels()
})
</script>

<template>
  <div class="novel-list-page">
    <!-- 页面标题 -->
    <a-card :bordered="false" class="header-card">
      <PageHeader title="小说列表" subtitle="管理和查看您的AI生成小说" icon="📚">
        <template #actions>
          <div class="header-stats">
            <div class="stat-item">
              <BookOutlined class="stat-icon" />
              <span class="stat-value">{{ novels.length }}</span>
              <span class="stat-label">部小说</span>
            </div>
          </div>
          <div class="view-toggle">
            <a-radio-group v-model:value="viewMode" button-style="solid" size="small">
              <a-radio-button value="table">列表</a-radio-button>
              <a-radio-button value="grid">卡片</a-radio-button>
            </a-radio-group>
          </div>
          <a-button type="primary" size="large" class="create-btn" @click="goToCreate">
            <template #icon>
              <PlusOutlined />
            </template>
            创建新小说
          </a-button>
        </template>
      </PageHeader>
    </a-card>

    <!-- 小说列表 -->
    <a-card :bordered="false" class="list-card">
      <a-spin :spinning="loading" size="large">
        <!-- 空状态 -->
        <EmptyState
          v-if="!loading && filteredNovels.length === 0"
          :description="searchKeyword ? '没有找到匹配的小说' : '暂无小说，快去创作您的第一部作品吧！'"
          button-text="立即创建"
          type="create"
          @action="goToCreate"
        />

        <!-- 数据表格 -->
        <template v-else-if="viewMode === 'table'">
          <a-table
            :columns="columns"
            :data-source="filteredNovels"
            :pagination="{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 部小说`,
            }"
            :scroll="{ x: 1200 }"
            row-key="id"
            class="novel-table"
          >
            <template #bodyCell="{ column, record }">
              <!-- 书名列 -->
              <template v-if="column.key === 'title'">
                <a-button type="link" class="title-link" @click="goToDetail(record.id)">
                  <BookOutlined class="title-icon" />
                  {{ record.title }}
                </a-button>
              </template>

              <!-- 风格列 -->
              <template v-else-if="column.key === 'style'">
                <div class="style-tags">
                  <a-tag v-for="style in record.style?.slice(0, 2)" :key="style" color="blue">
                    {{ style }}
                  </a-tag>
                  <a-tag v-if="record.style?.length > 2" color="blue">
                    +{{ record.style.length - 2 }}
                  </a-tag>
                </div>
              </template>

              <!-- 简介列 -->
              <template v-else-if="column.key === 'description'">
                <a-tooltip :title="record.description">
                  <span class="description-text">{{ record.description }}</span>
                </a-tooltip>
              </template>

              <!-- 字数列 -->
              <template v-else-if="column.key === 'totalWords'">
                <span class="word-count">{{ formatWordCount(record.totalWords) }}</span>
              </template>

              <!-- 创建时间列 -->
              <template v-else-if="column.key === 'createdAt'">
                <span class="create-time">
                  <ClockCircleOutlined class="time-icon" />
                  {{ formatDate(record.createdAt) }}
                </span>
              </template>

              <!-- 操作列 -->
              <template v-else-if="column.key === 'action'">
                <a-space class="action-buttons">
                  <a-tooltip title="查看详情">
                    <a-button type="text" size="small" class="action-btn" @click="goToDetail(record.id)">
                      <EyeOutlined />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip title="编辑">
                    <a-button type="text" size="small" class="action-btn" @click="goToEdit(record.id)">
                      <EditOutlined />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip title="阅读">
                    <a-button
                      type="text"
                      size="small"
                      class="action-btn"
                      :disabled="record.chapterCount === 0"
                      @click="router.push(`/reader/${record.id}`)"
                    >
                      <ReadOutlined />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip title="删除">
                    <a-button type="text" size="small" class="action-btn danger" @click="handleDelete(record.id)">
                      <DeleteOutlined />
                    </a-button>
                  </a-tooltip>
                </a-space>
              </template>
            </template>
          </a-table>
        </template>

        <!-- 卡片视图 -->
        <template v-else>
          <div class="novel-grid">
            <div
              v-for="novel in filteredNovels"
              :key="novel.id"
              class="novel-card"
              @click="goToDetail(novel.id)"
            >
              <div class="card-header">
                <div class="card-icon">
                  <BookOutlined />
                </div>
                <div class="card-title">{{ novel.title }}</div>
              </div>
              <div class="card-body">
                <p class="card-description">{{ novel.description || '暂无简介' }}</p>
                <div class="card-tags">
                  <a-tag v-for="style in novel.style?.slice(0, 3)" :key="style" size="small">
                    {{ style }}
                  </a-tag>
                </div>
              </div>
              <div class="card-footer">
                <div class="card-stats">
                  <span class="stat">
                    <FileTextOutlined />
                    {{ novel.chapterCount || 0 }} 章
                  </span>
                  <span class="stat">
                    {{ formatWordCount(novel.totalWords) }} 字
                  </span>
                </div>
                <div class="card-actions" @click.stop>
                  <a-button type="text" size="small" @click="goToEdit(novel.id)">
                    <EditOutlined />
                  </a-button>
                  <a-button type="text" size="small" danger @click="handleDelete(novel.id)">
                    <DeleteOutlined />
                  </a-button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </a-spin>
    </a-card>
  </div>
</template>

<style scoped>
.novel-list-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.header-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.header-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-right: var(--spacing-lg);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 20px;
}

.stat-icon {
  color: #667eea;
  font-size: 16px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.view-toggle {
  margin-right: var(--spacing-md);
}

.create-btn {
  border-radius: 10px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.25s ease;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.list-card {
  background: var(--bg-primary);
}

/* 表格样式 */
.novel-table :deep(.ant-table-thead > tr > th) {
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 600;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

.novel-table :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(102, 126, 234, 0.02);
}

.title-link {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 15px;
}

.title-icon {
  color: #667eea;
}

.style-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.description-text {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  max-width: 230px;
}

.word-count {
  color: #667eea;
  font-weight: 600;
}

.create-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 13px;
}

.time-icon {
  font-size: 12px;
}

.action-buttons {
  gap: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* 卡片网格样式 */
.novel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.novel-card {
  background: var(--bg-primary);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.novel-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  border-color: rgba(102, 126, 234, 0.2);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-body {
  padding: 16px;
}

.card-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.card-stats {
  display: flex;
  gap: 16px;
}

.card-stats .stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.card-actions {
  display: flex;
  gap: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-stats {
    display: none;
  }

  .view-toggle {
    display: none;
  }

  .novel-grid {
    grid-template-columns: 1fr;
  }
}
</style>
