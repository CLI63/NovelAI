
/**
 * 灵感增强工具
 * 提供灵感扩写、灵感问答、灵感模板功能
 */

/**
 * 灵感模板库
 * 预设不同类型的小说灵感模板
 */
export const inspirationTemplates = {
  '玄幻': {
    keywords: ['修仙', '境界', '宗门', '灵根', '法宝', '丹药', '阵法', '灵兽'],
    template: {
      protagonist: {
        identity: '宗门弟子/散修/世家子弟',
        specialAbility: '特殊灵根/传承功法/神秘法宝',
        goal: '飞升成仙/复仇/寻找身世'
      },
      worldSetting: {
        era: '上古时期/远古时代',
        powerSystem: '练气→筑基→金丹→元婴→化神→渡劫→大乘',
        socialStructure: '宗门、家族、散修三足鼎立',
        specialElements: '灵根、法宝、丹药、阵法、灵兽'
      },
      plotHooks: [
        '主角获得神秘传承',
        '宗门大比一鸣惊人',
        '发现上古遗迹',
        '遭遇强敌追杀',
        '意外获得神兽蛋'
      ]
    }
  },

  '仙侠': {
    keywords: ['仙界', '道心', '因果', '劫难', '法宝', '洞府', '秘境'],
    template: {
      protagonist: {
        identity: '修仙者/仙人转世/天道之子',
        specialAbility: '先天道体/仙器认主/前世记忆',
        goal: '证道长生/了结因果/守护苍生'
      },
      worldSetting: {
        era: '仙凡共存的时代',
        powerSystem: '炼气→筑基→金丹→元婴→化神→合体→大乘→渡劫',
        socialStructure: '仙门、魔道、妖族三界鼎立',
        specialElements: '道心、因果、劫难、法宝、洞府'
      },
      plotHooks: [
        '前世记忆觉醒',
        '意外获得仙器',
        '卷入仙魔大战',
        '发现上古仙府',
        '道心受到考验'
      ]
    }
  },

  '都市': {
    keywords: ['都市', '职场', '商战', '情感', '现代', '都市生活'],
    template: {
      protagonist: {
        identity: '职场新人/创业者/专业人士',
        specialAbility: '特殊技能/人脉资源/系统辅助',
        goal: '事业成功/寻找真爱/改变命运'
      },
      worldSetting: {
        era: '现代都市',
        powerSystem: '无/商业实力/社会地位',
        socialStructure: '职场、商界、社交圈',
        specialElements: '职场竞争、商业博弈、情感纠葛'
      },
      plotHooks: [
        '意外获得重要机会',
        '遭遇职场危机',
        '与旧爱重逢',
        '卷入商业阴谋',
        '身份突然转变'
      ]
    }
  },

  '言情': {
    keywords: ['爱情', '情感', '甜蜜', '虐恋', 'CP', '恋爱'],
    template: {
      protagonist: {
        identity: '普通女孩/职场女性/学生',
        specialAbility: '特殊魅力/才艺/性格特点',
        goal: '寻找真爱/事业爱情双丰收'
      },
      worldSetting: {
        era: '现代/古代/架空',
        powerSystem: '无',
        socialStructure: '家庭、朋友圈、职场',
        specialElements: '情感纠葛、误会、甜蜜互动'
      },
      plotHooks: [
        '意外相遇产生误会',
        '契约关系假戏真做',
        '青梅竹马重逢',
        '欢喜冤家日常',
        '身份差距的阻碍'
      ]
    }
  },

  '科幻': {
    keywords: ['未来', '科技', '宇宙', '星际', 'AI', '机甲'],
    template: {
      protagonist: {
        identity: '星际探险家/科学家/机甲驾驶员',
        specialAbility: '特殊基因/科技改造/AI伙伴',
        goal: '探索宇宙/拯救人类/揭开真相'
      },
      worldSetting: {
        era: '未来/星际时代',
        powerSystem: '科技等级/基因等级/机甲等级',
        socialStructure: '星际联邦、各大势力、AI文明',
        specialElements: '星际旅行、外星文明、科技奇点'
      },
      plotHooks: [
        '发现未知星球',
        'AI觉醒事件',
        '星际战争爆发',
        '神秘信号出现',
        '基因突变危机'
      ]
    }
  },

  '历史': {
    keywords: ['古代', '朝代', '权谋', '历史', '穿越', '架空'],
    template: {
      protagonist: {
        identity: '皇子/将军/书生/穿越者',
        specialAbility: '现代知识/过人智谋/武艺高强',
        goal: '夺嫡/保家卫国/改变历史'
      },
      worldSetting: {
        era: '架空朝代/真实历史时期',
        powerSystem: '官职/爵位/军权',
        socialStructure: '皇室、世家、平民',
        specialElements: '权谋、战争、宫廷斗争'
      },
      plotHooks: [
        '穿越到关键历史节点',
        '卷入夺嫡之争',
        '边关战事突发',
        '发现惊天阴谋',
        '身份突然转变'
      ]
    }
  },

  '悬疑': {
    keywords: ['推理', '悬疑', '破案', '谜题', '真相', '侦探'],
    template: {
      protagonist: {
        identity: '侦探/警察/法医/普通人',
        specialAbility: '敏锐观察力/特殊直觉/专业知识',
        goal: '揭开真相/伸张正义'
      },
      worldSetting: {
        era: '现代/古代/架空',
        powerSystem: '无',
        socialStructure: '警方、犯罪组织、普通民众',
        specialElements: '谜题、线索、反转、真相'
      },
      plotHooks: [
        '离奇案件发生',
        '收到神秘信息',
        '发现关键线索',
        '证人突然失踪',
        '真凶出乎意料'
      ]
    }
  },

  '末世': {
    keywords: ['末世', '丧尸', '变异', '生存', '废土', '灾难'],
    template: {
      protagonist: {
        identity: '幸存者/军人/科学家',
        specialAbility: '特殊抗体/战斗技能/科技知识',
        goal: '生存/寻找避难所/拯救人类'
      },
      worldSetting: {
        era: '灾难后的未来',
        powerSystem: '变异能力/科技装备/战斗等级',
        socialStructure: '幸存者营地、掠夺者、变异生物',
        specialElements: '资源匮乏、变异生物、人性考验'
      },
      plotHooks: [
        '灾难突然降临',
        '发现安全避难所',
        '遭遇变异生物',
        '幸存者之间的背叛',
        '发现灾难真相'
      ]
    }
  },

  '系统流': {
    keywords: ['系统', '任务', '奖励', '升级', '金手指'],
    template: {
      protagonist: {
        identity: '普通人/穿越者',
        specialAbility: '系统辅助',
        goal: '完成系统任务/变强'
      },
      worldSetting: {
        era: '任意',
        powerSystem: '系统等级/任务奖励',
        socialStructure: '根据世界设定',
        specialElements: '系统任务、商城、抽奖、成就'
      },
      plotHooks: [
        '获得神秘系统',
        '完成首个任务',
        '系统升级解锁新功能',
        '隐藏任务触发',
        '系统出现异常'
      ]
    }
  }
}

/**
 * 构建灵感扩写提示词
 * @param {string} idea - 用户原始灵感
 * @param {string} style - 小说风格
 */
export function buildInspirationExpandPrompt(idea, style = '') {
  const styleInfo = style ? `\n目标风格：${style}` : ''
  
  return [
    {
      role: 'system',
      content: `你是一位资深的小说创作顾问，擅长将简短的灵感扩写成详细的创作需求文档。`
    },
    {
      role: 'user',
      content: `请将以下简短灵感扩写成详细的小说创作需求文档。${styleInfo}

用户灵感：${idea}

请按以下JSON格式返回结果：
{
  "title": "建议的小说标题（3-5个选项）",
  "coreIdea": "核心创意点（50字以内）",
  "style": ["主要风格", "次要风格"],
  "targetReader": "目标读者群体",
  "protagonistSuggestion": {
    "identity": "主角身份建议",
    "personality": "主角性格特点",
    "goal": "主角核心目标",
    "specialAbility": "主角特殊能力/金手指"
  },
  "worldSettingSuggestion": {
    "era": "时代背景",
    "location": "主要场景",
    "powerSystem": "力量体系（如有）",
    "specialElements": "特殊设定元素"
  },
  "plotOutline": {
    "opening": "开篇情节建议（100字）",
    "development": "发展情节建议（150字）",
    "climax": "高潮情节建议（100字）",
    "ending": "结局方向建议（50字）"
  },
  "highlights": ["亮点1", "亮点2", "亮点3"],
  "potentialIssues": ["可能的问题1", "可能的问题2"],
  "suggestions": ["创作建议1", "创作建议2"]
}

只返回JSON，不要其他文字。`
    }
  ]
}

/**
 * 构建灵感问答提示词
 * @param {string} idea - 用户原始灵感
 * @param {Object} currentSetting - 当前已确定的设定
 */
export function buildInspirationQAPrompt(idea, currentSetting = {}) {
  const settingInfo = Object.keys(currentSetting).length > 0 
    ? `\n当前已确定的设定：\n${JSON.stringify(currentSetting, null, 2)}` 
    : ''
  
  return [
    {
      role: 'system',
      content: `你是一位资深的小说创作顾问，擅长通过提问引导用户完善小说设定。你的问题应该：
1. 针对当前设定的不足之处
2. 帮助用户思考关键情节
3. 引导用户明确角色动机
4. 确保设定的完整性和逻辑性`
    },
    {
      role: 'user',
      content: `请根据以下灵感，提出3-5个关键问题来帮助完善设定。${settingInfo}

用户灵感：${idea}

请按以下JSON格式返回：
{
  "questions": [
    {
      "id": 1,
      "question": "问题内容",
      "reason": "为什么这个问题很重要",
      "options": ["建议选项1", "建议选项2", "建议选项3"]
    }
  ],
  "analysis": "当前设定的简要分析",
  "completeness": 60
}

只返回JSON，不要其他文字。`
    }
  ]
}

/**
 * 根据风格获取灵感模板
 * @param {string} style - 风格名称
 */
export function getInspirationTemplate(style) {
  return inspirationTemplates[style] || null
}

/**
 * 获取所有可用的灵感模板风格
 */
export function getAvailableTemplateStyles() {
  return Object.keys(inspirationTemplates)
}

/**
 * 应用灵感模板到用户灵感
 * @param {string} idea - 用户原始灵感
 * @param {string} style - 风格名称
 */
export function applyInspirationTemplate(idea, style) {
  const template = inspirationTemplates[style]
  if (!template) return null
  
  return {
    style,
    keywords: template.keywords,
    suggestions: template.template,
    prompt: `基于"${style}"类型的灵感模板，结合您的灵感"${idea}"，可以参考以下设定方向：

【主角设定建议】
- 身份：${template.template.protagonist.identity}
- 特殊能力：${template.template.protagonist.specialAbility}
- 核心目标：${template.template.protagonist.goal}

【世界观设定建议】
- 时代背景：${template.template.worldSetting.era}
- 力量体系：${template.template.worldSetting.powerSystem}
- 社会结构：${template.template.worldSetting.socialStructure}
- 特殊元素：${template.template.worldSetting.specialElements}

【情节钩子建议】
${template.template.plotHooks.map((hook, i) => `${i + 1}. ${hook}`).join('\n')}

【关键词参考】
${template.keywords.join('、')}`
  }
}

/**
 * 灵感增强组合式函数
 */
export function useInspirationEnhancer() {
  const expanding = ref(false)
  const asking = ref(false)
  const expandedIdea = ref(null)
  const questions = ref([])
  const selectedTemplate = ref(null)

  /**
   * 扩写灵感
   * @param {string} idea - 用户灵感
   * @param {string} style - 小说风格
   * @param {Function} generate - AI生成函数
   */
  const expandIdea = async (idea, style, generate) => {
    expanding.value = true
    try {
      const messages = buildInspirationExpandPrompt(idea, style)
      const response = await generate(messages)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        expandedIdea.value = JSON.parse(jsonMatch[0])
        return expandedIdea.value
      }
      return null
    } catch (err) {
      console.error('灵感扩写失败:', err)
      return null
    } finally {
      expanding.value = false
    }
  }

  /**
   * 获取引导问题
   * @param {string} idea - 用户灵感
   * @param {Object} currentSetting - 当前设定
   * @param {Function} generate - AI生成函数
   */
  const getGuidingQuestions = async (idea, currentSetting, generate) => {
    asking.value = true
    try {
      const messages = buildInspirationQAPrompt(idea, currentSetting)
      const response = await generate(messages)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        questions.value = result.questions
        return result
      }
      return null
    } catch (err) {
      console.error('获取引导问题失败:', err)
      return null
    } finally {
      asking.value = false
    }
  }

  /**
   * 选择灵感模板
   * @param {string} style - 风格名称
   */
  const selectTemplate = (style) => {
    selectedTemplate.value = getInspirationTemplate(style)
    return selectedTemplate.value
  }

  return {
    expanding,
    asking,
    expandedIdea,
    questions,
    selectedTemplate,
    expandIdea,
    getGuidingQuestions,
    selectTemplate,
    getInspirationTemplate,
    getAvailableTemplateStyles,
    applyInspirationTemplate,
    inspirationTemplates
  }
}
