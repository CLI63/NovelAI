import db from './db'

export const novelDao = {
  async add(novel) {
    return await db.novels.add(novel)
  },

  async update(id, novel) {
    return await db.novels.update(id, novel)
  },

  async delete(id) {
    return await db.novels.delete(id)
  },

  async getById(id) {
    return await db.novels.get(id)
  },

  async getAll() {
    return await db.novels.toArray()
  },

  async getByTitle(title) {
    return await db.novels.where('title').equals(title).first()
  }
}

export const chapterDao = {
  async add(chapter) {
    const existing = await db.chapters
      .where({ novelId: chapter.novelId, chapterNumber: chapter.chapterNumber })
      .first()

    if (existing) {
      throw new Error(`第${chapter.chapterNumber}章已存在`)
    }

    return await db.chapters.add(chapter)
  },

  async update(id, chapter) {
    const current = await db.chapters.get(id)
    if (!current) return 0

    const targetNovelId = chapter.novelId ?? current.novelId
    const targetChapterNumber = chapter.chapterNumber ?? current.chapterNumber
    const existing = await db.chapters
      .where({ novelId: targetNovelId, chapterNumber: targetChapterNumber })
      .first()

    if (existing && existing.id !== id) {
      throw new Error(`第${targetChapterNumber}章已存在`)
    }

    return await db.chapters.update(id, chapter)
  },

  async delete(id) {
    return await db.chapters.delete(id)
  },

  async deleteCascade(id) {
    const chapter = await db.chapters.get(id)
    if (!chapter) return false

    // 统一的更新时间，确保级联修复后的关联数据时间戳一致。
    const updatedAt = new Date().toISOString()

    // 这些字段在旧版本库里没有索引，直接 where('field') 会导致 Dexie 抛出 SchemaError，
    // 因此这里改为遍历集合后按字段过滤，保证老数据也能正常删除章节。
    const deleteOutlineEventsByChapterId = db.outlineEvents
      .toCollection()
      .filter(event => event.chapterId === id)
      .delete()

    const deleteForeshadowingByChapterId = db.foreshadowing
      .toCollection()
      .filter(item => item.chapterId === id)
      .delete()

    const resetResolvedForeshadowing = db.foreshadowing
      .toCollection()
      .filter(item => item.resolvedIn === id)
      .modify({
        status: 'pending',
        resolvedIn: null,
        resolvedInChapterNumber: null,
        updatedAt
      })

    await Promise.all([
      db.backgroundTasks.where('chapterId').equals(id).delete(),
      db.bookmarks.where('chapterId').equals(id).delete(),
      db.annotations.where('chapterId').equals(id).delete(),
      deleteOutlineEventsByChapterId,
      deleteForeshadowingByChapterId,
      resetResolvedForeshadowing,
      db.characters.toCollection().modify(character => {
        if (!Array.isArray(character.appearances)) return
        const nextAppearances = character.appearances.filter(item => item.chapterId !== id)
        if (nextAppearances.length !== character.appearances.length) {
          character.appearances = nextAppearances
          character.updatedAt = updatedAt
        }
      }),
      db.timelineEvents.where('chapterId').equals(id).delete()
    ])

    await db.chapters.delete(id)
    return true
  },

  async getById(id) {
    return await db.chapters.get(id)
  },

  async getByNovelId(novelId) {
    return await db.chapters.where('novelId').equals(novelId).toArray()
  },

  async getByNovelIdAndChapterNumber(novelId, chapterNumber) {
    return await db.chapters.where({ novelId, chapterNumber }).first()
  },

  async getRecentChapters(novelId, count = 3) {
    return await db.chapters
      .where('novelId')
      .equals(novelId)
      .sortBy('chapterNumber')
      .then(chapters => chapters.slice(-count))
  },

  async getChapterSummaries(novelId, limit = 100) {
    return await db.chapters
      .where('novelId')
      .equals(novelId)
      .sortBy('chapterNumber')
      .then(chapters => chapters.slice(0, limit).map(ch => ({
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        summary: ch.summary
      })))
  }
}

/**
 * 角色数据访问对象
 * 用于管理小说角色的CRUD操作和状态追踪
 */
export const characterDao = {
  async add(character) {
    return await db.characters.add({
      ...character,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },

  async update(id, character) {
    return await db.characters.update(id, {
      ...character,
      updatedAt: new Date().toISOString()
    })
  },

  async delete(id) {
    return await db.characters.delete(id)
  },

  async getById(id) {
    return await db.characters.get(id)
  },

  async getByNovelId(novelId) {
    return await db.characters.where('novelId').equals(novelId).toArray()
  },

  async getByType(novelId, type) {
    return await db.characters
      .where('novelId')
      .equals(novelId)
      .and(c => c.type === type)
      .toArray()
  },

  async getProtagonist(novelId) {
    return await db.characters
      .where('novelId')
      .equals(novelId)
      .and(c => c.type === 'protagonist')
      .first()
  },

  async updateStatus(id, statusUpdate) {
    const character = await db.characters.get(id)
    if (!character) return null
    
    const currentStatus = character.currentStatus || {}
    const newStatus = { ...currentStatus, ...statusUpdate }
    
    return await db.characters.update(id, {
      currentStatus: newStatus,
      updatedAt: new Date().toISOString()
    })
  },

  async addAppearance(id, chapterId, events) {
    const character = await db.characters.get(id)
    if (!character) return null
    
    const appearances = character.appearances || []
    appearances.push({
      chapterId,
      events,
      timestamp: new Date().toISOString()
    })
    
    return await db.characters.update(id, {
      appearances,
      updatedAt: new Date().toISOString()
    })
  },

  async updateRelationship(id, targetId, relationshipUpdate) {
    const character = await db.characters.get(id)
    if (!character) return null
    
    const relationships = character.currentStatus?.relationships || []
    const existingIndex = relationships.findIndex(r => r.targetId === targetId)
    
    if (existingIndex >= 0) {
      relationships[existingIndex] = { ...relationships[existingIndex], ...relationshipUpdate }
    } else {
      relationships.push({ targetId, ...relationshipUpdate })
    }
    
    return await this.updateStatus(id, { relationships })
  },

  async batchAdd(characters) {
    const timestamp = new Date().toISOString()
    const charactersWithTimestamp = characters.map(c => ({
      ...c,
      createdAt: timestamp,
      updatedAt: timestamp
    }))
    return await db.characters.bulkAdd(charactersWithTimestamp)
  }
}

/**
 * 伏笔数据访问对象
 * 用于管理伏笔的埋设和回收
 */
export const foreshadowingDao = {
  async add(foreshadowing) {
    return await db.foreshadowing.add({
      ...foreshadowing,
      status: foreshadowing.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },

  async update(id, foreshadowing) {
    return await db.foreshadowing.update(id, {
      ...foreshadowing,
      updatedAt: new Date().toISOString()
    })
  },

  async delete(id) {
    return await db.foreshadowing.delete(id)
  },

  async getById(id) {
    return await db.foreshadowing.get(id)
  },

  async getByNovelId(novelId) {
    return await db.foreshadowing.where('novelId').equals(novelId).toArray()
  },

  async getPending(novelId) {
    return await db.foreshadowing
      .where('novelId')
      .equals(novelId)
      .and(f => f.status === 'pending')
      .toArray()
  },

  async getResolved(novelId) {
    return await db.foreshadowing
      .where('novelId')
      .equals(novelId)
      .and(f => f.status === 'resolved')
      .toArray()
  },

  async markResolved(id, resolvedInChapterId, resolvedInChapterNumber = null) {
    return await db.foreshadowing.update(id, {
      status: 'resolved',
      resolvedIn: resolvedInChapterId,
      resolvedInChapterNumber,
      updatedAt: new Date().toISOString()
    })
  },

  async getByImportance(novelId, importance) {
    const all = await this.getByNovelId(novelId)
    return all.filter(f => f.importance === importance)
  },

  async getHighImportancePending(novelId) {
    const pending = await this.getPending(novelId)
    return pending.filter(f => f.importance === 'high')
  }
}

/**
 * 时间线事件数据访问对象
 * 用于记录和查询关键事件
 */
export const timelineEventDao = {
  async add(event) {
    return await db.timelineEvents.add({
      ...event,
      createdAt: new Date().toISOString()
    })
  },

  async getByNovelId(novelId) {
    return await db.timelineEvents
      .where('novelId')
      .equals(novelId)
      .sortBy('createdAt')
  },

  async getByChapterId(chapterId) {
    return await db.timelineEvents
      .where('chapterId')
      .equals(chapterId)
      .toArray()
  },

  async deleteByChapterId(chapterId) {
    const events = await this.getByChapterId(chapterId)
    const ids = events.map(e => e.id)
    return await db.timelineEvents.bulkDelete(ids)
  },

  async getRecentEvents(novelId, limit = 10) {
    const events = await this.getByNovelId(novelId)
    return events.slice(-limit)
  }
}

/**
 * 生成任务数据访问对象
 * 用于管理批量生成任务队列
 */
export const generationTaskDao = {
  async add(task) {
    return await db.generationTasks.add({
      ...task,
      status: task.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },

  async update(id, task) {
    return await db.generationTasks.update(id, {
      ...task,
      updatedAt: new Date().toISOString()
    })
  },

  async delete(id) {
    return await db.generationTasks.delete(id)
  },

  async getById(id) {
    return await db.generationTasks.get(id)
  },

  async getByNovelId(novelId) {
    return await db.generationTasks
      .where('novelId')
      .equals(novelId)
      .toArray()
  },

  async getPending(novelId) {
    return await db.generationTasks
      .where('novelId')
      .equals(novelId)
      .and(t => t.status === 'pending')
      .toArray()
  },

  async getRunning(novelId) {
    return await db.generationTasks
      .where('novelId')
      .equals(novelId)
      .and(t => t.status === 'running')
      .toArray()
  },

  async updateTaskProgress(id, chapterIndex, status, content = null) {
    const task = await this.getById(id)
    if (!task) return null
    
    const chapters = task.chapters || []
    if (chapters[chapterIndex]) {
      chapters[chapterIndex].status = status
      if (content) {
        chapters[chapterIndex].content = content
      }
    }
    
    return await this.update(id, { chapters })
  },

  async markCompleted(id) {
    return await this.update(id, { status: 'completed' })
  },

  async markFailed(id, error) {
    return await this.update(id, { status: 'failed', error })
  },

  async markPaused(id) {
    return await this.update(id, { status: 'paused' })
  },

  async markRunning(id) {
    return await this.update(id, { status: 'running' })
  }
}

/**
 * 灵感数据访问对象
 * 用于管理用户灵感的CRUD操作
 */
/**
 * 清洗灵感数据，避免把 Vue 响应式代理对象直接写入 IndexedDB，触发 DataCloneError。
 * @param {Object} inspiration - 原始灵感数据
 */
const sanitizeInspirationPayload = (inspiration = {}) => {
  let sanitizedInspiration = {}

  try {
    sanitizedInspiration = JSON.parse(JSON.stringify(inspiration || {}))
  } catch {
    sanitizedInspiration = {}
  }

  return sanitizedInspiration
}

const normalizeInspirationForCreate = (inspiration = {}) => {
  const payload = sanitizeInspirationPayload(inspiration)

  return {
    ...payload,
    title: String(payload.title || ''),
    content: String(payload.content || ''),
    tags: Array.isArray(payload.tags)
      ? payload.tags.map(tag => String(tag).trim()).filter(Boolean)
      : [],
    style: payload.style ? String(payload.style) : ''
  }
}

const normalizeInspirationForUpdate = (inspiration = {}) => {
  const payload = sanitizeInspirationPayload(inspiration)
  delete payload.id

  // 局部更新只规范传入字段，避免保存扩写内容时误清空原始灵感。
  if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
    payload.title = String(payload.title || '')
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'content')) {
    payload.content = String(payload.content || '')
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'tags')) {
    payload.tags = Array.isArray(payload.tags)
      ? payload.tags.map(tag => String(tag).trim()).filter(Boolean)
      : []
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'style')) {
    payload.style = payload.style ? String(payload.style) : ''
  }

  return payload
}

export const inspirationDao = {
  async add(inspiration) {
    // 写库前先转成普通对象，确保 Dexie / IndexedDB 可以安全克隆。
    const payload = normalizeInspirationForCreate(inspiration)

    return await db.inspirations.add({
      ...payload,
      status: payload.status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },

  async update(id, inspiration) {
    // 更新时只清洗传入字段，支持 expandedContent、score、status 等局部写入。
    const payload = normalizeInspirationForUpdate(inspiration)

    return await db.inspirations.update(id, {
      ...payload,
      updatedAt: new Date().toISOString()
    })
  },

  async delete(id) {
    return await db.inspirations.delete(id)
  },

  async getById(id) {
    return await db.inspirations.get(id)
  },

  async getAll() {
    return await db.inspirations.orderBy('updatedAt').reverse().toArray()
  },

  async getByStatus(status) {
    return await db.inspirations
      .where('status')
      .equals(status)
      .sortBy('updatedAt')
      .then(items => items.reverse())
  },

  async getDrafts() {
    return await this.getByStatus('draft')
  },

  async getCompleted() {
    return await this.getByStatus('completed')
  },

  async getArchived() {
    return await this.getByStatus('archived')
  },

  async search(keyword) {
    if (!keyword?.trim()) {
      return await this.getAll()
    }
    const all = await this.getAll()
    const lowerKeyword = keyword.toLowerCase()
    return all.filter(item =>
      item.title?.toLowerCase().includes(lowerKeyword) ||
      item.content?.toLowerCase().includes(lowerKeyword) ||
      item.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword))
    )
  },

  async markAsCompleted(id) {
    return await this.update(id, { status: 'completed' })
  },

  async markAsArchived(id) {
    return await this.update(id, { status: 'archived' })
  },

  async markAsDraft(id) {
    return await this.update(id, { status: 'draft' })
  },

  async updateScore(id, score) {
    return await this.update(id, { score })
  },

  async getByTag(tag) {
    const all = await this.getAll()
    return all.filter(item => item.tags?.includes(tag))
  },

  async getTags() {
    const all = await this.getAll()
    const tagsSet = new Set()
    all.forEach(item => {
      item.tags?.forEach(tag => tagsSet.add(tag))
    })
    return Array.from(tagsSet)
  },

  async batchDelete(ids) {
    return await db.inspirations.bulkDelete(ids)
  }
}

/**
 * 书签数据访问对象
 * 用于管理阅读书签
 */
export const bookmarkDao = {
  async add(bookmark) {
    return await db.bookmarks.add({
      ...bookmark,
      createdAt: new Date().toISOString()
    })
  },

  async delete(id) {
    return await db.bookmarks.delete(id)
  },

  async getById(id) {
    return await db.bookmarks.get(id)
  },

  async getByNovelId(novelId) {
    return await db.bookmarks.where('novelId').equals(novelId).sortBy('createdAt')
  },

  async getByChapterId(novelId, chapterId) {
    return await db.bookmarks
      .where('novelId')
      .equals(novelId)
      .and(b => b.chapterId === chapterId)
      .toArray()
  },

  async updateNote(id, note) {
    return await db.bookmarks.update(id, { note })
  },

  async deleteByNovelId(novelId) {
    const bookmarks = await this.getByNovelId(novelId)
    return await db.bookmarks.bulkDelete(bookmarks.map(b => b.id))
  }
}

/**
 * 批注数据访问对象
 * 用于管理章节批注
 */
export const annotationDao = {
  async add(annotation) {
    return await db.annotations.add({
      ...annotation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },

  async update(id, annotation) {
    return await db.annotations.update(id, {
      ...annotation,
      updatedAt: new Date().toISOString()
    })
  },

  async delete(id) {
    return await db.annotations.delete(id)
  },

  async getById(id) {
    return await db.annotations.get(id)
  },

  async getByNovelId(novelId) {
    return await db.annotations.where('novelId').equals(novelId).sortBy('createdAt')
  },

  async getByChapterId(novelId, chapterId) {
    return await db.annotations
      .where('novelId')
      .equals(novelId)
      .and(a => a.chapterId === chapterId)
      .toArray()
  },

  async deleteByNovelId(novelId) {
    const annotations = await this.getByNovelId(novelId)
    return await db.annotations.bulkDelete(annotations.map(a => a.id))
  }
}

/**
 * 角色关系数据访问对象
 * 用于管理角色之间的关系
 */
export const characterRelationDao = {
  async add(relation) {
    return await db.characterRelations.add({
      ...relation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },

  async update(id, relation) {
    return await db.characterRelations.update(id, {
      ...relation,
      updatedAt: new Date().toISOString()
    })
  },

  async delete(id) {
    return await db.characterRelations.delete(id)
  },

  async getById(id) {
    return await db.characterRelations.get(id)
  },

  async getByNovelId(novelId) {
    return await db.characterRelations.where('novelId').equals(novelId).toArray()
  },

  async getByCharacterId(characterId) {
    // 获取与该角色相关的所有关系（作为源角色或目标角色）
    const allRelations = await db.characterRelations.toArray()
    return allRelations.filter(
      r => r.sourceId === characterId || r.targetId === characterId
    )
  },

  async getRelationBetween(sourceId, targetId) {
    // 检查两个方向的关系
    const allRelations = await db.characterRelations.toArray()
    return allRelations.find(
      r => (r.sourceId === sourceId && r.targetId === targetId) ||
           (r.sourceId === targetId && r.targetId === sourceId)
    )
  },

  async batchAdd(relations) {
    const timestamp = new Date().toISOString()
    const relationsWithTimestamp = relations.map(r => ({
      ...r,
      createdAt: timestamp,
      updatedAt: timestamp
    }))
    return await db.characterRelations.bulkAdd(relationsWithTimestamp)
  },

  async deleteByNovelId(novelId) {
    const relations = await this.getByNovelId(novelId)
    return await db.characterRelations.bulkDelete(relations.map(r => r.id))
  },

  async deleteByCharacterId(characterId) {
    const relations = await this.getByCharacterId(characterId)
    return await db.characterRelations.bulkDelete(relations.map(r => r.id))
  }
}

/**
 * 大纲数据访问对象
 * 用于管理小说大纲
 */
export const outlineDao = {
  async add(outline) {
    return await db.outlines.add({
      ...outline,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },

  async update(id, outline) {
    return await db.outlines.update(id, {
      ...outline,
      updatedAt: new Date().toISOString()
    })
  },

  async delete(id) {
    return await db.outlines.delete(id)
  },

  async getById(id) {
    return await db.outlines.get(id)
  },

  async getByNovelId(novelId) {
    return await db.outlines.where('novelId').equals(novelId).toArray()
  },

  async getByType(novelId, type) {
    return await db.outlines
      .where('novelId')
      .equals(novelId)
      .and(o => o.type === type)
      .first()
  },

  async getMainOutline(novelId) {
    return await this.getByType(novelId, 'main')
  }
}

/**
 * 剧情线数据访问对象
 * 用于管理主线/支线剧情
 */
export const plotLineDao = {
  async add(plotLine) {
    return await db.plotLines.add({
      ...plotLine,
      status: plotLine.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },

  async update(id, plotLine) {
    return await db.plotLines.update(id, {
      ...plotLine,
      updatedAt: new Date().toISOString()
    })
  },

  async delete(id) {
    // 删除关联的事件
    const events = await db.outlineEvents.where('plotLineId').equals(id).toArray()
    await db.outlineEvents.bulkDelete(events.map(e => e.id))
    return await db.plotLines.delete(id)
  },

  async getById(id) {
    return await db.plotLines.get(id)
  },

  async getByNovelId(novelId) {
    return await db.plotLines.where('novelId').equals(novelId).sortBy('createdAt')
  },

  async getMainPlotLines(novelId) {
    return await db.plotLines
      .where('novelId')
      .equals(novelId)
      .and(p => p.type === 'main')
      .sortBy('createdAt')
  },

  async getMainPlotLine(novelId) {
    return await db.plotLines
      .where('novelId')
      .equals(novelId)
      .and(p => p.type === 'main')
      .first()
  },

  async getSubPlotLines(novelId) {
    return await db.plotLines
      .where('novelId')
      .equals(novelId)
      .and(p => p.type === 'sub')
      .sortBy('createdAt')
  },

  async getByStatus(novelId, status) {
    return await db.plotLines
      .where('novelId')
      .equals(novelId)
      .and(p => p.status === status)
      .toArray()
  },

  async reorder(novelId, plotLineIds) {
    const updates = plotLineIds.map((id, index) => ({
      key: id,
      changes: { order: index, updatedAt: new Date().toISOString() }
    }))
    for (const update of updates) {
      await db.plotLines.update(update.key, update.changes)
    }
    return true
  }
}

/**
 * 大纲事件数据访问对象
 * 用于管理剧情线上的事件节点
 */
export const outlineEventDao = {
  async add(event) {
    return await db.outlineEvents.add({
      ...event,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },

  async update(id, event) {
    return await db.outlineEvents.update(id, {
      ...event,
      updatedAt: new Date().toISOString()
    })
  },

  async delete(id) {
    return await db.outlineEvents.delete(id)
  },

  async getById(id) {
    return await db.outlineEvents.get(id)
  },

  async getByPlotLineId(plotLineId) {
    return await db.outlineEvents.where('plotLineId').equals(plotLineId).sortBy('order')
  },

  async getByNovelId(novelId) {
    return await db.outlineEvents.where('novelId').equals(novelId).sortBy('order')
  },

  async getByChapterId(chapterId) {
    return await db.outlineEvents
      .where('chapterId')
      .equals(chapterId)
      .toArray()
  },

  async reorder(plotLineId, eventIds) {
    const updates = eventIds.map((id, index) => ({
      key: id,
      changes: { order: index, updatedAt: new Date().toISOString() }
    }))
    for (const update of updates) {
      await db.outlineEvents.update(update.key, update.changes)
    }
    return true
  },

  async batchAdd(events) {
    const timestamp = new Date().toISOString()
    const eventsWithTimestamp = events.map((e, i) => ({
      ...e,
      order: e.order ?? i,
      createdAt: timestamp,
      updatedAt: timestamp
    }))
    return await db.outlineEvents.bulkAdd(eventsWithTimestamp)
  },

  async deleteByPlotLineId(plotLineId) {
    const events = await this.getByPlotLineId(plotLineId)
    return await db.outlineEvents.bulkDelete(events.map(e => e.id))
  }
}
