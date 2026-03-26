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
    return await db.chapters.add(chapter)
  },

  async update(id, chapter) {
    return await db.chapters.update(id, chapter)
  },

  async delete(id) {
    return await db.chapters.delete(id)
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
      .reverse()
      .sortBy('chapterNumber')
      .then(chapters => chapters.slice(0, count))
  },

  async getChapterSummaries(novelId, limit = 100) {
    return await db.chapters
      .where('novelId')
      .equals(novelId)
      .reverse()
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

  async markResolved(id, resolvedInChapterId) {
    return await db.foreshadowing.update(id, {
      status: 'resolved',
      resolvedIn: resolvedInChapterId,
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
export const inspirationDao = {
  async add(inspiration) {
    return await db.inspirations.add({
      ...inspiration,
      status: inspiration.status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  },

  async update(id, inspiration) {
    return await db.inspirations.update(id, {
      ...inspiration,
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
      .reverse()
      .sortBy('updatedAt')
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
