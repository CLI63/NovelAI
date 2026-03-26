import Dexie from 'dexie'

const db = new Dexie('NovelAIDB')

// 数据库版本升级说明：
// v1: 基础表（novels, chapters）
// v2: 新增角色管理、伏笔管理、生成任务队列表
// v3: 新增剧情分支表、自定义世界观模板表
// v4: 新增灵感表
// v5: 新增书签表、批注表
// v6: 新增角色关系表
// v7: 新增大纲表、剧情线表、大纲事件表
db.version(7).stores({
  novels: '++id, title, createdAt, updatedAt',
  chapters: '++id, novelId, chapterNumber, createdAt, updatedAt',
  // 角色表：存储小说角色信息及动态状态
  characters: '++id, novelId, name, type, createdAt, updatedAt',
  // 角色关系表：存储角色之间的关系
  characterRelations: '++id, novelId, sourceId, targetId, type, createdAt, updatedAt',
  // 伏笔表：记录伏笔埋设和回收
  foreshadowing: '++id, novelId, type, status, createdAt, updatedAt',
  // 生成任务表：管理批量生成任务
  generationTasks: '++id, novelId, status, createdAt, updatedAt',
  // 时间线事件表：记录关键事件
  timelineEvents: '++id, novelId, chapterId, createdAt',
  // 剧情分支表：管理剧情分支
  plotBranches: '++id, novelId, type, status, createdAt, updatedAt',
  // 自定义世界观模板表
  worldTemplates: '++id, category, createdAt, updatedAt',
  // 灵感表：存储用户灵感和创意点
  inspirations: '++id, status, createdAt, updatedAt',
  // 书签表：存储阅读书签
  bookmarks: '++id, novelId, chapterId, createdAt',
  // 批注表：存储章节批注
  annotations: '++id, novelId, chapterId, createdAt, updatedAt',
  // 大纲表：存储小说大纲
  outlines: '++id, novelId, type, createdAt, updatedAt',
  // 剧情线表：存储主线/支线剧情
  plotLines: '++id, novelId, type, status, createdAt, updatedAt',
  // 大纲事件表：存储剧情线上的事件节点
  outlineEvents: '++id, novelId, plotLineId, order, createdAt, updatedAt'
})

export default db
