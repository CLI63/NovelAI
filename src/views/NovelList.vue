<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { novelDao, chapterDao } from '../utils/dao'
import { message, Modal } from 'ant-design-vue'

const router = useRouter()
const novels = ref([])
const loading = ref(false)

/**
 * 加载小说列表数据
 */
const loadNovels = async () => {
  loading.value = true
  try {
    const novelList = await novelDao.getAll()
    for (const novel of novelList) {
      const chapters = await chapterDao.getByNovelId(novel.id)
      novel.chapterCount = chapters.length
      novel.totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
    }
    novels.value = novelList
  } catch (error) {
    message.error('加载小说列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 跳转到创建小说页面
 */
const handleCreate = () => {
  router.push('/novel/create')
}

/**
 * 查看小说详情
 * @param {number} id - 小说ID
 */
const handleView = (id) => {
  router.push(`/novel/${id}`)
}

/**
 * 编辑小说
 * @param {number} id - 小说ID
 */
const handleEdit = (id) => {
  router.push(`/novel/${id}/edit`)
}

/**
 * 删除小说
 * @param {number} id - 小说ID
 */
const handleDelete = (id) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这部小说及其所有章节吗？删除后将无法恢复。',
    okText: '确定',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        await novelDao.delete(id)
        message.success('删除成功')
        loadNovels()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

/**
 * 表格列配置
 */
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

onMounted(() => {
  loadNovels()
})
</script>

<template>
  <div class="novel-list-page">
    <!-- 页面标题卡片 -->
    <a-card :bordered="false" class="page-header-card">
      <div class="page-header">
        <div class="header-left">
          <div class="header-icon">📚</div>
          <div class="header-info">
            <h1 class="page-title">小说列表</h1>
            <p class="page-subtitle">管理和查看您的AI生成小说</p>
          </div>
        </div>
        <div class="header-stats">
          <a-tag color="processing" class="stats-tag">
            <span class="stats-number">{{ novels.length }}</span>
            <span class="stats-label">部小说</span>
          </a-tag>
        </div>
        <a-button type="primary" size="large" class="create-btn" @click="handleCreate">
          <template #icon>
            <span class="btn-icon">+</span>
          </template>
          创建新小说
        </a-button>
      </div>
    </a-card>

    <!-- 小说列表卡片 -->
    <a-card :bordered="false" class="list-card">
      <a-spin :spinning="loading" size="large">
        <!-- 空状态 -->
        <a-empty
          v-if="!loading && novels.length === 0"
          class="empty-state"
          image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
          description="暂无小说，快去创建吧！"
        >
          <a-button type="primary" @click="handleCreate">立即创建</a-button>
        </a-empty>

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
              <a class="novel-title" @click="handleView(record.id)">
                {{ record.title }}
              </a>
            </template>

            <!-- 风格列 -->
            <template v-else-if="column.key === 'style'">
              <div class="style-tags">
                <a-tag
                  v-for="style in record.style"
                  :key="style"
                  :color="
                    ['blue', 'green', 'purple', 'orange', 'cyan'][record.style.indexOf(style) % 5]
                  "
                  class="style-tag"
                >
                  {{ style }}
                </a-tag>
              </div>
            </template>

            <!-- 简介列 -->
            <template v-else-if="column.key === 'description'">
              <a-tooltip :title="record.description">
                <span class="description-text">{{ record.description }}</span>
              </a-tooltip>
            </template>

            <!-- 创建时间列 -->
            <template v-else-if="column.key === 'createdAt'">
              <span class="time-text">{{ new Date(record.createdAt).toLocaleString() }}</span>
            </template>

            <!-- 操作列 -->
            <template v-else-if="column.key === 'action'">
              <div class="action-btns">
                <a-button type="link" class="action-btn view-btn" @click="handleView(record.id)">
                  查看
                </a-button>
                <a-button type="link" class="action-btn edit-btn" @click="handleEdit(record.id)">
                  编辑
                </a-button>
                <a-popconfirm
                  title="确定要删除这部小说吗？"
                  ok-text="确定"
                  cancel-text="取消"
                  ok-button-props="{ danger: true }"
                  @confirm="handleDelete(record.id)"
                >
                  <a-button type="link" danger class="action-btn delete-btn"> 删除 </a-button>
                </a-popconfirm>
              </div>
            </template>
          </template>
        </a-table>
      </a-spin>
    </a-card>
  </div>
</template>

<style scoped>
.novel-list-page {
  padding: 8px;
}

.page-header-card {
  margin-bottom: 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-icon {
  font-size: 48px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.header-info {
  color: #ffffff;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
  font-weight: 400;
}

.header-stats {
  display: flex;
  align-items: center;
}

.stats-tag {
  padding: 8px 20px;
  font-size: 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.stats-number {
  font-size: 24px;
  font-weight: 700;
  margin-right: 4px;
}

.stats-label {
  font-size: 14px;
  opacity: 0.9;
}

.create-btn {
  height: 48px;
  padding: 0 28px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: #ffffff;
  color: #667eea;
  border: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  background: #ffffff;
  color: #764ba2;
}

.btn-icon {
  font-size: 20px;
  margin-right: 4px;
}

.list-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  background: #ffffff;
  overflow: hidden;
}

.empty-state {
  padding: 80px 0;
}

.novel-table {
  font-size: 14px;
}

:deep(.ant-table-wrapper) {
  overflow-x: auto;
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

.novel-title {
  font-weight: 600;
  color: #667eea;
  font-size: 15px;
  transition: color 0.3s ease;
}

.novel-title:hover {
  color: #764ba2;
}

.style-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.style-tag {
  border-radius: 6px;
  font-size: 12px;
  padding: 2px 10px;
}

.description-text {
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.time-text {
  color: #94a3b8;
  font-size: 13px;
}

.action-btns {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.action-btn {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.view-btn {
  color: #667eea;
}

.view-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

.edit-btn {
  color: #10b981;
}

.edit-btn:hover {
  background: rgba(16, 185, 129, 0.1);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

:deep(.ant-pagination) {
  margin-top: 24px;
  padding: 16px;
}

:deep(.ant-pagination-item-active) {
  border-color: #667eea;
  background: #667eea;
}

:deep(.ant-pagination-item-active a) {
  color: #ffffff;
}

:deep(.ant-spin-dot-item) {
  background-color: #667eea;
}
</style>
