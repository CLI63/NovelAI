<script setup>
/**
 * 通用页面头部组件
 * 用于统一各页面的标题、副标题和操作按钮区域
 * 支持图标、返回按钮、操作按钮插槽
 */
import { ArrowLeftOutlined } from '@ant-design/icons-vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  showBack: {
    type: Boolean,
    default: false,
  },
  iconColor: {
    type: String,
    default: 'primary', // primary, success, warning, danger, info
  },
})

const emit = defineEmits(['back'])

const handleBack = () => {
  emit('back')
}
</script>

<template>
  <div class="page-header">
    <div class="header-left">
      <a-button
        v-if="showBack"
        type="text"
        class="back-btn"
        @click="handleBack"
      >
        <template #icon>
          <ArrowLeftOutlined class="back-icon" />
        </template>
      </a-button>

      <div v-if="icon" class="header-icon" :class="`icon-${iconColor}`">
        <span class="icon-emoji">{{ icon }}</span>
      </div>

      <div class="header-info">
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <div class="header-right">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
  padding: 20px 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 0;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.25s ease;
  flex-shrink: 0;
}

.back-btn:hover {
  background: var(--bg-tertiary);
  transform: translateX(-2px);
}

.back-icon {
  font-size: 16px;
  color: var(--text-secondary);
  transition: transform 0.25s ease;
}

.back-btn:hover .back-icon {
  transform: translateX(-2px);
}

.header-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.header-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  opacity: 0.15;
}

.header-icon.icon-primary::before {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header-icon.icon-success::before {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.header-icon.icon-warning::before {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.header-icon.icon-danger::before {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.header-icon.icon-info::before {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.icon-emoji {
  font-size: 28px;
  position: relative;
  z-index: 1;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
  line-height: 1.3;
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    padding: 16px;
    flex-wrap: wrap;
    gap: var(--spacing-md);
  }

  .header-icon {
    width: 44px;
    height: 44px;
  }

  .icon-emoji {
    font-size: 24px;
  }

  .page-title {
    font-size: 18px;
  }

  .page-subtitle {
    font-size: 13px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
