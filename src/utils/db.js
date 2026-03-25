import Dexie from 'dexie'

const db = new Dexie('NovelAIDB')

// 数据库版本升级说明：
// v1: 基础表（novels, chapters）
// v2: 新增角色管理、伏笔管理、生成任务队列表
// v3: 新增剧情分支表、自定义世界观模板表
db.version(3).stores({
  novels: '++id, title, createdAt, updatedAt',
  chapters: '++id, novelId, chapterNumber, createdAt, updatedAt',
  // 角色表：存储小说角色信息及动态状态
  characters: '++id, novelId, name, type, createdAt, updatedAt',
  // 伏笔表：记录伏笔埋设和回收
  foreshadowing: '++id, novelId, type, status, createdAt, updatedAt',
  // 生成任务表：管理批量生成任务
  generationTasks: '++id, novelId, status, createdAt, updatedAt',
  // 时间线事件表：记录关键事件
  timelineEvents: '++id, novelId, chapterId, createdAt',
  // 剧情分支表：管理剧情分支
  plotBranches: '++id, novelId, type, status, createdAt, updatedAt',
  // 自定义世界观模板表
  worldTemplates: '++id, category, createdAt, updatedAt'
})

export default db
