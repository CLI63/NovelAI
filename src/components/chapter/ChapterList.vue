<script setup>
/**
 * 章节列表组件
 * 用于展示小说的章节列表，支持分页和操作
 */
defineProps({
  chapters: {
    type: Array,
    required: true,
  },
  novelId: {
    type: [Number, String],
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['view', 'delete'])

const columns = [
  {
    title: '章节',
    dataIndex: 'chapterNumber',
    key: 'chapterNumber',
    width: 80,
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
    width: 160,
    align: 'center',
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    align: 'center',
  },
]

const handleView = (record) => {
  emit('view', record)
}

const handleDelete = (record) => {
  emit('delete', record)
}

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
</script>

<template>
  <div class="chapter-list">
    <a-table
      :columns="columns"
      :data-source="chapters"
      :loading="loading"
      :pagination="{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 章`,
      }"
      row-key="id"
      class="chapter-table"
    >
      <template #bodyCell="{ column, record }">
        <!-- 章节序号 -->
        <template v-if="column.key === 'chapterNumber'">
          <span class="chapter-number">第{{ record.chapterNumber }}章</span>
        </template>

        <!-- 标题 -->
        <template v-else-if="column.key === 'title'">
          <span class="chapter-title">{{ record.title }}</span>
        </template>

        <!-- 字数 -->
        <template v-else-if="column.key === 'wordCount'">
          <span class="word-count">{{ record.wordCount?.toLocaleString() || 0 }} 字</span>
        </template>

        <!-- 创建时间 -->
        <template v-else-if="column.key === 'createdAt'">
          <span class="create-time">{{ formatDate(record.createdAt) }}</span>
        </template>

        <!-- 操作 -->
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="handleView(record)">
              查看
            </a-button>
            <a-button type="link" size="small" danger @click="handleDelete(record)">
              删除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<style scoped>
.chapter-list {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
}

.chapter-table :deep(.ant-table-thead > tr > th) {
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 600;
}

.chapter-number {
  font-weight: 500;
  color: var(--primary-color);
}

.chapter-title {
  color: var(--text-primary);
}

.word-count {
  color: var(--text-secondary);
  font-size: 13px;
}

.create-time {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
