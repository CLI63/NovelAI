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
// v8: 新增后台任务表，章节表添加后处理状态字段
// v9: 新增小说圣经表，用于积累跨章节的结构化知识
db.version(8).stores({
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
  outlineEvents: '++id, novelId, plotLineId, order, createdAt, updatedAt',
  // 后台任务表：存储所有静默任务
  backgroundTasks: '++id, type, status, novelId, chapterId, createdAt, updatedAt'
})

db.version(9).stores({
  novels: '++id, title, createdAt, updatedAt',
  chapters: '++id, novelId, chapterNumber, createdAt, updatedAt',
  characters: '++id, novelId, name, type, createdAt, updatedAt',
  characterRelations: '++id, novelId, sourceId, targetId, type, createdAt, updatedAt',
  foreshadowing: '++id, novelId, type, status, createdAt, updatedAt',
  generationTasks: '++id, novelId, status, createdAt, updatedAt',
  timelineEvents: '++id, novelId, chapterId, createdAt',
  plotBranches: '++id, novelId, type, status, createdAt, updatedAt',
  worldTemplates: '++id, category, createdAt, updatedAt',
  inspirations: '++id, status, createdAt, updatedAt',
  bookmarks: '++id, novelId, chapterId, createdAt',
  annotations: '++id, novelId, chapterId, createdAt, updatedAt',
  outlines: '++id, novelId, type, createdAt, updatedAt',
  plotLines: '++id, novelId, type, status, createdAt, updatedAt',
  outlineEvents: '++id, novelId, plotLineId, order, createdAt, updatedAt',
  backgroundTasks: '++id, type, status, novelId, chapterId, createdAt, updatedAt',
  novelBibles: '++id, novelId, updatedAt'
})

export default db
