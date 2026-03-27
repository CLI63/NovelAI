export const prompts = {
  novelOverview: `你是一位资深的小说创作顾问，拥有丰富的文学创作经验和世界观构建能力。请根据用户提供的灵感，创作一部完整且专业的小说概览。

【创作要求】：
1. 构建完整的世界观和背景设定
2. 设计鲜明的人物角色
3. 规划引人入胜的剧情线
4. 制定合理的章节结构

请严格按照以下JSON格式返回结果（不要添加任何额外文字）：
{
  "title": "小说书名（要有吸引力，符合类型风格）",
  "description": "小说简介（200-300字，要包含：背景设定、主角身份、核心冲突、故事看点，要有吸引读者的钩子）",
  "style": ["主要风格", "次要风格", "题材类型"],
  "estimatedWords": "预估总字数（如：100万字）",
  "worldSetting": {
    "era": "故事时代背景",
    "location": "主要故事发生地点",
    "powerSystem": "力量体系/等级设定（如修仙等级、魔法体系等，无则填'无'）",
    "socialStructure": "社会结构/势力分布",
    "specialElements": "特殊设定或独特元素"
  },
  "characters": {
    "protagonist": {
      "name": "主角姓名",
      "age": "年龄",
      "identity": "身份/职业",
      "personality": "性格特点（3-5个词）",
      "background": "背景故事（50-100字）",
      "goal": "核心目标/动机",
      "specialAbility": "特殊能力/金手指（无则填'无'）"
    },
    "supportingCharacters": [
      {
        "name": "配角姓名",
        "identity": "与主角关系/身份",
        "personality": "性格特点",
        "role": "在故事中的作用"
      }
    ]
  },
  "plotLines": {
    "main": "主线剧情描述（150-200字，包含起因、发展、高潮、结局的脉络）",
    "sub": ["支线1：描述", "支线2：描述", "支线3：描述"]
  },
  "conflicts": {
    "external": "外部冲突（主角面对的外部障碍/敌人）",
    "internal": "内部冲突（主角内心的矛盾/成长）"
  },
  "outline": [
    {
      "volume": "第一卷名称（要有吸引力）",
      "chapters": 章节数量,
      "summary": "本卷概要（100-150字，包含主要事件、人物成长、剧情推进）"
    }
  ],
  "chapterStructure": {
    "totalChapters": 总章节数,
    "minWordsPerChapter": 每章最小字数,
    "maxWordsPerChapter": 每章最大字数
  }
}

【风格标签参考】：
玄幻、仙侠、都市、科幻、历史、军事、言情、悬疑、恐怖、武侠、游戏、竞技、灵异、同人、奇幻、末世、系统流、重生流、穿越流、种田文、爽文、虐文、甜宠

【字数规划参考】：
- 短篇：10-30万字，每章2000-3000字
- 中篇：30-80万字，每章2000-4000字
- 长篇：80万字以上，每章3000-5000字

用户灵感：`,

  // 分步生成 - 第一步：基础设定
  step1BasicSetting: `你是一位资深的小说创作顾问。请根据用户提供的灵感，生成小说的基础设定。

请严格按照以下JSON格式返回结果（不要添加任何额外文字）：
{
  "title": "小说书名（要有吸引力，符合类型风格）",
  "style": ["主要风格", "次要风格", "题材类型"],
  "estimatedWords": "预估总字数（如：100万字）",
  "worldSetting": {
    "era": "故事时代背景",
    "location": "主要故事发生地点",
    "powerSystem": "力量体系/等级设定（如修仙等级、魔法体系等，无则填'无'）",
    "socialStructure": "社会结构/势力分布",
    "specialElements": "特殊设定或独特元素"
  },
  "description": "小说简介（200-300字，要包含：背景设定、主角身份、核心冲突、故事看点）"
}

【风格标签参考】：
玄幻、仙侠、都市、科幻、历史、军事、言情、悬疑、恐怖、武侠、游戏、竞技、灵异、同人、奇幻、末世、系统流、重生流、穿越流、种田文、爽文、虐文、甜宠

用户灵感：`,

  // 分步生成 - 第二步：角色设定
  step2Characters: `你是一位资深的小说创作顾问。请根据已有的基础设定，设计小说的角色。

请严格按照以下JSON格式返回结果（不要添加任何额外文字）：
{
  "protagonist": {
    "name": "主角姓名",
    "age": "年龄",
    "identity": "身份/职业",
    "personality": "性格特点（3-5个词）",
    "background": "背景故事（50-100字）",
    "goal": "核心目标/动机",
    "specialAbility": "特殊能力/金手指（无则填'无'）"
  },
  "supportingCharacters": [
    {
      "name": "配角姓名",
      "identity": "与主角关系/身份",
      "personality": "性格特点",
      "role": "在故事中的作用"
    }
  ],
  "antagonists": [
    {
      "name": "反派姓名",
      "identity": "身份",
      "personality": "性格特点",
      "threat": "对主角的威胁"
    }
  ]
}

请设计3-5个重要配角和1-2个主要反派。`,

  // 分步生成 - 第三步：剧情大纲
  step3PlotOutline: `你是一位资深的小说创作顾问。请根据已有的基础设定和角色设定，规划小说的剧情大纲。

请严格按照以下JSON格式返回结果（不要添加任何额外文字）：
{
  "plotLines": {
    "main": "主线剧情描述（150-200字，包含起因、发展、高潮、结局的脉络）",
    "sub": ["支线1：描述", "支线2：描述", "支线3：描述"]
  },
  "conflicts": {
    "external": "外部冲突（主角面对的外部障碍/敌人）",
    "internal": "内部冲突（主角内心的矛盾/成长）"
  },
  "outline": [
    {
      "volume": "第一卷名称（要有吸引力）",
      "chapters": 章节数量,
      "summary": "本卷概要（100-150字，包含主要事件、人物成长、剧情推进）"
    }
  ],
  "chapterStructure": {
    "totalChapters": 总章节数,
    "minWordsPerChapter": 每章最小字数,
    "maxWordsPerChapter": 每章最大字数
  }
}

请规划3-5个分卷，每卷包含合理的章节数量。`,

  chapterGeneration: `你是一位专业的小说创作助手。根据提供的小说信息和上下文，生成指定数量的章节内容。

重要：只返回JSON格式的结果，不要包含任何其他文字、标记或说明。

返回格式（必须严格遵守）：
{
  "chapters": [
    {
      "title": "章节标题",
      "content": "章节正文内容",
      "summary": "章节总结"
    }
  ]
}

【字数要求 - 最重要】：
- 每章内容字数是硬性要求，必须达到指定的最少字数
- 如果字数不足，必须通过以下方式扩充：
  * 增加详细的环境描写（天气、光线、气味、声音等）
  * 丰富人物对话（加入更多互动、争论、幽默元素）
  * 深化心理描写（内心独白、情绪变化、回忆联想）
  * 扩展动作细节（战斗过程、日常动作的细致刻画）
  * 增加场景转换和过渡段落
  * 加入背景故事和世界观介绍
  * 描写人物外貌、服饰、神态变化

【内容质量要求】：
1. 章节内容要符合小说风格和剧情走向
2. 章节之间要有连贯性
3. 章节总结要精炼（50-100字），便于后续生成时快速回顾
4. 每章都要有完整的情节发展，有起承转合
5. 必须确保JSON格式完整且有效

【写作技巧】：
- 使用多种修辞手法：比喻、拟人、排比、夸张等
- 注重感官描写：视觉、听觉、嗅觉、触觉、味觉
- 合理运用插叙、倒叙等叙事手法
- 适当设置悬念和伏笔
- 人物对话要符合角色性格，有个性化特征

小说信息：`,

  chapterRegeneration: `你是一位专业的小说创作助手。根据用户的反馈和提示词，重新生成章节内容。

请按照以下JSON格式返回结果：
{
  "title": "章节标题",
  "content": "章节正文内容",
  "summary": "章节总结（50-100字，精炼概括本章主要情节）"
}

用户反馈：`,

  /**
   * 伏笔提取提示词
   * 用于从章节内容中自动识别和提取伏笔
   */
  foreshadowingExtraction: `你是一位资深的小说编辑，擅长分析和识别小说中的伏笔。请仔细分析提供的章节内容，提取其中埋设的伏笔。

【伏笔识别标准】：
1. 悬念性伏笔：暗示未来事件、留下疑问、引起读者好奇
2. 角色伏笔：角色身份的秘密、隐藏的能力、潜在的关系
3. 物品伏笔：特殊物品的出现、物品的特殊属性
4. 环境伏笔：场景的细节暗示、氛围的铺垫
5. 对话伏笔：角色对话中的暗示、预言、警告
6. 情节伏笔：事件的伏线、因果的暗示

【重要判断原则】：
- 只有明确的伏笔才提取，不要过度解读
- 伏笔应该有明确的"埋设"特征，而非普通的情节描述
- 区分伏笔和普通情节推进
- 只提取**跨章节**的伏笔，本章节内已回收的伏笔不提取（如悬念在本章已揭晓，则不应作为伏笔记录）
- 提取的伏笔应该是埋设后需要在未来章节中回收的，而非本章已经完成的

请严格按照以下JSON格式返回结果（不要添加任何额外文字）：
{
  "foreshadowings": [
    {
      "content": "伏笔的具体内容描述（简洁明了，20-50字）",
      "type": "伏笔类型（suspense/character/item/environment/dialogue/plot）",
      "importance": "重要性（high/medium/low）",
      "description": "伏笔的详细说明（包括为什么这是伏笔，可能的回收方向）",
      "suggestedResolution": "建议的回收方式（50-100字）",
      "suggestedChapterRange": "建议回收章节范围（如：5-10章后）",
      "relatedCharacters": ["相关角色名称"],
      "keywords": ["关键词"]
    }
  ]
}

如果章节中没有明显的伏笔，返回：
{
  "foreshadowings": []
}

【重要性判断标准】：
- high：对主线剧情有重大影响，必须在后续回收
- medium：对支线剧情或角色发展有影响
- low：细节伏笔，可选回收

章节内容：`,
}

/**
 * 构建分步生成 - 第一步提示词
 * @param {string} idea - 用户灵感
 */
export function buildStep1Prompt(idea) {
  return [
    {
      role: 'system',
      content: '你是一位专业的小说创作助手，擅长根据用户灵感生成小说基础设定。'
    },
    {
      role: 'user',
      content: prompts.step1BasicSetting + idea
    }
  ]
}

/**
 * 构建分步生成 - 第二步提示词
 * @param {Object} basicSetting - 基础设定
 */
export function buildStep2Prompt(basicSetting) {
  return [
    {
      role: 'system',
      content: '你是一位专业的小说创作助手，擅长设计小说角色。'
    },
    {
      role: 'user',
      content: `已有基础设定：
书名：${basicSetting.title}
风格：${basicSetting.style?.join('、')}
世界观：${JSON.stringify(basicSetting.worldSetting, null, 2)}
简介：${basicSetting.description}

${prompts.step2Characters}`
    }
  ]
}

/**
 * 构建分步生成 - 第三步提示词
 * @param {Object} basicSetting - 基础设定
 * @param {Object} characters - 角色设定
 */
export function buildStep3Prompt(basicSetting, characters) {
  let characterInfo = ''
  
  if (characters.protagonist) {
    characterInfo += `主角：${characters.protagonist.name}（${characters.protagonist.identity}）\n`
    characterInfo += `背景：${characters.protagonist.background}\n`
    characterInfo += `目标：${characters.protagonist.goal}\n\n`
  }
  
  if (characters.supportingCharacters?.length > 0) {
    characterInfo += `重要配角：\n`
    characters.supportingCharacters.slice(0, 3).forEach(c => {
      characterInfo += `- ${c.name}（${c.identity}）：${c.role}\n`
    })
  }

  return [
    {
      role: 'system',
      content: '你是一位专业的小说创作助手，擅长规划小说剧情大纲。'
    },
    {
      role: 'user',
      content: `已有设定：
书名：${basicSetting.title}
风格：${basicSetting.style?.join('、')}
世界观：${JSON.stringify(basicSetting.worldSetting, null, 2)}

角色：
${characterInfo}

${prompts.step3PlotOutline}`
    }
  ]
}

/**
 * 合并分步生成的结果
 * @param {Object} step1Result - 第一步结果
 * @param {Object} step2Result - 第二步结果
 * @param {Object} step3Result - 第三步结果
 */
export function mergeStepResults(step1Result, step2Result, step3Result) {
  return {
    title: step1Result?.title || '',
    description: step1Result?.description || '',
    style: step1Result?.style || [],
    estimatedWords: step1Result?.estimatedWords || '',
    worldSetting: step1Result?.worldSetting || {},
    characters: {
      protagonist: step2Result?.protagonist || null,
      supportingCharacters: step2Result?.supportingCharacters || []
    },
    plotLines: step3Result?.plotLines || { main: '', sub: [] },
    conflicts: step3Result?.conflicts || {},
    outline: step3Result?.outline || [],
    chapterStructure: step3Result?.chapterStructure || {}
  }
}

export function buildNovelOverviewPrompt(idea) {
  const messages = []

  // 系统角色设定
  messages.push({
    role: 'system',
    content: '你是一位专业的小说创作助手，擅长根据用户灵感生成完整的小说概览。',
  })

  // 用户灵感
  messages.push({
    role: 'user',
    content: prompts.novelOverview + idea,
  })

  return messages
}

export function buildChapterGenerationPrompt(
  novel,
  recentChapters,
  chapterSummaries,
  chapterCount,
  minWords,
  maxWords,
) {
  const messages = []

  // 系统角色设定
  messages.push({
    role: 'system',
    content: '你是一位专业的小说创作助手，擅长根据小说背景和上下文生成连贯的章节内容。',
  })

  // 小说基本信息
  let basicInfo = `小说基本信息：\n`
  basicInfo += `书名：${novel.title}\n`
  basicInfo += `简介：${novel.description}\n`
  basicInfo += `风格：${novel.style.join('、')}\n`
  basicInfo += `剧情线：\n主线：${novel.plotLines.main}\n`
  if (novel.plotLines.sub && novel.plotLines.sub.length > 0) {
    basicInfo += `支线：${novel.plotLines.sub.join('、')}\n`
  }
  basicInfo += `大纲：\n`
  novel.outline.forEach((vol, index) => {
    basicInfo += `${index + 1}. ${vol.volume}（${vol.chapters}章）：${vol.summary}\n`
  })

  messages.push({
    role: 'user',
    content: basicInfo,
  })

  // 最近章节内容（如果有）
  if (recentChapters && recentChapters.length > 0) {
    let recentContent = `最近章节内容（最近${recentChapters.length}章）：\n`
    recentChapters.forEach((ch) => {
      recentContent += `第${ch.chapterNumber}章 ${ch.title}：\n${ch.content}\n\n`
    })

    messages.push({
      role: 'user',
      content: recentContent,
    })
  }

  // 章节总结（如果有）
  if (chapterSummaries && chapterSummaries.length > 0) {
    let summaryContent = `章节总结（最近${chapterSummaries.length}章）：\n`
    chapterSummaries.forEach((ch) => {
      summaryContent += `第${ch.chapterNumber}章 ${ch.title}：${ch.summary}\n`
    })

    messages.push({
      role: 'user',
      content: summaryContent,
    })
  }

  // 生成要求
  let generationRequirements = prompts.chapterGeneration + '\n'
  generationRequirements += `========================================\n`
  generationRequirements += `【本次生成任务】\n`
  generationRequirements += `- 生成章节数量：${chapterCount}章\n`
  generationRequirements += `- 每章字数范围：${minWords}-${maxWords}字\n`
  generationRequirements += `- 章节编号从${recentChapters.length + 1}开始\n`
  generationRequirements += `========================================\n\n`

  generationRequirements += `【字数硬性要求 - 请务必遵守】\n`
  generationRequirements += `每章内容字数绝对不能少于${minWords}字！这是最重要的要求！\n`
  generationRequirements += `如果生成的内容字数不足，请通过以下方式扩充：\n`
  generationRequirements += `1. 增加详细的环境描写（天气变化、光线明暗、气味声音等）\n`
  generationRequirements += `2. 丰富人物对话（加入更多互动、争论、幽默元素）\n`
  generationRequirements += `3. 深化心理描写（内心独白、情绪变化、回忆联想）\n`
  generationRequirements += `4. 扩展动作细节（战斗过程、日常动作的细致刻画）\n`
  generationRequirements += `5. 增加场景转换和过渡段落\n`
  generationRequirements += `6. 加入背景故事和世界观介绍\n`
  generationRequirements += `7. 描写人物外貌、服饰、神态变化\n`
  generationRequirements += `8. 使用多种修辞手法和感官描写\n\n`

  generationRequirements += `【内容结构要求】\n`
  generationRequirements += `每章应包含：\n`
  generationRequirements += `- 开头：场景引入或承接上文（约10%）\n`
  generationRequirements += `- 发展：主要情节推进（约60%）\n`
  generationRequirements += `- 高潮：情节的紧张或转折点（约20%）\n`
  generationRequirements += `- 结尾：留有悬念或过渡到下一章（约10%）\n`

  messages.push({
    role: 'user',
    content: generationRequirements,
  })

  return messages
}

export function buildChapterRegenerationPrompt(novel, chapter, feedback) {
  const messages = []

  // 系统角色设定
  messages.push({
    role: 'system',
    content: '你是一位专业的小说创作助手，擅长根据用户反馈重新生成章节内容。',
  })

  // 用户反馈
  messages.push({
    role: 'user',
    content: `用户反馈：${feedback}`,
  })

  // 小说基本信息
  let basicInfo = `小说基本信息：\n`
  basicInfo += `书名：${novel.title}\n`
  basicInfo += `简介：${novel.description}\n`
  basicInfo += `风格：${novel.style.join('、')}\n`

  messages.push({
    role: 'user',
    content: basicInfo,
  })

  // 章节信息
  let chapterInfo = `章节信息：\n`
  chapterInfo += `章节号：${chapter.chapterNumber}\n`
  chapterInfo += `章节标题：${chapter.title}\n`
  chapterInfo += `原章节内容：\n${chapter.content}\n`

  messages.push({
    role: 'user',
    content: chapterInfo,
  })

  // 生成要求
  messages.push({
    role: 'user',
    content: prompts.chapterRegeneration,
  })

  return messages
}

/**
 * 构建内容补充提示词
 * @param {Object} novel - 小说信息
 * @param {Object} chapter - 章节信息
 * @param {number} targetWords - 目标字数
 * @param {number} currentWords - 当前字数
 */
export function buildContentSupplementPrompt(novel, chapter, targetWords, currentWords) {
  const messages = []

  messages.push({
    role: 'system',
    content: '你是一位专业的小说创作助手，擅长扩充和丰富章节内容。你的任务是在保持原有剧情的基础上，通过增加细节描写来达到目标字数。',
  })

  let contextInfo = `小说信息：\n`
  contextInfo += `书名：${novel.title}\n`
  contextInfo += `风格：${novel.style.join('、')}\n\n`

  contextInfo += `章节信息：\n`
  contextInfo += `章节号：${chapter.chapterNumber}\n`
  contextInfo += `标题：${chapter.title}\n`
  contextInfo += `当前字数：${currentWords}字\n`
  contextInfo += `目标字数：${targetWords}字\n`
  contextInfo += `需要补充：${targetWords - currentWords}字\n\n`

  contextInfo += `原章节内容：\n${chapter.content}\n\n`

  messages.push({
    role: 'user',
    content: contextInfo,
  })

  messages.push({
    role: 'user',
    content: `请扩充上述章节内容，使其达到${targetWords}字以上。

【扩充要求】：
1. 保持原有剧情和风格不变
2. 通过以下方式增加内容（需要增加约${targetWords - currentWords}字）：
   - 增加详细的环境描写（天气、光线、气味、声音等）
   - 丰富人物对话和互动
   - 深化心理描写（内心独白、情绪变化）
   - 扩展动作细节
   - 增加场景转换和过渡
   - 加入背景故事

3. 新增内容要与原文自然融合，不能生硬插入

【返回格式】：
只返回JSON格式：
{
  "content": "扩充后的完整章节内容（包含原文和新增加的内容）"
}`,
  })

  return messages
}

/**
 * 构建流式章节生成提示词（直接输出小说正文，不要求JSON）
 * @param {Object} novel - 小说信息
 * @param {Array} recentChapters - 最近章节
 * @param {Array} chapterSummaries - 章节总结
 * @param {number} minWords - 最小字数
 * @param {number} maxWords - 最大字数
 * @param {number} chapterNumber - 章节号
 * @param {Object} enhancedContext - 增强上下文（角色状态、伏笔等）
 */
export function buildStreamChapterPrompt(
  novel,
  recentChapters,
  chapterSummaries,
  minWords,
  maxWords,
  chapterNumber,
  enhancedContext = null
) {
  const messages = []

  // 系统角色设定
  messages.push({
    role: 'system',
    content: `你是一位专业的网络小说作家。请根据提供的小说信息和上下文，直接撰写章节内容。

【重要规则】：
1. 直接输出章节正文内容，不要输出任何其他内容（如标题、说明、JSON等）
2. 字数要求：${minWords}-${maxWords}字
3. 内容要连贯、生动、有代入感
4. 第一行输出章节标题（格式：章节标题名称），然后换行开始正文

【思考过程限制】：
- 你的思考时间不要超过10秒
- 思考内容不要超过3000字
- 快速进入正文写作，不要过度思考

【上下文一致性要求】：
- 严格遵守角色当前状态设定
- 注意伏笔的延续和回收
- 保持时间线和剧情连贯性`,
  })

  // 小说基本信息
  let basicInfo = `【小说基本信息】\n`
  basicInfo += `书名：${novel.title}\n`
  basicInfo += `简介：${novel.description}\n`
  basicInfo += `风格：${novel.style.join('、')}\n`
  basicInfo += `剧情线：\n主线：${novel.plotLines.main}\n`
  if (novel.plotLines.sub && novel.plotLines.sub.length > 0) {
    basicInfo += `支线：${novel.plotLines.sub.join('、')}\n`
  }
  basicInfo += `大纲：\n`
  novel.outline.forEach((vol, index) => {
    basicInfo += `${index + 1}. ${vol.volume}（${vol.chapters}章）：${vol.summary}\n`
  })

  messages.push({
    role: 'user',
    content: basicInfo,
  })

  // 增强上下文：角色状态、伏笔等
  if (enhancedContext) {
    const contextText = formatEnhancedContext(enhancedContext)
    if (contextText) {
      messages.push({
        role: 'user',
        content: contextText,
      })
    }
  }

  // 最近章节内容
  if (recentChapters && recentChapters.length > 0) {
    let recentContent = `【最近章节内容】（最近${recentChapters.length}章）：\n`
    recentChapters.forEach((ch) => {
      recentContent += `第${ch.chapterNumber}章 ${ch.title}：\n${ch.content}\n\n`
    })

    messages.push({
      role: 'user',
      content: recentContent,
    })
  }

  // 章节总结
  if (chapterSummaries && chapterSummaries.length > 0) {
    let summaryContent = `【章节总结】（最近${chapterSummaries.length}章）：\n`
    chapterSummaries.forEach((ch) => {
      summaryContent += `第${ch.chapterNumber}章 ${ch.title}：${ch.summary}\n`
    })

    messages.push({
      role: 'user',
      content: summaryContent,
    })
  }

  // 生成要求
  let generationRequirements = `【本次任务】\n`
  generationRequirements += `- 撰写第${chapterNumber}章\n`
  generationRequirements += `- 字数要求：${minWords}-${maxWords}字\n\n`
  generationRequirements += `【写作要求】\n`
  generationRequirements += `1. 第一行输出章节标题（不要带"第X章"，只要标题名称）\n`
  generationRequirements += `2. 从第二行开始输出正文内容\n`
  generationRequirements += `3. 内容要符合小说风格，情节连贯\n`
  generationRequirements += `4. 注重细节描写：环境、对话、心理、动作\n`
  generationRequirements += `5. 确保字数达到${minWords}字以上\n`
  generationRequirements += `6. 不要输出任何其他内容（如说明、注释等）\n`
  
  // 添加上下文一致性提醒
  if (enhancedContext?.characterStatus) {
    generationRequirements += `7. 严格遵守角色当前状态设定（位置、状态、关系等）\n`
  }
  if (enhancedContext?.foreshadowingInfo?.pendingCount > 0) {
    generationRequirements += `8. 注意伏笔的延续，可在合适时机回收待处理伏笔\n`
  }
  
  generationRequirements += `\n现在请开始撰写第${chapterNumber}章：`

  messages.push({
    role: 'user',
    content: generationRequirements,
  })

  return messages
}

/**
 * 格式化增强上下文为Prompt文本
 * @param {Object} context - 增强上下文对象
 */
function formatEnhancedContext(context) {
  let contextText = ''

  // 角色状态
  if (context.characterStatus) {
    const { grouped, characters } = context.characterStatus
    
    contextText += `【角色当前状态】\n`
    
    if (grouped.protagonist) {
      const p = grouped.protagonist
      contextText += `\n主角：${p.name}\n`
      contextText += `  - 身份：${p.identity}\n`
      contextText += `  - 当前位置：${p.currentLocation}\n`
      contextText += `  - 当前状态：${p.currentCondition}\n`
      if (p.powerLevel) {
        contextText += `  - 实力等级：${p.powerLevel}\n`
      }
      if (p.relationships && p.relationships.length > 0) {
        contextText += `  - 重要关系：\n`
        p.relationships.slice(0, 3).forEach(r => {
          contextText += `    · ${r.type}（${r.reason || '原因未知'}）\n`
        })
      }
    }

    const importantSupporting = (grouped.supporting || []).slice(0, 3)
    if (importantSupporting.length > 0) {
      contextText += `\n重要配角：\n`
      importantSupporting.forEach(s => {
        contextText += `  - ${s.name}（${s.identity}）：${s.currentLocation}，${s.currentCondition}\n`
      })
    }

    const antagonists = grouped.antagonist || []
    if (antagonists.length > 0) {
      contextText += `\n反派角色：\n`
      antagonists.forEach(a => {
        contextText += `  - ${a.name}（${a.identity}）：${a.currentLocation}\n`
      })
    }
  }

  // 伏笔信息
  if (context.foreshadowingInfo && context.foreshadowingInfo.pendingCount > 0) {
    const { pending, highImportance, reminder } = context.foreshadowingInfo
    
    contextText += `\n【伏笔提醒】\n`
    
    if (highImportance && highImportance.length > 0) {
      contextText += `高优先级待回收伏笔：\n`
      highImportance.forEach(f => {
        contextText += `  - ${f.content}（埋设于第${f.plantedInChapter}章）\n`
      })
    }

    if (pending && pending.length > (highImportance?.length || 0)) {
      contextText += `\n其他待回收伏笔（共${pending.length - (highImportance?.length || 0)}个）：\n`
      pending.filter(f => f.importance !== 'high').slice(0, 3).forEach(f => {
        contextText += `  - ${f.content}\n`
      })
    }

    if (reminder) {
      contextText += `\n⚠️ ${reminder}\n`
    }
  }

  // 时间线
  if (context.timeline && context.timeline.events && context.timeline.events.length > 0) {
    const recentEvents = context.timeline.events.slice(-5)
    
    contextText += `\n【近期重要事件】\n`
    recentEvents.forEach(e => {
      contextText += `  - ${e.description}\n`
      if (e.location) {
        contextText += `    地点：${e.location}\n`
      }
    })
  }

  return contextText ? contextText : null
}

/**
 * 构建章节总结生成提示词
 * @param {Object} novel - 小说信息
 * @param {string} chapterTitle - 章节标题
 * @param {string} chapterContent - 章节内容
 */
export function buildChapterSummaryPrompt(novel, chapterTitle, chapterContent) {
  const messages = []

  messages.push({
    role: 'system',
    content: '你是一位专业的小说编辑，擅长用简洁的语言总结章节内容。',
  })

  messages.push({
    role: 'user',
    content: `请为以下章节生成一个精炼的总结。

【小说信息】
书名：${novel.title}
风格：${novel.style.join('、')}

【章节信息】
标题：${chapterTitle}
内容：
${chapterContent}

【要求】
1. 总结字数：50-100字
2. 精炼概括本章主要情节和关键事件
3. 只输出总结内容，不要其他任何文字`,
  })

  return messages
}

/**
 * 构建章节大纲预生成提示词
 * @param {Object} novel - 小说信息
 * @param {Array} recentChapters - 最近章节
 * @param {Array} chapterSummaries - 章节总结
 * @param {number} chapterNumber - 章节号
 * @param {Object} enhancedContext - 增强上下文
 */
export function buildChapterOutlinePrompt(
  novel,
  recentChapters,
  chapterSummaries,
  chapterNumber,
  enhancedContext = null
) {
  const messages = []

  messages.push({
    role: 'system',
    content: `你是一位专业的网络小说策划师。请根据提供的小说信息和上下文，为即将撰写的章节生成一个详细的大纲。

【重要规则】：
1. 大纲要详细但不冗长，控制在300-500字
2. 要有明确的情节发展和转折点
3. 要考虑与前后章节的衔接
4. 要符合小说整体风格和剧情走向`,
  })

  // 小说基本信息
  let basicInfo = `【小说基本信息】\n`
  basicInfo += `书名：${novel.title}\n`
  basicInfo += `简介：${novel.description}\n`
  basicInfo += `风格：${novel.style.join('、')}\n`
  basicInfo += `剧情线：\n主线：${novel.plotLines.main}\n`
  if (novel.plotLines.sub && novel.plotLines.sub.length > 0) {
    basicInfo += `支线：${novel.plotLines.sub.join('、')}\n`
  }
  basicInfo += `大纲：\n`
  novel.outline.forEach((vol, index) => {
    basicInfo += `${index + 1}. ${vol.volume}（${vol.chapters}章）：${vol.summary}\n`
  })

  messages.push({
    role: 'user',
    content: basicInfo,
  })

  // 增强上下文
  if (enhancedContext) {
    const contextText = formatEnhancedContext(enhancedContext)
    if (contextText) {
      messages.push({
        role: 'user',
        content: contextText,
      })
    }
  }

  // 最近章节总结
  if (chapterSummaries && chapterSummaries.length > 0) {
    let summaryContent = `【章节总结】（最近${chapterSummaries.length}章）：\n`
    chapterSummaries.forEach((ch) => {
      summaryContent += `第${ch.chapterNumber}章 ${ch.title}：${ch.summary}\n`
    })

    messages.push({
      role: 'user',
      content: summaryContent,
    })
  }

  // 生成要求
  let requirements = `【任务】\n`
  requirements += `请为第${chapterNumber}章生成一个详细大纲。\n\n`
  requirements += `【大纲格式要求】\n`
  requirements += `请按以下JSON格式返回：\n`
  requirements += `{\n`
  requirements += `  "title": "章节标题（要有吸引力）",\n`
  requirements += `  "summary": "章节概要（100字以内）",\n`
  requirements += `  "scenes": [\n`
  requirements += `    {\n`
  requirements += `      "location": "场景地点",\n`
  requirements += `      "characters": ["出场角色"],\n`
  requirements += `      "events": ["主要事件"],\n`
  requirements += `      "mood": "场景氛围"\n`
  requirements += `    }\n`
  requirements += `  ],\n`
  requirements += `  "keyEvents": ["关键事件1", "关键事件2"],\n`
  requirements += `  "cliffhanger": "结尾悬念/钩子",\n`
  requirements += `  "foreshadowing": {\n`
  requirements += `    "plant": ["可埋设的伏笔"],\n`
  requirements += `    "resolve": ["可回收的伏笔"]\n`
  requirements += `  }\n`
  requirements += `}\n\n`
  requirements += `只返回JSON，不要其他文字。`

  messages.push({
    role: 'user',
    content: requirements,
  })

  return messages
}

/**
 * 构建伏笔提取提示词
 * @param {string} chapterContent - 章节内容
 * @param {string} chapterTitle - 章节标题
 * @param {number} chapterNumber - 章节号
 * @param {Array} characters - 角色列表（用于关联分析）
 */
export function buildForeshadowingExtractionPrompt(chapterContent, chapterTitle, chapterNumber, characters = []) {
  const messages = []

  messages.push({
    role: 'system',
    content: '你是一位资深的小说编辑，擅长分析和识别小说中的伏笔。请严格按照JSON格式返回分析结果。',
  })

  let contextInfo = `请分析以下章节内容，提取其中的伏笔。\n\n`
  contextInfo += `【章节信息】\n`
  contextInfo += `章节号：第${chapterNumber}章\n`
  contextInfo += `章节标题：${chapterTitle}\n\n`

  // 提供角色信息以便关联
  if (characters.length > 0) {
    contextInfo += `【本小说角色列表】\n`
    characters.forEach(char => {
      contextInfo += `- ${char.name}（${char.type === 'protagonist' ? '主角' : char.identity || '配角'}）\n`
    })
    contextInfo += `\n`
  }

  contextInfo += `【章节内容】\n`
  contextInfo += chapterContent

  messages.push({
    role: 'user',
    content: contextInfo,
  })

  messages.push({
    role: 'user',
    content: prompts.foreshadowingExtraction,
  })

  return messages
}

/**
 * 构建内容扩写提示词（整章扩写）
 * @param {Object} novel - 小说信息
 * @param {Object} chapter - 章节信息
 * @param {number} targetWords - 目标字数
 * @param {number} currentWords - 当前字数
 */
export function buildContentExpansionPrompt(novel, chapter, targetWords, currentWords) {
  const messages = []

  messages.push({
    role: 'system',
    content: `你是一位专业的小说编辑，擅长在保持原有剧情和风格的基础上扩充章节内容。你的任务是通过增加细节描写来达到目标字数。

【扩写原则】：
1. 保持原有剧情走向不变
2. 保持人物性格一致
3. 新增内容要自然融入原文
4. 扩写要有价值，增加信息量或艺术性

【扩写技巧】：
- 环境描写：天气、光线、气味、声音、温度
- 心理描写：内心独白、情绪变化、回忆联想
- 对话丰富：增加互动、争论、幽默元素
- 动作细节：战斗过程、日常动作的细致刻画
- 外貌描写：人物神态、服饰、表情变化
- 场景转换：增加过渡段落
- 背景故事：适当补充设定信息`
  })

  let contextInfo = `【小说信息】\n`
  contextInfo += `书名：${novel.title}\n`
  contextInfo += `风格：${novel.style?.join('、') || '未设置'}\n\n`

  contextInfo += `【章节信息】\n`
  contextInfo += `章节号：第${chapter.chapterNumber}章\n`
  contextInfo += `标题：${chapter.title}\n`
  contextInfo += `当前字数：${currentWords}字\n`
  contextInfo += `目标字数：${targetWords}字\n`
  contextInfo += `需要增加：${targetWords - currentWords}字\n\n`

  contextInfo += `【原章节内容】\n${chapter.content}\n`

  messages.push({
    role: 'user',
    content: contextInfo
  })

  messages.push({
    role: 'user',
    content: `请扩写上述章节内容，使其达到${targetWords}字以上。

【要求】：
1. 保持原有剧情和风格
2. 需要增加约${targetWords - currentWords}字
3. 扩写内容要自然融合，不要生硬插入
4. 优先扩写情节关键点、对话、心理活动等

【返回格式】：
只返回JSON格式：
{
  "content": "扩写后的完整章节内容（包含原文和新增内容）"
}`
  })

  return messages
}

/**
 * 构建段落扩写提示词
 * @param {Object} novel - 小说信息
 * @param {Object} chapter - 章节信息
 * @param {string} paragraph - 待扩写的段落
 * @param {number} targetExpansion - 目标扩写字数
 */
export function buildParagraphExpansionPrompt(novel, chapter, paragraph, targetExpansion) {
  const messages = []

  messages.push({
    role: 'system',
    content: `你是一位专业的小说编辑，擅长扩写和丰富段落内容。请在保持原意的基础上，通过增加细节描写来扩充段落。

【扩写方向】：
1. 增加感官描写（视觉、听觉、嗅觉、触觉）
2. 深化心理活动
3. 丰富对话内容
4. 扩展动作细节
5. 增加环境氛围描写`
  })

  let contextInfo = `【小说风格】${novel.style?.join('、') || '未设置'}\n`
  contextInfo += `【章节标题】${chapter.title}\n\n`
  contextInfo += `【待扩写段落】\n${paragraph}\n\n`
  contextInfo += `【目标】增加约${targetExpansion}字\n`

  messages.push({
    role: 'user',
    content: contextInfo
  })

  messages.push({
    role: 'user',
    content: `请扩写上述段落，使其更加丰富生动。

【要求】：
1. 保持原意和风格
2. 增加约${targetExpansion}字
3. 新增内容要自然融入

【返回格式】：
只返回JSON格式：
{
  "content": "扩写后的段落内容"
}`
  })

  return messages
}

/**
 * 构建伏笔回收提醒提示词
 * @param {Array} pendingForeshadowings - 待回收伏笔列表
 * @param {number} currentChapterNumber - 当前章节号
 */
export function buildForeshadowingReminderPrompt(pendingForeshadowings, currentChapterNumber) {
  if (!pendingForeshadowings || pendingForeshadowings.length === 0) {
    return null
  }

  let reminderText = `【伏笔回收提醒】\n`
  reminderText += `当前即将生成第${currentChapterNumber}章，以下伏笔尚未回收：\n\n`

  // 高优先级伏笔
  const highImportance = pendingForeshadowings.filter(f => f.importance === 'high')
  if (highImportance.length > 0) {
    reminderText += `⚠️ 高优先级伏笔（强烈建议在近期回收）：\n`
    highImportance.forEach(f => {
      const plantedChapter = f.plantedInChapter || f.chapterNumber || '?'
      const chaptersPassed = typeof plantedChapter === 'number' ? Math.max(0, currentChapterNumber - plantedChapter) : '?'
      reminderText += `  - ${f.content}\n`
      reminderText += `    埋设于第${plantedChapter}章，已过${chaptersPassed}章\n`
      if (f.suggestedResolution) {
        reminderText += `    建议回收：${f.suggestedResolution}\n`
      }
    })
    reminderText += `\n`
  }

  // 普通伏笔
  const normalImportance = pendingForeshadowings.filter(f => f.importance !== 'high')
  if (normalImportance.length > 0) {
    reminderText += `📝 待回收伏笔：\n`
    normalImportance.slice(0, 5).forEach(f => {
      const plantedChapter = f.plantedInChapter || f.chapterNumber || '?'
      reminderText += `  - ${f.content}（埋设于第${plantedChapter}章）\n`
    })
    if (normalImportance.length > 5) {
      reminderText += `  ... 还有${normalImportance.length - 5}个伏笔待回收\n`
    }
  }

  return reminderText
}

/**
 * 构建灵感扩写提示词
 * @param {Object} inspiration - 灵感对象
 */
export function buildInspirationExpandPrompt(inspiration) {
  const messages = []

  messages.push({
    role: 'system',
    content: `你是一位资深的小说创作顾问和创意策划师。你擅长将简短的灵感扩展成丰富的创意设定。

【扩写原则】：
1. 保持核心创意点不变
2. 补充背景设定和世界观元素
3. 设计可能的角色和冲突
4. 思考故事的潜在发展方向
5. 增加细节使创意更加具体可感

【扩写方向】：
- 时间/地点设定
- 可能的主角身份
- 潜在的冲突和矛盾
- 故事的核心看点
- 可以融入的元素`
  })

  let content = `请扩写以下灵感：\n\n`
  content += `【标题】${inspiration.title || '无标题'}\n`
  content += `【内容】${inspiration.content}\n`

  if (inspiration.tags?.length > 0) {
    content += `【标签】${inspiration.tags.join('、')}\n`
  }

  if (inspiration.style) {
    content += `【风格偏好】${inspiration.style}\n`
  }

  content += `\n请将这个灵感扩展成 300-500 字的创意描述，包括：
1. 更详细的世界观设定
2. 可能的主角和核心冲突
3. 故事的主要看点
4. 可发展的剧情方向

直接输出扩写内容，不需要 JSON 格式。`

  messages.push({
    role: 'user',
    content
  })

  return messages
}

/**
 * 构建灵感引导问答提示词
 * @param {Object} inspiration - 灵感对象
 */
export function buildInspirationQAPrompt(inspiration) {
  const messages = []

  messages.push({
    role: 'system',
    content: `你是一位资深的小说创作顾问。你的任务是通过提问引导用户完善和深化他们的灵感。

【提问原则】：
1. 问题要具体且有针对性
2. 帮助用户思考故事的深度和广度
3. 引导用户发现潜在的创意空间
4. 问题数量控制在 3-5 个

【问题方向】：
- 角色塑造：主角是谁？有什么特点？
- 冲突设计：核心矛盾是什么？主角面临什么挑战？
- 世界观：故事发生在什么背景？有什么特殊设定？
- 剧情发展：故事的开端、发展、高潮可能是怎样的？
- 差异化：这个故事与其他同类作品有什么不同？`
  })

  messages.push({
    role: 'user',
    content: `请根据以下灵感，提出 3-5 个引导性问题，帮助我深化这个创意：

【标题】${inspiration.title || '无标题'}
【内容】${inspiration.content}
${inspiration.tags?.length > 0 ? `【标签】${inspiration.tags.join('、')}` : ''}

请以 JSON 格式返回：
{
  "questions": [
    {
      "question": "问题内容",
      "purpose": "这个问题的目的",
      "suggestions": ["可能的回答方向1", "可能的回答方向2"]
    }
  ],
  "analysis": "对这个灵感的简要分析"
}`
  })

  return messages
}

/**
 * 构建多灵感融合提示词
 * @param {Array} inspirations - 灵感列表
 */
export function buildMultiInspirationMergePrompt(inspirations) {
  const messages = []

  messages.push({
    role: 'system',
    content: `你是一位资深的小说创作顾问。你擅长将多个创意点融合，创作出完整且引人入胜的小说概览。

【融合原则】：
1. 寻找灵感之间的内在联系
2. 统一世界观和时间线
3. 整合角色和冲突
4. 构建完整的故事脉络
5. 保持创意的独特性和亮点`
  })

  let content = `请将以下 ${inspirations.length} 个灵感融合，创作一个完整的小说概览：\n\n`

  inspirations.forEach((insp, index) => {
    content += `【灵感 ${index + 1}】\n`
    content += `标题：${insp.title || '无标题'}\n`
    content += `内容：${insp.content}\n`
    if (insp.expandedContent) {
      content += `扩写：${insp.expandedContent}\n`
    }
    if (insp.tags?.length > 0) {
      content += `标签：${insp.tags.join('、')}\n`
    }
    content += `\n`
  })

  content += prompts.novelOverview

  messages.push({
    role: 'user',
    content
  })

  return messages
}

/**
 * 构建灵感评分提示词
 * @param {Object} inspiration - 灵感对象
 */
export function buildInspirationScorePrompt(inspiration) {
  const messages = []

  messages.push({
    role: 'system',
    content: `你是一位资深的小说编辑和市场分析师。你需要从多个维度评估一个灵感的创作潜力和市场价值。

【评分维度】：
1. 创新性（0-30分）：创意是否新颖独特，是否有差异化亮点
2. 可扩展性（0-25分）：是否能够支撑长篇故事，是否有足够的剧情发展空间
3. 市场匹配度（0-25分）：是否符合当前市场热点和读者偏好
4. 完成难度（0-20分）：实现这个创意的难度，分数越高表示越容易实现

【评估标准】：
- 90-100分：极佳创意，强烈推荐开发
- 75-89分：优秀创意，值得深入开发
- 60-74分：良好创意，可以尝试
- 45-59分：一般创意，需要更多打磨
- 0-44分：创意较弱，建议重新构思`
  })

  let content = `请评估以下灵感的创作潜力和市场价值：\n\n`
  content += `【标题】${inspiration.title || '无标题'}\n`
  content += `【内容】${inspiration.content}\n`

  if (inspiration.expandedContent) {
    content += `【扩写】${inspiration.expandedContent}\n`
  }
  if (inspiration.tags?.length > 0) {
    content += `【标签】${inspiration.tags.join('、')}\n`
  }
  if (inspiration.style) {
    content += `【风格偏好】${inspiration.style}\n`
  }

  content += `\n请以 JSON 格式返回评分结果：
{
  "totalScore": 总分,
  "dimensions": {
    "innovation": {
      "score": 创新性分数,
      "comment": "评价说明"
    },
    "expandability": {
      "score": 可扩展性分数,
      "comment": "评价说明"
    },
    "marketFit": {
      "score": 市场匹配度分数,
      "comment": "评价说明"
    },
    "feasibility": {
      "score": 完成难度分数,
      "comment": "评价说明"
    }
  },
  "strengths": ["优点1", "优点2", "优点3"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["改进建议1", "改进建议2"],
  "comparableWorks": ["类似作品参考1", "类似作品参考2"],
  "recommendation": "综合推荐意见"
}`

  messages.push({
    role: 'user',
    content
  })

  return messages
}

/**
 * 构建模板选择提示词
 * @param {Object} inspiration - 灵感对象
 * @param {Array} templates - 可用模板列表
 */
export function buildTemplateSelectionPrompt(inspiration, templates) {
  const messages = []

  messages.push({
    role: 'system',
    content: `你是一位资深的小说创作顾问。请根据用户的灵感，推荐最合适的小说创作模板。

【推荐原则】：
1. 匹配灵感的风格和类型
2. 考虑故事的发展潜力
3. 选择能够发挥灵感优势的模板`
  })

  let content = `请为以下灵感推荐最合适的创作模板：\n\n`
  content += `【灵感】${inspiration.title || '无标题'}\n`
  content += `${inspiration.content}\n\n`

  content += `【可用模板】\n`
  templates.forEach((t, index) => {
    content += `${index + 1}. ${t.name}：${t.description}\n`
  })

  content += `\n请返回 JSON 格式：
{
  "recommendedTemplate": "推荐的模板名称",
  "reason": "推荐理由",
  "adaptations": ["需要调整的方面1", "需要调整的方面2"]
}`

  messages.push({
    role: 'user',
    content
  })

  return messages
}

/**
 * 构建基于大纲的章节生成提示词
 * @param {Object} novel - 小说信息
 * @param {Object} outline - 章节大纲
 * @param {Array} recentChapters - 最近章节
 * @param {number} minWords - 最小字数
 * @param {number} maxWords - 最大字数
 * @param {number} chapterNumber - 章节号
 * @param {Object} enhancedContext - 增强上下文
 */
export function buildChapterFromOutlinePrompt(
  novel,
  outline,
  recentChapters,
  minWords,
  maxWords,
  chapterNumber,
  enhancedContext = null
) {
  const messages = []

  messages.push({
    role: 'system',
    content: `你是一位专业的网络小说作家。请根据提供的章节大纲，撰写完整的章节内容。

【重要规则】：
1. 严格按照大纲的情节发展撰写
2. 字数要求：${minWords}-${maxWords}字
3. 直接输出章节正文，第一行为标题
4. 内容要生动、有代入感
5. 注重细节描写：环境、对话、心理、动作`,
  })

  // 小说基本信息
  let basicInfo = `【小说基本信息】\n`
  basicInfo += `书名：${novel.title}\n`
  basicInfo += `风格：${novel.style.join('、')}\n`

  messages.push({
    role: 'user',
    content: basicInfo,
  })

  // 章节大纲
  let outlineInfo = `【本章大纲】\n`
  outlineInfo += `标题：${outline.title}\n`
  outlineInfo += `概要：${outline.summary}\n\n`
  
  if (outline.scenes && outline.scenes.length > 0) {
    outlineInfo += `场景安排：\n`
    outline.scenes.forEach((scene, index) => {
      outlineInfo += `${index + 1}. ${scene.location}\n`
      outlineInfo += `   出场角色：${scene.characters?.join('、') || '无特定'}\n`
      outlineInfo += `   主要事件：${scene.events?.join('；') || '无'}\n`
      outlineInfo += `   场景氛围：${scene.mood || '正常'}\n`
    })
  }
  
  if (outline.keyEvents && outline.keyEvents.length > 0) {
    outlineInfo += `\n关键事件：\n`
    outline.keyEvents.forEach((event, index) => {
      outlineInfo += `${index + 1}. ${event}\n`
    })
  }
  
  if (outline.cliffhanger) {
    outlineInfo += `\n结尾悬念：${outline.cliffhanger}\n`
  }
  
  if (outline.foreshadowing) {
    if (outline.foreshadowing.plant && outline.foreshadowing.plant.length > 0) {
      outlineInfo += `\n可埋设伏笔：${outline.foreshadowing.plant.join('、')}\n`
    }
    if (outline.foreshadowing.resolve && outline.foreshadowing.resolve.length > 0) {
      outlineInfo += `可回收伏笔：${outline.foreshadowing.resolve.join('、')}\n`
    }
  }

  messages.push({
    role: 'user',
    content: outlineInfo,
  })

  // 增强上下文
  if (enhancedContext) {
    const contextText = formatEnhancedContext(enhancedContext)
    if (contextText) {
      messages.push({
        role: 'user',
        content: contextText,
      })
    }
  }

  // 最近章节内容
  if (recentChapters && recentChapters.length > 0) {
    let recentContent = `【最近章节内容】（最近${recentChapters.length}章）：\n`
    recentChapters.forEach((ch) => {
      recentContent += `第${ch.chapterNumber}章 ${ch.title}：\n${ch.content.slice(0, 1000)}...\n\n`
    })

    messages.push({
      role: 'user',
      content: recentContent,
    })
  }

  // 生成要求
  let requirements = `【写作要求】\n`
  requirements += `1. 第一行输出章节标题（不要带"第X章"）\n`
  requirements += `2. 从第二行开始输出正文内容\n`
  requirements += `3. 严格按照大纲的情节发展撰写\n`
  requirements += `4. 确保字数达到${minWords}字以上\n`
  requirements += `5. 注重场景描写和人物刻画\n`
  requirements += `6. 结尾要有悬念感\n\n`
  requirements += `现在请开始撰写第${chapterNumber}章：`

  messages.push({
    role: 'user',
    content: requirements,
  })

  return messages
}

/**
 * 大纲生成提示词
 */
export const outlineGeneration = `你是一位资深的小说策划师。请根据以下小说信息，生成一个详细的章节大纲。

请严格按照以下JSON格式返回结果（不要添加任何额外文字）：
{
  "mainPlot": {
    "name": "主线名称",
    "description": "主线剧情描述（200字以内）",
    "events": [
      {
        "title": "事件标题",
        "description": "事件描述",
        "estimatedChapter": "预计发生章节",
        "importance": "重要性（high/medium/low）"
      }
    ]
  },
  "subPlots": [
    {
      "name": "支线名称",
      "description": "支线剧情描述",
      "type": "支线类型（romance/growth/mystery/conflict等）",
      "events": []
    }
  ],
  "chapterOutline": [
    {
      "chapterNumber": 章节号,
      "title": "章节标题",
      "summary": "章节概要（50-100字）",
      "mainEvents": ["主要事件1", "主要事件2"],
      "estimatedWords": 预估字数
    }
  ],
  "totalEstimatedWords": 总预估字数
}

小说书名：{title}
类型：{genre}
主题：{theme}
总章节数：{totalChapters}
主要角色：{mainCharacters}`

/**
 * 剧情事件建议提示词
 */
export const plotEventSuggestion = `你是一位资深的小说策划师。请根据剧情线信息，为其建议合适的事件节点。

请严格按照以下JSON格式返回结果（不要添加任何额外文字）：
{
  "suggestedEvents": [
    {
      "title": "事件标题",
      "description": "事件详细描述（100字以内）",
      "type": "事件类型（conflict/turning_point/climax/resolution等）",
      "importance": "重要性（high/medium/low）",
      "suggestedPosition": "建议在剧情线的位置（开头/中段/结尾）",
      "involvedCharacters": ["涉及的角色"],
      "potentialForeshadowing": ["可能埋设的伏笔"],
      "impactOnMainPlot": "对主线的影响"
    }
  ],
  "plotTension": "剧情张力评估",
  "suggestions": ["改进建议"]
}

剧情线名称：{plotLineName}
剧情线描述：{plotLineDescription}
上下文：{context}`
