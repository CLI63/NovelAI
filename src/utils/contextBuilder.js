import { characterDao, foreshadowingDao, chapterDao, timelineEventDao } from './dao'

/**
 * 上下文构建器
 * 用于智能选择相关章节、构建角色状态追踪、伏笔追踪等
 */

/**
 * 构建完整的章节生成上下文
 * @param {number} novelId - 小说ID
 * @param {number} targetChapterNumber - 目标章节号
 * @param {Object} options - 配置选项
 */
export async function buildChapterContext(novelId, targetChapterNumber, options = {}) {
  const {
    recentChapterCount = 3,      // 最近章节数量
    summaryLimit = 100,          // 摘要限制
    includeCharacterStatus = true, // 是否包含角色状态
    includeForeshadowing = true,   // 是否包含伏笔信息
    includeTimeline = true         // 是否包含时间线
  } = options

  const context = {
    recentChapters: [],
    chapterSummaries: [],
    characterStatus: null,
    foreshadowingInfo: null,
    timeline: null
  }

  try {
    // 获取最近章节
    context.recentChapters = await chapterDao.getRecentChapters(novelId, recentChapterCount)

    // 获取章节摘要
    context.chapterSummaries = await chapterDao.getChapterSummaries(novelId, summaryLimit)

    // 获取角色状态
    if (includeCharacterStatus) {
      context.characterStatus = await buildCharacterStatusContext(novelId)
    }

    // 获取伏笔信息
    if (includeForeshadowing) {
      context.foreshadowingInfo = await buildForeshadowingContext(novelId)
    }

    // 获取时间线
    if (includeTimeline) {
      context.timeline = await buildTimelineContext(novelId, targetChapterNumber)
    }

    return context
  } catch (err) {
    console.error('构建章节上下文失败:', err)
    return context
  }
}

/**
 * 构建角色状态上下文
 * @param {number} novelId - 小说ID
 */
export async function buildCharacterStatusContext(novelId) {
  try {
    const characters = await characterDao.getByNovelId(novelId)
    
    if (!characters || characters.length === 0) {
      return null
    }

    const statusList = characters.map(char => {
      const status = char.currentStatus || {}
      const lastAppearance = char.appearances?.length > 0 
        ? char.appearances[char.appearances.length - 1]
        : null

      return {
        name: char.name,
        type: char.type,
        identity: char.basicInfo?.identity || '',
        personality: char.basicInfo?.personality || '',
        currentLocation: status.location || '未知',
        currentCondition: status.condition || '正常',
        powerLevel: status.powerLevel || '',
        relationships: (status.relationships || []).map(r => ({
          target: r.targetId,
          type: r.type,
          value: r.value,
          reason: r.reason || ''
        })),
        lastAppearanceChapter: lastAppearance?.chapterId || null,
        lastAppearanceEvents: lastAppearance?.events || []
      }
    })

    // 按角色类型分组
    const grouped = {
      protagonist: statusList.find(c => c.type === 'protagonist'),
      supporting: statusList.filter(c => c.type === 'supporting'),
      antagonist: statusList.filter(c => c.type === 'antagonist'),
      minor: statusList.filter(c => c.type === 'minor')
    }

    return {
      characters: statusList,
      grouped,
      totalCount: statusList.length
    }
  } catch (err) {
    console.error('构建角色状态上下文失败:', err)
    return null
  }
}

/**
 * 构建伏笔上下文
 * @param {number} novelId - 小说ID
 */
export async function buildForeshadowingContext(novelId) {
  try {
    const pending = await foreshadowingDao.getPending(novelId)
    const highImportance = pending.filter(f => f.importance === 'high')

    if (pending.length === 0) {
      return null
    }

    return {
      pending: pending.map(f => ({
        id: f.id,
        content: f.content,
        importance: f.importance,
        plantedInChapter: f.chapterId,
        relatedCharacters: f.relatedCharacters || [],
        notes: f.notes || ''
      })),
      highImportance: highImportance.map(f => ({
        id: f.id,
        content: f.content,
        plantedInChapter: f.chapterId
      })),
      pendingCount: pending.length,
      highImportanceCount: highImportance.length,
      reminder: highImportance.length > 0 
        ? `注意：有${highImportance.length}个高优先级伏笔待回收，请在合适时机处理。`
        : null
    }
  } catch (err) {
    console.error('构建伏笔上下文失败:', err)
    return null
  }
}

/**
 * 构建时间线上下文
 * @param {number} novelId - 小说ID
 * @param {number} targetChapterNumber - 目标章节号
 */
export async function buildTimelineContext(novelId, targetChapterNumber) {
  try {
    const events = await timelineEventDao.getRecentEvents(novelId, 20)
    
    if (!events || events.length === 0) {
      return null
    }

    return {
      events: events.map(e => ({
        chapterId: e.chapterId,
        description: e.description,
        characters: e.characters || [],
        location: e.location || '',
        timestamp: e.timestamp || ''
      })),
      lastEvent: events[events.length - 1] || null
    }
  } catch (err) {
    console.error('构建时间线上下文失败:', err)
    return null
  }
}

/**
 * 智能选择相关章节
 * 根据角色、地点等关联性选择相关章节
 * @param {number} novelId - 小说ID
 * @param {number} targetChapterNumber - 目标章节号
 * @param {Array} relatedCharacters - 相关角色ID列表
 * @param {Array} relatedLocations - 相关地点列表
 */
export async function selectRelevantChapters(novelId, targetChapterNumber, relatedCharacters = [], relatedLocations = []) {
  try {
    const allChapters = await chapterDao.getByNovelId(novelId)
    const previousChapters = allChapters.filter(ch => ch.chapterNumber < targetChapterNumber)
    
    // 如果没有关联信息，返回最近的章节
    if (relatedCharacters.length === 0 && relatedLocations.length === 0) {
      return previousChapters.slice(-3)
    }

    // 计算每章的相关性分数
    const scoredChapters = previousChapters.map(ch => {
      let score = 0
      
      // 基于章节号计算基础分（越近分数越高）
      const distance = targetChapterNumber - ch.chapterNumber
      score += Math.max(0, 10 - distance) * 2

      // 基于角色关联加分
      if (ch.characters && relatedCharacters.length > 0) {
        const matchedCharacters = ch.characters.filter(c => relatedCharacters.includes(c))
        score += matchedCharacters.length * 5
      }

      // 基于地点关联加分
      if (ch.location && relatedLocations.includes(ch.location)) {
        score += 3
      }

      return { chapter: ch, score }
    })

    // 按分数排序，取前5章
    scoredChapters.sort((a, b) => b.score - a.score)
    const selectedChapters = scoredChapters.slice(0, 5).map(s => s.chapter)

    // 按章节号排序返回
    selectedChapters.sort((a, b) => a.chapterNumber - b.chapterNumber)
    
    return selectedChapters
  } catch (err) {
    console.error('智能选择相关章节失败:', err)
    return []
  }
}

/**
 * 格式化上下文为Prompt文本
 * @param {Object} context - 上下文对象
 */
export function formatContextForPrompt(context) {
  let promptText = ''

  // 角色状态
  if (context.characterStatus) {
    const { grouped, characters } = context.characterStatus
    
    promptText += '\n【角色当前状态】\n'
    
    if (grouped.protagonist) {
      const p = grouped.protagonist
      promptText += `\n主角：${p.name}\n`
      promptText += `  - 身份：${p.identity}\n`
      promptText += `  - 当前位置：${p.currentLocation}\n`
      promptText += `  - 当前状态：${p.currentCondition}\n`
      if (p.powerLevel) {
        promptText += `  - 实力等级：${p.powerLevel}\n`
      }
      if (p.relationships.length > 0) {
        promptText += `  - 重要关系：\n`
        p.relationships.slice(0, 3).forEach(r => {
          promptText += `    · ${r.type}（${r.reason || '原因未知'}）\n`
        })
      }
    }

    const importantSupporting = grouped.supporting.slice(0, 3)
    if (importantSupporting.length > 0) {
      promptText += `\n重要配角：\n`
      importantSupporting.forEach(s => {
        promptText += `  - ${s.name}（${s.identity}）：${s.currentLocation}，${s.currentCondition}\n`
      })
    }

    const antagonists = grouped.antagonist
    if (antagonists.length > 0) {
      promptText += `\n反派角色：\n`
      antagonists.forEach(a => {
        promptText += `  - ${a.name}（${a.identity}）：${a.currentLocation}\n`
      })
    }
  }

  // 伏笔信息
  if (context.foreshadowingInfo && context.foreshadowingInfo.pendingCount > 0) {
    const { pending, highImportance, reminder } = context.foreshadowingInfo
    
    promptText += '\n【伏笔提醒】\n'
    
    if (highImportance.length > 0) {
      promptText += '高优先级待回收伏笔：\n'
      highImportance.forEach(f => {
        promptText += `  - ${f.content}（埋设于第${f.plantedInChapter}章）\n`
      })
    }

    if (pending.length > highImportance.length) {
      promptText += `\n其他待回收伏笔（共${pending.length - highImportance.length}个）：\n`
      pending.filter(f => f.importance !== 'high').slice(0, 3).forEach(f => {
        promptText += `  - ${f.content}\n`
      })
    }

    if (reminder) {
      promptText += `\n⚠️ ${reminder}\n`
    }
  }

  // 时间线
  if (context.timeline && context.timeline.events.length > 0) {
    const recentEvents = context.timeline.events.slice(-5)
    
    promptText += '\n【近期重要事件】\n'
    recentEvents.forEach(e => {
      promptText += `  - ${e.description}\n`
      if (e.location) {
        promptText += `    地点：${e.location}\n`
      }
    })
  }

  return promptText
}

/**
 * 更新角色状态（章节生成后调用）
 * @param {number} novelId - 小说ID
 * @param {Object} chapterData - 章节数据
 * @param {Object} extractedInfo - 从章节中提取的信息
 */
export async function updateCharacterStatusFromChapter(novelId, chapterData, extractedInfo) {
  try {
    const characters = await characterDao.getByNovelId(novelId)
    
    for (const info of extractedInfo.characterChanges || []) {
      const character = characters.find(c => c.name === info.name)
      if (character) {
        const statusUpdate = {}
        
        if (info.newLocation) {
          statusUpdate.location = info.newLocation
        }
        if (info.newCondition) {
          statusUpdate.condition = info.newCondition
        }
        if (info.newPowerLevel) {
          statusUpdate.powerLevel = info.newPowerLevel
        }
        
        if (Object.keys(statusUpdate).length > 0) {
          await characterDao.updateStatus(character.id, statusUpdate)
        }

        // 添加出场记录
        await characterDao.addAppearance(character.id, chapterData.id, info.events || [])
      }
    }

    return true
  } catch (err) {
    console.error('更新角色状态失败:', err)
    return false
  }
}

/**
 * 记录时间线事件
 * @param {number} novelId - 小说ID
 * @param {number} chapterId - 章节ID
 * @param {Array} events - 事件列表
 */
export async function recordTimelineEvents(novelId, chapterId, events) {
  try {
    for (const event of events) {
      await timelineEventDao.add({
        novelId,
        chapterId,
        description: event.description,
        characters: event.characters || [],
        location: event.location || '',
        timestamp: event.timestamp || new Date().toISOString()
      })
    }
    return true
  } catch (err) {
    console.error('记录时间线事件失败:', err)
    return false
  }
}
