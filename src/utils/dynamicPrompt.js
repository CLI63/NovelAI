/**
 * 动态 Prompt 构建器
 * 根据小说类型、风格等动态调整生成提示词
 */

/**
 * 风格相关的写作规范
 */
const styleGuidelines = {
  '玄幻': `
【玄幻写作规范】
- 注重境界突破描写，要有仪式感和天地异象
- 功法名称要有意境（如：太虚剑诀、九转玄功、混沌真经）
- 战斗描写要有层次，先试探后全力，招式要有名号
- 突破时要有天地异象（雷劫、祥云、灵气汇聚）
- 境界差距要明显，高境界对低境界有压制
- 用词要大气磅礴，多用"天地"、"乾坤"、"苍穹"等`,

  '仙侠': `
【仙侠写作规范】
- 强调修仙之路的艰辛与机缘
- 注重道心、因果、劫难等概念
- 法宝、灵器要有来历和品阶
- 宗门、洞府、秘境等场景描写要仙气飘飘
- 人物对话要带几分仙风道骨
- 情节要体现求道之心的坚定`,

  '都市': `
【都市写作规范】
- 场景描写要贴近现实生活
- 对话要口语化，符合现代人说话习惯
- 人物关系要体现社会现实
- 情节发展要符合逻辑常理
- 可以融入职场、商战、情感等元素
- 注意时代背景和流行元素`,

  '言情': `
【言情写作规范】
- 注重情感细腻描写，心理活动要丰富
- 对话要有互动性和暧昧感
- 细节动作要传情（眼神、触碰、语气）
- 感情发展要有层次，循序渐进
- 适当设置误会、吃醋等情节
- 结尾要有甜蜜感或悬念`,

  '悬疑': `
【悬疑写作规范】
- 每章结尾要有悬念，吊读者胃口
- 线索要逐步释放，不能一次性揭示
- 人物要有隐藏面，不能一眼看穿
- 伏笔要前后呼应，草蛇灰线
- 节奏要紧凑，不能拖沓
- 真相揭示要出人意料但合情合理`,

  '科幻': `
【科幻写作规范】
- 科技设定要有理论基础，自圆其说
- 未来世界要有画面感和代入感
- 科技名词要专业但不晦涩
- 情节要体现科技与人性的冲突
- 宇宙、星系、文明等概念要宏大
- 注意科技发展的逻辑性`,

  '历史': `
【历史写作规范】
- 历史背景要考据准确
- 人物称谓、官职要符合时代
- 对话要半文半白，有古风
- 场景描写要有历史感
- 情节要符合历史逻辑
- 注意避讳和时代禁忌`,

  '武侠': `
【武侠写作规范】
- 武功招式要有名号和特点
- 江湖规矩、门派恩怨要清晰
- 人物要有侠义精神
- 打斗描写要精彩，招式分明
- 江湖黑话、切口要适当使用
- 恩怨情仇要分明`,

  '末世': `
【末世写作规范】
- 末世环境描写要压抑、绝望
- 人性在极端环境下的挣扎
- 资源匮乏、生存危机要体现
- 变异生物、丧尸等设定要合理
- 幸存者之间的信任与背叛
- 希望与绝望的交织`,

  '系统流': `
【系统流写作规范】
- 系统功能要清晰，有升级路线
- 任务发布和奖励要合理
- 系统提示要有特色（可以拟人化）
- 主角利用系统的方式要聪明
- 系统的限制和副作用要体现
- 避免系统过于万能导致无聊`
}

/**
 * 负面提示词
 */
const negativePrompts = {
  general: [
    '不要出现现代网络用语（如：yyds、绝绝子、栓Q等）',
    '不要出现逻辑矛盾',
    '不要重复之前的情节',
    '不要出现过于夸张的形容词堆砌',
    '不要出现明显的错别字和语病',
    '不要出现与设定矛盾的内容'
  ],
  
  specific: {
    '玄幻': [
      '不要出现西方魔法元素（如：魔法师、精灵、巨龙）',
      '不要出现科技产物（如：手机、电脑、汽车）',
      '不要出现现代地名和人名'
    ],
    '仙侠': [
      '不要出现西方奇幻元素',
      '不要出现科技产物',
      '不要出现过于现代的词汇'
    ],
    '都市': [
      '不要出现修仙元素',
      '不要出现超自然现象（除非设定允许）',
      '不要出现与时代不符的事物'
    ],
    '历史': [
      '不要出现现代物品',
      '不要出现穿越者才知道的历史（除非是穿越设定）',
      '不要出现现代思想和价值观'
    ],
    '科幻': [
      '不要出现修仙元素',
      '不要出现魔法元素',
      '不要出现与科技设定矛盾的内容'
    ]
  }
}

/**
 * 根据小说风格构建动态 Prompt
 * @param {Object} novel - 小说信息
 * @param {string} basePrompt - 基础提示词
 */
export function buildDynamicPrompt(novel, basePrompt = '') {
  let prompt = basePrompt

  // 获取小说风格
  const styles = novel.style || []
  
  // 添加风格相关的写作规范
  styles.forEach(style => {
    if (styleGuidelines[style]) {
      prompt += '\n' + styleGuidelines[style]
    }
  })

  // 添加负面提示词
  prompt += '\n\n【写作禁忌】\n'
  prompt += negativePrompts.general.join('\n')
  
  // 添加特定风格的负面提示词
  styles.forEach(style => {
    if (negativePrompts.specific[style]) {
      prompt += '\n' + negativePrompts.specific[style].join('\n')
    }
  })

  return prompt
}

/**
 * 获取风格特定的写作规范
 * @param {string} style - 风格名称
 */
export function getStyleGuideline(style) {
  return styleGuidelines[style] || ''
}

/**
 * 获取负面提示词
 * @param {Array} styles - 风格列表
 */
export function getNegativePrompts(styles = []) {
  let prompts = [...negativePrompts.general]
  
  styles.forEach(style => {
    if (negativePrompts.specific[style]) {
      prompts = prompts.concat(negativePrompts.specific[style])
    }
  })
  
  return prompts
}

/**
 * 构建角色相关的动态提示词
 * @param {Object} character - 角色信息
 */
export function buildCharacterPrompt(character) {
  let prompt = ''

  if (character.type === 'protagonist') {
    prompt += `\n【主角设定】
姓名：${character.name}
身份：${character.basicInfo?.identity || '未知'}
性格：${character.basicInfo?.personality || '未知'}
背景：${character.background || '未知'}
目标：${character.goals?.join('、') || '未知'}
特殊能力：${character.abilities?.join('、') || '无'}

写作要点：
- 主角出场要有存在感
- 体现主角的性格特点
- 主角的行为要符合其目标和动机
- 适当展现主角的特殊能力`
  } else if (character.type === 'antagonist') {
    prompt += `\n【反派设定】
姓名：${character.name}
身份：${character.basicInfo?.identity || '未知'}
性格：${character.basicInfo?.personality || '未知'}

写作要点：
- 反派要有自己的逻辑和动机
- 不要脸谱化，要有立体感
- 与主角的冲突要合理`
  }

  return prompt
}

/**
 * 构建世界观相关的动态提示词
 * @param {Object} worldSetting - 世界观设定
 */
export function buildWorldSettingPrompt(worldSetting) {
  if (!worldSetting) return ''

  let prompt = '\n【世界观设定】\n'

  if (worldSetting.era) {
    prompt += `时代背景：${worldSetting.era}\n`
  }
  if (worldSetting.location) {
    prompt += `主要地点：${worldSetting.location}\n`
  }
  if (worldSetting.powerSystem) {
    prompt += `力量体系：${worldSetting.powerSystem}\n`
  }
  if (worldSetting.socialStructure) {
    prompt += `社会结构：${worldSetting.socialStructure}\n`
  }
  if (worldSetting.specialElements) {
    prompt += `特殊元素：${worldSetting.specialElements}\n`
  }

  return prompt
}

/**
 * 构建剧情相关的动态提示词
 * @param {Object} plotLines - 剧情线
 * @param {number} currentProgress - 当前进度（0-1）
 */
export function buildPlotPrompt(plotLines, currentProgress = 0) {
  if (!plotLines) return ''

  let prompt = '\n【剧情走向】\n'
  
  prompt += `主线：${plotLines.main}\n`
  
  if (plotLines.sub && plotLines.sub.length > 0) {
    prompt += `支线：${plotLines.sub.join('、')}\n`
  }

  // 根据进度给出不同的提示
  if (currentProgress < 0.2) {
    prompt += '\n当前处于开篇阶段，注意：\n'
    prompt += '- 要有吸引读者的开头\n'
    prompt += '- 逐步展开世界观\n'
    prompt += '- 引入主要角色和矛盾\n'
  } else if (currentProgress < 0.5) {
    prompt += '\n当前处于发展阶段，注意：\n'
    prompt += '- 推进主线剧情\n'
    prompt += '- 发展支线情节\n'
    prompt += '- 深化人物关系\n'
  } else if (currentProgress < 0.8) {
    prompt += '\n当前处于高潮阶段，注意：\n'
    prompt += '- 矛盾冲突要激烈\n'
    prompt += '- 情节要有张力\n'
    prompt += '- 为结局做铺垫\n'
  } else {
    prompt += '\n当前处于收尾阶段，注意：\n'
    prompt += '- 回收伏笔\n'
    prompt += '- 解决主要矛盾\n'
    prompt += '- 给出合理的结局\n'
  }

  return prompt
}

/**
 * 智能构建完整的动态提示词
 * @param {Object} novel - 小说信息
 * @param {Object} options - 选项
 */
export function buildCompleteDynamicPrompt(novel, options = {}) {
  const {
    includeStyleGuidelines = true,
    includeNegativePrompts = true,
    includeCharacterPrompts = true,
    includeWorldSetting = true,
    includePlotGuidance = true,
    currentProgress = 0
  } = options

  let prompt = ''

  // 风格写作规范
  if (includeStyleGuidelines) {
    prompt += buildDynamicPrompt(novel, '')
  }

  // 世界观设定
  if (includeWorldSetting && novel.worldSetting) {
    prompt += buildWorldSettingPrompt(novel.worldSetting)
  }

  // 剧情引导
  if (includePlotGuidance && novel.plotLines) {
    prompt += buildPlotPrompt(novel.plotLines, currentProgress)
  }

  return prompt
}

/**
 * 导出风格列表
 */
export const availableStyles = Object.keys(styleGuidelines)

/**
 * 导出负面提示词模板
 */
export { negativePrompts, styleGuidelines }
