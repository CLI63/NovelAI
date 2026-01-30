const c={novelOverview:`你是一位专业的小说创作助手。根据用户提供的灵感，生成一部完整的小说概览。

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

用户灵感：`,chapterGeneration:`你是一位专业的小说创作助手。根据提供的小说信息和上下文，生成指定数量的章节内容。

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

小说信息：`,chapterRegeneration:`你是一位专业的小说创作助手。根据用户的反馈和提示词，重新生成章节内容。

请按照以下JSON格式返回结果：
{
  "title": "章节标题",
  "content": "章节正文内容",
  "summary": "章节总结（50-100字，精炼概括本章主要情节）"
}

用户反馈：`};function $(e){const t=[];return t.push({role:"system",content:"你是一位专业的小说创作助手，擅长根据用户灵感生成完整的小说概览。"}),t.push({role:"user",content:c.novelOverview+e}),t}function m(e,t,l,o,i,a){const p=[];p.push({role:"system",content:"你是一位专业的小说创作助手，擅长根据小说背景和上下文生成连贯的章节内容。"});let u=`小说基本信息：
`;if(u+=`书名：${e.title}
`,u+=`简介：${e.description}
`,u+=`风格：${e.style.join("、")}
`,u+=`剧情线：
主线：${e.plotLines.main}
`,e.plotLines.sub&&e.plotLines.sub.length>0&&(u+=`支线：${e.plotLines.sub.join("、")}
`),u+=`大纲：
`,e.outline.forEach((s,r)=>{u+=`${r+1}. ${s.volume}（${s.chapters}章）：${s.summary}
`}),p.push({role:"user",content:u}),t&&t.length>0){let s=`最近章节内容（最近${t.length}章）：
`;t.forEach(r=>{s+=`第${r.chapterNumber}章 ${r.title}：
${r.content}

`}),p.push({role:"user",content:s})}if(l&&l.length>0){let s=`章节总结（最近${l.length}章）：
`;l.forEach(r=>{s+=`第${r.chapterNumber}章 ${r.title}：${r.summary}
`}),p.push({role:"user",content:s})}let n=c.chapterGeneration+`
`;return n+=`生成要求（必须严格遵守）：
`,n+=`- 生成${o}章
`,n+=`- 每章字数范围：${i}-${a}字
`,n+=`- 章节编号从${t.length+1}开始（系统会自动分配）
`,n+=`- 每章内容必须达到最少字数要求，不能少于${i}字
`,n+=`- 通过丰富的细节描写、对话、心理活动、环境描述等方式充实内容
`,n+=`- 每章都要有完整的情节发展，不能过早结束
`,n+=`- 如果内容不足，可以增加背景介绍、人物心理描写、环境氛围渲染、对话细节等
`,n+=`- 确保每章内容充实饱满，字数达标
`,p.push({role:"user",content:n}),p}function h(e,t,l){const o=[];o.push({role:"system",content:"你是一位专业的小说创作助手，擅长根据用户反馈重新生成章节内容。"}),o.push({role:"user",content:`用户反馈：${l}`});let i=`小说基本信息：
`;i+=`书名：${e.title}
`,i+=`简介：${e.description}
`,i+=`风格：${e.style.join("、")}
`,o.push({role:"user",content:i});let a=`章节信息：
`;return a+=`章节号：${t.chapterNumber}
`,a+=`章节标题：${t.title}
`,a+=`原章节内容：
${t.content}
`,o.push({role:"user",content:a}),o.push({role:"user",content:c.chapterRegeneration}),o}export{m as a,$ as b,h as c};
