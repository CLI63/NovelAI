<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useNovel, useNovelStats } from '@/composables/useNovel'
import { useChapter } from '@/composables/useChapter'
import { useAI } from '@/composables/useAI'
import { useGenerationQueue } from '@/composables/useGenerationQueue'
import { useQualityCheck } from '@/composables/useQualityCheck'
import { useResumeGeneration } from '@/composables/useResumeGeneration'
import { useBackgroundTask } from '@/composables/useBackgroundTask'
import { eventBus, EVENTS } from '@/utils/eventBus'
import {
  buildStreamChapterPrompt,
  buildChapterSummaryPrompt,
  buildChapterOutlinePrompt,
  buildChapterFromOutlinePrompt
} from '@/utils/prompts'
import { buildChapterContext } from '@/utils/contextBuilder'
import { getStrategyInfo } from '@/utils/batchGenerator'
import { processChapter } from '@/utils/chapterPostProcessor'
import PageHeader from '@/components/common/PageHeader.vue'
import StreamOutput from '@/components/chapter/StreamOutput.vue'

const router = useRouter()
const route = useRoute()

const { novel, loading: novelLoading, loadNovel } = useNovel()
const { chapters, loadChapters, getRecentChapters, getChapterSummaries, createChapter, nextChapterNumber } = useChapter()
const { createTask: createBackgroundTask, TASK_TYPES, updateTask: updateBackgroundTask, TASK_STATUS } = useBackgroundTask()
const { generateStream, generate, checkApiKey } = useAI()

// 生成任务队列
const {
  tasks,
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

// 页面滚动容器引用
const pageContainerRef = ref(null)
// 输出区域引用
const outputCardRef = ref(null)

// 保存章节状态
const savingChapter = ref(false)

// 批量生成状态
const batchGenerating = ref(false)
const batchProgress = ref(0)
const batchCurrentChapter = ref(0)
const batchResults = ref([])
const batchPaused = ref(false)

// 断点续写状态
const { checkResumableTask, resumeGeneration, clearProgress } = useResumeGeneration()
const resumableTask = ref(null)
const showResumeModal = ref(false)

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
    
    // 检查是否有可恢复的批量生成任务
    const resumable = await checkResumableTask(novel.value.id)
    if (resumable) {
      resumableTask.value = resumable
      showResumeModal.value = true
    }
  }
}

// 恢复批量生成
const handleResumeTask = async () => {
  if (!resumableTask.value) return
  
  showResumeModal.value = false
  batchGenerating.value = true
  batchPaused.value = false
  
  try {
    const result = await resumeGeneration(
      resumableTask.value.taskId,
      async ({ startFromChapter, chapters, onProgress, onChapterComplete, onError }) => {
        // 继续生成逻辑
        for (let i = startFromChapter; i <= chapters.length && !batchPaused.value; i++) {
          batchCurrentChapter.value = i
          
          try {
            const chapterNum = chapters[i - 1].number
            const recentChapters = await getRecentChapters(novel.value.id, 3)
            const chapterSummaries = await getChapterSummaries(novel.value.id, 100)
            const enhancedContext = await buildChapterContext(novel.value.id, chapterNum, {
              recentChapterCount: 3,
              summaryLimit: 50,
              includeCharacterStatus: true,
              includeForeshadowing: true,
              includeTimeline: true
            })
            
            const totalChapters = novel.value.chapterStructure?.totalChapters || 100
            const progressRatio = (chapterNum - 1) / totalChapters
            const strategy = getStrategyInfo(progressRatio, totalChapters)
            
            const messages = buildStreamChapterPrompt(
              novel.value,
              recentChapters,
              chapterSummaries,
              strategy.wordRange[0],
              strategy.wordRange[1],
              chapterNum,
              enhancedContext
            )
            
            let content = await generate(messages)
            const lines = content.split('\n')
            const title = lines.length > 0 ? lines[0].trim() : `第${chapterNum}章`
            content = lines.slice(1).join('\n').trim()
            
            const summary = await generateSummary(content)
            
            const chapterData = {
              novelId: novel.value.id,
              chapterNumber: chapterNum,
              title,
              content,
              summary,
              wordCount: content.length
            }
            
            const chapterId = await createChapter(chapterData, novel.value.outline)

            if (chapterId) {
              await afterChapterSave(chapterId, content, chapterNum)
            }

            if (onChapterComplete) {
              await onChapterComplete(chapterNum, { content, title, wordCount: content.length })
            }
            
            batchResults.value.push({
              chapter: chapterNum,
              success: true,
              title,
              wordCount: content.length
            })
            
            await loadChapters(novel.value.id)
            
          } catch (error) {
            if (onError) {
              const action = await onError(i, error)
              if (action === 'skip') {
                batchResults.value.push({
                  chapter: chapters[i - 1].number,
                  success: false,
                  error: error.message
                })
              }
            }
          }
          
          if (onProgress) {
            onProgress(i)
          }
        }
        
        return true
      },
      {
        onProgress: (current) => {
          batchProgress.value = Math.round((current / resumableTask.value.chapterCount) * 100)
        },
        onChapterComplete: (chapterNum, data) => {
          message.success(`第 ${chapterNum} 章生成完成`)
        },
        onError: (chapterNum, error) => {
          message.error(`第 ${chapterNum} 章生成失败: ${error.message}`)
        }
      }
    )
    
    if (result) {
      message.success('批量生成恢复完成！')
      await clearProgress(resumableTask.value.taskId)
      resumableTask.value = null
    }
  } catch (error) {
    message.error('恢复生成失败：' + error.message)
  } finally {
    batchGenerating.value = false
  }
}

// 放弃恢复，开始新任务
const handleDiscardResume = async () => {
  if (resumableTask.value) {
    await clearProgress(resumableTask.value.taskId)
    resumableTask.value = null
  }
  showResumeModal.value = false
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
  // 隐藏大纲预览（设置为0表示不显示大纲卡片）
  // outlineStep: 0-未开始, 1-大纲已生成(显示), 2-正在生成正文(隐藏), 3-生成完成(可重新显示)
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
const generateSummary = async (content, chapterTitle = '') => {
  const messages = buildChapterSummaryPrompt(novel.value, chapterTitle || `第${nextChapterNumber.value}章`, content)
  const response = await generate(messages)
  if (response) {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return result.summary || ''
    }
    // 如果没有JSON格式，直接返回响应内容（去除多余空白）
    return response.trim().slice(0, 200)
  }
  return content.slice(0, 200) + '...'
}

// 保存流式生成的章节
const handleSaveStreamChapter = async () => {
  // 防止重复点击
  if (savingChapter.value) return
  
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
  // 防止重复点击
  if (savingChapter.value) return
  savingChapter.value = true
  
  message.loading({ content: '正在保存章节...', key: 'saving', duration: 0 })

  try {
    // 生成总结
    let summary = ''
    try {
      summary = await generateSummary(streamContent.value, streamTitle.value)
    } catch (e) {
      console.warn('生成总结失败，使用默认摘要:', e)
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

    const id = await createChapter(chapterData, novel.value.outline)
    if (id) {
      message.success({ content: '章节保存成功！', key: 'saving' })
      
      // 创建后台任务记录并自动触发执行
      try {
        const taskData = {
          type: TASK_TYPES.CHAPTER_POST_PROCESS,
          novelId: novel.value.id,
          chapterId: id,
          chapterNumber: nextChapterNumber.value,
          data: {
            novelId: novel.value.id,
            chapterId: id,
            chapterNumber: nextChapterNumber.value
          }
        }
        const taskId = await createBackgroundTask(taskData)
        console.log('已创建章节后处理任务，ID:', taskId)
        
        // 发送事件通知全局后台面板自动执行
        eventBus.emit(EVENTS.TASK_CREATED, { id: taskId, ...taskData })
      } catch (err) {
        console.warn('创建后处理任务失败:', err)
      }
      
      router.push(`/novel/${novel.value.id}/chapter/${nextChapterNumber.value}`)
    } else {
      message.error({ content: '章节保存失败', key: 'saving' })
    }
  } catch (error) {
    console.error('保存章节失败:', error)
    message.error({ content: '保存失败：' + error.message, key: 'saving' })
  } finally {
    savingChapter.value = false
  }
}

/**
 * 章节保存后的自动处理（静默执行，委托给统一的 postProcessor）
 * @param {number} chapterId - 章节ID
 * @param {string} content - 章节内容
 * @param {number} chapterNumber - 章节号
 * @param {boolean} showMessage - 是否显示处理结果消息
 * @returns {Promise<Object>} 处理结果统计
 */
const afterChapterSave = async (chapterId, content, chapterNumber, showMessage = false) => {
  const results = await processChapter({
    novel: novel.value,
    chapter: { id: chapterId, content, chapterNumber, title: '' },
    callAI: generate
  })

  if (showMessage) {
    const failedItems = Object.entries(results)
      .filter(([_, v]) => !v.success)
      .map(([k]) => ({
        structuredSummary: '结构化摘要',
        foreshadowingExtract: '伏笔提取',
        characterAppearance: '角色出场',
        characterStatus: '角色状态',
        foreshadowingResolution: '伏笔回收',
        timeline: '时间线',
        characterChanges: '角色变化',
        newForeshadowing: '新伏笔'
      })[k])

    if (failedItems.length > 0) {
      message.warning(`后处理部分失败：${failedItems.join('、')}`)
    } else {
      message.success('章节后处理完成')
    }
  }

  return results
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
        
        const chapterId = await createChapter(chapterData, novel.value.outline)
        
        // 章节保存后处理（提取伏笔、更新角色等）
        if (chapterId) {
          await afterChapterSave(chapterId, content, chapterNum)
        }
        
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

// 滚动到输出区域
const scrollToOutput = () => {
  nextTick(() => {
    // 滚动输出卡片到可视区域
    if (outputCardRef.value) {
      // a-card组件需要通过$el获取DOM元素
      const el = outputCardRef.value.$el || outputCardRef.value
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    // 同时滚动页面最外层到最底部
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    })
  })
}

// 监听流式内容变化，自动滚动
watch(streamContent, () => {
  scrollToOutput()
})

// 监听思考过程变化，自动滚动
watch(streamReasoning, () => {
  scrollToOutput()
})

// 监听流式生成状态，开始生成时滚动到底部
watch(streamGenerating, (newVal) => {
  if (newVal) {
    // 开始生成时，滚动到页面底部
    nextTick(() => {
      setTimeout(() => {
        scrollToOutput()
      }, 100)
    })
  }
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="chapter-create-page">
    <!-- 断点续写恢复提示 -->
    <a-modal
      v-model:open="showResumeModal"
      title="🔄 检测到未完成的批量生成任务"
      :closable="false"
      :maskClosable="false"
      @ok="handleResumeTask"
      @cancel="handleDiscardResume"
    >
      <div v-if="resumableTask" class="resume-info">
        <a-alert type="info" show-icon style="margin-bottom: 16px">
          <template #message>
            发现一个未完成的批量生成任务，是否继续？
          </template>
        </a-alert>
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="任务状态">
            <a-tag :color="resumableTask.status === 'paused' ? 'orange' : 'red'">
              {{ resumableTask.status === 'paused' ? '已暂停' : '中断' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="进度">
            {{ resumableTask.completedCount }} / {{ resumableTask.chapterCount }} 章
          </a-descriptions-item>
          <a-descriptions-item label="完成度" :span="2">
            <a-progress :percent="resumableTask.progress" size="small" />
          </a-descriptions-item>
        </a-descriptions>
      </div>
      <template #footer>
        <a-button @click="handleDiscardResume">放弃并重新开始</a-button>
        <a-button type="primary" @click="handleResumeTask">继续生成</a-button>
      </template>
    </a-modal>

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

        <!-- 章节大纲预览 - 只在大纲生成后且未开始生成正文时显示 -->
        <a-card v-if="chapterOutline && outlineStep === 1" :bordered="false" class="outline-card">
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
        <a-card v-if="streamContent || streamReasoning || streamGenerating" ref="outputCardRef" :bordered="false" class="output-card">
          <StreamOutput
            :content="streamContent"
            :reasoning="streamReasoning"
            :title="streamTitle"
            :saving="savingChapter"
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
