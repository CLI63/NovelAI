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
