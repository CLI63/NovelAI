<script setup>
/**
 * 通用空状态组件
 * 用于显示空列表、无数据等状态
 * 支持自定义图标、描述和操作按钮
 */
import { PlusOutlined, FileTextOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'

const props = defineProps({
  description: {
    type: String,
    default: '暂无数据',
  },
  image: {
    type: String,
    default: '',
  },
  buttonText: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'default', // default, search, create, error
  },
  icon: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['action'])

const handleAction = () => {
  emit('action')
}

// 根据类型获取图标
const defaultIcon = computed(() => {
  switch (props.type) {
    case 'search':
      return SearchOutlined
    case 'create':
      return PlusOutlined
    default:
      return FileTextOutlined
  }
})

// 根据类型获取颜色主题
const themeClass = computed(() => {
  return `theme-${props.type}`
})
</script>

<template>
  <div class="empty-state" :class="themeClass">
    <div class="empty-content">
      <!-- 自定义图标或默认图标 -->
      <div class="empty-icon-wrapper">
        <div class="empty-icon-bg">
          <component
            :is="defaultIcon"
            v-if="!icon && !image"
            class="empty-icon"
          />
          <span v-else-if="icon" class="empty-icon-emoji">{{ icon }}</span>
        </div>
        <!-- 装饰元素 -->
        <div class="empty-decoration">
          <span class="deco deco-1"></span>
          <span class="deco deco-2"></span>
          <span class="deco deco-3"></span>
        </div>
      </div>

      <!-- 描述文字 -->
      <div class="empty-text">
        <p class="empty-description">{{ description }}</p>
      </div>

      <!-- 操作按钮 -->
      <div v-if="buttonText" class="empty-action">
        <a-button type="primary" size="large" @click="handleAction">
          <template #icon>
            <PlusOutlined />
          </template>
          {{ buttonText }}
        </a-button>
      </div>

      <!-- 自定义插槽 -->
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  padding: var(--spacing-xxl) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 320px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
  max-width: 320px;
  text-align: center;
}

/* 图标容器 */
.empty-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon-bg {
  width: 100px;
  height: 100px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

.theme-default .empty-icon-bg {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.theme-search .empty-icon-bg {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
}

.theme-create .empty-icon-bg {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
}

.theme-error .empty-icon-bg {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
}

.empty-icon {
  font-size: 42px;
  color: var(--text-muted);
}

.theme-default .empty-icon {
  color: #667eea;
}

.theme-search .empty-icon {
  color: #3b82f6;
}

.theme-create .empty-icon {
  color: #10b981;
}

.theme-error .empty-icon {
  color: #ef4444;
}

.empty-icon-emoji {
  font-size: 48px;
}

/* 装饰元素 */
.empty-decoration {
  position: absolute;
  inset: -10px;
  pointer-events: none;
}

.deco {
  position: absolute;
  border-radius: 50%;
  opacity: 0.4;
  animation: float 3s ease-in-out infinite;
}

.deco-1 {
  width: 12px;
  height: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  top: 0;
  right: 20px;
  animation-delay: 0s;
}

.deco-2 {
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  bottom: 10px;
  left: 10px;
  animation-delay: 1s;
}

.deco-3 {
  width: 6px;
  height: 6px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  top: 20px;
  left: 0;
  animation-delay: 2s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.1);
  }
}

/* 文字描述 */
.empty-text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.empty-description {
  margin: 0;
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 操作按钮 */
.empty-action {
  margin-top: var(--spacing-sm);
}

.empty-action :deep(.ant-btn) {
  height: 44px;
  padding: 0 28px;
  border-radius: 12px;
  font-weight: 500;
  font-size: 15px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.25s ease;
}

.empty-action :deep(.ant-btn:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .empty-state {
    min-height: 240px;
    padding: var(--spacing-xl) var(--spacing-md);
  }

  .empty-icon-bg {
    width: 80px;
    height: 80px;
  }

  .empty-icon {
    font-size: 36px;
  }

  .empty-icon-emoji {
    font-size: 40px;
  }

  .empty-description {
    font-size: 14px;
  }
}
</style>
