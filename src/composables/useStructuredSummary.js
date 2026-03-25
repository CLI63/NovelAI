import { ref, computed } from 'vue'

/**
 * 结构化摘要组合式函数
 * 提供自动生成结构化摘要功能
 */
export function useStructuredSummary() {
  const generating = ref(false)
  const structuredSummary = ref(null)

  /**
   * 生成结构化摘要
   * @param {Object} chapter - 章节信息
   * @param {Object} novel - 小说信息
   * @param {Function} generate - AI生成函数
   */
  const generateStructuredSummary = async (chapter, novel, generate) => {
    generating.value = true
    structuredSummary.value = null

    try {
      const messages = buildStructuredSummaryPrompt(chapter, novel)
      const response = await generate(messages)
      
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        structuredSummary.value = normalizeSummary(result)
        return structuredSummary.value
      }

      return null
    } catch (err) {
      console.error('生成结构化摘要失败:', err)
      return null
    } finally {
      generating.value = false
    }
  }

  /**
   * 规范化摘要数据
   */
  const normalizeSummary = (raw) => {
    return {
      keyEvents: raw.keyEvents || [],
      characterChanges: (raw.characterChanges || []).map(c => ({
        character: c.character || c.name,
        change: c.change || c.changes,
        type: c.type || 'status' // status, relationship, ability
      })),
      foreshadowing: {
        planted: (raw.foreshadowing?.planted || []).map(f => ({
          content: f.content || f,
          relatedTo: f.relatedTo || '',
          importance: f.importance || 'medium'
        })),
        resolved: (raw.foreshadowing?.resolved || []).map(f => ({
          content: f.content || f,
          plantedIn: f.plantedIn || ''
        }))
      },
      timeline: {
        time: raw.timeline?.time || '',
        location: raw.timeline?.location || '',
        duration: raw.timeline?.duration || ''
      },
      worldBuilding: {
        newLocations: raw.worldBuilding?.newLocations || [],
        newConcepts: raw.worldBuilding?.newConcepts || [],
        newItems: raw.worldBuilding?.newItems || []
      },
      emotionalArc: raw.emotionalArc || '',
      nextChapterHints: raw.nextChapterHints || [],
      plainSummary: raw.plainSummary || ''
    }
  }

  /**
   * 从结构化摘要生成简短摘要
   */
  const generatePlainSummary = (summary) => {
    if (!summary) return ''
    
    const parts = []
    
    if (summary.keyEvents?.length > 0) {
      parts.push(summary.keyEvents.slice(0, 2).join('；'))
    }
    
    if (summary.characterChanges?.length > 0) {
      const changes = summary.characterChanges
        .slice(0, 2)
        .map(c => `${c.character}${c.change}`)
      parts.push(changes.join('，'))
    }
    
    return parts.join('。') + '。'
  }

  /**
   * 获取摘要统计信息
   */
  const summaryStats = computed(() => {
    if (!structuredSummary.value) return null

    const summary = structuredSummary.value
    return {
      eventCount: summary.keyEvents?.length || 0,
      characterChangeCount: summary.characterChanges?.length || 0,
      foreshadowingPlanted: summary.foreshadowing?.planted?.length || 0,
      foreshadowingResolved: summary.foreshadowing?.resolved?.length || 0,
      newLocationCount: summary.worldBuilding?.newLocations?.length || 0,
      hasTimeline: !!summary.timeline?.time
    }
  })

  /**
   * 更新角色状态（基于摘要）
   * @param {Object} summary - 结构化摘要
   * @param {Function} updateCharacterFn - 更新角色的函数
   */
  const applyCharacterChanges = async (summary, updateCharacterFn) => {
    if (!summary?.characterChanges?.length) return

    for (const change of summary.characterChanges) {
      try {
        await updateCharacterFn(change.character, {
          change: change.change,
          type: change.type
        })
      } catch (err) {
        console.error(`更新角色 ${change.character} 状态失败:`, err)
      }
    }
  }

  /**
   * 记录伏笔（基于摘要）
   * @param {Object} summary - 结构化摘要
   * @param {number} novelId - 小说ID
   * @param {number} chapterId - 章节ID
   * @param {Function} createForeshadowingFn - 创建伏笔的函数
   */
  const recordForeshadowing = async (summary, novelId, chapterId, createForeshadowingFn) => {
    if (!summary?.foreshadowing) return

    // 记录新埋设的伏笔
    for (const planted of summary.foreshadowing.planted || []) {
      try {
        await createForeshadowingFn({
          novelId,
          chapterId,
          type: 'planted',
          content: planted.content,
          importance: planted.importance || 'medium',
          relatedCharacters: planted.relatedTo ? [planted.relatedTo] : [],
          status: 'pending'
        })
      } catch (err) {
        console.error('记录伏笔失败:', err)
      }
    }

    // 标记已回收的伏笔
    for (const resolved of summary.foreshadowing.resolved || []) {
      try {
        // 这里需要根据内容查找对应的伏笔ID
        // 实际实现可能需要更复杂的匹配逻辑
      } catch (err) {
        console.error('标记伏笔回收失败:', err)
      }
    }
  }

  return {
    generating,
    structuredSummary,
    summaryStats,
    generateStructuredSummary,
    generatePlainSummary,
    applyCharacterChanges,
    recordForeshadowing
  }
}

/**
 * 构建结构化摘要提示词
 */
export function buildStructuredSummaryPrompt(chapter, novel) {
  return [
    {
      role: 'system',
      content: `你是一位专业的小说编辑，擅长提取章节的关键信息并生成结构化摘要。请仔细分析章节内容，提取以下信息：

1. 关键事件：本章发生的主要事件
2. 角色变化：角色的状态、关系、能力变化
3. 伏笔：埋设的新伏笔和回收的旧伏笔
4. 时间线：故事发生的时间、地点、持续时间
5. 世界观扩展：新出现的地点、概念、物品
6. 情感弧线：本章的情感走向
7. 下章暗示：为下章埋下的悬念或铺垫`
    },
    {
      role: 'user',
      content: `【小说信息】
书名：${novel.title}
风格：${novel.style?.join('、')}

【章节信息】
章节号：第${chapter.chapterNumber}章
标题：${chapter.title}

【章节内容】
${chapter.content}

请按以下JSON格式返回结构化摘要：
{
  "keyEvents": [
    "关键事件1",
    "关键事件2"
  ],
  "characterChanges": [
    {
      "character": "角色名",
      "change": "变化描述",
      "type": "status|relationship|ability"
    }
  ],
  "foreshadowing": {
    "planted": [
      {
        "content": "伏笔内容",
        "relatedTo": "相关角色或剧情",
        "importance": "high|medium|low"
      }
    ],
    "resolved": [
      {
        "content": "回收的伏笔内容",
        "plantedIn": "埋设章节"
      }
    ]
  },
  "timeline": {
    "time": "故事时间（如：修炼第3年春季）",
    "location": "主要地点",
    "duration": "持续时间"
  },
  "worldBuilding": {
    "newLocations": ["新地点1"],
    "newConcepts": ["新概念1"],
    "newItems": ["新物品1"]
  },
  "emotionalArc": "本章情感走向（如：紧张→希望→惊喜）",
  "nextChapterHints": ["下章暗示1"],
  "plainSummary": "简短摘要（50-100字）"
}

只返回JSON，不要其他文字。`
    }
  ]
}

/**
 * 批量生成结构化摘要
 * @param {Array} chapters - 章节列表
 * @param {Object} novel - 小说信息
 * @param {Function} generate - AI生成函数
 */
export async function batchGenerateStructuredSummaries(chapters, novel, generate) {
  const results = []
  
  for (const chapter of chapters) {
    try {
      const messages = buildStructuredSummaryPrompt(chapter, novel)
      const response = await generate(messages)
      
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        results.push({
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          summary: JSON.parse(jsonMatch[0])
        })
      }
    } catch (err) {
      console.error(`章节 ${chapter.chapterNumber} 摘要生成失败:`, err)
    }
  }
  
  return results
}

/**
 * 合并多个章节的结构化摘要
 */
export function mergeStructuredSummaries(summaries) {
  if (!summaries || summaries.length === 0) return null

  const merged = {
    keyEvents: [],
    characterChanges: [],
    foreshadowing: {
      planted: [],
      resolved: []
    },
    timeline: {
      startTime: '',
      endTime: '',
      locations: []
    },
    worldBuilding: {
      newLocations: [],
      newConcepts: [],
      newItems: []
    },
    chapterCount: summaries.length
  }

  summaries.forEach((s, index) => {
    const summary = s.summary || s
    
    // 合并关键事件
    if (summary.keyEvents) {
      merged.keyEvents.push(...summary.keyEvents.map(e => ({
        chapter: s.chapterNumber || index + 1,
        event: e
      })))
    }

    // 合并角色变化
    if (summary.characterChanges) {
      merged.characterChanges.push(...summary.characterChanges.map(c => ({
        ...c,
        chapter: s.chapterNumber || index + 1
      })))
    }

    // 合并伏笔
    if (summary.foreshadowing) {
      if (summary.foreshadowing.planted) {
        merged.foreshadowing.planted.push(...summary.foreshadowing.planted)
      }
      if (summary.foreshadowing.resolved) {
        merged.foreshadowing.resolved.push(...summary.foreshadowing.resolved)
      }
    }

    // 合并世界观扩展
    if (summary.worldBuilding) {
      if (summary.worldBuilding.newLocations) {
        merged.worldBuilding.newLocations.push(...summary.worldBuilding.newLocations)
      }
      if (summary.worldBuilding.newConcepts) {
        merged.worldBuilding.newConcepts.push(...summary.worldBuilding.newConcepts)
      }
      if (summary.worldBuilding.newItems) {
        merged.worldBuilding.newItems.push(...summary.worldBuilding.newItems)
      }
    }

    // 记录时间线
    if (summary.timeline) {
      if (index === 0) {
        merged.timeline.startTime = summary.timeline.time
      }
      if (index === summaries.length - 1) {
        merged.timeline.endTime = summary.timeline.time
      }
      if (summary.timeline.location) {
        merged.timeline.locations.push({
          chapter: s.chapterNumber || index + 1,
          location: summary.timeline.location
        })
      }
    }
  })

  // 去重
  merged.worldBuilding.newLocations = [...new Set(merged.worldBuilding.newLocations)]
  merged.worldBuilding.newConcepts = [...new Set(merged.worldBuilding.newConcepts)]
  merged.worldBuilding.newItems = [...new Set(merged.worldBuilding.newItems)]

  return merged
}
