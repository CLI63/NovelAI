<script setup>
/**
 * 通用空状态组件
 * 用于显示空列表、无数据等状态
 */
defineProps({
  description: {
    type: String,
    default: '暂无数据',
  },
  image: {
    type: String,
    default: 'https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg',
  },
  buttonText: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['action'])

const handleAction = () => {
  emit('action')
}
</script>

<template>
  <div class="empty-state">
    <a-empty :image="image" :description="description">
      <template v-if="buttonText" #footer>
        <a-button type="primary" @click="handleAction">
          {{ buttonText }}
        </a-button>
      </template>
      <slot></slot>
    </a-empty>
  </div>
</template>

<style scoped>
.empty-state {
  padding: var(--spacing-xl) var(--spacing-lg);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.empty-state :deep(.ant-empty-description) {
  color: var(--text-secondary);
}
</style>
