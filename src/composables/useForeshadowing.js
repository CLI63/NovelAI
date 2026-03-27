import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { foreshadowingDao, characterDao, chapterDao } from '@/utils/dao'
import { callAI } from '@/utils/api'
import { useAppStore } from '@/stores/app'
import { buildForeshadowingExtractionPrompt, buildForeshadowingReminderPrompt } from '@/utils/prompts'

/**
 * 伏笔管理组合式函数
 * 提供伏笔的CRUD操作和状态追踪功能
 */
export function useForeshadowing() {
  const foreshadowings = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * 加载小说的所有伏笔
   * @param {number} novelId - 小说ID
   */
  const loadForeshadowings = async (novelId) => {
    loading.value = true
    error.value = null

    try {
      const list = await foreshadowingDao.getByNovelId(novelId)
      foreshadowings.value = list
      return list
    } catch (err) {
      error.value = err.message
      console.error('加载伏笔失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新伏笔
   * @param {Object} foreshadowingData - 伏笔数据
   */
  const createForeshadowing = async (foreshadowingData) => {
    loading.value = true
    error.value = null

    try {
      const id = await foreshadowingDao.add(foreshadowingData)
      message.success('伏笔创建成功！')
      return id
    } catch (err) {
      error.value = err.message
      message.error('创建伏笔失败：' + err.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新伏笔
   * @param {number} id - 伏笔ID
   * @param {Object} foreshadowingData - 更新的数据
   */
  const updateForeshadowing = async (id, foreshadowingData) => {
    loading.value = true
    error.value = null

    try {
      await foreshadowingDao.update(id, foreshadowingData)
      message.success('伏笔更新成功！')
      return true
    } catch (err) {
      error.value = err.message
      message.error('更新伏笔失败：' + err.message)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除伏笔
   * @param {number} id - 伏笔ID
   */
  const deleteForeshadowing = async (id) => {
    try {
      await foreshadowingDao.delete(id)
      message.success('伏笔删除成功！')
      return true
    } catch (err) {
      error.value = err.message
      message.error('删除伏笔失败：' + err.message)
      return false
    }
  }

  /**
   * 标记伏笔已回收
   * @param {number} id - 伏笔ID
   * @param {number} resolvedInChapterId - 回收章节ID
   */
  const markResolved = async (id, resolvedInChapterId) => {
    try {
      await foreshadowingDao.markResolved(id, resolvedInChapterId)
      message.success('伏笔已标记为回收！')
      return true
    } catch (err) {
      console.error('标记伏笔回收失败:', err)
      return false
    }
  }

  /**
   * 获取待回收的伏笔
   * @param {number} novelId - 小说ID
   */
  const getPendingForeshadowings = async (novelId) => {
    try {
      return await foreshadowingDao.getPending(novelId)
    } catch (err) {
      console.error('获取待回收伏笔失败:', err)
      return []
    }
  }

  /**
   * 获取高优先级待回收伏笔
   * @param {number} novelId - 小说ID
   */
  const getHighImportancePending = async (novelId) => {
    try {
      return await foreshadowingDao.getHighImportancePending(novelId)
    } catch (err) {
      console.error('获取高优先级伏笔失败:', err)
      return []
    }
  }

  /**
   * 获取伏笔摘要（用于生成上下文）
   * @param {number} novelId - 小说ID
   */
  const getForeshadowingSummary = async (novelId) => {
    try {
      const pending = await foreshadowingDao.getPending(novelId)
      
      return {
        pending: pending.map(f => ({
          id: f.id,
          content: f.content,
          importance: f.importance,
          plantedIn: f.chapterId,
          relatedCharacters: f.relatedCharacters || [],
          notes: f.notes || ''
        })),
        pendingCount: pending.length,
        highImportanceCount: pending.filter(f => f.importance === 'high').length
      }
    } catch (err) {
      console.error('获取伏笔摘要失败:', err)
      return { pending: [], pendingCount: 0, highImportanceCount: 0 }
    }
  }

  /**
   * 从章节内容中自动提取伏笔（AI辅助）
   * @param {string} chapterContent - 章节内容
   * @param {number} chapterId - 章节ID
   * @param {number} novelId - 小说ID
   * @returns {Promise<Array>} 提取的伏笔列表
   */
  const extractFromChapter = async (chapterContent, chapterId, novelId) => {
    const appStore = useAppStore()
    const apiKey = appStore.getCurrentApiKey()
    const provider = appStore.settings.aiProvider
    const model = appStore.getCurrentModel()

    if (!apiKey) {
      console.warn('未配置 API Key，无法提取伏笔')
      return []
    }

    loading.value = true
    error.value = null

    try {
      // 获取章节信息
      const chapter = await chapterDao.getById(chapterId)
      if (!chapter) {
        console.warn('章节不存在', chapterId)
        return []
      }

      // 获取小说角色列表（用于关联分析）
      const characters = await characterDao.getByNovelId(novelId)

      // 构建提取提示词
      const messages = buildForeshadowingExtractionPrompt(
        chapterContent,
        chapter.title,
        chapter.chapterNumber,
        characters
      )

      // 调用 AI 提取伏笔
      const response = await callAI(messages, provider, apiKey, model)

      // 解析 AI 返回的 JSON
      const foreshadowings = parseForeshadowingResponse(response)

      // 保存提取的伏笔并关联角色
      const savedForeshadowings = []
      for (const foreshadow of foreshadowings) {
        const foreshadowData = {
          novelId,
          chapterId,
          content: foreshadow.content,
          type: foreshadow.type || 'plot',
          importance: foreshadow.importance || 'medium',
          description: foreshadow.description || '',
          suggestedResolution: foreshadow.suggestedResolution || '',
          suggestedChapterRange: foreshadow.suggestedChapterRange || '',
          relatedCharacters: foreshadow.relatedCharacters || [],
          keywords: foreshadow.keywords || [],
          status: 'pending',
          plantedInChapter: chapter.chapterNumber
        }

        const id = await foreshadowingDao.add(foreshadowData)
        savedForeshadowings.push({ id, ...foreshadowData })
      }

      if (savedForeshadowings.length > 0) {
        message.success(`成功提取 ${savedForeshadowings.length} 个伏笔`)
      }

      return savedForeshadowings
    } catch (err) {
      error.value = err.message
      console.error('提取伏笔失败:', err)
      message.error('提取伏笔失败：' + err.message)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 解析 AI 返回的伏笔提取结果
   * @param {string} response - AI 返回的 JSON 字符串
   * @returns {Array} 解析后的伏笔数组
   */
  const parseForeshadowingResponse = (response) => {
    try {
      // 尝试提取 JSON 内容
      let jsonStr = response.trim()

      // 移除可能的 markdown 代码块标记
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7)
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3)
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3)
      }

      const parsed = JSON.parse(jsonStr.trim())

      if (parsed.foreshadowings && Array.isArray(parsed.foreshadowings)) {
        return parsed.foreshadowings
      }

      return []
    } catch (err) {
      console.error('解析伏笔提取结果失败:', err)
      return []
    }
  }

  /**
   * 伏笔关联性分析 - 自动关联角色和章节
   * @param {number} novelId - 小说ID
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 关联分析结果
   */
  const analyzeForeshadowingRelations = async (novelId, options = {}) => {
    try {
      const foreshadowings = await foreshadowingDao.getByNovelId(novelId)
      const characters = await characterDao.getByNovelId(novelId)
      const chapters = await chapterDao.getByNovelId(novelId)

      const relations = {
        characterRelations: [],    // 角色相关伏笔
        chapterRelations: [],      // 章节伏笔分布
        orphanedForeshadowings: [], // 未关联的伏笔
        suggestions: []            // 关联建议
      }

      // 构建角色名称映射
      const characterNames = new Map()
      characters.forEach(char => {
        characterNames.set(char.name, char)
        // 同时存储可能的别名
        if (char.basicInfo?.aliases) {
          char.basicInfo.aliases.forEach(alias => {
            characterNames.set(alias, char)
          })
        }
      })

      // 分析每个伏笔的关联
      for (const foreshadow of foreshadowings) {
        const relatedChars = []
        const charNames = foreshadow.relatedCharacters || []

        // 检查已关联的角色
        for (const charName of charNames) {
          const character = characterNames.get(charName)
          if (character) {
            relatedChars.push({
              foreshadowId: foreshadow.id,
              characterId: character.id,
              characterName: character.name,
              relationType: 'explicit' // 显式关联
            })
          }
        }

        // 尝试从内容中提取隐式关联
        const content = foreshadow.content + ' ' + (foreshadow.description || '')
        for (const [name, character] of characterNames) {
          if (!charNames.includes(name) && content.includes(name)) {
            relatedChars.push({
              foreshadowId: foreshadow.id,
              characterId: character.id,
              characterName: character.name,
              relationType: 'implicit' // 隐式关联
            })

            // 添加关联建议
            relations.suggestions.push({
              foreshadowId: foreshadow.id,
              foreshadowContent: foreshadow.content,
              suggestedCharacter: character.name,
              reason: '伏笔内容中提及该角色'
            })
          }
        }

        relations.characterRelations.push(...relatedChars)

        // 检查是否为孤立伏笔
        if (relatedChars.length === 0 && (!foreshadow.relatedCharacters || foreshadow.relatedCharacters.length === 0)) {
          relations.orphanedForeshadowings.push(foreshadow)
        }
      }

      // 分析章节伏笔分布
      const chapterForeshadowCount = new Map()
      foreshadowings.forEach(f => {
        const chapterNum = f.plantedInChapter || f.chapterNumber
        if (chapterNum) {
          chapterForeshadowCount.set(chapterNum, (chapterForeshadowCount.get(chapterNum) || 0) + 1)
        }
      })

      chapters.forEach(chapter => {
        relations.chapterRelations.push({
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          foreshadowCount: chapterForeshadowCount.get(chapter.chapterNumber) || 0
        })
      })

      return relations
    } catch (err) {
      console.error('伏笔关联分析失败:', err)
      return {
        characterRelations: [],
        chapterRelations: [],
        orphanedForeshadowings: [],
        suggestions: []
      }
    }
  }

  /**
   * 伏笔遗漏预警 - 检测高优先级伏笔和长期未回收伏笔
   * @param {number} novelId - 小说ID
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 预警信息
   */
  const checkForeshadowingWarnings = async (novelId, options = {}) => {
    const {
      highImportanceThreshold = 3,    // 高优先级伏笔超过N章未回收则预警
      longPendingThreshold = 10,      // 普通伏笔超过N章未回收则预警
      currentChapterNumber = null     // 当前章节号（可选）
    } = options

    try {
      const pending = await foreshadowingDao.getPending(novelId)
      const chapters = await chapterDao.getByNovelId(novelId)

      // 确定当前最新章节号
      let latestChapterNum = currentChapterNumber
      if (!latestChapterNum && chapters.length > 0) {
        latestChapterNum = Math.max(...chapters.map(ch => ch.chapterNumber))
      }

      const warnings = {
        highPriority: [],      // 高优先级伏笔预警
        longPending: [],       // 长期未回收伏笔预警
        statistics: {
          totalPending: pending.length,
          highImportanceCount: 0,
          warningCount: 0
        },
        reminder: null         // 生成时的提醒文本
      }

      for (const foreshadow of pending) {
        const plantedChapter = foreshadow.plantedInChapter || foreshadow.chapterNumber || 1
        const chaptersSincePlanted = latestChapterNum ? latestChapterNum - plantedChapter : 0

        // 高优先级伏笔预警
        if (foreshadow.importance === 'high') {
          warnings.statistics.highImportanceCount++

          if (chaptersSincePlanted >= highImportanceThreshold) {
            warnings.highPriority.push({
              ...foreshadow,
              chaptersSincePlanted,
              warningLevel: chaptersSincePlanted >= highImportanceThreshold * 2 ? 'critical' : 'warning',
              message: `高优先级伏笔"${foreshadow.content}"已过${chaptersSincePlanted}章未回收`
            })
            warnings.statistics.warningCount++
          }
        }
        // 长期未回收伏笔预警
        else if (chaptersSincePlanted >= longPendingThreshold) {
          warnings.longPending.push({
            ...foreshadow,
            chaptersSincePlanted,
            warningLevel: 'info',
            message: `伏笔"${foreshadow.content}"已过${chaptersSincePlanted}章未回收，建议近期处理`
          })
          warnings.statistics.warningCount++
        }
      }

      // 生成提醒文本（用于章节生成时）
      warnings.reminder = buildForeshadowingReminderPrompt(pending, latestChapterNum || 1)

      return warnings
    } catch (err) {
      console.error('伏笔预警检查失败:', err)
      return {
        highPriority: [],
        longPending: [],
        statistics: { totalPending: 0, highImportanceCount: 0, warningCount: 0 },
        reminder: null
      }
    }
  }

  /**
   * 获取生成章节时的伏笔上下文
   * @param {number} novelId - 小说ID
   * @param {number} chapterNumber - 即将生成的章节号
   * @returns {Promise<Object>} 伏笔上下文信息
   */
  const getForeshadowingContextForGeneration = async (novelId, chapterNumber) => {
    try {
      const pending = await foreshadowingDao.getPending(novelId)
      const highImportance = pending.filter(f => f.importance === 'high')

      // 计算预警信息
      const warnings = await checkForeshadowingWarnings(novelId, {
        currentChapterNumber: chapterNumber
      })

      return {
        pendingCount: pending.length,
        highImportanceCount: highImportance.length,
        pending: pending.slice(0, 10).map(f => ({
          id: f.id,
          content: f.content,
          importance: f.importance,
          type: f.type,
          plantedInChapter: f.plantedInChapter || f.chapterNumber,
          relatedCharacters: f.relatedCharacters || [],
          suggestedResolution: f.suggestedResolution || ''
        })),
        highImportance: highImportance.map(f => ({
          id: f.id,
          content: f.content,
          plantedInChapter: f.plantedInChapter || f.chapterNumber,
          suggestedResolution: f.suggestedResolution || ''
        })),
        warnings,
        reminder: warnings.reminder
      }
    } catch (err) {
      console.error('获取伏笔上下文失败:', err)
      return {
        pendingCount: 0,
        highImportanceCount: 0,
        pending: [],
        highImportance: [],
        warnings: null,
        reminder: null
      }
    }
  }

  /**
   * 待回收伏笔列表
   */
  const pendingForeshadowings = computed(() => {
    return foreshadowings.value.filter(f => f.status === 'pending')
  })

  /**
   * 已回收伏笔列表
   */
  const resolvedForeshadowings = computed(() => {
    return foreshadowings.value.filter(f => f.status === 'resolved')
  })

  /**
   * 高优先级待回收伏笔
   */
  const highImportancePending = computed(() => {
    return foreshadowings.value.filter(f => f.status === 'pending' && f.importance === 'high')
  })

  /**
   * 伏笔统计
   */
  const statistics = computed(() => {
    const total = foreshadowings.value.length
    const pending = pendingForeshadowings.value.length
    const resolved = resolvedForeshadowings.value.length
    const highImportance = highImportancePending.value.length

    return {
      total,
      pending,
      resolved,
      highImportance,
      resolvedRate: total > 0 ? Math.round((resolved / total) * 100) : 0
    }
  })

  /**
   * 从小说概览中提取潜在伏笔
   * @param {number} novelId - 小说ID
   * @param {Object} plotLines - 剧情线信息
   * @param {Array} outline - 大纲信息
   * @returns {Promise<number>} 创建的伏笔数量
   */
  const extractFromNovelOverview = async (novelId, plotLines, outline) => {
    try {
      const foreshadowings = []

      // 从主线剧情中提取潜在伏笔
      if (plotLines?.main) {
        const mainForeshadowings = analyzePlotForForeshadowing(plotLines.main, 'main')
        foreshadowings.push(...mainForeshadowings)
      }

      // 从支线剧情中提取
      if (plotLines?.sub?.length) {
        for (const subPlot of plotLines.sub) {
          const subForeshadowings = analyzePlotForForeshadowing(subPlot, 'sub')
          foreshadowings.push(...subForeshadowings)
        }
      }

      // 从大纲中提取
      if (outline?.length) {
        for (const volume of outline) {
          if (volume.summary) {
            const volumeForeshadowings = analyzePlotForForeshadowing(volume.summary, 'outline')
            foreshadowings.push(...volumeForeshadowings)
          }
        }
      }

      // 保存提取的伏笔
      const saved = []
      for (const fs of foreshadowings) {
        const id = await foreshadowingDao.add({
          novelId,
          content: fs.content,
          type: fs.type || 'plot',
          importance: fs.importance || 'medium',
          description: fs.description || '',
          relatedCharacters: fs.relatedCharacters || [],
          status: 'pending',
          source: 'overview'
        })
        saved.push(id)
      }

      return saved.length
    } catch (err) {
      console.error('从概览提取伏笔失败:', err)
      return 0
    }
  }

  /**
   * 分析剧情文本，提取潜在伏笔
   * @param {string} plotText - 剧情文本
   * @param {string} source - 来源类型 (main/sub/outline)
   * @returns {Array} 提取的伏笔数组
   */
  const analyzePlotForForeshadowing = (plotText, source) => {
    const foreshadowings = []
    
    if (!plotText || typeof plotText !== 'string') {
      return foreshadowings
    }

    // 伏笔关键词模式
    const patterns = [
      // 神秘物品/人物
      { regex: /神秘[的人物事]/g, type: 'mystery', importance: 'high' },
      { regex: /未知[的的]/g, type: 'mystery', importance: 'medium' },
      { regex: /传说[中的]/g, type: 'mystery', importance: 'medium' },
      // 预示/暗示
      { regex: /似乎|仿佛|隐约/g, type: 'hint', importance: 'low' },
      // 未解之谜
      { regex: /谜团|秘密|真相/g, type: 'mystery', importance: 'high' },
      // 重要承诺/誓言
      { regex: /誓言|承诺|约定/g, type: 'promise', importance: 'medium' },
      // 宿命/命运
      { regex: /宿命|命运|注定/g, type: 'fate', importance: 'high' },
      // 隐藏身份
      { regex: /隐藏|伪装|身份/g, type: 'identity', importance: 'high' },
      // 复仇
      { regex: /复仇|报仇|仇恨/g, type: 'revenge', importance: 'medium' },
      // 宝物/传承
      { regex: /宝物|传承|遗物/g, type: 'treasure', importance: 'medium' }
    ]

    // 按句子分割
    const sentences = plotText.split(/[。！？；\n]/).filter(s => s.trim())
    
    for (const sentence of sentences) {
      for (const pattern of patterns) {
        if (pattern.regex.test(sentence)) {
          // 避免重复
          const exists = foreshadowings.some(f => f.content === sentence.trim())
          if (!exists && sentence.trim().length > 5) {
            foreshadowings.push({
              content: sentence.trim(),
              type: pattern.type,
              importance: pattern.importance,
              description: `从${source === 'main' ? '主线剧情' : source === 'sub' ? '支线剧情' : '大纲'}中自动提取`,
              relatedCharacters: []
            })
          }
          break // 一个句子只匹配一个模式
        }
      }
    }

    return foreshadowings
  }

  /**
   * 检查章节内容中的伏笔回收情况
   * @param {string} content - 章节内容
   * @param {number} novelId - 小说ID
   * @param {number} chapterId - 章节ID
   * @returns {Promise<Array>} 已回收的伏笔列表
   */
  const checkForeshadowingResolution = async (content, novelId, chapterId) => {
    try {
      // 获取所有待回收的伏笔
      const pendingForeshadowings = await foreshadowingDao.getPending(novelId)
      
      if (!pendingForeshadowings.length) {
        return []
      }

      const resolved = []
      
      for (const fs of pendingForeshadowings) {
        // 跳过在本章节埋设的伏笔（避免同章回收）
        if (fs.chapterId === chapterId) {
          continue
        }
        
        // 检查伏笔内容是否在章节中被回应/解决
        const keywords = fs.keywords || extractKeywords(fs.content)
        let matchCount = 0
        
        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            matchCount++
          }
        }

        // 如果关键词匹配度超过50%，认为伏笔已回收
        if (keywords.length > 0 && matchCount / keywords.length >= 0.5) {
          await foreshadowingDao.markResolved(fs.id, chapterId)
          resolved.push(fs)
        }
      }

      return resolved
    } catch (err) {
      console.error('检查伏笔回收失败:', err)
      return []
    }
  }

  /**
   * 从文本中提取关键词
   * @param {string} text - 文本内容
   * @returns {Array} 关键词数组
   */
  const extractKeywords = (text) => {
    if (!text || typeof text !== 'string') return []
    
    // 简单的关键词提取：提取2-4字的词语
    const keywords = []
    const words = text.match(/[\u4e00-\u9fa5]{2,4}/g) || []
    
    // 过滤常见无意义词
    const stopWords = ['这是', '那是', '他的', '她的', '我的', '这个', '那个', '但是', '因为', '所以', '如果', '虽然']
    
    for (const word of words) {
      if (!stopWords.includes(word) && !keywords.includes(word)) {
        keywords.push(word)
      }
    }
    
    return keywords.slice(0, 5) // 最多返回5个关键词
  }

  return {
    foreshadowings,
    loading,
    error,
    pendingForeshadowings,
    resolvedForeshadowings,
    highImportancePending,
    statistics,
    loadForeshadowings,
    createForeshadowing,
    updateForeshadowing,
    deleteForeshadowing,
    markResolved,
    getPendingForeshadowings,
    getHighImportancePending,
    getForeshadowingSummary,
    extractFromChapter,
    extractFromNovelOverview,
    checkForeshadowingResolution,
    analyzeForeshadowingRelations,
    checkForeshadowingWarnings,
    getForeshadowingContextForGeneration
  }
}
