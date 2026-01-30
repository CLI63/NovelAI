import Dexie from 'dexie'

const db = new Dexie('NovelAIDB')

db.version(1).stores({
  novels: '++id, title, createdAt, updatedAt',
  chapters: '++id, novelId, chapterNumber, createdAt, updatedAt',
})

export default db
