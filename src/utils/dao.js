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
