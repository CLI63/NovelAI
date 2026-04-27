import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { novelDao, chapterDao } from '@/utils/dao'
import { callAI } from '@/utils/api'
import { buildChapterContext } from '@/utils/contextBuilder'
import {
  buildStreamChapterPrompt,
  buildChapterSummaryPrompt,
  getVolumeContext
} from '@/utils/prompts'
import { getStrategyInfo } from '@/utils/batchGenerator'
import { useBackgroundTask } from '@/composables/useBackgroundTask'
import { eventBus, EVENTS } from '@/utils/eventBus'

/**
 * 全本小说自动生成组合式函数
 * 从小说保存到逐章生成、后处理的完整流水线
 *
 * 使用示例：
 *   const gen = useFullNovelGeneration()
 *   await gen.start(novelId)      // 开始全本生成
 *   gen.pause()                    // 暂停
 *   gen.resume()                   // 继续
 *   gen.cancel()                   // 取消
 *   gen.reset()                    // 重置状态
 */
export function useFullNovelGeneration() {
  const store = useAppStore()
  const { TASK_TYPES, ensureChapterPostProcessTask } = useBackgroundTask()

  // ===== 响应式状态 =====
  const phase = ref('idle')
  // idle | outlines | chapters | completed | error | paused | cancelled

  const progress = ref({
    totalChapters: 0,
    completedChapters: 0,
    currentNumber: 0,       // 当前生成的章节号
    currentTitle: '',       // 当前章节标题
    currentContent: '',     // 当前章节内容（生成完成后填充）
    currentPhase: '',       // generating | saving | postprocessing
    percent: 0              // 0-100
  })

  const errors = ref([])    // { chapter, phase, error }
  const results = ref([])   // { chapter, title, wordCount, success }
  const paused = ref(false)
  const cancelled = ref(false)
  const customPrompt = ref('')  // 用户自定义提示词，拼接到每章 prompt 末尾

  // 内部：用于 pause/resume 的 Promise 控制器
  let resumeResolver = null

  // 后台任务进度回调
  let _onProgress = null

  // ===== 内部工具方法 =====

  /**
   * 获取当前 AI 配置
   */
  function getApiConfig() {
    return {
      apiKey: store.getCurrentApiKey(),
      model: store.getCurrentModel(),
      provider: store.settings.aiProvider
    }
  }

  /**
   * 检查 API Key 是否已配置
   */
  function checkApiKeySetup() {
    return !!getApiConfig().apiKey
  }

  /**
   * 调用 AI（非流式）
   */
  async function callAIWithConfig(messages) {
    const { apiKey, provider, model } = getApiConfig()
    return await callAI(messages, provider, apiKey, model)
  }

  /**
   * 为章节生成摘要
   */
  async function generateChapterSummary(novel, content, title) {
    try {
      const messages = buildChapterSummaryPrompt(novel, title || '', content)
      const response = await callAIWithConfig(messages)
      if (response) {
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          return result.summary || content.slice(0, 200) + '...'
        }
        return response.trim().slice(0, 200)
      }
    } catch (e) {
      console.warn('生成摘要失败:', e)
    }
    return content.slice(0, 200) + '...'
  }

  async function enqueuePostProcessing(chapterId, chapterNumber, novelId) {
    const taskData = {
      type: TASK_TYPES.CHAPTER_POST_PROCESS,
      novelId,
      chapterId,
      chapterNumber,
      data: { novelId, chapterId, chapterNumber }
    }

    const { id, task } = await ensureChapterPostProcessTask(taskData)
    eventBus.emit(EVENTS.TASK_CREATED, { ...task, id })
  }

  // ===== 暂停/继续机制 =====

  /**
   * 检查暂停/取消状态，如果暂停则等待
   */
  async function checkPause() {
    while (paused.value && !cancelled.value) {
      await new Promise(resolve => { resumeResolver = resolve })
      resumeResolver = null
    }
    if (cancelled.value) throw new Error('CANCELLED')
  }

  // ===== 公开方法 =====

  /**
   * 设置后台任务进度回调
   * @param {Function} callback - 每次章节完成后的回调 (progress) => void
   */
  function setOnProgress(callback) {
    _onProgress = callback
  }

  /**
   * 开始全本生成
   * @param {number} novelId - 小说 ID（必须先保存到数据库）
   * @param {string} [extraPrompt=''] - 自定义提示词，拼接到每章 prompt 末尾
   */
  async function start(novelId, extraPrompt = '') {
    // 加载小说
    const novel = await novelDao.getById(novelId)
    if (!novel) {
      phase.value = 'error'
      throw new Error('小说不存在')
    }

    const totalChapters = novel.chapterStructure?.totalChapters || 0
    if (totalChapters === 0) {
      phase.value = 'error'
      throw new Error('章节结构未设置，请先生成小说概览')
    }

    // 重置进度
    progress.value = {
      totalChapters,
      completedChapters: 0,
      currentNumber: 0,
      currentTitle: '',
      currentContent: '',
      currentPhase: '',
      percent: 0
    }
    errors.value = []
    results.value = []
    paused.value = false
    cancelled.value = false
    customPrompt.value = extraPrompt

    // 统计已生成的章节（支持续写）
    const existingChapters = await chapterDao.getByNovelId(novelId)
    const existingNumbers = new Set(existingChapters.map(c => c.chapterNumber))
    let completedCount = existingNumbers.size
    progress.value.completedChapters = completedCount

    // 从下一个未生成章节开始
    let chapterNum = completedCount + 1

    try {
      phase.value = 'chapters'

      while (chapterNum <= totalChapters) {
        // 暂停/取消检查
        await checkPause()

        // 更新进度
        progress.value.currentNumber = chapterNum
        progress.value.currentPhase = 'generating'
        progress.value.currentTitle = ''
        progress.value.currentContent = ''

        // 获取智能策略
        const progressRatio = (chapterNum - 1) / totalChapters
        const strategy = getStrategyInfo(progressRatio, totalChapters)

        // 构建上下文
        const recentChapters = await chapterDao.getRecentChapters(novelId, 3)
        const chapterSummaries = await chapterDao.getChapterSummaries(novelId, 100)
        const enhancedContext = await buildChapterContext(novelId, chapterNum, {
          recentChapterCount: 3,
          summaryLimit: 50,
          includeCharacterStatus: true,
          includeForeshadowing: true,
          includeTimeline: true
        })

        // 生成章节内容
        let content = ''
        try {
          const messages = buildStreamChapterPrompt(
            novel,
            recentChapters,
            chapterSummaries,
            strategy.wordRange[0],
            strategy.wordRange[1],
            chapterNum,
            enhancedContext,
            strategy.phase,
            totalChapters
          )
          if (customPrompt.value.trim()) {
            messages.push({ role: 'user', content: `额外要求：${customPrompt.value.trim()}` })
          }
          content = await callAIWithConfig(messages)
        } catch (e) {
          errors.value.push({ chapter: chapterNum, phase: 'generate', error: e.message })
          chapterNum++
          continue
        }

        if (!content || content.trim().length < 50) {
          errors.value.push({ chapter: chapterNum, phase: 'generate', error: '内容过短或为空' })
          chapterNum++
          continue
        }

        // 解析标题（首行为标题）
        const lines = content.split('\n')
        const title = lines.length > 0 ? lines[0].trim() : `第${chapterNum}章`
        const body = lines.slice(1).join('\n').trim()

        progress.value.currentTitle = title
        progress.value.currentContent = body.slice(0, 500) // 仅预览

        // 保存章节
        progress.value.currentPhase = 'saving'

        let summary = ''
        try {
          summary = await generateChapterSummary(novel, body, title)
        } catch (e) {
          summary = body.slice(0, 200) + '...'
        }

        let chapterId
        try {
          chapterId = await chapterDao.add({
            novelId,
            chapterNumber: chapterNum,
            title,
            content: body,
            summary,
            wordCount: body.length,
            volumeName: getVolumeContext(chapterNum, novel.outline)?.name || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        } catch (e) {
          errors.value.push({ chapter: chapterNum, phase: 'save', error: e.message })
          chapterNum++
          continue
        }

        try {
          await enqueuePostProcessing(chapterId, chapterNum, novelId)
        } catch (e) {
          console.warn('创建章节后处理任务失败:', e)
        }

        // 统计完成
        completedCount++
        progress.value.completedChapters = completedCount
        progress.value.percent = Math.round((completedCount / totalChapters) * 100)
        results.value.push({
          chapter: chapterNum,
          title,
          wordCount: body.length,
          success: true
        })

        // 回调通知（供后台任务持久化进度）
        if (_onProgress) {
          _onProgress({
            phase: phase.value,
            completedChapters: completedCount,
            totalChapters,
            currentNumber: chapterNum,
            currentTitle: title,
            percent: progress.value.percent,
            errors: errors.value.length,
            results: results.value.length
          })
        }

        chapterNum++
      }

      phase.value = 'completed'
    } catch (e) {
      if (e.message === 'CANCELLED') {
        phase.value = 'cancelled'
      } else {
        phase.value = 'error'
        errors.value.push({ chapter: chapterNum, phase: 'system', error: e.message })
      }
    }
  }

  /**
   * 暂停生成
   */
  function pause() {
    paused.value = true
    phase.value = 'paused'
  }

  /**
   * 继续生成
   */
  function resume() {
    paused.value = false
    phase.value = 'chapters'
    if (resumeResolver) {
      resumeResolver()
      resumeResolver = null
    }
  }

  /**
   * 取消生成
   */
  function cancel() {
    cancelled.value = true
    paused.value = false
    if (resumeResolver) {
      resumeResolver()
      resumeResolver = null
    }
  }

  /**
   * 重置所有状态
   */
  function reset() {
    phase.value = 'idle'
    progress.value = {
      totalChapters: 0, completedChapters: 0,
      currentNumber: 0, currentTitle: '', currentContent: '',
      currentPhase: '', percent: 0
    }
    errors.value = []
    results.value = []
    paused.value = false
    cancelled.value = false
    resumeResolver = null
  }

  return {
    // 状态
    phase,
    progress,
    errors,
    results,
    paused,

    // 方法
    start,
    pause,
    resume,
    cancel,
    reset,
    checkApiKeySetup,
    setOnProgress
  }
}
