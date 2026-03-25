import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { generationTaskDao, chapterDao } from '@/utils/dao'
import { buildStreamChapterPrompt, buildChapterOutlinePrompt, buildChapterFromOutlinePrompt } from '@/utils/prompts'
import { buildChapterContext } from '@/utils/contextBuilder'

/**
 * 生成策略配置
 */
export const generationStrategies = {
  // 开篇章节策略：详细生成
  opening: {
    name: '开篇策略',
    minWords: 3000,
    maxWords: 5000,
    useOutline: true,
    description: '开篇需要详细铺垫，字数较多'
  },
  // 发展章节策略：标准生成
  development: {
    name: '发展策略',
    minWords: 2000,
    maxWords: 3000,
    useOutline: true,
    description: '剧情推进阶段，标准字数'
  },
  // 过渡章节策略：精简生成
  transition: {
    name: '过渡策略',
    minWords: 1500,
    maxWords: 2500,
    useOutline: false,
    description: '过渡章节，可适当精简'
  },
  // 高潮章节策略：详细生成
  climax: {
    name: '高潮策略',
    minWords: 3000,
    maxWords: 4000,
    useOutline: true,
    description: '高潮章节，需要详细描写'
  }
}

/**
 * 根据章节位置确定生成策略
 * @param {number} chapterNumber - 章节号
 * @param {number} totalChapters - 总章节数
 * @returns {Object} 策略配置
 */
export function determineStrategy(chapterNumber, totalChapters) {
  const progress = chapterNumber / totalChapters

  if (progress <= 0.1) {
    // 前10%为开篇
    return generationStrategies.opening
  } else if (progress <= 0.7) {
    // 10%-70%为发展
    return generationStrategies.development
  } else if (progress <= 0.9) {
    // 70%-90%为高潮
    return generationStrategies.climax
  } else {
    // 90%-100%为过渡/收尾
    return generationStrategies.transition
  }
}

/**
 * 获取策略信息（用于批量生成显示）
 * @param {number} progress - 进度比例 (0-1)
 * @param {number} totalChapters - 总章节数
 * @returns {Object} 策略信息
 */
export function getStrategyInfo(progress, totalChapters) {
  // progress 是 0-1 的比例值，转换为章节号
  const chapterNumber = Math.max(1, Math.round(progress * totalChapters))
  const strategy = determineStrategy(chapterNumber, totalChapters)
  return {
    name: strategy.name,
    description: strategy.description,
    wordRange: [strategy.minWords, strategy.maxWords], // 返回数组格式以支持 wordRange[0]/[1] 访问
    minWords: strategy.minWords,
    maxWords: strategy.maxWords,
    useOutline: strategy.useOutline
  }
}

/**
 * 创建智能批量生成任务
 * @param {number} novelId - 小说ID
 * @param {number} startChapter - 起始章节
 * @param {number} endChapter - 结束章节
 * @param {Object} novel - 小说信息
 * @returns {Promise<number>} 任务ID
 */
export async function createSmartBatchTask(novelId, startChapter, endChapter, novel) {
  const totalChapters = novel.chapterStructure?.totalChapters || endChapter
  const chapters = []

  for (let i = startChapter; i <= endChapter; i++) {
    const strategy = determineStrategy(i, totalChapters)
    chapters.push({
      number: i,
      status: 'pending',
      content: null,
      title: null,
      summary: null,
      wordCount: 0,
      strategy: strategy.name,
      minWords: strategy.minWords,
      maxWords: strategy.maxWords,
      useOutline: strategy.useOutline
    })
  }

  const task = {
    novelId,
    type: 'batch',
    status: 'pending',
    chapters,
    progress: 0,
    options: {
      totalChapters,
      smartStrategy: true
    }
  }

  const taskId = await generationTaskDao.add(task)
  return taskId
}

/**
 * 执行批量生成任务
 * @param {number} taskId - 任务ID
 * @param {Object} novel - 小说信息
 * @param {Function} generateStream - 流式生成函数
 * @param {Function} generate - 普通生成函数
 * @param {Object} callbacks - 回调函数 { onProgress, onChapterComplete, onError }
 * @returns {Promise<boolean>} 是否成功
 */
export async function executeBatchTask(taskId, novel, generateStream, generate, callbacks = {}) {
  const task = await generationTaskDao.getById(taskId)
  if (!task) {
    message.error('任务不存在')
    return false
  }

  await generationTaskDao.markRunning(taskId)

  try {
    for (let i = 0; i < task.chapters.length; i++) {
      // 检查是否暂停
      const currentTaskStatus = await generationTaskDao.getById(taskId)
      if (currentTaskStatus.status === 'paused') {
        message.info('任务已暂停')
        return false
      }

      const chapterConfig = task.chapters[i]
      if (chapterConfig.status === 'completed') {
        continue
      }

      // 更新章节状态为生成中
      await generationTaskDao.updateTaskProgress(taskId, i, 'generating')

      try {
        // 获取上下文
        const recentChapters = await chapterDao.getRecentChapters(novel.id, 3)
        const chapterSummaries = await chapterDao.getChapterSummaries(novel.id, 100)
        const enhancedContext = await buildChapterContext(novel.id, chapterConfig.number, {
          recentChapterCount: 3,
          summaryLimit: 50,
          includeCharacterStatus: true,
          includeForeshadowing: true,
          includeTimeline: true
        })

        let content = ''
        let title = ''

        // 根据策略决定是否使用大纲
        if (chapterConfig.useOutline) {
          // 先生成大纲
          const outlineMessages = buildChapterOutlinePrompt(
            novel,
            recentChapters,
            chapterSummaries,
            chapterConfig.number,
            enhancedContext
          )
          const outlineResponse = await generate(outlineMessages)
          const outlineJson = outlineResponse.match(/\{[\s\S]*\}/)
          
          if (outlineJson) {
            const outline = JSON.parse(outlineJson[0])
            
            // 基于大纲生成正文
            const contentMessages = buildChapterFromOutlinePrompt(
              novel,
              outline,
              recentChapters,
              chapterConfig.minWords,
              chapterConfig.maxWords,
              chapterConfig.number,
              enhancedContext
            )

            let contentBuffer = ''
            await generateStream(contentMessages, (chunk) => {
              contentBuffer += chunk
            })
            content = contentBuffer
            title = outline.title
          }
        } else {
          // 直接生成
          const messages = buildStreamChapterPrompt(
            novel,
            recentChapters,
            chapterSummaries,
            chapterConfig.minWords,
            chapterConfig.maxWords,
            chapterConfig.number,
            enhancedContext
          )

          let contentBuffer = ''
          await generateStream(messages, (chunk) => {
            contentBuffer += chunk
          })
          content = contentBuffer
        }

        // 解析标题和内容
        const lines = content.split('\n')
        if (lines.length > 0 && !title) {
          title = lines[0].trim()
          content = lines.slice(1).join('\n').trim()
        }

        // 更新章节完成状态
        await generationTaskDao.updateTaskProgress(taskId, i, 'completed', {
          title,
          content,
          summary: '', // 可以后续生成
          wordCount: content.length
        })

        // 更新进度
        const completedCount = task.chapters.filter((c, idx) => 
          idx <= i || c.status === 'completed'
        ).length
        const progress = Math.round((completedCount / task.chapters.length) * 100)
        await generationTaskDao.update(taskId, { progress })

        // 回调通知
        if (callbacks.onProgress) {
          callbacks.onProgress(progress, i, chapterConfig.number)
        }
        if (callbacks.onChapterComplete) {
          callbacks.onChapterComplete(chapterConfig.number, { title, content, wordCount: content.length })
        }

      } catch (chapterError) {
        console.error(`章节 ${chapterConfig.number} 生成失败:`, chapterError)
        await generationTaskDao.updateTaskProgress(taskId, i, 'failed')
        if (callbacks.onError) {
          callbacks.onError(chapterConfig.number, chapterError)
        }
        // 继续下一章节
        continue
      }
    }

    // 任务完成
    await generationTaskDao.markCompleted(taskId)
    message.success('批量生成完成！')
    return true

  } catch (error) {
    console.error('批量生成失败:', error)
    await generationTaskDao.markFailed(taskId, error.message)
    message.error('批量生成失败：' + error.message)
    return false
  }
}

/**
 * 智能批量生成组合式函数
 * 提供批量生成章节的智能策略分配功能（带响应式状态）
 */
export function useBatchGenerator() {
  const generating = ref(false)
  const currentTask = ref(null)
  const progress = ref(0)
  const status = ref('idle') // idle, running, paused, completed, failed

  /**
   * 暂停任务
   * @param {number} taskId - 任务ID
   */
  const pauseTask = async (taskId) => {
    await generationTaskDao.markPaused(taskId)
    status.value = 'paused'
    message.info('任务已暂停')
  }

  /**
   * 继续任务
   * @param {number} taskId - 任务ID
   */
  const resumeTask = async (taskId) => {
    await generationTaskDao.markRunning(taskId)
    status.value = 'running'
    message.success('任务已继续')
  }

  /**
   * 获取任务进度信息
   */
  const getTaskProgressInfo = computed(() => {
    if (!currentTask.value) return null

    const task = currentTask.value
    const completed = task.chapters?.filter(c => c.status === 'completed').length || 0
    const total = task.chapters?.length || 0
    const failed = task.chapters?.filter(c => c.status === 'failed').length || 0

    return {
      completed,
      total,
      failed,
      progress: progress.value,
      status: status.value
    }
  })

  /**
   * 获取策略说明
   */
  const getStrategyDescription = (chapterNumber, totalChapters) => {
    const strategy = determineStrategy(chapterNumber, totalChapters)
    return {
      name: strategy.name,
      description: strategy.description,
      wordRange: `${strategy.minWords}-${strategy.maxWords}字`
    }
  }

  return {
    generating,
    currentTask,
    progress,
    status,
    getTaskProgressInfo,
    generationStrategies,
    determineStrategy,
    createSmartBatchTask,
    executeBatchTask,
    pauseTask,
    resumeTask,
    getStrategyDescription,
    getStrategyInfo
  }
}
