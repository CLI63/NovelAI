const $={novelOverview:`你是一位资深的小说创作顾问，拥有丰富的文学创作经验和世界观构建能力。请根据用户提供的灵感，创作一部完整且专业的小说概览。

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

用户灵感：`,step1BasicSetting:`你是一位资深的小说创作顾问。请根据用户提供的灵感，生成小说的基础设定。

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

用户灵感：`,step2Characters:`你是一位资深的小说创作顾问。请根据已有的基础设定，设计小说的角色。

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

请设计3-5个重要配角和1-2个主要反派。`,step3PlotOutline:`你是一位资深的小说创作顾问。请根据已有的基础设定和角色设定，规划小说的剧情大纲。

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

请规划3-5个分卷，每卷包含合理的章节数量。`,chapterGeneration:`你是一位专业的小说创作助手。根据提供的小说信息和上下文，生成指定数量的章节内容。

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

小说信息：`,chapterRegeneration:`你是一位专业的小说创作助手。根据用户的反馈和提示词，重新生成章节内容。

请按照以下JSON格式返回结果：
{
  "title": "章节标题",
  "content": "章节正文内容",
  "summary": "章节总结（50-100字，精炼概括本章主要情节）"
}

用户反馈：`,foreshadowingExtraction:`你是一位资深的小说编辑，擅长分析和识别小说中的伏笔。请仔细分析提供的章节内容，提取其中埋设的伏笔。

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

章节内容：`};function d(t){const n=[];return n.push({role:"system",content:"你是一位专业的小说创作助手，擅长根据用户灵感生成完整的小说概览。"}),n.push({role:"user",content:$.novelOverview+t}),n}function y(t,n,e){const s=[];s.push({role:"system",content:"你是一位专业的小说创作助手，擅长根据用户反馈重新生成章节内容。"}),s.push({role:"user",content:`用户反馈：${e}`});let a=`小说基本信息：
`;a+=`书名：${t.title}
`,a+=`简介：${t.description}
`,a+=`风格：${t.style.join("、")}
`,s.push({role:"user",content:a});let o=`章节信息：
`;return o+=`章节号：${n.chapterNumber}
`,o+=`章节标题：${n.title}
`,o+=`原章节内容：
${n.content}
`,s.push({role:"user",content:o}),s.push({role:"user",content:$.chapterRegeneration}),s}function b(t,n,e,s,a,o,r=null){var h;const i=[];i.push({role:"system",content:`你是一位专业的网络小说作家。请根据提供的小说信息和上下文，直接撰写章节内容。

【重要规则】：
1. 直接输出章节正文内容，不要输出任何其他内容（如标题、说明、JSON等）
2. 字数要求：${s}-${a}字
3. 内容要连贯、生动、有代入感
4. 第一行输出章节标题（格式：章节标题名称），然后换行开始正文

【思考过程限制】：
- 你的思考时间不要超过10秒
- 思考内容不要超过3000字
- 快速进入正文写作，不要过度思考

【上下文一致性要求】：
- 严格遵守角色当前状态设定
- 注意伏笔的延续和回收
- 保持时间线和剧情连贯性`});let u=`【小说基本信息】
`;if(u+=`书名：${t.title}
`,u+=`简介：${t.description}
`,u+=`风格：${t.style.join("、")}
`,u+=`剧情线：
主线：${t.plotLines.main}
`,t.plotLines.sub&&t.plotLines.sub.length>0&&(u+=`支线：${t.plotLines.sub.join("、")}
`),u+=`大纲：
`,t.outline.forEach((c,p)=>{u+=`${p+1}. ${c.volume}（${c.chapters}章）：${c.summary}
`}),i.push({role:"user",content:u}),r){const c=m(r);c&&i.push({role:"user",content:c})}if(n&&n.length>0){let c=`【最近章节内容】（最近${n.length}章）：
`;n.forEach(p=>{c+=`第${p.chapterNumber}章 ${p.title}：
${p.content}

`}),i.push({role:"user",content:c})}if(e&&e.length>0){let c=`【章节总结】（最近${e.length}章）：
`;e.forEach(p=>{c+=`第${p.chapterNumber}章 ${p.title}：${p.summary}
`}),i.push({role:"user",content:c})}let l=`【本次任务】
`;return l+=`- 撰写第${o}章
`,l+=`- 字数要求：${s}-${a}字

`,l+=`【写作要求】
`,l+=`1. 第一行输出章节标题（不要带"第X章"，只要标题名称）
`,l+=`2. 从第二行开始输出正文内容
`,l+=`3. 内容要符合小说风格，情节连贯
`,l+=`4. 注重细节描写：环境、对话、心理、动作
`,l+=`5. 确保字数达到${s}字以上
`,l+=`6. 不要输出任何其他内容（如说明、注释等）
`,r!=null&&r.characterStatus&&(l+=`7. 严格遵守角色当前状态设定（位置、状态、关系等）
`),((h=r==null?void 0:r.foreshadowingInfo)==null?void 0:h.pendingCount)>0&&(l+=`8. 注意伏笔的延续，可在合适时机回收待处理伏笔
`),l+=`
现在请开始撰写第${o}章：`,i.push({role:"user",content:l}),i}function m(t){let n="";if(t.characterStatus){const{grouped:e,characters:s}=t.characterStatus;if(n+=`【角色当前状态】
`,e.protagonist){const r=e.protagonist;n+=`
主角：${r.name}
`,n+=`  - 身份：${r.identity}
`,n+=`  - 当前位置：${r.currentLocation}
`,n+=`  - 当前状态：${r.currentCondition}
`,r.powerLevel&&(n+=`  - 实力等级：${r.powerLevel}
`),r.relationships&&r.relationships.length>0&&(n+=`  - 重要关系：
`,r.relationships.slice(0,3).forEach(i=>{n+=`    · ${i.type}（${i.reason||"原因未知"}）
`}))}const a=(e.supporting||[]).slice(0,3);a.length>0&&(n+=`
重要配角：
`,a.forEach(r=>{n+=`  - ${r.name}（${r.identity}）：${r.currentLocation}，${r.currentCondition}
`}));const o=e.antagonist||[];o.length>0&&(n+=`
反派角色：
`,o.forEach(r=>{n+=`  - ${r.name}（${r.identity}）：${r.currentLocation}
`}))}if(t.foreshadowingInfo&&t.foreshadowingInfo.pendingCount>0){const{pending:e,highImportance:s,reminder:a}=t.foreshadowingInfo;n+=`
【伏笔提醒】
`,s&&s.length>0&&(n+=`高优先级待回收伏笔：
`,s.forEach(o=>{n+=`  - ${o.content}（埋设于第${o.plantedInChapter}章）
`})),e&&e.length>((s==null?void 0:s.length)||0)&&(n+=`
其他待回收伏笔（共${e.length-((s==null?void 0:s.length)||0)}个）：
`,e.filter(o=>o.importance!=="high").slice(0,3).forEach(o=>{n+=`  - ${o.content}
`})),a&&(n+=`
⚠️ ${a}
`)}if(t.timeline&&t.timeline.events&&t.timeline.events.length>0){const e=t.timeline.events.slice(-5);n+=`
【近期重要事件】
`,e.forEach(s=>{n+=`  - ${s.description}
`,s.location&&(n+=`    地点：${s.location}
`)})}return n||null}function E(t,n,e){const s=[];return s.push({role:"system",content:"你是一位专业的小说编辑，擅长用简洁的语言总结章节内容。"}),s.push({role:"user",content:`请为以下章节生成一个精炼的总结。

【小说信息】
书名：${t.title}
风格：${t.style.join("、")}

【章节信息】
标题：${n}
内容：
${e}

【要求】
1. 总结字数：50-100字
2. 精炼概括本章主要情节和关键事件
3. 只输出总结内容，不要其他任何文字`}),s}function w(t,n,e,s,a=null){const o=[];o.push({role:"system",content:`你是一位专业的网络小说策划师。请根据提供的小说信息和上下文，为即将撰写的章节生成一个详细的大纲。

【重要规则】：
1. 大纲要详细但不冗长，控制在300-500字
2. 要有明确的情节发展和转折点
3. 要考虑与前后章节的衔接
4. 要符合小说整体风格和剧情走向`});let r=`【小说基本信息】
`;if(r+=`书名：${t.title}
`,r+=`简介：${t.description}
`,r+=`风格：${t.style.join("、")}
`,r+=`剧情线：
主线：${t.plotLines.main}
`,t.plotLines.sub&&t.plotLines.sub.length>0&&(r+=`支线：${t.plotLines.sub.join("、")}
`),r+=`大纲：
`,t.outline.forEach((u,l)=>{r+=`${l+1}. ${u.volume}（${u.chapters}章）：${u.summary}
`}),o.push({role:"user",content:r}),a){const u=m(a);u&&o.push({role:"user",content:u})}if(e&&e.length>0){let u=`【章节总结】（最近${e.length}章）：
`;e.forEach(l=>{u+=`第${l.chapterNumber}章 ${l.title}：${l.summary}
`}),o.push({role:"user",content:u})}let i=`【任务】
`;return i+=`请为第${s}章生成一个详细大纲。

`,i+=`【大纲格式要求】
`,i+=`请按以下JSON格式返回：
`,i+=`{
`,i+=`  "title": "章节标题（要有吸引力）",
`,i+=`  "summary": "章节概要（100字以内）",
`,i+=`  "scenes": [
`,i+=`    {
`,i+=`      "location": "场景地点",
`,i+=`      "characters": ["出场角色"],
`,i+=`      "events": ["主要事件"],
`,i+=`      "mood": "场景氛围"
`,i+=`    }
`,i+=`  ],
`,i+=`  "keyEvents": ["关键事件1", "关键事件2"],
`,i+=`  "cliffhanger": "结尾悬念/钩子",
`,i+=`  "foreshadowing": {
`,i+=`    "plant": ["可埋设的伏笔"],
`,i+=`    "resolve": ["可回收的伏笔"]
`,i+=`  }
`,i+=`}

`,i+="只返回JSON，不要其他文字。",o.push({role:"user",content:i}),o}function S(t,n,e,s=[]){const a=[];a.push({role:"system",content:"你是一位资深的小说编辑，擅长分析和识别小说中的伏笔。请严格按照JSON格式返回分析结果。"});let o=`请分析以下章节内容，提取其中的伏笔。

`;return o+=`【章节信息】
`,o+=`章节号：第${e}章
`,o+=`章节标题：${n}

`,s.length>0&&(o+=`【本小说角色列表】
`,s.forEach(r=>{o+=`- ${r.name}（${r.type==="protagonist"?"主角":r.identity||"配角"}）
`}),o+=`
`),o+=`【章节内容】
`,o+=t,a.push({role:"user",content:o}),a.push({role:"user",content:$.foreshadowingExtraction}),a}function O(t,n){if(!t||t.length===0)return null;let e=`【伏笔回收提醒】
`;e+=`当前即将生成第${n}章，以下伏笔尚未回收：

`;const s=t.filter(o=>o.importance==="high");s.length>0&&(e+=`⚠️ 高优先级伏笔（强烈建议在近期回收）：
`,s.forEach(o=>{const r=o.plantedInChapter||o.chapterNumber||"?",i=typeof r=="number"?Math.max(0,n-r):"?";e+=`  - ${o.content}
`,e+=`    埋设于第${r}章，已过${i}章
`,o.suggestedResolution&&(e+=`    建议回收：${o.suggestedResolution}
`)}),e+=`
`);const a=t.filter(o=>o.importance!=="high");return a.length>0&&(e+=`📝 待回收伏笔：
`,a.slice(0,5).forEach(o=>{const r=o.plantedInChapter||o.chapterNumber||"?";e+=`  - ${o.content}（埋设于第${r}章）
`}),a.length>5&&(e+=`  ... 还有${a.length-5}个伏笔待回收
`)),e}function N(t){var s;const n=[];n.push({role:"system",content:`你是一位资深的小说创作顾问和创意策划师。你擅长将简短的灵感扩展成丰富的创意设定。

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
- 可以融入的元素`});let e=`请扩写以下灵感：

`;return e+=`【标题】${t.title||"无标题"}
`,e+=`【内容】${t.content}
`,((s=t.tags)==null?void 0:s.length)>0&&(e+=`【标签】${t.tags.join("、")}
`),t.style&&(e+=`【风格偏好】${t.style}
`),e+=`
请将这个灵感扩展成 300-500 字的创意描述，包括：
1. 更详细的世界观设定
2. 可能的主角和核心冲突
3. 故事的主要看点
4. 可发展的剧情方向

直接输出扩写内容，不需要 JSON 格式。`,n.push({role:"user",content:e}),n}function P(t){var e;const n=[];return n.push({role:"system",content:`你是一位资深的小说创作顾问。你的任务是通过提问引导用户完善和深化他们的灵感。

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
- 差异化：这个故事与其他同类作品有什么不同？`}),n.push({role:"user",content:`请根据以下灵感，提出 3-5 个引导性问题，帮助我深化这个创意：

【标题】${t.title||"无标题"}
【内容】${t.content}
${((e=t.tags)==null?void 0:e.length)>0?`【标签】${t.tags.join("、")}`:""}

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
}`}),n}function I(t){const n=[];n.push({role:"system",content:`你是一位资深的小说创作顾问。你擅长将多个创意点融合，创作出完整且引人入胜的小说概览。

【融合原则】：
1. 寻找灵感之间的内在联系
2. 统一世界观和时间线
3. 整合角色和冲突
4. 构建完整的故事脉络
5. 保持创意的独特性和亮点`});let e=`请将以下 ${t.length} 个灵感融合，创作一个完整的小说概览：

`;return t.forEach((s,a)=>{var o;e+=`【灵感 ${a+1}】
`,e+=`标题：${s.title||"无标题"}
`,e+=`内容：${s.content}
`,s.expandedContent&&(e+=`扩写：${s.expandedContent}
`),((o=s.tags)==null?void 0:o.length)>0&&(e+=`标签：${s.tags.join("、")}
`),e+=`
`}),e+=$.novelOverview,n.push({role:"user",content:e}),n}function j(t){var s;const n=[];n.push({role:"system",content:`你是一位资深的小说编辑和市场分析师。你需要从多个维度评估一个灵感的创作潜力和市场价值。

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
- 0-44分：创意较弱，建议重新构思`});let e=`请评估以下灵感的创作潜力和市场价值：

`;return e+=`【标题】${t.title||"无标题"}
`,e+=`【内容】${t.content}
`,t.expandedContent&&(e+=`【扩写】${t.expandedContent}
`),((s=t.tags)==null?void 0:s.length)>0&&(e+=`【标签】${t.tags.join("、")}
`),t.style&&(e+=`【风格偏好】${t.style}
`),e+=`
请以 JSON 格式返回评分结果：
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
}`,n.push({role:"user",content:e}),n}function C(t,n,e,s,a,o,r=null){const i=[];i.push({role:"system",content:`你是一位专业的网络小说作家。请根据提供的章节大纲，撰写完整的章节内容。

【重要规则】：
1. 严格按照大纲的情节发展撰写
2. 字数要求：${s}-${a}字
3. 直接输出章节正文，第一行为标题
4. 内容要生动、有代入感
5. 注重细节描写：环境、对话、心理、动作`});let u=`【小说基本信息】
`;u+=`书名：${t.title}
`,u+=`风格：${t.style.join("、")}
`,i.push({role:"user",content:u});let l=`【本章大纲】
`;if(l+=`标题：${n.title}
`,l+=`概要：${n.summary}

`,n.scenes&&n.scenes.length>0&&(l+=`场景安排：
`,n.scenes.forEach((c,p)=>{var g,f;l+=`${p+1}. ${c.location}
`,l+=`   出场角色：${((g=c.characters)==null?void 0:g.join("、"))||"无特定"}
`,l+=`   主要事件：${((f=c.events)==null?void 0:f.join("；"))||"无"}
`,l+=`   场景氛围：${c.mood||"正常"}
`})),n.keyEvents&&n.keyEvents.length>0&&(l+=`
关键事件：
`,n.keyEvents.forEach((c,p)=>{l+=`${p+1}. ${c}
`})),n.cliffhanger&&(l+=`
结尾悬念：${n.cliffhanger}
`),n.foreshadowing&&(n.foreshadowing.plant&&n.foreshadowing.plant.length>0&&(l+=`
可埋设伏笔：${n.foreshadowing.plant.join("、")}
`),n.foreshadowing.resolve&&n.foreshadowing.resolve.length>0&&(l+=`可回收伏笔：${n.foreshadowing.resolve.join("、")}
`)),i.push({role:"user",content:l}),r){const c=m(r);c&&i.push({role:"user",content:c})}if(e&&e.length>0){let c=`【最近章节内容】（最近${e.length}章）：
`;e.forEach(p=>{c+=`第${p.chapterNumber}章 ${p.title}：
${p.content.slice(0,1e3)}...

`}),i.push({role:"user",content:c})}let h=`【写作要求】
`;return h+=`1. 第一行输出章节标题（不要带"第X章"）
`,h+=`2. 从第二行开始输出正文内容
`,h+=`3. 严格按照大纲的情节发展撰写
`,h+=`4. 确保字数达到${s}字以上
`,h+=`5. 注重场景描写和人物刻画
`,h+=`6. 结尾要有悬念感

`,h+=`现在请开始撰写第${o}章：`,i.push({role:"user",content:h}),i}export{I as a,j as b,P as c,N as d,d as e,O as f,S as g,b as h,w as i,C as j,E as k,y as l,$ as p};
