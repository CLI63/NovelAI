/**
 * 统一的章节后处理器
 *
 * 整合全本生成、单章生成、后台任务三条路径共用同一套后处理逻辑，
 * 确保行为一致。处理项：
 *   1. 生成结构化摘要（AI）
 *   2. 提取新伏笔（AI）
 *   3. 更新角色出场记录
 *   4. 更新角色状态
 *   5. 检查伏笔回收
 *   6. 记录时间线事件
 *   7. 应用结构化摘要中的角色变化
 *   8. 记录结构化摘要中的新伏笔
 */
import { characterDao, foreshadowingDao, timelineEventDao } from './dao'
import { buildStructuredSummaryPrompt } from '@/composables/useStructuredSummary'
import { updateBibleAfterChapter } from './novelBible'

/**
 * 执行完整的章节后处理流水线
 * @param {Object} ctx
 * @param {Object} ctx.novel        - 小说对象
 * @param {Object} ctx.chapter      - 章节对象（含 id, content, chapterNumber, title）
 * @param {Function} ctx.callAI     - AI 调用函数 (messages) => Promise<string>
 * @returns {Promise<Object>} results - 每项处理的 success/count/error
 */
export async function processChapter(ctx) {
  const { novel, chapter, callAI } = ctx
  const { id: chapterId, content, chapterNumber } = chapter
  const novelId = novel.id

  const results = {
    structuredSummary: { success: false, error: null },
    foreshadowingExtract: { success: false, error: null, count: 0 },
    characterAppearance: { success: false, error: null, count: 0 },
    characterStatus: { success: false, error: null },
    foreshadowingResolution: { success: false, error: null, count: 0 },
    timeline: { success: false, error: null, count: 0 },
    characterChanges: { success: false, error: null, count: 0 },
    newForeshadowing: { success: false, error: null, count: 0 },
    novelBible: { success: false, error: null }
  }

  // ===== 1. 生成结构化摘要 =====
  let structuredSummary = null
  try {
    const messages = buildStructuredSummaryPrompt(
      { content, chapterNumber, title: chapter.title || '' },
      novel
    )
    const response = await callAI(messages)
    if (response) {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        structuredSummary = normalizeStructuredSummary(JSON.parse(jsonMatch[0]))
        results.structuredSummary.success = true
      }
    }
  } catch (err) {
    results.structuredSummary.error = err.message
    console.warn('生成结构化摘要失败:', err)
  }

  // ===== 2. AI 提取新伏笔 =====
  try {
    const newForeshadowings = await extractForeshadowing(content, chapterId, novelId, callAI, chapter.title, chapterNumber)
    const savedCount = await persistExtractedForeshadowings(newForeshadowings, novelId, chapterId)
    if (savedCount > 0) {
      results.foreshadowingExtract.success = true
      results.foreshadowingExtract.count = savedCount
    } else {
      results.foreshadowingExtract.success = true
    }
  } catch (err) {
    results.foreshadowingExtract.error = err.message
    console.warn('提取伏笔失败:', err)
  }

  // ===== 3. 更新角色出场记录 =====
  try {
    const appeared = await updateCharacterAppearances(content, chapterId, novelId)
    if (appeared.length > 0) {
      results.characterAppearance.success = true
      results.characterAppearance.count = appeared.length
    } else {
      results.characterAppearance.success = true
    }
  } catch (err) {
    results.characterAppearance.error = err.message
    console.warn('更新角色出场记录失败:', err)
  }

  // ===== 4. 更新角色状态 =====
  try {
    await updateCharacterStatuses(content, novelId)
    results.characterStatus.success = true
  } catch (err) {
    results.characterStatus.error = err.message
    console.warn('更新角色状态失败:', err)
  }

  // ===== 5. 检查伏笔回收 =====
  try {
    const resolved = await checkForeshadowingResolution(content, novelId, chapterId, chapterNumber)
    if (resolved.length > 0) {
      results.foreshadowingResolution.success = true
      results.foreshadowingResolution.count = resolved.length
    } else {
      results.foreshadowingResolution.success = true
    }
  } catch (err) {
    results.foreshadowingResolution.error = err.message
    console.warn('检查伏笔回收失败:', err)
  }

  // ===== 6. 记录时间线事件 =====
  try {
    const count = await recordTimelineEvents(content, chapterId, chapterNumber, novelId)
    if (count > 0) {
      results.timeline.success = true
      results.timeline.count = count
    } else {
      results.timeline.success = true
    }
  } catch (err) {
    results.timeline.error = err.message
    console.warn('记录时间线事件失败:', err)
  }

  // ===== 7. 应用结构化摘要中的角色变化 =====
  if (structuredSummary?.characterChanges?.length > 0) {
    let changeCount = 0
    for (const change of structuredSummary.characterChanges) {
      try {
        const characterId = await resolveCharacterId(change, novelId)
        if (characterId) {
          const current = await characterDao.getById(characterId)
          const nextNotes = [current?.notes, `${change.type || 'status'}：${change.change}`]
            .filter(Boolean)
            .join('\n')
          await characterDao.update(characterId, {
            ...current,
            notes: nextNotes
          })
          changeCount++
        }
      } catch (e) {
        console.warn('更新角色变化失败:', e)
      }
    }
    results.characterChanges.success = true
    results.characterChanges.count = changeCount
  } else {
    results.characterChanges.success = true
  }

  // ===== 8. 记录结构化摘要中的新伏笔 =====
  if (structuredSummary?.foreshadowing?.planted?.length > 0) {
    let foreshadowCount = 0
    for (const f of structuredSummary.foreshadowing.planted) {
      try {
        if (f.content) {
          await foreshadowingDao.add({
            novelId,
            content: f.content,
            chapterId,
            importance: f.importance || 'medium',
            relatedCharacters: f.relatedTo ? [f.relatedTo] : [],
            status: 'pending'
          })
          foreshadowCount++
        }
      } catch (e) {
        console.warn('创建伏笔记录失败:', e)
      }
    }
    results.newForeshadowing.success = true
    results.newForeshadowing.count = foreshadowCount
  } else {
    results.newForeshadowing.success = true
  }

  // ===== 9. 更新小说圣经 =====
  try {
    await updateBibleAfterChapter(novelId, {
      id: chapterId,
      chapterNumber,
      title: chapter.title || '',
      content
    }, structuredSummary)
    results.novelBible.success = true
  } catch (err) {
    results.novelBible.error = err.message
    console.warn('更新小说圣经失败:', err)
  }

  return results
}

/**
 * AI 提取伏笔
 */
async function extractForeshadowing(content, chapterId, novelId, callAI, title, chapterNumber) {
  try {
    const characters = await characterDao.getByNovelId(novelId)
    const prompt = buildForeshadowingExtractionPrompt(content, title || '', chapterNumber || 0, characters)
    const response = await callAI(prompt)
    return parseForeshadowingResponse(response)
  } catch {
    return []
  }
}

async function persistExtractedForeshadowings(items, novelId, chapterId) {
  if (!Array.isArray(items) || items.length === 0) return 0

  let savedCount = 0
  for (const item of items) {
    const content = String(item?.content || '').trim()
    if (!content) continue

    await foreshadowingDao.add({
      novelId,
      chapterId,
      content,
      type: item.type || 'planted',
      importance: item.importance || 'medium',
      description: item.description || '',
      relatedCharacters: Array.isArray(item.relatedCharacters) ? item.relatedCharacters : [],
      keywords: Array.isArray(item.keywords) ? item.keywords : extractKeywords(content),
      status: 'pending'
    })
    savedCount++
  }

  return savedCount
}

/**
 * 从内容中匹配角色并记录出场
 */
async function updateCharacterAppearances(content, chapterId, novelId) {
  const allCharacters = await characterDao.getByNovelId(novelId)
  const appeared = []

  for (const char of allCharacters) {
    const escapedName = char.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const nameRegex = new RegExp(escapedName, 'g')
    const matches = content.match(nameRegex)

    if (matches && matches.length > 0) {
      const events = extractCharacterEvents(content, char.name)
      await characterDao.addAppearance(char.id, chapterId, events)
      appeared.push({
        id: char.id, name: char.name,
        appearanceCount: matches.length, events
      })
    }
  }

  return appeared
}

/**
 * 从内容中更新角色状态
 */
async function updateCharacterStatuses(content, novelId) {
  const allCharacters = await characterDao.getByNovelId(novelId)

  for (const char of allCharacters) {
    if (!content.includes(char.name)) continue

    const escapedName = char.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const statusUpdate = {}

    // 检测位置变化
    const locationPatterns = [
      /来到[了]?([^，。！？]{2,10})/,
      /到达[了]?([^，。！？]{2,10})/,
      /出现在([^，。！？]{2,10})/,
      /身处([^，。！？]{2,10})/
    ]
    for (const pattern of locationPatterns) {
      const match = content.match(new RegExp(escapedName + pattern.source))
      if (match) { statusUpdate.location = match[1]; break }
    }

    // 检测状态变化
    const conditionPatterns = [
      { regex: /受伤|负伤|重伤/, condition: '受伤' },
      { regex: /恢复|痊愈|康复/, condition: '正常' },
      { regex: /死亡|牺牲|陨落/, condition: '死亡' },
      { regex: /突破|晋升|进阶/, condition: '突破' }
    ]
    for (const { regex, condition } of conditionPatterns) {
      if (new RegExp(escapedName + regex.source).test(content)) {
        statusUpdate.condition = condition; break
      }
    }

    if (Object.keys(statusUpdate).length > 0) {
      await characterDao.updateStatus(char.id, statusUpdate)
    }
  }
}

/**
 * 关键词匹配检查伏笔回收
 */
async function checkForeshadowingResolution(content, novelId, chapterId, chapterNumber) {
  const pendingForeshadowings = await foreshadowingDao.getPending(novelId)
  const resolved = []

  for (const fs of pendingForeshadowings) {
    if (fs.chapterId === chapterId) continue
    const keywords = fs.keywords || extractKeywords(fs.content)
    if (keywords.length === 0) continue
    const matchCount = keywords.filter(k => content.includes(k)).length
    if (matchCount / keywords.length >= 0.5) {
      await foreshadowingDao.markResolved(fs.id, chapterId, chapterNumber)
      resolved.push(fs)
    }
  }

  return resolved
}

/**
 * 记录时间线事件
 */
async function recordTimelineEvents(content, chapterId, chapterNumber, novelId) {
  const allChars = await characterDao.getByNovelId(novelId)
  const sentences = content.split(/[。！？\n]+/).filter(s => s.trim().length > 10)
  let createdCount = 0

  for (const sentence of sentences.slice(0, 5)) {
    const hasChar = allChars.some(c => sentence.includes(c.name))
    if (!hasChar) continue

    await timelineEventDao.add({
      novelId,
      chapterId,
      chapterNumber,
      title: sentence.trim().slice(0, 30) + '...',
      content: sentence.trim(),
      order: createdCount
    })
    createdCount++
  }

  return createdCount
}

async function resolveCharacterId(change, novelId) {
  if (change.characterId) return change.characterId

  const characterName = String(change.character || '').trim()
  if (!characterName) return null

  const characters = await characterDao.getByNovelId(novelId)
  const matched = characters.find(item => item.name === characterName)
  return matched?.id || null
}

// ============ 工具函数 ============

function normalizeStructuredSummary(raw) {
  return {
    keyEvents: raw.keyEvents || [],
    characterChanges: (raw.characterChanges || []).map(c => ({
      character: c.character || c.name,
      change: c.change || c.changes,
      type: c.type || 'status'
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

function extractCharacterEvents(content, characterName) {
  const events = []
  const sentences = content.split(/[。！？\n]/)
  for (const sentence of sentences) {
    if (sentence.includes(characterName)) {
      const trimmed = sentence.trim()
      if (trimmed.length > 5 && trimmed.length < 100) {
        events.push(trimmed)
      }
    }
  }
  return events.slice(0, 5)
}

function extractKeywords(text) {
  if (!text || typeof text !== 'string') return []
  const keywords = []
  const words = text.match(/[一-龥]{2,4}/g) || []
  const stopWords = ['这是', '那是', '他的', '她的', '我的', '这个', '那个', '但是', '因为', '所以', '如果', '虽然']
  for (const word of words) {
    if (!stopWords.includes(word) && !keywords.includes(word)) {
      keywords.push(word)
    }
  }
  return keywords.slice(0, 5)
}

function buildForeshadowingExtractionPrompt(content, title, chapterNumber, characters) {
  const charNames = characters.map(c => c.name).join('、')
  return [
    {
      role: 'system',
      content: '你是一个专业的小说伏笔分析师。分析章节内容，找出作者埋设的伏笔。每个伏笔需要包含：内容、类型、重要性、相关角色、关键词。'
    },
    {
      role: 'user',
      content: JSON.stringify({
        content,
        title,
        chapterNumber,
        characters: charNames,
        format: {
          foreshadowings: [
            {
              content: '伏笔描述',
              type: 'mystery|hint|promise|fate|identity|revenge|treasure|plot',
              importance: 'high|medium|low',
              description: '详细说明',
              relatedCharacters: ['角色名'],
              keywords: ['关键词1', '关键词2']
            }
          ]
        }
      })
    }
  ]
}

function parseForeshadowingResponse(response) {
  try {
    let jsonStr = response.trim()
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)

    const parsed = JSON.parse(jsonStr.trim())
    if (parsed.foreshadowings && Array.isArray(parsed.foreshadowings)) {
      return parsed.foreshadowings
    }
    return []
  } catch {
    return []
  }
}
