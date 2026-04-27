import db from './db'
import { characterDao, foreshadowingDao, chapterDao } from './dao'

/**
 * 小说圣经 —— 跨章节的结构化知识积累文档
 *
 * 每生成一章后自动更新，替代滑动窗口上下文。
 * 后续章节生成时作为背景知识传入 AI，保证长篇小说的人物/伏笔/世界观一致性。
 */

// ============ 外部 API ============

/**
 * 获取小说的圣经
 * @param {number} novelId
 * @returns {Promise<Object|null>}
 */
export async function getBible(novelId) {
  const bible = await db.novelBibles.where('novelId').equals(novelId).first()
  return bible?.data || null
}

/**
 * 重建（或刷新）整本圣经
 * 从现有的 characters / foreshadowing / chapters 等表中
 * 聚合最新数据，生成一份结构化圣经文档
 * @param {number} novelId
 * @returns {Promise<Object>}
 */
export async function rebuildBible(novelId) {
  const novel = await db.novels.get(novelId)
  if (!novel) return null

  const [
    characters,
    pendingForeshadowings,
    resolvedForeshadowings,
    chapters
  ] = await Promise.all([
    characterDao.getByNovelId(novelId),
    foreshadowingDao.getPending(novelId),
    foreshadowingDao.getByNovelId(novelId).then(list => list.filter(f => f.status === 'resolved')),
    chapterDao.getByNovelId(novelId)
  ])

  const bible = {
    updatedAt: new Date().toISOString(),
    novelId,
    summary: {
      title: novel.title,
      totalChapters: chapters.length,
      totalCharacters: characters.length,
      pendingForeshadowing: pendingForeshadowings.length,
      resolvedForeshadowing: resolvedForeshadowings.length
    },
    characters: buildCharacterSection(characters),
    foreshadowing: buildForeshadowingSection(pendingForeshadowings, resolvedForeshadowings),
    timeline: buildTimelineSection(chapters),
    worldTerms: extractWorldTerms(novel, chapters)
  }

  await saveBible(novelId, bible)
  return bible
}

/**
 * 增量更新圣经（每章生成后调用）
 * @param {number} novelId
 * @param {Object} chapterData - { id, chapterNumber, title, content }
 * @param {Object} [structuredSummary] - 可选的结构化摘要（含角色变化、新伏笔等）
 * @returns {Promise<Object>} 更新后的 bible
 */
export async function updateBibleAfterChapter(novelId, chapterData, structuredSummary = null) {
  let bible = await getBible(novelId)
  if (!bible) {
    return await rebuildBible(novelId)
  }

  // 更新概览统计
  bible.summary.totalChapters = (await chapterDao.getByNovelId(novelId)).length

  // 刷新角色章节
  bible.characters = buildCharacterSection(await characterDao.getByNovelId(novelId))

  // 刷新伏笔章节
  const [pending, resolved] = await Promise.all([
    foreshadowingDao.getPending(novelId),
    foreshadowingDao.getByNovelId(novelId).then(list => list.filter(f => f.status === 'resolved'))
  ])
  bible.foreshadowing = buildForeshadowingSection(pending, resolved)
  bible.summary.pendingForeshadowing = pending.length
  bible.summary.resolvedForeshadowing = resolved.length

  // 追加时间线事件（来自结构化摘要或章节内容）
  if (structuredSummary?.keyEvents?.length > 0) {
    bible.timeline.events.push(...structuredSummary.keyEvents.map(e => ({
      chapterNumber: chapterData.chapterNumber,
      title: chapterData.title,
      event: typeof e === 'string' ? e : e.description || '',
      characters: e.characters || []
    })))
  }

  // 提取新世界观词汇
  if (structuredSummary?.worldBuilding) {
    const wb = structuredSummary.worldBuilding
    if (wb.newLocations?.length > 0) {
      for (const loc of wb.newLocations) {
        if (!bible.worldTerms.locations.find(l => l.name === (typeof loc === 'string' ? loc : loc.name))) {
          bible.worldTerms.locations.push({ name: typeof loc === 'string' ? loc : loc.name, chapter: chapterData.chapterNumber })
        }
      }
    }
    if (wb.newConcepts?.length > 0) {
      for (const c of wb.newConcepts) {
        if (!bible.worldTerms.concepts.find(x => x.name === (typeof c === 'string' ? c : c.name))) {
          bible.worldTerms.concepts.push({ name: typeof c === 'string' ? c : c.name, chapter: chapterData.chapterNumber })
        }
      }
    }
  }

  bible.updatedAt = new Date().toISOString()
  await saveBible(novelId, bible)
  return bible
}

/**
 * 格式化圣经为 prompt 文本，供生成章节时作为上下文
 * @param {Object} bible
 * @param {number} [maxChars=3000]
 * @returns {string}
 */
export function formatBibleForPrompt(bible, maxChars = 3000) {
  if (!bible) return ''

  const parts = []

  // ---- 角色状态 ----
  if (bible.characters?.length > 0) {
    const lines = ['【角色当前状态】']
    for (const c of bible.characters) {
      lines.push(`  ${c.name}（${c.typeLabel}）：${c.location}，${c.condition}${c.power ? `，${c.power}` : ''}`)
    }
    parts.push(lines.join('\n'))
  }

  // ---- 伏笔概览 ----
  if (bible.foreshadowing) {
    const fLines = ['【伏笔状态】']
    if (bible.foreshadowing.pending.length > 0) {
      fLines.push(`  待回收（${bible.foreshadowing.pending.length} 个）：`)
      for (const f of bible.foreshadowing.pending.slice(0, 5)) {
        fLines.push(`    · [${f.importance}] ${f.content}`)
      }
    }
    if (bible.foreshadowing.resolved.length > 0) {
      fLines.push(`  已回收：${bible.foreshadowing.resolved.length} 个`)
    }
    parts.push(fLines.join('\n'))
  }

  // ---- 近期时间线 ----
  if (bible.timeline?.events?.length > 0) {
    const tLines = ['【近期事件】']
    const recent = bible.timeline.events.slice(-8)
    for (const e of recent) {
      tLines.push(`  第${e.chapterNumber}章 ${e.title || ''}：${typeof e.event === 'string' ? e.event.slice(0, 60) : ''}`)
    }
    parts.push(tLines.join('\n'))
  }

  // ---- 世界观词汇 ----
  if (bible.worldTerms) {
    const wLines = []
    if (bible.worldTerms.locations.length > 0) {
      wLines.push(`  地点：${bible.worldTerms.locations.map(l => l.name).join('、')}`)
    }
    if (bible.worldTerms.concepts.length > 0) {
      wLines.push(`  概念：${bible.worldTerms.concepts.map(c => c.name).join('、')}`)
    }
    if (wLines.length > 0) {
      parts.push('【世界观词汇】\n' + wLines.join('\n'))
    }
  }

  let result = parts.join('\n\n')
  if (result.length > maxChars) {
    result = result.slice(0, maxChars) + '\n...（因长度限制截断）'
  }
  return result
}

// ============ 内部方法 ============

async function saveBible(novelId, data) {
  const existing = await db.novelBibles.where('novelId').equals(novelId).first()
  const record = { novelId, data, updatedAt: new Date().toISOString() }
  if (existing) {
    await db.novelBibles.update(existing.id, record)
  } else {
    await db.novelBibles.add(record)
  }
}

function buildCharacterSection(characters) {
  return characters.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    typeLabel: ({ protagonist: '主角', supporting: '配角', antagonist: '反派', minor: '次要' })[c.type] || c.type,
    location: c.currentStatus?.location || '未知',
    condition: c.currentStatus?.condition || '正常',
    power: c.currentStatus?.powerLevel || '',
    relationships: (c.currentStatus?.relationships || []).slice(0, 5)
  }))
}

function buildForeshadowingSection(pending, resolved) {
  const sortByImportance = list => [...list].sort(
    (a, b) => ({ high: 0, medium: 1, low: 2 })[a.importance] - ({ high: 0, medium: 1, low: 2 })[b.importance]
  )
  return {
    pending: sortByImportance(pending).map(f => ({
      id: f.id,
      content: f.content,
      importance: f.importance,
      plantedInChapter: f.plantedInChapter || f.chapterNumber || f.chapterId
    })),
    resolved: resolved.map(f => ({
      content: f.content,
      resolvedIn: f.resolvedInChapterNumber || f.resolvedIn
    }))
  }
}

function buildTimelineSection(chapters) {
  return {
    events: chapters.sort((a, b) => a.chapterNumber - b.chapterNumber).map(c => ({
      chapterNumber: c.chapterNumber,
      title: c.title,
      event: c.summary ? c.summary.slice(0, 80) : `第${c.chapterNumber}章`,
      characters: []
    }))
  }
}

function extractWorldTerms(novel, chapters) {
  const locations = []
  const concepts = []

  // 从世界观设定中提取
  if (novel.worldSetting) {
    if (typeof novel.worldSetting === 'string') {
      const locs = novel.worldSetting.match(/[^\s，。、]{2,6}(?:大陆|城|国|山|河|湖|海|林|谷|洞|宫|殿|塔|寺)/g)
      if (locs) locs.forEach(l => { if (!locations.find(x => x.name === l)) locations.push({ name: l, chapter: 0 }) })
    } else if (novel.worldSetting.locations) {
      for (const loc of (Array.isArray(novel.worldSetting.locations) ? novel.worldSetting.locations : [novel.worldSetting.locations])) {
        const name = typeof loc === 'string' ? loc : loc.name
        if (name && !locations.find(x => x.name === name)) locations.push({ name, chapter: 0 })
      }
    }
  }

  return { locations, concepts }
}
