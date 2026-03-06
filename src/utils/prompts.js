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
