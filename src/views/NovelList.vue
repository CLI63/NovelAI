<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNovel } from '@/composables/useNovel'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const router = useRouter()
const { novels, loading, loadNovels, deleteNovel, goToDetail, goToEdit, goToCreate } = useNovel()

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
          <a-tag color="processing" class="stats-tag">
            <span class="stats-number">{{ novels.length }}</span>
            <span class="stats-label">部小说</span>
          </a-tag>
          <a-button type="primary" size="large" @click="goToCreate">
            <template #icon>
              <span class="btn-icon">+</span>
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
          v-if="!loading && novels.length === 0"
          description="暂无小说，快去创建吧！"
          button-text="立即创建"
          @action="goToCreate"
        />

        <!-- 数据表格 -->
        <a-table
          v-else
          :columns="columns"
          :data-source="novels"
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
              <a-button type="link" @click="goToDetail(record.id)">
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
              <span class="create-time">{{ formatDate(record.createdAt) }}</span>
            </template>

            <!-- 操作列 -->
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="goToDetail(record.id)">
                  查看
                </a-button>
                <a-button type="link" size="small" @click="goToEdit(record.id)">
                  编辑
                </a-button>
                <a-button type="link" size="small" danger @click="handleDelete(record.id)">
                  删除
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
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
  background: var(--bg-primary);
}

.stats-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
}

.stats-number {
  font-size: 18px;
  font-weight: 700;
}

.stats-label {
  font-size: 12px;
}

.btn-icon {
  font-size: 16px;
  font-weight: bold;
}

.list-card {
  background: var(--bg-primary);
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
  color: var(--primary-color);
  font-weight: 500;
}

.create-time {
  color: var(--text-muted);
  font-size: 13px;
}

.novel-table :deep(.ant-table-thead > tr > th) {
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 600;
}
</style>
