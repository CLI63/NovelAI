import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { generationTaskDao } from '@/utils/dao'

/**
 * 生成中断续写组合式函数
 * 提供生成进度保存、中断恢复、自动重试功能
 */
export function useResumeGeneration() {
  const savedProgress = ref(null)
  const isResuming = ref(false)
  const autoRetryEnabled = ref(true)
  const maxRetryCount = ref(3)
  const retryCount = ref(0)
  const lastError = ref(null)

  /**
   * 保存生成进度
   * @param {Object} progress - 进度数据
   */
  const saveProgress = async (progress) => {
    const progressData = {
      ...progress,
      savedAt: new Date().toISOString(),
      retryCount: retryCount.value
    }

    try {
      // 保存到 IndexedDB
      if (progress.taskId) {
        await generationTaskDao.update(progress.taskId, {
          progress: progress.progress,
          chapters: progress.chapters,
          lastSavedAt: progressData.savedAt,
          error: null
        })
      }

      // 同时保存到 localStorage 作为备份
      localStorage.setItem('generation_progress', JSON.stringify(progressData))
      savedProgress.value = progressData

      return true
    } catch (err) {
      console.error('保存进度失败:', err)
      return false
    }
  }

  /**
   * 加载保存的进度
   * @param {number} taskId - 任务ID
   */
  const loadProgress = async (taskId) => {
    try {
      // 先从 IndexedDB 加载
      const task = await generationTaskDao.getById(taskId)
      
      if (task && task.status !== 'completed') {
        savedProgress.value = {
          taskId: task.id,
          novelId: task.novelId,
          progress: task.progress,
          chapters: task.chapters,
          savedAt: task.lastSavedAt || task.updatedAt,
          status: task.status
        }
        return savedProgress.value
      }

      // 尝试从 localStorage 恢复
      const localProgress = localStorage.getItem('generation_progress')
      if (localProgress) {
        const parsed = JSON.parse(localProgress)
        if (parsed.taskId === taskId) {
          savedProgress.value = parsed
          return parsed
        }
      }

      return null
    } catch (err) {
      console.error('加载进度失败:', err)
      return null
    }
  }

  /**
   * 检查是否有可恢复的任务
   * @param {number} novelId - 小说ID
   */
  const checkResumableTask = async (novelId) => {
    try {
      const tasks = await generationTaskDao.getByNovelId(novelId)
      
      // 查找暂停或失败的任务
      const resumable = tasks.find(t => 
        t.status === 'paused' || 
        t.status === 'failed' ||
        (t.status === 'running' && t.progress < 100)
      )

      if (resumable) {
        return {
          taskId: resumable.id,
          status: resumable.status,
          progress: resumable.progress,
          chapterCount: resumable.chapters?.length || 0,
          completedCount: resumable.chapters?.filter(c => c.status === 'completed').length || 0,
          canResume: true
        }
      }

      return null
    } catch (err) {
      console.error('检查可恢复任务失败:', err)
      return null
    }
  }

  /**
   * 从中断点继续生成
   * @param {number} taskId - 任务ID
   * @param {Function} generateFn - 生成函数
   * @param {Object} callbacks - 回调函数
   */
  const resumeGeneration = async (taskId, generateFn, callbacks = {}) => {
    isResuming.value = true
    retryCount.value = 0

    try {
      const progress = await loadProgress(taskId)
      
      if (!progress) {
        message.error('未找到可恢复的进度')
        return false
      }

      // 找到第一个未完成的章节
      const pendingChapter = progress.chapters?.find(c => 
        c.status === 'pending' || c.status === 'failed'
      )

      if (!pendingChapter) {
        message.info('所有章节已完成')
        return true
      }

      // 标记任务为运行中
      await generationTaskDao.markRunning(taskId)

      // 从中断点继续
      const result = await generateFn({
        taskId,
        startFromChapter: pendingChapter.number,
        chapters: progress.chapters,
        onProgress: callbacks.onProgress,
        onChapterComplete: async (chapterNum, data) => {
          // 更新进度
          await saveProgress({
            taskId,
            progress: calculateProgress(progress.chapters, chapterNum),
            chapters: updateChapterStatus(progress.chapters, chapterNum, 'completed', data)
          })
          
          if (callbacks.onChapterComplete) {
            callbacks.onChapterComplete(chapterNum, data)
          }
        },
        onError: async (chapterNum, error) => {
          lastError.value = error
          
          if (autoRetryEnabled.value && retryCount.value < maxRetryCount.value) {
            retryCount.value++
            message.warning(`章节 ${chapterNum} 生成失败，正在重试 (${retryCount.value}/${maxRetryCount.value})`)
            
            // 延迟重试
            await new Promise(resolve => setTimeout(resolve, 2000))
            return 'retry'
          }
          
          // 保存失败状态
          await saveProgress({
            taskId,
            progress: calculateProgress(progress.chapters, chapterNum),
            chapters: updateChapterStatus(progress.chapters, chapterNum, 'failed')
          })
          
          if (callbacks.onError) {
            callbacks.onError(chapterNum, error)
          }
          
          return 'skip'
        }
      })

      return result
    } catch (err) {
      console.error('恢复生成失败:', err)
      lastError.value = err
      message.error('恢复生成失败: ' + err.message)
      return false
    } finally {
      isResuming.value = false
    }
  }

  /**
   * 计算进度百分比
   */
  const calculateProgress = (chapters, completedChapter) => {
    if (!chapters || chapters.length === 0) return 0
    const completed = chapters.filter(c => 
      c.status === 'completed' || c.number <= completedChapter
    ).length
    return Math.round((completed / chapters.length) * 100)
  }

  /**
   * 更新章节状态
   */
  const updateChapterStatus = (chapters, chapterNum, status, data = null) => {
    return chapters.map(c => {
      if (c.number === chapterNum) {
        return {
          ...c,
          status,
          ...(data && { content: data.content, title: data.title, wordCount: data.wordCount })
        }
      }
      return c
    })
  }

  /**
   * 清除保存的进度
   */
  const clearProgress = async (taskId) => {
    try {
      localStorage.removeItem('generation_progress')
      savedProgress.value = null
      retryCount.value = 0
      lastError.value = null
      
      if (taskId) {
        await generationTaskDao.delete(taskId)
      }
      
      return true
    } catch (err) {
      console.error('清除进度失败:', err)
      return false
    }
  }

  /**
   * 网络状态检测
   */
  const checkNetworkStatus = () => {
    return navigator.onLine
  }

  /**
   * 自动重试（网络恢复后）
   */
  const setupAutoRetry = (taskId, generateFn, callbacks) => {
    window.addEventListener('online', async () => {
      if (autoRetryEnabled.value && savedProgress.value?.taskId === taskId) {
        message.info('网络已恢复，正在继续生成...')
        await resumeGeneration(taskId, generateFn, callbacks)
      }
    })
  }

  /**
   * 获取恢复状态描述
   */
  const resumeStatusText = computed(() => {
    if (!savedProgress.value) return ''
    
    const progress = savedProgress.value
    const completedCount = progress.chapters?.filter(c => c.status === 'completed').length || 0
    const totalCount = progress.chapters?.length || 0
    
    return `已保存进度：${completedCount}/${totalCount} 章节完成 (${progress.progress}%)`
  })

  return {
    savedProgress,
    isResuming,
    autoRetryEnabled,
    maxRetryCount,
    retryCount,
    lastError,
    resumeStatusText,
    saveProgress,
    loadProgress,
    checkResumableTask,
    resumeGeneration,
    clearProgress,
    checkNetworkStatus,
    setupAutoRetry
  }
}

/**
 * 构建续写提示词
 * @param {Object} novel - 小说信息
 * @param {Object} lastChapter - 上一章信息
 * @param {string} partialContent - 已生成的部分内容
 */
export function buildResumePrompt(novel, lastChapter, partialContent) {
  return [
    {
      role: 'system',
      content: `你是一位专业的网络小说作家。请继续完成章节的写作，保持风格和内容的连贯性。`
    },
    {
      role: 'user',
      content: `【小说信息】
书名：${novel.title}
风格：${novel.style?.join('、')}

【上一章结尾】
${lastChapter?.content?.slice(-500) || '无'}

【当前章节已生成内容】
${partialContent}

【要求】
1. 从上面的内容继续写作，保持风格一致
2. 不要重复已生成的内容
3. 确保情节连贯
4. 直接输出续写内容，不要输出标题或其他说明

请继续写作：`
    }
  ]
}
