const INSPIRATION_BATCH_SIZE = 6
const INSPIRATION_HISTORY_LIMIT = 3

const GENRES = [
  '东方玄幻',
  '未来科幻',
  '都市异能',
  '悬疑推理',
  '历史权谋',
  '末世生存',
  '赛博朋克',
  '古风奇幻',
  '群像冒险',
  '轻喜剧都市',
  '克苏鲁悬疑',
  '种田经营',
]

const PROTAGONIST_TYPES = [
  '失业档案修复师',
  '低阶宗门账房',
  '退役机甲维修员',
  '被流放的王朝史官',
  '能听见城市记忆的外卖员',
  '冷门博物馆夜班保安',
  '末世水源测绘员',
  '过气游戏策划',
  '隐姓埋名的前朝女官',
  '负责处理异常遗物的实习生',
  '不会修炼却会做实验的药铺学徒',
  '专门替人写遗书的作家',
]

const CONFLICT_TYPES = [
  '守住一个即将被抹除的秘密',
  '在错误预言成真前改写因果',
  '用谎言维持一座城市的秩序',
  '找出亲友被替换的证据',
  '在资源崩坏前建立新的联盟',
  '对抗把记忆商品化的势力',
  '破解只针对普通人的超凡规则',
  '在敌对阵营中保护真正的继承人',
  '阻止主角自己未来造成的灾难',
  '把失败世界线里的幸存者带回现实',
]

const TWISTS = [
  '力量越强，越会失去一段真实记忆',
  '所有神明都只是旧时代留下的自动程序',
  '城市每天凌晨会随机交换一小块区域',
  '历史书会主动改写目击者的人生',
  '主角的金手指只会奖励善意的失败',
  '敌人并不想毁灭世界，而是在保护它不被唤醒',
  '每个普通职业都对应一条隐藏修炼途径',
  '梦境里的死亡会变成现实中的身份空缺',
  '灾难不是结束，而是一场长期筛选的开端',
  '所谓主线任务其实来自反派的求救信号',
]

const TONES = [
  '冷峻悬念',
  '热血成长',
  '温暖治愈',
  '黑色幽默',
  '史诗群像',
  '轻松爽感',
  '压迫感强',
  '浪漫诡谲',
  '现实锋利',
  '奇观冒险',
]

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5)
}

function pick(list, used = new Set()) {
  const candidates = shuffle(list).filter(item => !used.has(item))
  return candidates[0] || shuffle(list)[0]
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, '')
}

function getBigrams(value) {
  const text = normalizeText(value)
  if (text.length <= 1) return text ? [text] : []
  const tokens = []
  for (let index = 0; index < text.length - 1; index += 1) {
    tokens.push(text.slice(index, index + 2))
  }
  return tokens
}

function similarity(left, right) {
  const leftTokens = new Set(getBigrams(left))
  const rightTokens = new Set(getBigrams(right))
  if (!leftTokens.size || !rightTokens.size) return 0

  const overlap = [...leftTokens].filter(token => rightTokens.has(token)).length
  return overlap / Math.max(leftTokens.size, rightTokens.size)
}

function normalizeInspiration(item) {
  return {
    title: String(item?.title || '').trim(),
    description: String(item?.description || '').trim(),
    genre: String(item?.genre || '').trim(),
    protagonistType: String(item?.protagonistType || '').trim(),
    conflictType: String(item?.conflictType || '').trim(),
    twist: String(item?.twist || '').trim(),
  }
}

export { INSPIRATION_BATCH_SIZE, INSPIRATION_HISTORY_LIMIT }

export function createInspirationConstraints(count = INSPIRATION_BATCH_SIZE) {
  const usedGenres = new Set()
  const usedProtagonists = new Set()
  const usedConflicts = new Set()
  const usedTwists = new Set()
  const usedTones = new Set()

  return Array.from({ length: count }, (_, index) => {
    const genre = pick(GENRES, usedGenres)
    const protagonistType = pick(PROTAGONIST_TYPES, usedProtagonists)
    const conflictType = pick(CONFLICT_TYPES, usedConflicts)
    const twist = pick(TWISTS, usedTwists)
    const tone = pick(TONES, usedTones)

    usedGenres.add(genre)
    usedProtagonists.add(protagonistType)
    usedConflicts.add(conflictType)
    usedTwists.add(twist)
    usedTones.add(tone)

    return {
      index: index + 1,
      genre,
      protagonistType,
      conflictType,
      twist,
      tone,
    }
  })
}

export function summarizeInspirationBatch(batch) {
  return batch.map(item => {
    const inspiration = normalizeInspiration(item)
    return [
      inspiration.title,
      inspiration.genre,
      inspiration.protagonistType,
      inspiration.conflictType,
      inspiration.twist,
    ].filter(Boolean).join(' / ')
  })
}

export function buildNovelInspirationPrompt({ constraints, recentSummaries = [], count = INSPIRATION_BATCH_SIZE }) {
  const recentText = recentSummaries.length
    ? recentSummaries.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : '暂无'

  const constraintText = constraints.map(item => (
    `${item.index}. 题材：${item.genre}；主角身份：${item.protagonistType}；核心冲突：${item.conflictType}；设定反转：${item.twist}；叙事基调：${item.tone}`
  )).join('\n')

  return [
    {
      role: 'system',
      content: `你是一个小说创意策划助手，擅长给网络小说生成差异明显、可直接展开的灵感卡片。请严格返回 JSON 数组，不要使用 markdown 代码块。`,
    },
    {
      role: 'user',
      content: `请生成 ${count} 个小说创作灵感。每个灵感都必须按下方指定约束创作，彼此之间要明显不同，不要只是换标题重写同一个设定。

【本批差异化约束】
${constraintText}

【最近 3 批已经出现过的方向，必须主动避开】
${recentText}

【输出要求】
1. title：标题，2-8 个中文字符，避免泛泛而谈。
2. description：30-70 字，必须写出主角身份、核心冲突、独特设定钩子。
3. genre、protagonistType、conflictType、twist：必须按对应约束填写，便于前端去重。
4. 不要复用最近方向里的标题、主角身份、冲突钩子或设定反转。
5. 返回格式必须是 JSON 数组：
[{"title":"标题","description":"描述","genre":"题材","protagonistType":"主角身份","conflictType":"核心冲突","twist":"设定反转"}]`,
    },
  ]
}

export function parseInspirationResponse(response) {
  const jsonMatch = String(response || '').match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  const parsed = JSON.parse(jsonMatch[0])
  if (!Array.isArray(parsed)) return []

  return parsed
    .map(normalizeInspiration)
    .filter(item => item.title && item.description)
}

export function filterUniqueInspirations(items, existing = []) {
  const unique = []
  const pool = existing.map(normalizeInspiration).filter(item => item.title || item.description)

  for (const item of items.map(normalizeInspiration)) {
    const targets = [...pool, ...unique]
    const duplicated = targets.some(target => {
      const sameTitle = normalizeText(item.title) === normalizeText(target.title)
      const sameCore = item.protagonistType && item.conflictType
        && item.protagonistType === target.protagonistType
        && item.conflictType === target.conflictType
      const titleClose = similarity(item.title, target.title) >= 0.55
      const descriptionClose = similarity(item.description, target.description) >= 0.45
      const sameHook = item.conflictType && item.twist
        && item.conflictType === target.conflictType
        && item.twist === target.twist

      return sameTitle || sameCore || titleClose || descriptionClose || sameHook
    })

    if (!duplicated) {
      unique.push(item)
    }
  }

  return unique
}
