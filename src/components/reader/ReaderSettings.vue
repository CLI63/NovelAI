<script setup>
import { computed } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update', 'close'])

const fontSizeOptions = [
  { label: '小', value: 14 },
  { label: '中', value: 18 },
  { label: '大', value: 22 },
  { label: '特大', value: 26 }
]

const lineHeightOptions = [
  { label: '紧凑', value: 1.6 },
  { label: '标准', value: 2 },
  { label: '宽松', value: 2.4 }
]

const themeOptions = [
  { label: '明亮', value: 'light', icon: '☀️' },
  { label: '护眼', value: 'sepia', icon: '📖' },
  { label: '暗黑', value: 'dark', icon: '🌙' }
]

const fontOptions = [
  { label: '宋体', value: 'serif' },
  { label: '黑体', value: 'sans-serif' }
]

const widthOptions = [
  { label: '窄', value: 'narrow' },
  { label: '中', value: 'medium' },
  { label: '宽', value: 'wide' }
]

const updateSetting = (key, value) => {
  emit('update', { [key]: value })
}

const handleClose = () => {
  emit('close')
}

const currentFontSize = computed(() => props.settings.fontSize)
const currentLineHeight = computed(() => props.settings.lineHeight)
const currentTheme = computed(() => props.settings.theme)
const currentFont = computed(() => props.settings.fontFamily)
const currentWidth = computed(() => props.settings.width)
</script>

<template>
  <div class="reader-settings">
    <div class="settings-header">
      <span class="settings-title">阅读设置</span>
      <a-button type="text" size="small" class="close-btn" @click="handleClose">
        <template #icon><span>✕</span></template>
      </a-button>
    </div>

    <div class="settings-content">
      <!-- 字体大小 -->
      <div class="setting-group">
        <label class="setting-label">字体大小</label>
        <div class="setting-options">
          <a-button
            v-for="opt in fontSizeOptions"
            :key="opt.value"
            :type="currentFontSize === opt.value ? 'primary' : 'default'"
            size="small"
            @click="updateSetting('fontSize', opt.value)"
          >
            {{ opt.label }}
          </a-button>
        </div>
      </div>

      <!-- 行间距 -->
      <div class="setting-group">
        <label class="setting-label">行间距</label>
        <div class="setting-options">
          <a-button
            v-for="opt in lineHeightOptions"
            :key="opt.value"
            :type="currentLineHeight === opt.value ? 'primary' : 'default'"
            size="small"
            @click="updateSetting('lineHeight', opt.value)"
          >
            {{ opt.label }}
          </a-button>
        </div>
      </div>

      <!-- 主题 -->
      <div class="setting-group">
        <label class="setting-label">主题</label>
        <div class="setting-options theme-options">
          <div
            v-for="opt in themeOptions"
            :key="opt.value"
            class="theme-btn"
            :class="{ active: currentTheme === opt.value }"
            @click="updateSetting('theme', opt.value)"
          >
            <span class="theme-icon">{{ opt.icon }}</span>
            <span class="theme-label">{{ opt.label }}</span>
          </div>
        </div>
      </div>

      <!-- 字体 -->
      <div class="setting-group">
        <label class="setting-label">字体</label>
        <div class="setting-options">
          <a-button
            v-for="opt in fontOptions"
            :key="opt.value"
            :type="currentFont === opt.value ? 'primary' : 'default'"
            size="small"
            @click="updateSetting('fontFamily', opt.value)"
          >
            {{ opt.label }}
          </a-button>
        </div>
      </div>

      <!-- 内容宽度 -->
      <div class="setting-group">
        <label class="setting-label">页面宽度</label>
        <div class="setting-options">
          <a-button
            v-for="opt in widthOptions"
            :key="opt.value"
            :type="currentWidth === opt.value ? 'primary' : 'default'"
            size="small"
            @click="updateSetting('width', opt.value)"
          >
            {{ opt.label }}
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reader-settings {
  width: 300px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.settings-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
}

.settings-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  color: var(--text-secondary);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.setting-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.theme-options {
  display: flex;
  gap: 12px;
}

.theme-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid var(--border-color);
  transition: all 0.2s ease;
  flex: 1;
}

.theme-btn:hover {
  border-color: var(--ant-primary);
}

.theme-btn.active {
  border-color: var(--ant-primary);
  background: var(--bg-secondary);
}

.theme-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.theme-label {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
