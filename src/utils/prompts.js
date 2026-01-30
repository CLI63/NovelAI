export const prompts = {
  novelOverview: `你是一位专业的小说创作助手。根据用户提供的灵感，生成一部完整的小说概览。

请按照以下JSON格式返回结果：
{
  "title": "小说书名",
  "description": "小说简介（100-200字）",
  "style": ["风格标签1", "风格标签2", "风格标签3"],
  "estimatedWords": "预估总字数",
  "plotLines": {
    "main": "主线剧情描述",
    "sub": ["支线1", "支线2"]
  },
  "outline": [
    {
      "volume": "第一卷名称",
      "chapters": "章节数量",
      "summary": "本卷概要"
    }
  ],
  "chapterStructure": {
    "totalChapters": "总章节数",
    "minWordsPerChapter": "每章最小字数",
    "maxWordsPerChapter": "每章最大字数"
  }
}

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

要求：
1. 章节内容要符合小说风格和剧情走向
2. 章节之间要有连贯性
3. 章节总结要精炼（50-100字），便于后续生成时快速回顾
4. 确保章节字数在指定范围内
5. 必须确保JSON格式完整且有效
6. 章节内容必须达到指定的最少字数要求，不能过于简短
7. 通过丰富的细节描写、对话、心理活动、环境描述等方式充实内容
8. 每章都要有完整的情节发展，不能过早结束
9. 如果内容不足，可以增加背景介绍、人物心理描写、环境氛围渲染、对话细节等
10. 确保每章内容充实饱满，字数达标

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
  generationRequirements += `生成要求（必须严格遵守）：\n`
  generationRequirements += `- 生成${chapterCount}章\n`
  generationRequirements += `- 每章字数范围：${minWords}-${maxWords}字\n`
  generationRequirements += `- 章节编号从${recentChapters.length + 1}开始（系统会自动分配）\n`
  generationRequirements += `- 每章内容必须达到最少字数要求，不能少于${minWords}字\n`
  generationRequirements += `- 通过丰富的细节描写、对话、心理活动、环境描述等方式充实内容\n`
  generationRequirements += `- 每章都要有完整的情节发展，不能过早结束\n`
  generationRequirements += `- 如果内容不足，可以增加背景介绍、人物心理描写、环境氛围渲染、对话细节等\n`
  generationRequirements += `- 确保每章内容充实饱满，字数达标\n`

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
