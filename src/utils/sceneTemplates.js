/**
 * 场景模板库
 * 提供各类场景的写作模板和参考
 */

/**
 * 场景模板分类
 */
export const sceneCategories = [
  { key: 'combat', name: '打斗场景', icon: '⚔️' },
  { key: 'dialogue', name: '对话场景', icon: '💬' },
  { key: 'psychology', name: '心理描写', icon: '🧠' },
  { key: 'environment', name: '环境描写', icon: '🏔️' },
  { key: 'transition', name: '转场过渡', icon: '🔄' },
  { key: 'romance', name: '情感场景', icon: '💕' },
  { key: 'suspense', name: '悬疑场景', icon: '🔍' },
  { key: 'climax', name: '高潮场景', icon: '💥' },
]

/**
 * 打斗场景模板
 */
export const combatTemplates = [
  {
    id: 'combat-1',
    name: '单挑对决',
    description: '两个角色之间的正面对决',
    elements: ['对峙', '试探', '交锋', '转折', '胜负'],
    template: `【对峙】
两人相距数丈，目光如电。{角色A}缓缓拔出{武器}，{动作描写}。

【试探】
{角色A}率先发难，{招式名称}直取{角色B}要害。{角色B}{防御/闪避动作}，随即反击。

【交锋】
刀光剑影间，两人已过了{数量}招。{战斗细节描写}。

【转折】
就在此时，{转折事件}。{角色A/角色B}抓住机会，{关键一击}。

【胜负】
尘埃落定，{胜利者}{胜利描写}，{失败者}{失败描写}。`,
    tips: [
      '注意动作的连贯性和节奏感',
      '适当加入环境描写增强画面感',
      '通过心理活动展现角色状态',
      '战斗要有胜负悬念'
    ]
  },
  {
    id: 'combat-2',
    name: '群战场面',
    description: '多人混战的场景描写',
    elements: ['布局', '开战', '混战', '关键人物', '战局变化'],
    template: `【布局】
{战场环境}。{阵营A}与{阵营B}对峙，气氛剑拔弩张。

【开战】
一声令下，双方如潮水般涌向对方。{战斗爆发描写}。

【混战】
战场上{战斗细节}。{关键角色A}{战斗表现}，{关键角色B}{战斗表现}。

【关键人物】
突然，{重要角色}{关键行动}，战局为之一变。

【战局变化】
在{某因素}的影响下，{战局变化描写}。最终，{结果}。`,
    tips: [
      '群战要有层次感，不要平铺直叙',
      '聚焦关键人物的同时兼顾全局',
      '使用短句增强战斗节奏',
      '注意战斗中的光影、声音、气味等感官描写'
    ]
  },
  {
    id: 'combat-3',
    name: '偷袭暗战',
    description: '暗中偷袭或伏击场景',
    elements: ['潜伏', '时机', '出手', '反应', '结果'],
    template: `【潜伏】
{隐藏环境}。{角色}{隐藏状态}，{等待描写}。

【时机】
{目标角色}{行动}，露出了{破绽}。就是现在！

【出手】
{角色}如{比喻}般暴起，{攻击动作}直取{目标要害}。

【反应】
{目标角色}{反应描写}，{防御/闪避动作}。

【结果】
{偷袭结果}。{后续发展}。`,
    tips: [
      '偷袭前的紧张氛围很重要',
      '时机选择要有合理性',
      '被偷袭者的反应要符合人设',
      '可加入心理活动增强紧张感'
    ]
  }
]

/**
 * 对话场景模板
 */
export const dialogueTemplates = [
  {
    id: 'dialogue-1',
    name: '日常对话',
    description: '日常交流场景',
    elements: ['开场', '互动', '情绪变化', '结尾'],
    template: `【开场】
{场景环境}。{角色A}{动作}，开口道："{对话内容A}"

【互动】
{角色B}{反应动作}，{对话内容B}

{角色A}{对话内容A}

{角色B}{对话内容B}

【情绪变化】
话题渐渐{变化方向}，{角色A/角色B}{情绪变化描写}。

【结尾】
{对话收尾描写}。`,
    tips: [
      '对话要符合人物性格',
      '适当加入动作和神态描写',
      '对话节奏要有快慢变化',
      '避免对话过于书面化'
    ]
  },
  {
    id: 'dialogue-2',
    name: '冲突争论',
    description: '角色之间的争论或冲突',
    elements: ['矛盾起因', '争论', '升级', '高潮', '结果'],
    template: `【矛盾起因】
{触发事件}。{角色A}{情绪描写}，质问道："{对话内容A}"

【争论】
{角色B}{反应}，反驳道："{对话内容B}"

{角色A}{激烈反应}："{对话内容A}"

{角色B}{反驳}："{对话内容B}"

【升级】
双方的争执愈演愈烈，{冲突升级描写}。

【高潮】
{角色A/角色B}{情绪爆发}，{关键话语或行动}。

【结果】
{冲突结果}。{后续发展}。`,
    tips: [
      '争论要有合理的起因',
      '双方观点都要站得住脚',
      '情绪递进要有层次',
      '结果可以是和解、僵持或决裂'
    ]
  },
  {
    id: 'dialogue-3',
    name: '重要谈话',
    description: '揭示信息或推动剧情的重要对话',
    elements: ['氛围铺垫', '开场', '核心内容', '反应', '影响'],
    template: `【氛围铺垫】
{环境描写}，气氛{氛围形容词}。{角色A}{状态描写}，看向{角色B}。

【开场】
"{对话内容A}"，{角色A}{说话方式}。

{角色B}{反应}，{对话内容B}。

【核心内容】
{角色A}{重要内容揭示}："{对话内容A}"

{信息内容的详细描写或解释}

【反应】
{角色B}{震惊/惊讶/愤怒等反应}，{对话内容B}

【影响】
这番谈话{后续影响}。{结尾描写}。`,
    tips: [
      '氛围要配合谈话的重要性',
      '核心信息要有冲击力',
      '听者的反应要真实',
      '谈话结果要对剧情有推动作用'
    ]
  }
]

/**
 * 心理描写模板
 */
export const psychologyTemplates = [
  {
    id: 'psychology-1',
    name: '内心挣扎',
    description: '角色面临选择时的内心矛盾',
    elements: ['困境', '纠结', '回忆', '决定'],
    template: `【困境】
{角色}{面临的问题}，心中{情绪描写}。

【纠结】
一方面，{选项A的理由}；另一方面，{选项B的理由}。

{内心独白描写}

【回忆】
{角色}想起了{相关回忆}，{回忆内容}。

【决定】
经过一番挣扎，{角色}{最终决定}。{决定后的心理状态}。`,
    tips: [
      '纠结的理由要充分',
      '可通过回忆增加情感厚度',
      '决定要有说服力',
      '可加入身体反应描写'
    ]
  },
  {
    id: 'psychology-2',
    name: '情感爆发',
    description: '强烈的情绪宣泄',
    elements: ['压抑', '触发', '爆发', '余波'],
    template: `【压抑】
{角色}{压抑情绪的原因}，{外在表现}，但内心{内心真实状态}。

【触发】
{触发事件}，如同{比喻}，点燃了{角色}心中压抑已久的{情绪}。

【爆发】
{情绪爆发描写}

{心理独白}

{行为表现}

【余波】
{爆发后的状态}。{角色}{余波描写}。`,
    tips: [
      '压抑的描写要到位',
      '触发点要有合理性',
      '爆发要充分、真实',
      '爆发后要有余波'
    ]
  },
  {
    id: 'psychology-3',
    name: '顿悟觉醒',
    description: '角色在某个时刻的领悟',
    elements: ['迷茫', '契机', '顿悟', '改变'],
    template: `【迷茫】
{角色}{困惑或问题}，心中{迷茫状态描写}。

【契机】
{某个事件或话语}，让{角色}{触动描写}。

【顿悟】
如同{比喻}，{角色}突然{领悟内容}。

{顿悟的心理描写}

【改变】
{角色}{心态转变}，{行为变化}。`,
    tips: [
      '顿悟要有铺垫',
      '契机的选择很重要',
      '顿悟过程要有画面感',
      '改变要体现在行动上'
    ]
  }
]

/**
 * 环境描写模板
 */
export const environmentTemplates = [
  {
    id: 'environment-1',
    name: '自然风景',
    description: '自然环境场景描写',
    elements: ['整体印象', '细节描写', '氛围营造'],
    template: `【整体印象】
{季节/时间}，{地点}。{整体景象描写}。

【细节描写】
{天空描写}

{山/水/树等景物描写}

{声音/气味/触感等感官描写}

【氛围营造】
{氛围形容词}的气息弥漫开来，{角色}{在环境中的状态或感受}。`,
    tips: [
      '由远及近，由大到小',
      '调动多种感官',
      '环境要服务于情节和情绪',
      '避免堆砌形容词'
    ]
  },
  {
    id: 'environment-2',
    name: '城市街景',
    description: '城市环境场景描写',
    elements: ['整体景象', '建筑', '人物', '氛围'],
    template: `【整体景象】
{时间}，{城市名/区域}。{整体描写}。

【建筑】
{建筑描写}，{特色细节}。

【人物】
街上{人物活动描写}，{喧闹/安静等氛围}。

【氛围】
{城市氛围描写}。{角色}{在环境中的感受}。`,
    tips: [
      '城市要有特色',
      '注意时代的准确描写',
      '人物活动要符合场景',
      '氛围要与情节呼应'
    ]
  },
  {
    id: 'environment-3',
    name: '室内场景',
    description: '室内环境描写',
    elements: ['空间布局', '陈设细节', '氛围'],
    template: `【空间布局】
{房间名称}，{大小/结构描写}。

【陈设细节】
{主要家具或陈设描写}

{装饰或细节描写}

{光线描写}

【氛围】
室内{氛围形容词}，{气味/温度等}。{角色}{感受或行动}。`,
    tips: [
      '室内描写要符合角色身份',
      '细节要有生活气息',
      '氛围要配合情节',
      '可通过物品暗示人物性格'
    ]
  }
]

/**
 * 转场过渡模板
 */
export const transitionTemplates = [
  {
    id: 'transition-1',
    name: '时间过渡',
    description: '时间流逝的转场',
    elements: ['过渡句', '时间标记', '新场景引入'],
    template: `【时间过渡】
{时间过渡句}。

【变化概述】
{时间跨度内的变化概述}。

【新场景引入】
{新时间点的场景描写}。`,
    examples: [
      '光阴似箭，转眼间已是{时间段}之后。',
      '{季节}过去，{季节}到来，{时间}一晃而过。',
      '不知过了多久，当{角色}{动作}时，已是{时间}。'
    ],
    tips: [
      '时间过渡要自然',
      '可概括期间的重要事件',
      '新场景引入要流畅',
      '时间跨度要合理'
    ]
  },
  {
    id: 'transition-2',
    name: '空间转场',
    description: '地点变换的转场',
    elements: ['离开', '旅途(可选)', '到达'],
    template: `【离开】
{角色}{离开动作}，{离开描写}。

【旅途】
{旅途描写(可选)}。

【到达】
{新地点}，{到达场景描写}。`,
    examples: [
      '{角色}离开{地点}，一路{旅途描写}，终于来到了{新地点}。',
      '穿过{中间地点}，{角色}来到了{新地点}。'
    ],
    tips: [
      '转场要简洁有力',
      '可根据情节需要略写或详写旅途',
      '到达新场景要有画面感',
      '注意保持叙事节奏'
    ]
  },
  {
    id: 'transition-3',
    name: '视角转换',
    description: '不同角色视角的切换',
    elements: ['收尾', '过渡', '新视角引入'],
    template: `【收尾】
{前一视角的收尾描写}。

【过渡】
与此同时，{新地点}。

【新视角引入】
{新角色}{状态或行动}，{新视角的开场描写}。`,
    tips: [
      '视角切换要清晰',
      '可使用"与此同时"等过渡词',
      '新视角要有独立场景',
      '时间线要保持一致'
    ]
  }
]

/**
 * 情感场景模板
 */
export const romanceTemplates = [
  {
    id: 'romance-1',
    name: '相遇场景',
    description: '角色初次相遇或重逢',
    elements: ['环境', '相遇', '印象', '互动'],
    template: `【环境】
{相遇场景环境描写}。

【相遇】
{角色A}{行动}，突然{相遇触发事件}。

{相遇细节描写}

【印象】
{角色A}{对角色B的第一印象}。

{角色B}{对角色A的第一印象}。

【互动】
{两人的初次互动}。{结尾描写}。`,
    tips: [
      '相遇要有戏剧性',
      '第一印象要为后续发展铺垫',
      '互动要体现角色性格',
      '可暗示未来的关系发展'
    ]
  },
  {
    id: 'romance-2',
    name: '告白场景',
    description: '情感表达的关键时刻',
    elements: ['铺垫', '告白', '反应', '结果'],
    template: `【铺垫】
{场景环境}。{角色A}{心理状态}，下定决心{行动}。

【告白】
{角色A}{告白前的犹豫或紧张}。

"{告白内容}"

【反应】
{角色B}{震惊/惊讶/感动等反应}。

{反应描写}

【结果】
{告白结果}。{后续发展}。`,
    tips: [
      '场景选择要有意义',
      '告白方式要符合角色性格',
      '反应要真实自然',
      '结果要有后续影响'
    ]
  }
]

/**
 * 悬疑场景模板
 */
export const suspenseTemplates = [
  {
    id: 'suspense-1',
    name: '发现线索',
    description: '发现重要线索或秘密',
    elements: ['探索', '发现', '震惊', '疑问'],
    template: `【探索】
{角色}{探索环境或行动}，{心理状态}。

【发现】
{发现触发事件}。

{发现细节描写}

【震惊】
{角色}{震惊反应}，{心理活动}。

【疑问】
{产生的疑问}。{悬念铺垫}。`,
    tips: [
      '探索要有紧张感',
      '发现要出人意料',
      '线索要重要且有冲击力',
      '要留下新的疑问'
    ]
  },
  {
    id: 'suspense-2',
    name: '危机逼近',
    description: '危险即将来临的紧张时刻',
    elements: ['异常', '察觉', '紧张', '临危'],
    template: `【异常】
{角色}{察觉异常}，{异常细节}。

【察觉】
{角色}{警觉描写}，{内心独白}。

【紧张】
{紧张氛围描写}

{感官细节(声音、光线、气味等)}

【临危】
{危机爆发或逼近描写}。{悬念结尾}。`,
    tips: [
      '异常要细微但明显',
      '紧张氛围要层层递进',
      '感官细节很重要',
      '可使用短句增强节奏'
    ]
  }
]

/**
 * 高潮场景模板
 */
export const climaxTemplates = [
  {
    id: 'climax-1',
    name: '决战时刻',
    description: '故事高潮的决战场景',
    elements: ['对峙', '交锋', '转折', '胜负', '结局'],
    template: `【对峙】
{决战环境}。{角色A}与{角色B}{对峙描写}，气氛{氛围描写}。

【交锋】
{战斗开始}

{激烈交锋描写}

【转折】
{转折事件}，{战局变化}。

【胜负】
{胜负关键时刻}

{最终结果}

【结局】
{胜利方}{状态}，{失败方}{状态}。{后续影响}。`,
    tips: [
      '决战要有史诗感',
      '交锋要激烈且有层次',
      '转折要有戏剧性',
      '结局要有情感冲击'
    ]
  },
  {
    id: 'climax-2',
    name: '真相大白',
    description: '谜底揭示的关键时刻',
    elements: ['铺垫', '揭示', '震惊', '影响'],
    template: `【铺垫】
{场景环境}。{相关角色}{状态}，{紧张氛围描写}。

【揭示】
{揭示者}{揭示方式}："{揭示内容}"

{详细解释或证据}

【震惊】
{相关角色}{震惊反应}。

{心理活动}

【影响】
{真相揭示的影响}。{后续发展}。`,
    tips: [
      '铺垫要有紧张感',
      '揭示要有冲击力',
      '反应要充分',
      '影响要对剧情有重大推动'
    ]
  }
]

/**
 * 根据分类获取模板
 * @param {string} category - 分类key
 * @returns {Array} 模板列表
 */
export function getTemplatesByCategory(category) {
  const templateMap = {
    combat: combatTemplates,
    dialogue: dialogueTemplates,
    psychology: psychologyTemplates,
    environment: environmentTemplates,
    transition: transitionTemplates,
    romance: romanceTemplates,
    suspense: suspenseTemplates,
    climax: climaxTemplates
  }
  return templateMap[category] || []
}

/**
 * 获取所有模板
 * @returns {Object} 分类为key的模板对象
 */
export function getAllTemplates() {
  return {
    combat: combatTemplates,
    dialogue: dialogueTemplates,
    psychology: psychologyTemplates,
    environment: environmentTemplates,
    transition: transitionTemplates,
    romance: romanceTemplates,
    suspense: suspenseTemplates,
    climax: climaxTemplates
  }
}

/**
 * 根据ID获取模板
 * @param {string} templateId - 模板ID
 * @returns {Object|null} 模板对象
 */
export function getTemplateById(templateId) {
  const allTemplates = [
    ...combatTemplates,
    ...dialogueTemplates,
    ...psychologyTemplates,
    ...environmentTemplates,
    ...transitionTemplates,
    ...romanceTemplates,
    ...suspenseTemplates,
    ...climaxTemplates
  ]
  return allTemplates.find(t => t.id === templateId) || null
}

/**
 * 搜索模板
 * @param {string} keyword - 搜索关键词
 * @returns {Array} 匹配的模板列表
 */
export function searchTemplates(keyword) {
  if (!keyword || !keyword.trim()) {
    return []
  }

  const lowerKeyword = keyword.toLowerCase()
  const allTemplates = [
    ...combatTemplates,
    ...dialogueTemplates,
    ...psychologyTemplates,
    ...environmentTemplates,
    ...transitionTemplates,
    ...romanceTemplates,
    ...suspenseTemplates,
    ...climaxTemplates
  ]

  return allTemplates.filter(template =>
    template.name.toLowerCase().includes(lowerKeyword) ||
    template.description.toLowerCase().includes(lowerKeyword) ||
    template.elements.some(e => e.toLowerCase().includes(lowerKeyword))
  )
}

/**
 * 填充模板变量
 * @param {string} template - 模板字符串
 * @param {Object} variables - 变量对象
 * @returns {string} 填充后的内容
 */
export function fillTemplate(template, variables = {}) {
  let result = template

  // 替换 {变量名} 格式的占位符
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(regex, value || `[${key}]`)
  })

  return result
}

/**
 * 提取模板中的变量名
 * @param {string} template - 模板字符串
 * @returns {Array} 变量名列表
 */
export function extractTemplateVariables(template) {
  const regex = /\{([^}]+)\}/g
  const variables = new Set()

  let match
  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1])
  }

  return Array.from(variables)
}

export default {
  sceneCategories,
  combatTemplates,
  dialogueTemplates,
  psychologyTemplates,
  environmentTemplates,
  transitionTemplates,
  romanceTemplates,
  suspenseTemplates,
  climaxTemplates,
  getTemplatesByCategory,
  getAllTemplates,
  getTemplateById,
  searchTemplates,
  fillTemplate,
  extractTemplateVariables
}
