<script setup>
import { RouterView } from 'vue-router'
import { useAppStore } from './stores/app'
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const appStore = useAppStore()
const router = useRouter()
const route = useRoute()

const collapsed = ref(false)
const selectedKeys = ref(['/'])

const menuItems = computed(() => [
  {
    key: '/',
    icon: 'book',
    label: '小说列表',
  },
  {
    key: '/settings',
    icon: 'setting',
    label: '设置',
  },
])

const handleMenuClick = ({ key }) => {
  router.push(key)
}

watch(
  route,
  (newRoute) => {
    selectedKeys.value = [newRoute.path]
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
      :width="240"
      :collapsed-width="80"
      class="app-sider"
    >
      <!-- Logo区域 -->
      <div class="logo-container">
        <div class="logo-icon">📖</div>
        <span v-if="!collapsed" class="logo-text">AI小说生成器</span>
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
        <a-menu-item key="/">
          <template #icon>
            <span class="menu-icon">📚</span>
          </template>
          <span class="menu-label">小说列表</span>
        </a-menu-item>
        <a-menu-item key="/settings">
          <template #icon>
            <span class="menu-icon">⚙️</span>
          </template>
          <span class="menu-label">设置</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <!-- 主内容区 -->
    <a-layout class="main-layout">
      <!-- 顶部导航栏 -->
      <a-layout-header class="app-header">
        <div class="header-content">
          <a-button type="text" class="collapse-btn" @click="collapsed = !collapsed">
            <template #icon>
              <span class="collapse-icon">☰</span>
            </template>
          </a-button>
          <div class="header-title">
            <span class="title-text">AI驱动的智能小说创作平台</span>
          </div>
        </div>
      </a-layout-header>

      <!-- 内容区域 -->
      <a-layout-content class="app-content">
        <div class="content-wrapper">
          <RouterView />
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-sider {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.06);
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  z-index: 1000;
  border-right: 1px solid #e2e8f0;
}

.logo-container {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.logo-icon {
  font-size: 28px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.logo-text {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.app-menu {
  border: none;
  background: transparent;
  padding: 12px 8px;
}

:deep(.ant-menu-item) {
  margin: 6px 0;
  height: 48px;
  line-height: 48px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #64748b;
}

:deep(.ant-menu-item:hover) {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
  transform: translateX(4px);
}

:deep(.ant-menu-item-selected) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}

:deep(.ant-menu-item-selected:hover) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #ffffff !important;
  transform: translateX(4px);
}

.menu-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-label {
  font-size: 14px;
  font-weight: 500;
}

.main-layout {
  margin-left: 240px;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: #f8fafc;
  min-height: 100vh;
}

:deep(.ant-layout-sider-collapsed) ~ .main-layout {
  margin-left: 80px;
}

.app-header {
  background: #ffffff;
  padding: 0 24px;
  height: 72px;
  line-height: 72px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.collapse-btn {
  font-size: 18px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.collapse-btn:hover {
  background: #f1f5f9;
  transform: scale(1.05);
}

.collapse-icon {
  color: #64748b;
  font-weight: 600;
}

.header-title {
  display: flex;
  align-items: center;
}

.title-text {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.app-content {
  padding: 24px;
  min-height: calc(100vh - 72px);
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

/* 滚动条样式 */
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
</style>
