<script setup>
import { ref, nextTick, watch } from 'vue'

/**
 * 流式输出组件
 * 用于实时显示AI流式生成的内容
 */
const props = defineProps({
  content: {
    type: String,
    default: '',
  },
  reasoning: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  generating: {
    type: Boolean,
    default: false,
  },
  minWords: {
    type: Number,
    default: 2000,
  },
})

const emit = defineEmits(['stop', 'save'])

const textareaRef = ref(null)
const reasoningRef = ref(null)

// 当前字数
const wordCount = ref(0)
// 思考过程字数
const reasoningWordCount = ref(0)
// 是否显示思考过程
const showReasoning = ref(false)

// 监听内容变化，更新字数并滚动到底部
watch(
  () => props.content,
  (newContent) => {
    wordCount.value = newContent.length
    scrollToBottom()
  }
)

// 监听思考过程变化
watch(
  () => props.reasoning,
  (newReasoning) => {
    reasoningWordCount.value = newReasoning.length
    // 如果有思考过程，自动展开显示
    if (newReasoning && !showReasoning.value) {
      showReasoning.value = true
    }
    scrollToReasoningBottom()
  }
)

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (textareaRef.value) {
      const textarea = textareaRef.value.$el?.querySelector('textarea') || textareaRef.value
      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight
      }
    }
  })
}

// 滚动思考过程到底部
const scrollToReasoningBottom = () => {
  nextTick(() => {
    if (reasoningRef.value) {
      const textarea = reasoningRef.value.$el?.querySelector('textarea') || reasoningRef.value
      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight
      }
    }
  })
}

// 切换思考过程显示
const toggleReasoning = () => {
  showReasoning.value = !showReasoning.value
}

// 停止生成
const handleStop = () => {
  emit('stop')
}

// 保存章节
const handleSave = () => {
  emit('save')
}

// 字数是否达标
const isWordCountMet = () => {
  return wordCount.value >= props.minWords
}
</script>

<template>
  <div class="stream-output">
    <!-- 思考过程区域（可折叠） -->
    <div v-if="reasoning" class="reasoning-section">
      <div class="reasoning-header" @click="toggleReasoning">
        <span class="reasoning-title">
          🧠 AI思考过程
          <span class="reasoning-word-count">({{ reasoningWordCount.toLocaleString() }}字)</span>
        </span>
        <span class="toggle-icon">{{ showReasoning ? '▼' : '▶' }}</span>
      </div>
      <div v-show="showReasoning" class="reasoning-content">
        <a-textarea
          ref="reasoningRef"
          :value="reasoning"
          :auto-size="{ minRows: 5, maxRows: 15 }"
          readonly
          class="reasoning-textarea"
          placeholder="AI的思考过程将在这里显示..."
        />
      </div>
    </div>

    <!-- 标题区域 -->
    <div v-if="title" class="output-header">
      <h3 class="output-title">{{ title }}</h3>
    </div>

    <!-- 内容区域 -->
    <div class="output-content">
      <a-textarea
        ref="textareaRef"
        :value="content"
        :auto-size="{ minRows: 15, maxRows: 30 }"
        readonly
        class="content-textarea"
        :placeholder="generating && !content ? 'AI正在思考中，请稍候...' : '生成的内容将在这里显示...'"
      />
    </div>

    <!-- 状态栏 -->
    <div class="output-footer">
      <div class="status-info">
        <span class="word-count" :class="{ warning: !isWordCountMet() && !generating }">
          字数：{{ wordCount.toLocaleString() }}
          <template v-if="minWords">
            / {{ minWords.toLocaleString() }}
          </template>
        </span>
        <a-tag v-if="generating" color="processing">
          <template #icon>
            <span class="loading-icon">⏳</span>
          </template>
          {{ reasoning && !content ? '思考中...' : '生成中...' }}
        </a-tag>
        <a-tag v-else-if="content" color="success">
          生成完成
        </a-tag>
      </div>

      <div class="action-buttons">
        <a-button
          v-if="generating"
          type="primary"
          danger
          @click="handleStop"
        >
          停止生成
        </a-button>
        <a-button
          v-else-if="content"
          type="primary"
          @click="handleSave"
        >
          保存章节
        </a-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stream-output {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

/* 思考过程区域样式 */
.reasoning-section {
  background: linear-gradient(135deg, #f0f4ff 0%, #fff5f5 100%);
  border-radius: var(--radius-sm);
  border: 1px solid #e0e7ff;
  overflow: hidden;
}

.reasoning-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.reasoning-header:hover {
  background: rgba(102, 126, 234, 0.1);
}

.reasoning-title {
  font-size: 14px;
  font-weight: 500;
  color: #667eea;
}

.reasoning-word-count {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.toggle-icon {
  font-size: 12px;
  color: #667eea;
  transition: transform 0.2s;
}

.reasoning-content {
  padding: 0 16px 16px;
}

.reasoning-textarea {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 13px;
  line-height: 1.6;
}

.reasoning-textarea :deep(textarea) {
  background: rgba(255, 255, 255, 0.8) !important;
  border-color: #e0e7ff !important;
  color: #6b7280 !important;
}

.output-header {
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.output-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.output-content {
  flex: 1;
}

.content-textarea {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 15px;
  line-height: 1.8;
}

.content-textarea :deep(textarea) {
  background: var(--bg-secondary) !important;
  border-color: var(--border-color) !important;
}

.output-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.status-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.word-count {
  font-size: 14px;
  color: var(--text-secondary);
}

.word-count.warning {
  color: var(--color-warning);
  font-weight: 500;
}

.loading-icon {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.action-buttons {
  display: flex;
  gap: var(--spacing-sm);
}
</style>
