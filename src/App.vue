<script setup>
import { RouterView } from 'vue-router'
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  BookOutlined,
  BulbOutlined,
  ToolOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  BellOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import GlobalFullGenerationPanel from './components/chapter/GlobalFullGenerationPanel.vue'

const router = useRouter()
const route = useRoute()

const collapsed = ref(false)
const selectedKeys = ref(['/'])
const searchVisible = ref(false)
const searchText = ref('')

const menuItems = [
  { key: '/', icon: BookOutlined, label: '小说列表' },
  { key: '/inspiration', icon: BulbOutlined, label: '灵感工作台' },
  { key: '/tools', icon: ToolOutlined, label: '写作工具' },
  { key: '/settings', icon: SettingOutlined, label: '设置' },
]

const handleMenuClick = ({ key }) => {
  router.push(key)
}

const currentPageTitle = computed(() => {
  const item = menuItems.find(m => m.key === selectedKeys.value[0])
  return item?.label || 'AI小说生成器'
})

watch(
  route,
  (newRoute) => {
    if (newRoute.path.startsWith('/novel/') || newRoute.path.startsWith('/reader/')) {
      selectedKeys.value = ['/']
    } else {
      selectedKeys.value = [newRoute.path]
    }
  },
  { immediate: true },
)

</script>

<template>
  <a-layout class="app-layout">
    <!-- 侧边栏 -->
    <a-layout-sider
      v-model:collapsed="collapsed"
      :trigger="null"
      collapsible
      theme="light"
      :width="260"
      :collapsed-width="80"
      class="app-sider"
    >
      <!-- Logo区域 -->
      <div class="logo-container" :class="{ collapsed }">
        <div class="logo-icon-wrapper">
          <BookOutlined class="logo-icon" />
        </div>
        <transition name="fade-slide">
          <span v-if="!collapsed" class="logo-text">AI小说生成器</span>
        </transition>
      </div>

      <!-- 导航菜单 -->
      <a-menu
        v-model:selectedKeys="selectedKeys"
        mode="inline"
        theme="light"
        :inline-collapsed="collapsed"
        @click="handleMenuClick"
        class="app-menu"
      >
        <a-menu-item v-for="item in menuItems" :key="item.key">
          <template #icon>
            <component :is="item.icon" class="menu-icon" />
          </template>
          <span class="menu-label">{{ item.label }}</span>
        </a-menu-item>
      </a-menu>

      <!-- 侧边栏底部 -->
      <div class="sider-footer" :class="{ collapsed }">
        <div v-if="!collapsed" class="footer-info">
          <span class="version">v2.0.0</span>
          <span class="copyright">AI创作平台</span>
        </div>
      </div>
    </a-layout-sider>

    <!-- 主内容区 -->
    <a-layout class="main-layout" :class="{ 'sider-collapsed': collapsed }">
      <!-- 顶部导航栏 -->
      <a-layout-header class="app-header">
        <div class="header-content">
          <div class="header-left">
            <a-button
              type="text"
              class="collapse-btn"
              @click="collapsed = !collapsed"
            >
              <MenuUnfoldOutlined v-if="collapsed" class="collapse-icon" />
              <MenuFoldOutlined v-else class="collapse-icon" />
            </a-button>
            <div class="header-breadcrumb">
              <span class="current-page">{{ currentPageTitle }}</span>
            </div>
          </div>

          <div class="header-right">
            <!-- 搜索框 -->
            <div class="header-search" :class="{ active: searchVisible }">
              <a-input
                v-if="searchVisible"
                v-model:value="searchText"
                placeholder="搜索小说..."
                class="search-input"
                @blur="searchVisible = false"
              >
                <template #prefix>
                  <SearchOutlined />
                </template>
              </a-input>
              <a-button v-else type="text" class="icon-btn" @click="searchVisible = true">
                <SearchOutlined />
              </a-button>
            </div>

            <!-- 通知 -->
            <a-badge :count="0" :offset="[-2, 2]">
              <a-button type="text" class="icon-btn">
                <BellOutlined />
              </a-button>
            </a-badge>

            <!-- 用户头像 -->
            <a-dropdown placement="bottomRight">
              <div class="user-avatar">
                <a-avatar size="small" class="avatar">
                  <template #icon><UserOutlined /></template>
                </a-avatar>
                <span class="user-name">创作者</span>
              </div>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="profile">
                    <UserOutlined /> 个人中心
                  </a-menu-item>
                  <a-menu-item key="settings" @click="router.push('/settings')">
                    <SettingOutlined /> 系统设置
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="logout">
                    退出登录
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>
      </a-layout-header>

      <!-- 内容区域 -->
      <a-layout-content class="app-content">
        <div class="content-wrapper">
          <RouterView v-slot="{ Component }">
            <transition name="page-fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </RouterView>
        </div>
      </a-layout-content>
    </a-layout>

    <GlobalFullGenerationPanel />
  </a-layout>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

/* ==================== 侧边栏样式 ==================== */
.app-sider {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 2px 0 16px rgba(0, 0, 0, 0.04);
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  z-index: 1000;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

/* Logo区域 */
.logo-container {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 0 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.logo-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
  pointer-events: none;
}

.logo-container.collapsed {
  padding: 0;
  gap: 0;
}

.logo-icon-wrapper {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  flex-shrink: 0;
}

.logo-icon {
  font-size: 22px;
  color: #ffffff;
}

.logo-text {
  color: #ffffff;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

/* 菜单样式 */
.app-menu {
  border: none;
  background: transparent;
  padding: 16px 12px;
  flex: 1;
}

:deep(.ant-menu-item) {
  margin: 4px 0;
  height: 52px;
  line-height: 52px;
  border-radius: 14px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: #64748b;
  font-weight: 500;
}

:deep(.ant-menu-item:hover) {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
  transform: translateX(4px);
}

:deep(.ant-menu-item-selected) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35);
}

:deep(.ant-menu-item-selected:hover) {
  transform: translateX(4px);
}

:deep(.ant-menu-item .anticon) {
  font-size: 18px;
}

.menu-icon {
  font-size: 18px;
  transition: transform 0.25s ease;
}

:deep(.ant-menu-item:hover .menu-icon) {
  transform: scale(1.1);
}

.menu-label {
  font-size: 15px;
  font-weight: 500;
}

/* 侧边栏底部 */
.sider-footer {
  padding: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(248, 250, 252, 0.5);
}

.sider-footer.collapsed {
  padding: 12px 8px;
}

.footer-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.version {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.copyright {
  font-size: 11px;
  color: #cbd5e1;
}

/* ==================== 主布局样式 ==================== */
.main-layout {
  margin-left: 260px;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: #f5f7fa;
  min-height: 100vh;
}

.main-layout.sider-collapsed {
  margin-left: 80px;
}

/* ==================== Header样式 ==================== */
.app-header {
  background: #ffffff;
  padding: 0 32px;
  height: 72px;
  line-height: 72px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.25s ease;
}

.collapse-btn:hover {
  background: #f1f5f9;
  transform: scale(1.05);
}

.collapse-icon {
  font-size: 18px;
  color: #64748b;
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-page {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-search {
  transition: all 0.3s ease;
}

.header-search.active {
  width: 220px;
}

.search-input {
  border-radius: 10px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 18px;
  color: #64748b;
  transition: all 0.25s ease;
}

.icon-btn:hover {
  background: #f1f5f9;
  color: #475569;
}

.user-avatar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 6px;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.user-avatar:hover {
  background: #f1f5f9;
}

.avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

/* ==================== 内容区域样式 ==================== */
.app-content {
  padding: 24px;
  min-height: calc(100vh - 72px);
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

/* ==================== 过渡动画 ==================== */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: all 0.25s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* ==================== 滚动条样式 ==================== */
:deep(.ant-layout-sider-children) {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

:deep(.ant-layout-sider-children::-webkit-scrollbar) {
  width: 4px;
}

:deep(.ant-layout-sider-children::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.ant-layout-sider-children::-webkit-scrollbar-thumb) {
  background: #cbd5e1;
  border-radius: 2px;
}

:deep(.ant-layout-sider-children::-webkit-scrollbar-thumb:hover) {
  background: #94a3b8;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 992px) {
  .main-layout {
    margin-left: 80px;
  }

  .app-sider {
    width: 80px !important;
    min-width: 80px !important;
    max-width: 80px !important;
  }

  .logo-text {
    display: none;
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
  }

  .app-content {
    padding: 16px;
  }

  .user-name {
    display: none;
  }

  .header-search.active {
    width: 160px;
  }
}
</style>
