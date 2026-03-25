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
