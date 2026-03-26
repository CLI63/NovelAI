import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { outlineDao, plotLineDao, outlineEventDao, chapterDao, characterDao, foreshadowingDao } from '@/utils/dao'
import { callAI } from '@/utils/api'
import { prompts } from '@/utils/prompts'

/**
 * 大纲管理组合式函数
 * 提供大纲、剧情线、事件的CRUD操作和冲突检测功能
 */
export function useOutline() {
  const outline = ref(null)
  const outlines = ref([])
  const plotLines = ref([])
  const events = ref([])
  const loading = ref(false)
  const error = ref(null)

  // ============ 大纲操作 ============

  const loadOutlines = async (novelId) => {
    loading.value = true
    try {
      outlines.value = await outlineDao.getByNovelId(novelId)
      return outlines.value
    } catch (err) {
      error.value = err.message
      message.error('加载大纲失败')
      return []
    } finally {
      loading.value = false
    }
  }

  const loadOutline = async (id) => {
    loading.value = true
    try {
      outline.value = await outlineDao.getById(id)
      return outline.value
    } catch (err) {
      error.value = err.message
      message.error('加载大纲失败')
      return null
    } finally {
      loading.value = false
    }
  }

  const createOutline = async (outlineData) => {
    loading.value = true
    try {
      const id = await outlineDao.add(outlineData)
      message.success('大纲创建成功')
      return id
    } catch (err) {
      error.value = err.message
      message.error('创建大纲失败')
      return null
    } finally {
      loading.value = false
    }
  }

  const updateOutline = async (id, outlineData) => {
    loading.value = true
    try {
      await outlineDao.update(id, outlineData)
      message.success('大纲更新成功')
      return true
    } catch (err) {
      error.value = err.message
      message.error('更新大纲失败')
      return false
    } finally {
      loading.value = false
    }
  }

  const deleteOutline = async (id) => {
    try {
      await outlineDao.delete(id)
      message.success('大纲已删除')
      return true
    } catch (err) {
      error.value = err.message
      message.error('删除大纲失败')
      return false
    }
  }

  // ============ 剧情线操作 ============

  const loadPlotLines = async (novelId) => {
    loading.value = true
    try {
      plotLines.value = await plotLineDao.getByNovelId(novelId)
      // 加载每条剧情线的事件
      for (const pl of plotLines.value) {
        pl.events = await outlineEventDao.getByPlotLineId(pl.id)
      }
      return plotLines.value
    } catch (err) {
      error.value = err.message
      message.error('加载剧情线失败')
      return []
    } finally {
      loading.value = false
    }
  }

  const createPlotLine = async (plotLineData) => {
    loading.value = true
    try {
      const id = await plotLineDao.add(plotLineData)
      message.success('剧情线创建成功')
      return id
    } catch (err) {
      error.value = err.message
      message.error('创建剧情线失败')
      return null
    } finally {
      loading.value = false
    }
  }

  const updatePlotLine = async (id, plotLineData) => {
    loading.value = true
    try {
      await plotLineDao.update(id, plotLineData)
      message.success('剧情线更新成功')
      return true
    } catch (err) {
      error.value = err.message
      message.error('更新剧情线失败')
      return false
    } finally {
      loading.value = false
    }
  }

  const deletePlotLine = async (id) => {
    try {
      await plotLineDao.delete(id)
      message.success('剧情线已删除')
      return true
    } catch (err) {
      error.value = err.message
      message.error('删除剧情线失败')
      return false
    }
  }

  const reorderPlotLines = async (novelId, plotLineIds) => {
    try {
      await plotLineDao.reorder(novelId, plotLineIds)
      return true
    } catch (err) {
      error.value = err.message
      message.error('排序失败')
      return false
    }
  }

  // ============ 事件操作 ============

  const loadEvents = async (plotLineId) => {
    loading.value = true
    try {
      events.value = await outlineEventDao.getByPlotLineId(plotLineId)
      return events.value
    } catch (err) {
      error.value = err.message
      message.error('加载事件失败')
      return []
    } finally {
      loading.value = false
    }
  }

  const createEvent = async (eventData) => {
    loading.value = true
    try {
      const id = await outlineEventDao.add(eventData)
      message.success('事件创建成功')
      return id
    } catch (err) {
      error.value = err.message
      message.error('创建事件失败')
      return null
    } finally {
      loading.value = false
    }
  }

  const updateEvent = async (id, eventData) => {
    loading.value = true
    try {
      await outlineEventDao.update(id, eventData)
      message.success('事件更新成功')
      return true
    } catch (err) {
      error.value = err.message
      message.error('更新事件失败')
      return false
    } finally {
      loading.value = false
    }
  }

  const deleteEvent = async (id) => {
    try {
      await outlineEventDao.delete(id)
      message.success('事件已删除')
      return true
    } catch (err) {
      error.value = err.message
      message.error('删除事件失败')
      return false
    }
  }

  const reorderEvents = async (plotLineId, eventIds) => {
    try {
      await outlineEventDao.reorder(plotLineId, eventIds)
      return true
    } catch (err) {
      error.value = err.message
      message.error('排序失败')
      return false
    }
  }

  const batchCreateEvents = async (eventsData) => {
    loading.value = true
    try {
      await outlineEventDao.batchAdd(eventsData)
      message.success('批量创建事件成功')
      return true
    } catch (err) {
      error.value = err.message
      message.error('批量创建事件失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // ============ 章节规划 ============

  const generateChapterPlan = async (novelId, config) => {
    loading.value = true
    try {
      const plotLinesData = await plotLineDao.getByNovelId(novelId)
      const characters = await characterDao.getByNovelId(novelId)
      const foreshadowings = await foreshadowingDao.getByNovelId(novelId)

      // 构建章节规划数据
      const plan = {
        novelId,
        totalChapters: config.totalChapters,
        targetWords: config.targetWords,
        chapters: [],
        generatedAt: new Date().toISOString()
      }

      // 根据剧情线事件分配章节
      const allEvents = []
      for (const pl of plotLinesData) {
        const plEvents = await outlineEventDao.getByPlotLineId(pl.id)
        allEvents.push(...plEvents.map(e => ({
          ...e,
          plotLineName: pl.name,
          plotLineType: pl.type
        })))
      }

      // 按时间顺序排序事件
      allEvents.sort((a, b) => (a.order || 0) - (b.order || 0))

      // 计算每章平均事件数
      const eventsPerChapter = Math.ceil(allEvents.length / config.totalChapters)

      // 分配事件到章节
      for (let i = 0; i < config.totalChapters; i++) {
        const startIndex = i * eventsPerChapter
        const chapterEvents = allEvents.slice(startIndex, startIndex + eventsPerChapter)

        plan.chapters.push({
          chapterNumber: i + 1,
          title: `第${i + 1}章`,
          estimatedWords: Math.round(config.targetWords / config.totalChapters),
          events: chapterEvents.map(e => ({
            id: e.id,
            title: e.title,
            description: e.description,
            plotLineId: e.plotLineId,
            plotLineName: e.plotLineName,
            plotLineType: e.plotLineType
          })),
          involvedCharacters: extractInvolvedCharacters(chapterEvents, characters),
          foreshadowingHints: extractForeshadowingHints(chapterEvents, foreshadowings)
        })
      }

      return plan
    } catch (err) {
      error.value = err.message
      message.error('生成章节规划失败')
      return null
    } finally {
      loading.value = false
    }
  }

  // 提取章节涉及的角色
  const extractInvolvedCharacters = (events, characters) => {
    const characterIds = new Set()
    events.forEach(e => {
      if (e.characterIds) {
        e.characterIds.forEach(id => characterIds.add(id))
      }
    })
    return characters.filter(c => characterIds.has(c.id))
  }

  // 提取章节涉及的伏笔提示
  const extractForeshadowingHints = (events, foreshadowings) => {
    const hints = []
    events.forEach(e => {
      if (e.foreshadowingIds) {
        e.foreshadowingIds.forEach(fid => {
          const f = foreshadowings.find(f => f.id === fid)
          if (f) hints.push(f)
        })
      }
    })
    return hints
  }

  // ============ 冲突检测 ============

  const detectConflicts = async (novelId) => {
    loading.value = true
    try {
      const conflicts = []
      const plotLinesData = await plotLineDao.getByNovelId(novelId)
      const chapters = await chapterDao.getByNovelId(novelId)
      const characters = await characterDao.getByNovelId(novelId)

      // 收集所有事件
      const allEvents = []
      for (const pl of plotLinesData) {
        const plEvents = await outlineEventDao.getByPlotLineId(pl.id)
        allEvents.push(...plEvents.map(e => ({
          ...e,
          plotLineId: pl.id,
          plotLineName: pl.name,
          plotLineType: pl.type
        })))
      }

      // 1. 时间线冲突检测
      const timelineConflicts = detectTimelineConflicts(allEvents, chapters)
      conflicts.push(...timelineConflicts)

      // 2. 角色状态冲突检测
      const characterConflicts = detectCharacterConflicts(allEvents, characters)
      conflicts.push(...characterConflicts)

      // 3. 剧情逻辑冲突检测
      const plotConflicts = detectPlotConflicts(allEvents, plotLinesData)
      conflicts.push(...plotConflicts)

      // 4. 章节分配冲突检测
      const chapterConflicts = detectChapterConflicts(allEvents, chapters)
      conflicts.push(...chapterConflicts)

      return conflicts
    } catch (err) {
      error.value = err.message
      message.error('检测冲突失败')
      return []
    } finally {
      loading.value = false
    }
  }

  // 检测时间线冲突
  const detectTimelineConflicts = (events, chapters) => {
    const conflicts = []
    const eventsByChapter = new Map()

    // 按章节分组事件
    events.forEach(e => {
      const chapterId = e.chapterId || e.plannedChapter
      if (chapterId) {
        if (!eventsByChapter.has(chapterId)) {
          eventsByChapter.set(chapterId, [])
        }
        eventsByChapter.get(chapterId).push(e)
      }
    })

    // 检测同一章节内的事件冲突
    eventsByChapter.forEach((chapterEvents, chapterId) => {
      // 检测同一角色在同一章节的不合理状态变化
      const characterStates = new Map()
      chapterEvents.forEach(e => {
        if (e.characterId && e.characterState) {
          if (characterStates.has(e.characterId)) {
            const prevState = characterStates.get(e.characterId)
            if (isConflictingState(prevState, e.characterState)) {
              conflicts.push({
                type: 'timeline',
                severity: 'high',
                chapterId,
                message: `角色状态冲突：同一章节内角色状态变化不合理`,
                details: {
                  events: [prevState.eventId, e.id],
                  characterId: e.characterId
                }
              })
            }
          }
          characterStates.set(e.characterId, {
            ...e.characterState,
            eventId: e.id
          })
        }
      })
    })

    // 检测事件顺序与章节顺序不一致
    const sortedEvents = [...events].sort((a, b) => (a.order || 0) - (b.order || 0))
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const current = sortedEvents[i]
      const next = sortedEvents[i + 1]
      if (current.plannedChapter > next.plannedChapter) {
        conflicts.push({
          type: 'timeline',
          severity: 'medium',
          message: `事件顺序与章节分配不一致`,
          details: {
            event1: current.title,
            event2: next.title,
            suggestion: '建议调整事件顺序或章节分配'
          }
        })
      }
    }

    return conflicts
  }

  // 检测角色状态是否冲突
  const isConflictingState = (state1, state2) => {
    // 定义冲突的状态对
    const conflictingPairs = [
      ['alive', 'dead'],
      ['friendly', 'hostile'],
      ['present', 'absent']
    ]
    for (const [s1, s2] of conflictingPairs) {
      if ((state1[s1] && state2[s2]) || (state1[s2] && state2[s1])) {
        return true
      }
    }
    return false
  }

  // 检测角色相关冲突
  const detectCharacterConflicts = (events, characters) => {
    const conflicts = []
    const characterEventMap = new Map()

    // 构建角色-事件映射
    events.forEach(e => {
      if (e.characterIds) {
        e.characterIds.forEach(charId => {
          if (!characterEventMap.has(charId)) {
            characterEventMap.set(charId, [])
          }
          characterEventMap.get(charId).push(e)
        })
      }
    })

    // 检测角色缺失
    events.forEach(e => {
      if (e.characterIds && e.characterIds.length > 0) {
        e.characterIds.forEach(charId => {
          const character = characters.find(c => c.id === charId)
          if (!character) {
            conflicts.push({
              type: 'character',
              severity: 'medium',
              message: `事件「${e.title}」引用了不存在的角色`,
              details: {
                eventId: e.id,
                characterId: charId
              }
            })
          }
        })
      }
    })

    // 检测角色事件过于集中
    characterEventMap.forEach((charEvents, charId) => {
      const chapterSet = new Set(charEvents.map(e => e.plannedChapter).filter(Boolean))
      if (charEvents.length > 5 && chapterSet.size === 1) {
        conflicts.push({
          type: 'character',
          severity: 'low',
          message: `角色事件过于集中在单一章节`,
          details: {
            characterId: charId,
            eventCount: charEvents.length,
            suggestion: '建议分散角色的出场安排'
          }
        })
      }
    })

    return conflicts
  }

  // 检测剧情逻辑冲突
  const detectPlotConflicts = (events, plotLines) => {
    const conflicts = []

    // 按剧情线分组事件
    const eventsByPlotLine = new Map()
    events.forEach(e => {
      if (!eventsByPlotLine.has(e.plotLineId)) {
        eventsByPlotLine.set(e.plotLineId, [])
      }
      eventsByPlotLine.get(e.plotLineId).push(e)
    })

    // 检测主线事件缺失
    const mainPlotLines = plotLines.filter(pl => pl.type === 'main')
    mainPlotLines.forEach(pl => {
      const plEvents = eventsByPlotLine.get(pl.id) || []
      if (plEvents.length === 0) {
        conflicts.push({
          type: 'plot',
          severity: 'high',
          message: `主线「${pl.name}」没有任何事件`,
          details: {
            plotLineId: pl.id,
            plotLineName: pl.name,
            suggestion: '建议添加主线事件'
          }
        })
      }
    })

    // 检测支线未闭合
    const subPlotLines = plotLines.filter(pl => pl.type === 'sub')
    subPlotLines.forEach(pl => {
      const plEvents = eventsByPlotLine.get(pl.id) || []
      const hasResolution = plEvents.some(e => e.isResolution)
      if (plEvents.length > 0 && !hasResolution && pl.status === 'completed') {
        conflicts.push({
          type: 'plot',
          severity: 'medium',
          message: `支线「${pl.name}」标记为已完成但缺少结局事件`,
          details: {
            plotLineId: pl.id,
            plotLineName: pl.name
          }
        })
      }
    })

    // 检测事件依赖问题
    events.forEach(e => {
      if (e.dependsOn) {
        const dependentEvent = events.find(ev => ev.id === e.dependsOn)
        if (!dependentEvent) {
          conflicts.push({
            type: 'plot',
            severity: 'medium',
            message: `事件「${e.title}」依赖的事件不存在`,
            details: {
              eventId: e.id,
              dependsOn: e.dependsOn
            }
          })
        } else if (e.plannedChapter < dependentEvent.plannedChapter) {
          conflicts.push({
            type: 'plot',
            severity: 'high',
            message: `事件依赖顺序错误`,
            details: {
              event1: e.title,
              event2: dependentEvent.title,
              suggestion: '依赖的事件应该先发生'
            }
          })
        }
      }
    })

    return conflicts
  }

  // 检测章节分配冲突
  const detectChapterConflicts = (events, chapters) => {
    const conflicts = []

    // 检测事件分配到不存在的章节
    events.forEach(e => {
      if (e.plannedChapter) {
        const chapter = chapters.find(ch => ch.chapterNumber === e.plannedChapter)
        if (!chapter && e.plannedChapter > chapters.length) {
          conflicts.push({
            type: 'chapter',
            severity: 'low',
            message: `事件「${e.title}」分配到尚未创建的章节`,
            details: {
              eventId: e.id,
              plannedChapter: e.plannedChapter,
              currentChapters: chapters.length
            }
          })
        }
      }
    })

    // 检测章节事件分布不均
    const eventsPerChapter = new Map()
    events.forEach(e => {
      const chapter = e.plannedChapter || 0
      eventsPerChapter.set(chapter, (eventsPerChapter.get(chapter) || 0) + 1)
    })

    const avgEventsPerChapter = events.length / (chapters.length || 1)
    eventsPerChapter.forEach((count, chapter) => {
      if (chapter > 0 && count > avgEventsPerChapter * 2) {
        conflicts.push({
          type: 'chapter',
          severity: 'low',
          message: `第${chapter}章事件过于密集`,
          details: {
            chapter,
            eventCount: count,
            average: avgEventsPerChapter.toFixed(1),
            suggestion: '建议分散事件到其他章节'
          }
        })
      }
    })

    return conflicts
  }

  // ============ AI 辅助功能 ============

  const generateOutlineWithAI = async (novelData) => {
    loading.value = true
    try {
      const prompt = prompts.outlineGeneration
        .replace('{title}', novelData.title)
        .replace('{genre}', novelData.genre || '玄幻')
        .replace('{theme}', novelData.theme || '')
        .replace('{totalChapters}', novelData.chapterStructure?.totalChapters || 50)
        .replace('{mainCharacters}', JSON.stringify(novelData.mainCharacters || []))

      const response = await callAI(prompt)
      const outline = parseAIOutlineResponse(response)
      return outline
    } catch (err) {
      error.value = err.message
      message.error('AI生成大纲失败')
      return null
    } finally {
      loading.value = false
    }
  }

  const suggestPlotEvents = async (plotLine, context) => {
    loading.value = true
    try {
      const prompt = prompts.plotEventSuggestion
        .replace('{plotLineName}', plotLine.name)
        .replace('{plotLineDescription}', plotLine.description || '')
        .replace('{context}', JSON.stringify(context))

      const response = await callAI(prompt)
      const suggestions = parseAIEventSuggestions(response)
      return suggestions
    } catch (err) {
      error.value = err.message
      message.error('AI建议生成失败')
      return []
    } finally {
      loading.value = false
    }
  }

  // 解析AI大纲响应
  const parseAIOutlineResponse = (response) => {
    try {
      // 尝试解析JSON
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1])
      }
      // 直接尝试解析
      return JSON.parse(response)
    } catch {
      // 如果不是JSON，返回基础结构
      return {
        mainPlot: {
          name: '主线',
          events: []
        },
        subPlots: [],
        chapterOutline: []
      }
    }
  }

  // 解析AI事件建议
  const parseAIEventSuggestions = (response) => {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1])
      }
      return JSON.parse(response)
    } catch {
      return []
    }
  }

  // ============ 统计信息 ============

  const getOutlineStats = computed(() => {
    const mainPlotLines = plotLines.value.filter(pl => pl.type === 'main')
    const subPlotLines = plotLines.value.filter(pl => pl.type === 'sub')
    const allEvents = plotLines.value.reduce((sum, pl) => sum + (pl.events?.length || 0), 0)

    return {
      totalPlotLines: plotLines.value.length,
      mainPlotLines: mainPlotLines.length,
      subPlotLines: subPlotLines.length,
      totalEvents: allEvents
    }
  })

  return {
    // 状态
    outline,
    outlines,
    plotLines,
    events,
    loading,
    error,

    // 大纲操作
    loadOutlines,
    loadOutline,
    createOutline,
    updateOutline,
    deleteOutline,

    // 剧情线操作
    loadPlotLines,
    createPlotLine,
    updatePlotLine,
    deletePlotLine,
    reorderPlotLines,

    // 事件操作
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    reorderEvents,
    batchCreateEvents,

    // 章节规划
    generateChapterPlan,

    // 冲突检测
    detectConflicts,

    // AI辅助
    generateOutlineWithAI,
    suggestPlotEvents,

    // 统计
    getOutlineStats
  }
}
