const h={novelOverview:`你是一位资深的小说创作顾问，拥有丰富的文学创作经验和世界观构建能力。请根据用户提供的灵感，创作一部完整且专业的小说概览。

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

【核心原则】：
**宁缺毋滥。只提取真正重要的长线伏笔，数量越少越好。如果一章中提取超过5个伏笔，说明标准太松了。**

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
- **关键过滤规则**：如果某个伏笔属于"小伏笔"（即在3章以内就能回收的短期伏笔），则**不提取**。只提取需要较长时间（超过3章）才能揭晓或回收的重要伏笔。
- **不提取**以下类型的小伏笔：日常对话中的随口一提、角色要去某个地方做某事的简单预告、章节结尾的小悬念（下章即揭晓）、过渡性的情节铺垫。
- 只有对主线剧情或重要角色发展有**持续影响**的伏笔才值得提取。

请严格按照以下JSON格式返回结果（不要添加任何额外文字）：
{
  "foreshadowings": [
    {
      "content": "伏笔的具体内容描述（简洁明了，20-50字）",
      "type": "伏笔类型（suspense/character/item/environment/dialogue/plot）",
      "importance": "重要性（high/medium）",
      "description": "伏笔的详细说明（包括为什么这是伏笔，可能的回收方向）",
      "suggestedResolution": "建议的回收方式（50-100字）",
      "suggestedChapterRange": "建议回收章节范围（如：10章后、卷末）",
      "relatedCharacters": ["相关角色名称"],
      "keywords": ["关键词"]
    }
  ]
}

如果章节中没有重要的长线伏笔，返回：
{
  "foreshadowings": []
}

【重要性判断标准】：
- high：对主线剧情有重大影响（如核心谜团、角色真实身份、关键物品来历），10章以上才回收
- medium：对支线剧情或角色发展有重要影响，3章以上才回收
- 如果是"low"级别的小细节伏笔，直接不提取

章节内容：`};function b(e){const n=[];return n.push({role:"system",content:"你是一位专业的小说创作助手，擅长根据用户灵感生成完整的小说概览。"}),n.push({role:"user",content:h.novelOverview+e}),n}function w(e,n,t){const o=[];o.push({role:"system",content:"你是一位专业的小说创作助手，擅长根据用户反馈重新生成章节内容。"}),o.push({role:"user",content:`用户反馈：${t}`});let i=`小说基本信息：
`;i+=`书名：${e.title}
`,i+=`简介：${e.description}
`,i+=`风格：${e.style.join("、")}
`,o.push({role:"user",content:i});let s=`章节信息：
`;return s+=`章节号：${n.chapterNumber}
`,s+=`章节标题：${n.title}
`,s+=`原章节内容：
${n.content}
`,o.push({role:"user",content:s}),o.push({role:"user",content:h.chapterRegeneration}),o}function S(e,n,t,o,i,s,r=null,l=null,u=null){var g;const c=[];c.push({role:"system",content:`你是一位专业的网络小说作家。请根据提供的小说信息和上下文，直接撰写章节内容。

【重要规则】：
1. 直接输出章节正文内容，不要输出任何其他内容（如标题、说明、JSON等）
2. 字数要求：${o}-${i}字
3. 内容要连贯、生动、有代入感
4. 第一行输出章节标题（格式：章节标题名称），然后换行开始正文

【思考过程限制】：
- 你的思考时间不要超过10秒
- 思考内容不要超过3000字
- 快速进入正文写作，不要过度思考

【上下文一致性要求】：
- 严格遵守角色当前状态设定
- 注意伏笔的延续和回收
- 保持时间线和剧情连贯性`});let $=`【小说基本信息】
`;if($+=`书名：${e.title}
`,$+=`简介：${e.description}
`,$+=`风格：${e.style.join("、")}
`,$+=`剧情线：
主线：${e.plotLines.main}
`,e.plotLines.sub&&e.plotLines.sub.length>0&&($+=`支线：${e.plotLines.sub.join("、")}
`),$+=`大纲：
`,e.outline.forEach((p,f)=>{$+=`${f+1}. ${p.volume}（${p.chapters}章）：${p.summary}
`}),c.push({role:"user",content:$}),r){const p=d(r);p&&c.push({role:"user",content:p})}if(n&&n.length>0){let p=`【最近章节内容】（最近${n.length}章）：
`;n.forEach(f=>{p+=`第${f.chapterNumber}章 ${f.title}：
${f.content}

`}),c.push({role:"user",content:p})}if(t&&t.length>0){let p=`【章节总结】（最近${t.length}章）：
`;t.forEach(f=>{p+=`第${f.chapterNumber}章 ${f.title}：${f.summary}
`}),c.push({role:"user",content:p})}let a=`【本次任务】
`;a+=`- 撰写第${s}章`,u&&(a+=`（共${u}章）`);const m=y(s,e.outline);return m&&(a+=`
- 所属卷册：${m.name}`),a+=`
`,a+=`- 字数要求：${o}-${i}字

`,l&&(a+=E(l,s,u,e.outline)+`

`),a+=`【写作要求】
`,a+=`1. 第一行输出章节标题（不要带"第X章"，只要标题名称）
`,a+=`2. 从第二行开始输出正文内容
`,a+=`3. 内容要符合小说风格，情节连贯
`,a+=`4. 注重细节描写：环境、对话、心理、动作
`,a+=`5. 确保字数达到${o}字以上
`,a+=`6. 不要输出任何其他内容（如说明、注释等）
`,r!=null&&r.characterStatus&&(a+=`7. 严格遵守角色当前状态设定（位置、状态、关系等）
`),((g=r==null?void 0:r.foreshadowingInfo)==null?void 0:g.pendingCount)>0&&(a+=`8. 注意伏笔的延续，可在合适时机回收待处理伏笔
`),a+=`
现在请开始撰写第${s}章：`,c.push({role:"user",content:a}),c}function d(e){let n="";if(e.characterStatus){const{grouped:t,characters:o}=e.characterStatus;if(n+=`【角色当前状态】
`,t.protagonist){const r=t.protagonist;n+=`
主角：${r.name}
`,n+=`  - 身份：${r.identity}
`,n+=`  - 当前位置：${r.currentLocation}
`,n+=`  - 当前状态：${r.currentCondition}
`,r.powerLevel&&(n+=`  - 实力等级：${r.powerLevel}
`),r.relationships&&r.relationships.length>0&&(n+=`  - 重要关系：
`,r.relationships.slice(0,3).forEach(l=>{n+=`    · ${l.type}（${l.reason||"原因未知"}）
`}))}const i=(t.supporting||[]).slice(0,3);i.length>0&&(n+=`
重要配角：
`,i.forEach(r=>{n+=`  - ${r.name}（${r.identity}）：${r.currentLocation}，${r.currentCondition}
`}));const s=t.antagonist||[];s.length>0&&(n+=`
反派角色：
`,s.forEach(r=>{n+=`  - ${r.name}（${r.identity}）：${r.currentLocation}
`}))}if(e.foreshadowingInfo&&e.foreshadowingInfo.pendingCount>0){const{pending:t,highImportance:o,reminder:i}=e.foreshadowingInfo;n+=`
【伏笔提醒】
`,o&&o.length>0&&(n+=`高优先级待回收伏笔：
`,o.forEach(s=>{n+=`  - ${s.content}（埋设于第${s.plantedInChapter}章）
`})),t&&t.length>((o==null?void 0:o.length)||0)&&(n+=`
其他待回收伏笔（共${t.length-((o==null?void 0:o.length)||0)}个）：
`,t.filter(s=>s.importance!=="high").slice(0,3).forEach(s=>{n+=`  - ${s.content}
`})),i&&(n+=`
⚠️ ${i}
`)}if(e.timeline&&e.timeline.events&&e.timeline.events.length>0){const t=e.timeline.events.slice(-5);n+=`
【近期重要事件】
`,t.forEach(o=>{n+=`  - ${o.description}
`,o.location&&(n+=`    地点：${o.location}
`)})}return n||null}function y(e,n){if(!(n!=null&&n.length))return null;let t=0;for(const o of n){const i=o.chapters||0;if(i===0){t++;continue}const s=t+1,r=t+i;if(e>=s&&e<=r){const l=(e-s)/i;let u="development";return l<=.1?u="opening":l<=.7?u="development":l<=.9?u="climax":u="ending",{name:o.volume,progress:l,phase:u,isLast:o===n[n.length-1],summary:o.summary||""}}t+=i}return null}function E(e,n,t,o=null){const i=[],s=y(n,o);if(s){const l={opening:`【本卷「${s.name}」·开篇】
本章位于该卷的开篇位置，任务是展开本卷的故事舞台：
- 引入本卷的新冲突、新目标或新势力
- 出场本卷的关键角色
- 为卷内后续剧情做铺垫和设定`,development:`【本卷「${s.name}」·发展】
本章位于该卷的发展推进阶段：
- 推进本卷内的核心事件和冲突
- 深化角色在本卷中的成长或关系变化
- 保持情节张力，适当埋设后续伏笔`,climax:`【本卷「${s.name}」·高潮】
本章位于该卷的高潮段落，是本卷最紧张激烈的部分：
- 本卷积累的矛盾集中爆发
- 关键对决或重大转折事件
- 给读者强烈的阅读冲击和情感共鸣`,ending:`【本卷「${s.name}」·收尾】
本章位于该卷的收尾部分，需要为卷内事件做结：
- 解决本卷的核心冲突，给出阶段性成果
- 为重要角色在本卷的经历画上句号
- 为下一卷埋设新的悬念或伏笔`};i.push(l[s.phase]||l.development)}const r={opening:"【全书定位】本书整体处于开篇阶段，需要在各卷推进中逐步建立世界观和核心矛盾。",development:"【全书定位】本书整体处于剧情展开阶段，主线在持续推进中，各卷形成各自的小高潮。",climax:"【全书定位】本书进入全书高潮阶段，所有卷的铺垫都指向最终收束。",ending:"【全书定位】本书进入收尾阶段，需要为全书做最终了结。"};return i.push(r[e]||r.development),n===t&&i.push(`【全书结局特别要求】
这是全书的最后一章！必须做到：
- 为所有主要角色的故事画上句号
- 主线冲突彻底解决，给出明确的结果
- 已埋设的高优先级伏笔必须回收
- 结局要有分量，让读者感到满足和回味
- 可以留有适当的余韵或开放式结尾，但不可中途断掉`),s&&s.phase==="ending"&&n<t&&i.push(`【卷末提示】本章是「${s.name}」的收尾章节，注意做好本卷的阶段性总结，同时为后续卷留下合理的悬念或伏笔。`),i.join(`

`)}function v(e,n,t){const o=[];return o.push({role:"system",content:"你是一位专业的小说编辑，擅长用简洁的语言总结章节内容。"}),o.push({role:"user",content:`请为以下章节生成一个精炼的总结。

【小说信息】
书名：${e.title}
风格：${e.style.join("、")}

【章节信息】
标题：${n}
内容：
${t}

【要求】
1. 总结字数：50-100字
2. 精炼概括本章主要情节和关键事件
3. 只输出总结内容，不要其他任何文字`}),o}function O(e,n,t,o,i=null){const s=[];s.push({role:"system",content:`你是一位专业的网络小说策划师。请根据提供的小说信息和上下文，为即将撰写的章节生成一个详细的大纲。

【重要规则】：
1. 大纲要详细但不冗长，控制在300-500字
2. 要有明确的情节发展和转折点
3. 要考虑与前后章节的衔接
4. 要符合小说整体风格和剧情走向`});let r=`【小说基本信息】
`;if(r+=`书名：${e.title}
`,r+=`简介：${e.description}
`,r+=`风格：${e.style.join("、")}
`,r+=`剧情线：
主线：${e.plotLines.main}
`,e.plotLines.sub&&e.plotLines.sub.length>0&&(r+=`支线：${e.plotLines.sub.join("、")}
`),r+=`大纲：
`,e.outline.forEach((u,c)=>{r+=`${c+1}. ${u.volume}（${u.chapters}章）：${u.summary}
`}),s.push({role:"user",content:r}),i){const u=d(i);u&&s.push({role:"user",content:u})}if(t&&t.length>0){let u=`【章节总结】（最近${t.length}章）：
`;t.forEach(c=>{u+=`第${c.chapterNumber}章 ${c.title}：${c.summary}
`}),s.push({role:"user",content:u})}let l=`【任务】
`;return l+=`请为第${o}章生成一个详细大纲。

`,l+=`【大纲格式要求】
`,l+=`请按以下JSON格式返回：
`,l+=`{
`,l+=`  "title": "章节标题（要有吸引力）",
`,l+=`  "summary": "章节概要（100字以内）",
`,l+=`  "scenes": [
`,l+=`    {
`,l+=`      "location": "场景地点",
`,l+=`      "characters": ["出场角色"],
`,l+=`      "events": ["主要事件"],
`,l+=`      "mood": "场景氛围"
`,l+=`    }
`,l+=`  ],
`,l+=`  "keyEvents": ["关键事件1", "关键事件2"],
`,l+=`  "cliffhanger": "结尾悬念/钩子",
`,l+=`  "foreshadowing": {
`,l+=`    "plant": ["可埋设的伏笔"],
`,l+=`    "resolve": ["可回收的伏笔"]
`,l+=`  }
`,l+=`}

`,l+="只返回JSON，不要其他文字。",s.push({role:"user",content:l}),s}function q(e,n,t,o=[]){const i=[];i.push({role:"system",content:"你是一位资深的小说编辑，擅长分析和识别小说中的伏笔。请严格按照JSON格式返回分析结果。"});let s=`请分析以下章节内容，提取其中的伏笔。

`;return s+=`【章节信息】
`,s+=`章节号：第${t}章
`,s+=`章节标题：${n}

`,o.length>0&&(s+=`【本小说角色列表】
`,o.forEach(r=>{s+=`- ${r.name}（${r.type==="protagonist"?"主角":r.identity||"配角"}）
`}),s+=`
`),s+=`【章节内容】
`,s+=e,i.push({role:"user",content:s}),i.push({role:"user",content:h.foreshadowingExtraction}),i}function P(e,n){if(!e||e.length===0)return null;let t=`【伏笔回收提醒】
`;t+=`当前即将生成第${n}章，以下伏笔尚未回收：

`;const o=e.filter(s=>s.importance==="high");o.length>0&&(t+=`⚠️ 高优先级伏笔（强烈建议在近期回收）：
`,o.forEach(s=>{const r=s.plantedInChapter||s.chapterNumber||"?",l=typeof r=="number"?Math.max(0,n-r):"?";t+=`  - ${s.content}
`,t+=`    埋设于第${r}章，已过${l}章
`,s.suggestedResolution&&(t+=`    建议回收：${s.suggestedResolution}
`)}),t+=`
`);const i=e.filter(s=>s.importance!=="high");return i.length>0&&(t+=`📝 待回收伏笔：
`,i.slice(0,5).forEach(s=>{const r=s.plantedInChapter||s.chapterNumber||"?";t+=`  - ${s.content}（埋设于第${r}章）
`}),i.length>5&&(t+=`  ... 还有${i.length-5}个伏笔待回收
`)),t}function j(e){var o;const n=[];n.push({role:"system",content:`你是一位资深的小说创作顾问和创意策划师。你擅长将简短的灵感扩展成丰富的创意设定。

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
- 可以融入的元素`});let t=`请扩写以下灵感：

`;return t+=`【标题】${e.title||"无标题"}
`,t+=`【内容】${e.content}
`,((o=e.tags)==null?void 0:o.length)>0&&(t+=`【标签】${e.tags.join("、")}
`),e.style&&(t+=`【风格偏好】${e.style}
`),t+=`
请将这个灵感扩展成 300-500 字的创意描述，包括：
1. 更详细的世界观设定
2. 可能的主角和核心冲突
3. 故事的主要看点
4. 可发展的剧情方向

直接输出扩写内容，不需要 JSON 格式。`,n.push({role:"user",content:t}),n}function I(e){var t;const n=[];return n.push({role:"system",content:`你是一位资深的小说创作顾问。你的任务是通过提问引导用户完善和深化他们的灵感。

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

【标题】${e.title||"无标题"}
【内容】${e.content}
${((t=e.tags)==null?void 0:t.length)>0?`【标签】${e.tags.join("、")}`:""}

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
}`}),n}function L(e){const n=[];n.push({role:"system",content:`你是一位资深的小说创作顾问。你擅长将多个创意点融合，创作出完整且引人入胜的小说概览。

【融合原则】：
1. 寻找灵感之间的内在联系
2. 统一世界观和时间线
3. 整合角色和冲突
4. 构建完整的故事脉络
5. 保持创意的独特性和亮点`});let t=`请将以下 ${e.length} 个灵感融合，创作一个完整的小说概览：

`;return e.forEach((o,i)=>{var s;t+=`【灵感 ${i+1}】
`,t+=`标题：${o.title||"无标题"}
`,t+=`内容：${o.content}
`,o.expandedContent&&(t+=`扩写：${o.expandedContent}
`),((s=o.tags)==null?void 0:s.length)>0&&(t+=`标签：${o.tags.join("、")}
`),t+=`
`}),t+=h.novelOverview,n.push({role:"user",content:t}),n}function C(e){var o;const n=[];n.push({role:"system",content:`你是一位资深的小说编辑和市场分析师。你需要从多个维度评估一个灵感的创作潜力和市场价值。

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
- 0-44分：创意较弱，建议重新构思`});let t=`请评估以下灵感的创作潜力和市场价值：

`;return t+=`【标题】${e.title||"无标题"}
`,t+=`【内容】${e.content}
`,e.expandedContent&&(t+=`【扩写】${e.expandedContent}
`),((o=e.tags)==null?void 0:o.length)>0&&(t+=`【标签】${e.tags.join("、")}
`),e.style&&(t+=`【风格偏好】${e.style}
`),t+=`
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
}`,n.push({role:"user",content:t}),n}function J(e,n,t,o,i,s,r=null,l=null,u=null){const c=[];c.push({role:"system",content:`你是一位专业的网络小说作家。请根据提供的章节大纲，撰写完整的章节内容。

【重要规则】：
1. 严格按照大纲的情节发展撰写
2. 字数要求：${o}-${i}字
3. 直接输出章节正文，第一行为标题
4. 内容要生动、有代入感
5. 注重细节描写：环境、对话、心理、动作`});let $=`【小说基本信息】
`;$+=`书名：${e.title}
`,$+=`风格：${e.style.join("、")}
`,c.push({role:"user",content:$});let a=`【本章大纲】
`;if(a+=`标题：${n.title}
`,a+=`概要：${n.summary}

`,n.scenes&&n.scenes.length>0&&(a+=`场景安排：
`,n.scenes.forEach((m,g)=>{var p,f;a+=`${g+1}. ${m.location}
`,a+=`   出场角色：${((p=m.characters)==null?void 0:p.join("、"))||"无特定"}
`,a+=`   主要事件：${((f=m.events)==null?void 0:f.join("；"))||"无"}
`,a+=`   场景氛围：${m.mood||"正常"}
`})),n.keyEvents&&n.keyEvents.length>0&&(a+=`
关键事件：
`,n.keyEvents.forEach((m,g)=>{a+=`${g+1}. ${m}
`})),n.cliffhanger&&(a+=`
结尾悬念：${n.cliffhanger}
`),n.foreshadowing&&(n.foreshadowing.plant&&n.foreshadowing.plant.length>0&&(a+=`
可埋设伏笔：${n.foreshadowing.plant.join("、")}
`),n.foreshadowing.resolve&&n.foreshadowing.resolve.length>0&&(a+=`可回收伏笔：${n.foreshadowing.resolve.join("、")}
`)),c.push({role:"user",content:a}),r){const m=d(r);m&&c.push({role:"user",content:m})}if(t&&t.length>0){let m=`【最近章节内容】（最近${t.length}章）：
`;t.forEach(g=>{m+=`第${g.chapterNumber}章 ${g.title}：
${g.content.slice(0,1e3)}...

`}),c.push({role:"user",content:m})}if(l){requirements=`【本次任务】
`,requirements+=`- 撰写第${s}章`,u&&(requirements+=`（共${u}章）`);const m=y(s,e.outline);m&&(requirements+=`
- 所属卷册：${m.name}`),requirements+=`
- 字数要求：${o}-${i}字

`,requirements+=E(l,s,u,e.outline)+`

`,requirements+=`【写作要求】
`}else requirements=`【写作要求】
`;return requirements+=`1. 第一行输出章节标题（不要带"第X章"）
`,requirements+=`2. 从第二行开始输出正文内容
`,requirements+=`3. 严格按照大纲的情节发展撰写
`,requirements+=`4. 确保字数达到${o}字以上
`,requirements+=`5. 注重场景描写和人物刻画
`,requirements+=`6. 结尾要有悬念感

`,requirements+=`现在请开始撰写第${s}章：`,c.push({role:"user",content:requirements}),c}export{L as a,C as b,I as c,j as d,b as e,P as f,q as g,S as h,O as i,J as j,v as k,w as l,y as m,h as p};
