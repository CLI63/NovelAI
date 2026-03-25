<script setup>
/**
 * 通用页面头部组件
 * 用于统一各页面的标题、副标题和操作按钮区域
 */
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
})

const emit = defineEmits(['back'])

const handleBack = () => {
  emit('back')
}
</script>

<template>
  <div class="page-header">
    <div class="header-left">
      <a-button v-if="showBack" type="text" class="back-btn" @click="handleBack">
        <template #icon>
          <span class="back-icon">←</span>
        </template>
      </a-button>
      <div v-if="icon" class="header-icon">{{ icon }}</div>
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
  padding: var(--spacing-lg);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: var(--transition-fast);
}

.back-btn:hover {
  background: var(--bg-tertiary);
}

.back-icon {
  font-size: 18px;
  color: var(--text-secondary);
}

.header-icon {
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}
</style>
