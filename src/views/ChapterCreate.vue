<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useNovel, useNovelStats } from '@/composables/useNovel'
import { useChapter } from '@/composables/useChapter'
import { useAI } from '@/composables/useAI'
import { useGenerationQueue } from '@/composables/useGenerationQueue'
import { useQualityCheck } from '@/composables/useQualityCheck'
import {
  buildStreamChapterPrompt,
  buildChapterSummaryPrompt,
  buildChapterOutlinePrompt,
  buildChapterFromOutlinePrompt
} from '@/utils/prompts'
import { buildChapterContext } from '@/utils/contextBuilder'
import { createSmartBatchTask, executeBatchTask, getStrategyInfo } from '@/utils/batchGenerator'
import PageHeader from '@/components/common/PageHeader.vue'
import StreamOutput from '@/components/chapter/StreamOutput.vue'

const router = useRouter()
const route = useRoute()

const { novel, loading: novelLoading, loadNovel } = useNovel()
const { chapters, loadChapters, getRecentChapters, getChapterSummaries, createChapter, nextChapterNumber } = useChapter()
const { generateStream, generate, checkApiKey } = useAI()

// 生成任务队列
const {
  tasks,
  runningTask,
  loadTasks,
  createTask,
  updateTask,
  startTask,
  pauseTask,
  resumeTask
} = useGenerationQueue()

// 质量检测
const { runQualityCheck, getQualitySummary } = useQualityCheck()

// 配置
const minWords = ref(2000)
const maxWords = ref(3000)
const customPrompt = ref('')

// 生成模式：single（单章）或 batch（批量）
const generateMode = ref('single')
const batchCount = ref(5)  // 批量生成章节数

// 大纲预生成模式
const outlineMode = ref(true)  // 默认开启大纲预生成
const chapterOutline = ref(null)
const outlineGenerating = ref(false)
const outlineStep = ref(0)  // 0: 未开始, 1: 大纲已生成, 2: 用户确认/修改后

// 流式生成状态
const streamMode = ref(true)
const streamContent = ref('')
const streamReasoning = ref('')  // 思考过程
const streamTitle = ref('')
const streamGenerating = ref(false)
const stopStream = ref(false)
const showReasoning = ref(false)  // 是否显示思考过程

// 批量生成状态
const batchGenerating = ref(false)
const batchProgress = ref(0)
const batchCurrentChapter = ref(0)
const batchResults = ref([])
const batchPaused = ref(false)

// 统计
const { progress } = useNovelStats(novel, chapters)

// 加载数据
const loadData = async () => {
  const id = parseInt(route.params.id)
  await loadNovel(id)
  if (novel.value) {
    await loadChapters(novel.value.id)
    minWords.value = parseInt(novel.value.chapterStructure.minWordsPerChapter) || 2000
    maxWords.value = parseInt(novel.value.chapterStructure.maxWordsPerChapter) || 3000
  }
}

// 生成章节大纲
const handleGenerateOutline = async () => {
  if (!checkApiKey()) return

  outlineGenerating.value = true
  chapterOutline.value = null

  try {
    const recentChapters = await getRecentChapters(novel.value.id, 3)
    const chapterSummaries = await getChapterSummaries(novel.value.id, 100)
    
    // 构建增强上下文
    const enhancedContext = await buildChapterContext(novel.value.id, nextChapterNumber.value, {
      recentChapterCount: 3,
      summaryLimit: 50,
      includeCharacterStatus: true,
      includeForeshadowing: true,
      includeTimeline: true
    })

    const messages = buildChapterOutlinePrompt(
      novel.value,
      recentChapters,
      chapterSummaries,
      nextChapterNumber.value,
      enhancedContext
    )

    if (customPrompt.value.trim()) {
      messages.push({
        role: 'user',
        content: `额外要求：${customPrompt.value}`,
      })
    }

    const response = await generate(messages)
    
    // 解析JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      chapterOutline.value = JSON.parse(jsonMatch[0])
      outlineStep.value = 1
      message.success('大纲生成完成！请确认或修改后生成正文')
    } else {
      message.error('大纲解析失败，请重试')
    }
  } catch (error) {
    message.error('生成大纲失败：' + error.message)
  } finally {
    outlineGenerating.value = false
  }
}

// 重新生成大纲
const handleRegenerateOutline = () => {
  handleGenerateOutline()
}

// 确认大纲并生成正文
const handleConfirmOutline = () => {
  outlineStep.value = 2
  // 自动开始生成正文
  handleStreamGenerateWithOutline()
}

// 修改大纲字段
const updateOutlineField = (field, value) => {
  if (chapterOutline.value) {
    chapterOutline.value[field] = value
  }
}

// 流式生成章节（直接生成，无大纲）
const handleStreamGenerate = async () => {
  if (!checkApiKey()) return

  streamGenerating.value = true
  streamContent.value = ''
  streamReasoning.value = ''
  streamTitle.value = ''
  stopStream.value = false

  // 内容缓冲区
  let contentBuffer = ''
  let contentTimer = null

  // 思考过程缓冲区
  let reasoningBuffer = ''
  let reasoningTimer = null

  const flushContentBuffer = () => {
    if (contentBuffer) {
      streamContent.value += contentBuffer
      contentBuffer = ''
    }
    contentTimer = null
  }

  const flushReasoningBuffer = () => {
    if (reasoningBuffer) {
      streamReasoning.value += reasoningBuffer
      reasoningBuffer = ''
    }
    reasoningTimer = null
  }

  const addToContentBuffer = (chunk) => {
    if (stopStream.value) {
      throw new Error('用户停止生成')
    }
    contentBuffer += chunk
    if (!contentTimer) {
      contentTimer = setTimeout(flushContentBuffer, 50)
    }
  }

  const addToReasoningBuffer = (chunk) => {
    if (stopStream.value) {
      throw new Error('用户停止生成')
    }
    reasoningBuffer += chunk
    if (!reasoningTimer) {
      reasoningTimer = setTimeout(flushReasoningBuffer, 100)
    }
  }

  try {
    const recentChapters = await getRecentChapters(novel.value.id, 3)
    const chapterSummaries = await getChapterSummaries(novel.value.id, 100)
    
    // 构建增强上下文
    const enhancedContext = await buildChapterContext(novel.value.id, nextChapterNumber.value, {
      recentChapterCount: 3,
      summaryLimit: 50,
      includeCharacterStatus: true,
      includeForeshadowing: true,
      includeTimeline: true
    })

    const messages = buildStreamChapterPrompt(
      novel.value,
      recentChapters,
      chapterSummaries,
      minWords.value,
      maxWords.value,
      nextChapterNumber.value,
      enhancedContext
    )

    if (customPrompt.value.trim()) {
      messages.push({
        role: 'user',
        content: `额外要求：${customPrompt.value}`,
      })
    }

    await generateStream(messages, addToContentBuffer, {
      onReasoning: addToReasoningBuffer
    })

    // 确保缓冲内容更新
    if (contentTimer) {
      clearTimeout(contentTimer)
      flushContentBuffer()
    }
    if (reasoningTimer) {
      clearTimeout(reasoningTimer)
      flushReasoningBuffer()
    }

    // 解析标题和内容
    const lines = streamContent.value.split('\n')
    if (lines.length > 0) {
      streamTitle.value = lines[0].trim()
      streamContent.value = lines.slice(1).join('\n').trim()
    }

    if (!stopStream.value) {
      message.success('章节生成完成！')
    }
  } catch (error) {
    if (contentTimer) {
      clearTimeout(contentTimer)
      flushContentBuffer()
    }
    if (reasoningTimer) {
      clearTimeout(reasoningTimer)
      flushReasoningBuffer()
    }
    if (stopStream.value) {
      message.info('已停止生成')
    } else {
      message.error('生成失败：' + error.message)
    }
  } finally {
    streamGenerating.value = false
    stopStream.value = false
  }
}

// 基于大纲流式生成章节
const handleStreamGenerateWithOutline = async () => {
  if (!checkApiKey() || !chapterOutline.value) return

  streamGenerating.value = true
  streamContent.value = ''
  streamReasoning.value = ''
  streamTitle.value = ''
  stopStream.value = false

  let contentBuffer = ''
  let contentTimer = null
  let reasoningBuffer = ''
  let reasoningTimer = null

  const flushContentBuffer = () => {
    if (contentBuffer) {
      streamContent.value += contentBuffer
      contentBuffer = ''
    }
    contentTimer = null
  }

  const flushReasoningBuffer = () => {
    if (reasoningBuffer) {
      streamReasoning.value += reasoningBuffer
      reasoningBuffer = ''
    }
    reasoningTimer = null
  }

  const addToContentBuffer = (chunk) => {
    if (stopStream.value) throw new Error('用户停止生成')
    contentBuffer += chunk
    if (!contentTimer) contentTimer = setTimeout(flushContentBuffer, 50)
  }

  const addToReasoningBuffer = (chunk) => {
    if (stopStream.value) throw new Error('用户停止生成')
    reasoningBuffer += chunk
    if (!reasoningTimer) reasoningTimer = setTimeout(flushReasoningBuffer, 100)
  }

  try {
    const recentChapters = await getRecentChapters(novel.value.id, 3)
    
    // 构建增强上下文
    const enhancedContext = await buildChapterContext(novel.value.id, nextChapterNumber.value, {
      recentChapterCount: 3,
      summaryLimit: 50,
      includeCharacterStatus: true,
      includeForeshadowing: true,
      includeTimeline: true
    })

    const messages = buildChapterFromOutlinePrompt(
      novel.value,
      chapterOutline.value,
      recentChapters,
      minWords.value,
      maxWords.value,
      nextChapterNumber.value,
      enhancedContext
    )

    await generateStream(messages, addToContentBuffer, {
      onReasoning: addToReasoningBuffer
    })

    if (contentTimer) {
      clearTimeout(contentTimer)
      flushContentBuffer()
    }
    if (reasoningTimer) {
      clearTimeout(reasoningTimer)
      flushReasoningBuffer()
    }

    const lines = streamContent.value.split('\n')
    if (lines.length > 0) {
      streamTitle.value = lines[0].trim()
      streamContent.value = lines.slice(1).join('\n').trim()
    }

    if (!stopStream.value) {
      message.success('章节生成完成！')
    }
  } catch (error) {
    if (contentTimer) {
      clearTimeout(contentTimer)
      flushContentBuffer()
    }
    if (reasoningTimer) {
      clearTimeout(reasoningTimer)
      flushReasoningBuffer()
    }
    if (stopStream.value) {
      message.info('已停止生成')
    } else {
      message.error('生成失败：' + error.message)
    }
  } finally {
    streamGenerating.value = false
    stopStream.value = false
  }
}

// 停止生成
const handleStopStream = () => {
  stopStream.value = true
}

// 生成章节总结
const generateSummary = async (content) => {
  const messages = buildChapterSummaryPrompt(content)
  const response = await generate(messages)
  if (response) {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return result.summary || ''
    }
  }
  return content.slice(0, 200) + '...'
}

// 保存流式生成的章节
const handleSaveStreamChapter = async () => {
  if (!streamContent.value || streamContent.value.length < minWords.value) {
    Modal.confirm({
      title: '⚠️ 字数不足提示',
      content: `当前章节字数（${streamContent.value.length}字）不足 ${minWords.value} 字，是否仍要保存？`,
      okText: '确认保存',
      cancelText: '取消',
      onOk: () => doSaveStreamChapter(),
    })
    return
  }
  await doSaveStreamChapter()
}

// 执行保存
const doSaveStreamChapter = async () => {
  message.loading({ content: '正在生成章节总结...', key: 'saving' })

  // 生成总结
  let summary = ''
  try {
    summary = await generateSummary(streamContent.value)
  } catch (e) {
    summary = streamContent.value.slice(0, 200) + '...'
  }

  const chapterData = {
    novelId: novel.value.id,
    chapterNumber: nextChapterNumber.value,
    title: streamTitle.value || `第${nextChapterNumber.value}章`,
    content: streamContent.value,
    summary: summary,
    wordCount: streamContent.value.length,
  }

  const id = await createChapter(chapterData)
  if (id) {
    message.success({ content: '章节保存成功！', key: 'saving' })
    router.push(`/novel/${novel.value.id}/chapter/${nextChapterNumber.value}`)
  }
}

// ============ 批量生成功能 ============

// 获取批量生成策略信息
const batchStrategyInfo = computed(() => {
  if (!novel.value || generateMode.value !== 'batch') return null
  
  const totalChapters = novel.value.chapterStructure?.totalChapters || 100
  const startChapter = nextChapterNumber.value
  const endChapter = Math.min(startChapter + batchCount.value - 1, totalChapters)
  
  const strategies = []
  for (let i = startChapter; i <= endChapter; i++) {
    const progress = (i - 1) / totalChapters
    const strategy = getStrategyInfo(progress, totalChapters)
    strategies.push({
      chapter: i,
      strategy: strategy.name,
      wordRange: strategy.wordRange,
      description: strategy.description
    })
  }
  return strategies
})

// 批量生成章节
const handleBatchGenerate = async () => {
  if (!checkApiKey()) return
  
  batchGenerating.value = true
  batchProgress.value = 0
  batchCurrentChapter.value = 0
  batchResults.value = []
  batchPaused.value = false
  
  const totalChapters = novel.value.chapterStructure?.totalChapters || 100
  const startChapter = nextChapterNumber.value
  const endChapter = Math.min(startChapter + batchCount.value - 1, totalChapters)
  const totalToGenerate = endChapter - startChapter + 1
  
  // 创建任务
  const chaptersToGenerate = []
  for (let i = startChapter; i <= endChapter; i++) {
    chaptersToGenerate.push({
      number: i,
      status: 'pending',
      content: '',
      title: '',
      summary: '',
      wordCount: 0
    })
  }
  
  const taskData = {
    novelId: novel.value.id,
    type: 'batch',
    status: 'running',
    chapters: chaptersToGenerate,
    progress: 0,
    options: {
      minWords: minWords.value,
      maxWords: maxWords.value,
      useOutline: outlineMode.value,
      autoSave: true
    }
  }
  
  const taskId = await createTask(taskData)
  
  try {
    for (let i = startChapter; i <= endChapter && !batchPaused.value; i++) {
      batchCurrentChapter.value = i
      
      // 更新任务状态
      await updateTask(taskId, {
        currentChapter: i,
        chapters: taskData.chapters.map((c, idx) =>
          idx === i - startChapter ? { ...c, status: 'generating' } : c
        )
      })
      
      // 获取策略
      const progress = (i - 1) / totalChapters
      const strategy = getStrategyInfo(progress, totalChapters)
      
      // 生成章节
      const chapterNum = i
      const chapterStartChapter = nextChapterNumber.value
      
      // 构建上下文
      const recentChapters = await getRecentChapters(novel.value.id, 3)
      const chapterSummaries = await getChapterSummaries(novel.value.id, 100)
      const enhancedContext = await buildChapterContext(novel.value.id, chapterNum, {
        recentChapterCount: 3,
        summaryLimit: 50,
        includeCharacterStatus: true,
        includeForeshadowing: true,
        includeTimeline: true
      })
      
      // 生成内容
      let content = ''
      let title = `第${chapterNum}章`
      let summary = ''
      
      try {
        const messages = buildStreamChapterPrompt(
          novel.value,
          recentChapters,
          chapterSummaries,
          strategy.wordRange[0],
          strategy.wordRange[1],
          chapterNum,
          enhancedContext
        )
        
        content = await generate(messages)
        
        // 解析标题和内容
        const lines = content.split('\n')
        if (lines.length > 0) {
          title = lines[0].trim()
          content = lines.slice(1).join('\n').trim()
        }
        
        // 生成总结
        try {
          summary = await generateSummary(content)
        } catch (e) {
          summary = content.slice(0, 200) + '...'
        }
        
        // 质量检测
        const qualityResult = await runQualityCheck(
          { content, title, chapterNumber: chapterNum },
          { minWords: strategy.wordRange[0], existingChapters: chapters.value }
        )
        
        // 保存章节
        const chapterData = {
          novelId: novel.value.id,
          chapterNumber: chapterNum,
          title,
          content,
          summary,
          wordCount: content.length
        }
        
        await createChapter(chapterData)
        
        batchResults.value.push({
          chapter: chapterNum,
          success: true,
          title,
          wordCount: content.length,
          quality: qualityResult
        })
        
        // 更新任务进度
        taskData.chapters[i - startChapter] = {
          number: chapterNum,
          status: 'completed',
          content,
          title,
          summary,
          wordCount: content.length
        }
        
      } catch (error) {
        batchResults.value.push({
          chapter: chapterNum,
          success: false,
          error: error.message
        })
        
        taskData.chapters[i - startChapter] = {
          number: chapterNum,
          status: 'failed',
          error: error.message
        }
      }
      
      batchProgress.value = Math.round(((i - startChapter + 1) / totalToGenerate) * 100)
      
      await updateTask(taskId, {
        progress: batchProgress.value,
        chapters: taskData.chapters
      })
      
      // 重新加载章节列表
      await loadChapters(novel.value.id)
    }
    
    // 任务完成
    await updateTask(taskId, {
      status: batchPaused.value ? 'paused' : 'completed',
      progress: 100,
      completedAt: new Date().toISOString()
    })
    
    if (!batchPaused.value) {
      message.success(`批量生成完成！共生成 ${batchResults.value.filter(r => r.success).length} 章`)
    }
    
  } catch (error) {
    message.error('批量生成失败：' + error.message)
    await updateTask(taskId, {
      status: 'failed',
      error: error.message
    })
  } finally {
    batchGenerating.value = false
  }
}

// 暂停批量生成
const handlePauseBatch = () => {
  batchPaused.value = true
  message.info('正在暂停批量生成...')
}

// 返回
const handleBack = () => {
  router.push(`/novel/${novel.value.id}`)
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="chapter-create-page">
    <a-spin :spinning="novelLoading" size="large">
      <template v-if="novel">
        <!-- 页面头部 -->
        <PageHeader
          title="生成章节"
          :subtitle="`第 ${nextChapterNumber} 章 / 共 ${novel.chapterStructure?.totalChapters || 0} 章`"
          icon="✍️"
          show-back
          @back="handleBack"
        >
          <template #actions>
            <a-progress
              :percent="progress"
              :stroke-color="{ '0%': '#667eea', '100%': '#764ba2' }"
              style="width: 200px"
            />
          </template>
        </PageHeader>

        <!-- 配置区域 -->
        <a-card :bordered="false" class="config-card">
          <div class="config-header">
            <h3 class="config-title">📝 生成配置</h3>
          </div>
          
          <!-- 生成模式选择 -->
          <a-row :gutter="24" style="margin-bottom: 16px">
            <a-col :span="24">
              <a-form-item label="生成模式">
                <a-radio-group v-model:value="generateMode" button-style="solid">
                  <a-radio-button value="single">单章生成</a-radio-button>
                  <a-radio-button value="batch">批量生成</a-radio-button>
                </a-radio-group>
              </a-form-item>
            </a-col>
          </a-row>
          
          <!-- 批量生成配置 -->
          <template v-if="generateMode === 'batch'">
            <a-row :gutter="24" style="margin-bottom: 16px">
              <a-col :span="6">
                <a-form-item label="生成章节数">
                  <a-input-number
                    v-model:value="batchCount"
                    :min="1"
                    :max="20"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="18">
                <a-form-item label="章节范围">
                  <span class="range-info">
                    将生成第 {{ nextChapterNumber }} - {{ Math.min(nextChapterNumber + batchCount - 1, novel.chapterStructure?.totalChapters || 999) }} 章
                  </span>
                </a-form-item>
              </a-col>
            </a-row>
            
            <!-- 批量生成策略预览 -->
            <div v-if="batchStrategyInfo && batchStrategyInfo.length > 0" class="strategy-preview">
              <a-divider orientation="left">智能生成策略</a-divider>
              <a-table
                :dataSource="batchStrategyInfo"
                :columns="[
                  { title: '章节', dataIndex: 'chapter', key: 'chapter', width: 80 },
                  { title: '策略', dataIndex: 'strategy', key: 'strategy', width: 100 },
                  { title: '字数范围', dataIndex: 'wordRange', key: 'wordRange', width: 120, customRender: ({ text }) => `${text[0]}-${text[1]}字` },
                  { title: '说明', dataIndex: 'description', key: 'description' }
                ]"
                :pagination="false"
                size="small"
                row-key="chapter"
              />
            </div>
          </template>
          
          <a-row :gutter="24">
            <a-col :span="6">
              <a-form-item label="最小字数">
                <a-input-number
                  v-model:value="minWords"
                  :min="500"
                  :step="100"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="最大字数">
                <a-input-number
                  v-model:value="maxWords"
                  :min="1000"
                  :step="100"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="输出模式">
                <a-switch
                  v-model:checked="streamMode"
                  checked-children="流式"
                  un-checked-children="普通"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="大纲预生成">
                <a-switch
                  v-model:checked="outlineMode"
                  checked-children="开启"
                  un-checked-children="关闭"
                  :disabled="generateMode === 'batch'"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="自定义提示词（可选）">
            <a-textarea
              v-model:value="customPrompt"
              :rows="2"
              placeholder="输入额外要求，如：增加打斗场面、加入新角色等..."
            />
          </a-form-item>
          
          <!-- 批量生成进度 -->
          <template v-if="batchGenerating">
            <a-card class="batch-progress-card" size="small">
              <div class="batch-progress">
                <div class="progress-header">
                  <span>批量生成进度</span>
                  <span>第 {{ batchCurrentChapter }} 章 / 共 {{ batchCount }} 章</span>
                </div>
                <a-progress :percent="batchProgress" status="active" />
                <div class="batch-actions">
                  <a-button
                    type="primary"
                    danger
                    size="small"
                    @click="handlePauseBatch"
                    :disabled="batchPaused"
                  >
                    {{ batchPaused ? '正在暂停...' : '暂停生成' }}
                  </a-button>
                </div>
              </div>
            </a-card>
          </template>
          
          <!-- 批量生成结果 -->
          <template v-if="batchResults.length > 0 && !batchGenerating">
            <a-card class="batch-results-card" size="small">
              <template #title>
                <span>生成结果</span>
                <a-tag color="success">{{ batchResults.filter(r => r.success).length }} 成功</a-tag>
                <a-tag v-if="batchResults.filter(r => !r.success).length > 0" color="error">
                  {{ batchResults.filter(r => !r.success).length }} 失败
                </a-tag>
              </template>
              <div class="results-list">
                <div v-for="result in batchResults" :key="result.chapter" class="result-item">
                  <span>第 {{ result.chapter }} 章</span>
                  <a-tag v-if="result.success" color="success">{{ result.wordCount }} 字</a-tag>
                  <a-tag v-else color="error">{{ result.error }}</a-tag>
                </div>
              </div>
            </a-card>
          </template>
          
          <div class="generate-action">
            <!-- 批量生成模式 -->
            <template v-if="generateMode === 'batch'">
              <a-button
                type="primary"
                size="large"
                :loading="batchGenerating"
                :disabled="batchGenerating"
                @click="handleBatchGenerate"
              >
                {{ batchGenerating ? `生成中 (${batchProgress}%)...` : `📚 批量生成 ${batchCount} 章` }}
              </a-button>
            </template>
            
            <!-- 单章生成模式 -->
            <template v-else>
              <!-- 大纲预生成模式 -->
              <template v-if="outlineMode">
                <a-button
                  v-if="outlineStep === 0"
                  type="primary"
                  size="large"
                  :loading="outlineGenerating"
                  @click="handleGenerateOutline"
                >
                  {{ outlineGenerating ? '生成大纲中...' : '📋 生成章节大纲' }}
                </a-button>
                <a-space v-else-if="outlineStep === 1">
                  <a-button
                    type="primary"
                    size="large"
                    :loading="streamGenerating"
                    @click="handleConfirmOutline"
                  >
                    ✅ 确认大纲并生成正文
                  </a-button>
                  <a-button
                    size="large"
                    :loading="outlineGenerating"
                    @click="handleRegenerateOutline"
                  >
                    🔄 重新生成大纲
                  </a-button>
                </a-space>
                <a-button
                  v-else
                  type="primary"
                  size="large"
                  :loading="streamGenerating"
                  @click="handleStreamGenerateWithOutline"
                >
                  {{ streamGenerating ? '生成中...' : '开始生成正文' }}
                </a-button>
              </template>
              <!-- 直接生成模式 -->
              <a-button
                v-else
                type="primary"
                size="large"
                :loading="streamGenerating"
                @click="handleStreamGenerate"
              >
                {{ streamGenerating ? '生成中...' : '开始生成' }}
              </a-button>
            </template>
          </div>
        </a-card>

        <!-- 章节大纲预览 -->
        <a-card v-if="chapterOutline && outlineStep >= 1" :bordered="false" class="outline-card">
          <div class="outline-header">
            <h3 class="outline-title">📋 章节大纲</h3>
            <a-tag color="blue">第 {{ nextChapterNumber }} 章</a-tag>
          </div>
          
          <div class="outline-content">
            <a-form layout="vertical">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="章节标题">
                    <a-input
                      v-model:value="chapterOutline.title"
                      placeholder="章节标题"
                      @change="updateOutlineField('title', chapterOutline.title)"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="章节概要">
                    <a-input
                      v-model:value="chapterOutline.summary"
                      placeholder="章节概要"
                      @change="updateOutlineField('summary', chapterOutline.summary)"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <!-- 场景安排 -->
              <a-divider orientation="left">场景安排</a-divider>
              <div v-if="chapterOutline.scenes && chapterOutline.scenes.length > 0" class="scenes-list">
                <a-card v-for="(scene, index) in chapterOutline.scenes" :key="index" size="small" class="scene-item">
                  <template #title>
                    <span class="scene-number">场景 {{ index + 1 }}</span>
                  </template>
                  <a-row :gutter="16">
                    <a-col :span="12">
                      <a-form-item label="地点">
                        <a-input v-model:value="scene.location" />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="氛围">
                        <a-input v-model:value="scene.mood" />
                      </a-form-item>
                    </a-col>
                  </a-row>
                  <a-form-item label="出场角色">
                    <a-select
                      v-model:value="scene.characters"
                      mode="tags"
                      placeholder="输入角色名"
                    />
                  </a-form-item>
                  <a-form-item label="主要事件">
                    <a-select
                      v-model:value="scene.events"
                      mode="tags"
                      placeholder="输入事件"
                    />
                  </a-form-item>
                </a-card>
              </div>

              <!-- 关键事件 -->
              <a-divider orientation="left">关键事件</a-divider>
              <a-form-item>
                <a-select
                  v-model:value="chapterOutline.keyEvents"
                  mode="tags"
                  placeholder="输入关键事件"
                  style="width: 100%"
                />
              </a-form-item>

              <!-- 结尾悬念 -->
              <a-divider orientation="left">结尾悬念</a-divider>
              <a-form-item>
                <a-textarea
                  v-model:value="chapterOutline.cliffhanger"
                  :rows="2"
                  placeholder="章节结尾的悬念或钩子"
                />
              </a-form-item>

              <!-- 伏笔设置 -->
              <a-divider orientation="left">伏笔设置</a-divider>
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="可埋设的伏笔">
                    <a-select
                      v-model:value="chapterOutline.foreshadowing.plant"
                      mode="tags"
                      placeholder="输入可埋设的伏笔"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="可回收的伏笔">
                    <a-select
                      v-model:value="chapterOutline.foreshadowing.resolve"
                      mode="tags"
                      placeholder="输入可回收的伏笔"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </div>
        </a-card>

        <!-- 流式输出区域 -->
        <a-card v-if="streamContent || streamReasoning || streamGenerating" :bordered="false" class="output-card">
          <StreamOutput
            :content="streamContent"
            :reasoning="streamReasoning"
            :title="streamTitle"
            :generating="streamGenerating"
            :min-words="minWords"
            @stop="handleStopStream"
            @save="handleSaveStreamChapter"
          />
        </a-card>

        <!-- 已有章节提示 -->
        <a-card v-if="chapters.length > 0" :bordered="false" class="hint-card">
          <div class="hint-content">
            <span class="hint-icon">💡</span>
            <span class="hint-text">
              已生成 {{ chapters.length }} 章，AI将根据已有内容继续创作，保持剧情连贯性。
            </span>
          </div>
        </a-card>
      </template>
    </a-spin>
  </div>
</template>

<style scoped>
.chapter-create-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.config-card,
.output-card,
.hint-card,
.outline-card {
  background: var(--bg-primary);
}

.config-header,
.outline-header {
  margin-bottom: var(--spacing-md);
}

.config-title,
.outline-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.outline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.outline-content {
  margin-top: var(--spacing-md);
}

.scenes-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.scene-item {
  background: var(--bg-secondary);
}

.scene-number {
  font-weight: 600;
  color: var(--primary-color);
}

.generate-action {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-lg);
}

.hint-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.hint-icon {
  font-size: 20px;
}

.hint-text {
  color: var(--text-secondary);
  font-size: 14px;
}

/* 批量生成样式 */
.range-info {
  color: var(--text-secondary);
  font-size: 14px;
}

.strategy-preview {
  margin: 16px 0;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.batch-progress-card {
  margin-top: 16px;
  background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
}

.batch-progress {
  padding: 8px 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 500;
}

.batch-actions {
  margin-top: 12px;
  text-align: center;
}

.batch-results-card {
  margin-top: 16px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 4px;
}
</style>
