# 小说生成核心功能优化建议

> 基于项目代码深入分析，针对**小说生成核心业务**的优化方案
> 
> 分析时间：2026-03-23

---

## 一、小说概览生成优化

### 1. 分步生成模式 ✅ 已完成

**已实现方案**：
```
第一步：生成基础设定（书名、风格、世界观、简介）
第二步：生成角色设定（主角、配角、反派）
第三步：生成剧情大纲（主线、支线、分卷、章节结构）
```

**已实现功能**：
- 分步生成提示词模板（`step1BasicSetting`、`step2Characters`、`step3PlotOutline`）
- 分步生成提示词构建函数（`buildStep1Prompt`、`buildStep2Prompt`、`buildStep3Prompt`）
- 结果合并函数（`mergeStepResults`）

**新增文件/函数**：
- `src/utils/prompts.js` - 新增分步生成相关的 prompts 和函数

**优势**：
- 每步可单独重新生成
- 用户可在每步进行微调
- 减少单次生成失败的风险

---

### 2. 灵感增强功能

**当前状态**：用户输入灵感后直接生成

**建议新增**：

| 功能 | 说明 |
|------|------|
| 灵感扩写 | 用户输入简短灵感后，AI先扩写成详细的创作需求文档 |
| 灵感问答 | AI主动提问引导用户完善设定（如："主角的金手指是什么？"） |
| 灵感模板 | 提供不同类型的灵感模板（玄幻模板、都市模板等） |

---

### 3. 世界观模板库

**建议新增**：
- 预设常见世界观模板（修仙体系、魔法体系、科幻体系）
- 用户选择模板后自动填充力量等级、势力结构等
- 支持自定义保存世界观模板

**示例模板结构**：
```javascript
worldTemplate: {
  name: '修仙体系',
  powerSystem: '练气→筑基→金丹→元婴→化神→渡劫→大乘',
  socialStructure: '宗门、家族、散修三足鼎立',
  specialElements: '灵根、法宝、丹药、阵法'
}
```

---

## 二、章节生成优化

### 4. 上下文优化（核心优化点）✅ 已完成

**当前问题分析** `src/utils/prompts.js`：

```javascript
// 当前只传递最近3章内容和章节总结
const recentChapters = await getRecentChapters(novel.value.id, 3)
const chapterSummaries = await getChapterSummaries(novel.value.id, 100)
```

**已实现优化方案**：

| 优化项 | 说明 | 实现文件 |
|--------|------|----------|
| 智能上下文选择 | 根据当前章节涉及的角色、地点，动态选择相关章节 | `src/utils/contextBuilder.js` |
| 角色状态追踪 | 维护角色状态表（当前位置、状态、关系变化），生成时注入 | `src/composables/useCharacter.js` |
| 伏笔追踪系统 | 记录已埋伏笔，提醒AI回收或延续 | `src/composables/useForeshadowing.js` |
| 关键事件时间线 | 提取重要事件生成时间线，确保剧情连贯 | `src/utils/dao.js` - `timelineEventDao` |

**已实现数据结构**：
```javascript
// 角色状态追踪数据结构（已实现）
// 数据库表：characters
character: {
  id: Number,
  novelId: Number,
  name: String,
  type: 'protagonist' | 'supporting' | 'antagonist' | 'minor',
  basicInfo: { age, identity, appearance, personality },
  background: String,
  goals: [String],
  abilities: [String],
  currentStatus: {
    location: String,
    condition: String,
    powerLevel: String,
    relationships: [{ targetId, type, value, reason }]
  },
  appearances: [{ chapterId, events, timestamp }]
}

// 伏笔追踪数据结构（已实现）
// 数据库表：foreshadowing
foreshadowing: {
  id: Number,
  novelId: Number,
  type: 'planted' | 'resolved',
  chapterId: Number,
  content: String,
  importance: 'high' | 'medium' | 'low',
  status: 'pending' | 'resolved',
  resolvedIn: Number,
  relatedCharacters: [Number],
  notes: String
}

// 时间线事件数据结构（已实现）
// 数据库表：timelineEvents
timelineEvent: {
  id: Number,
  novelId: Number,
  chapterId: Number,
  description: String,
  characters: [String],
  location: String,
  timestamp: String
}
```

**新增文件**：
- `src/utils/db.js` - 扩展数据库版本，新增 characters、foreshadowing、timelineEvents、generationTasks 表
- `src/utils/dao.js` - 新增 characterDao、foreshadowingDao、timelineEventDao、generationTaskDao
- `src/composables/useCharacter.js` - 角色管理组合式函数
- `src/composables/useForeshadowing.js` - 伏笔管理组合式函数
- `src/utils/contextBuilder.js` - 上下文构建器，提供智能上下文选择和格式化功能

---

### 5. 章节大纲预生成 ✅ 已完成

**已实现流程**：
```
1. 先生成章节大纲（JSON格式，包含标题、概要、场景、关键事件、伏笔等）
2. 用户确认/修改大纲（支持可视化编辑）
3. 根据大纲生成完整章节
```

**已实现功能**：
- 大纲预生成开关（默认开启）
- 大纲可视化编辑界面
- 场景安排编辑（地点、角色、事件、氛围）
- 关键事件设置
- 结尾悬念设置
- 伏笔埋设/回收设置

**新增文件/函数**：
- `src/utils/prompts.js` - 新增 `buildChapterOutlinePrompt()` 和 `buildChapterFromOutlinePrompt()`
- `src/views/ChapterCreate.vue` - 新增大纲预生成UI和交互逻辑

**优势**：
- 提高生成可控性
- 减少生成偏离
- 用户可提前干预剧情走向

---

### 6. 多版本生成对比

**建议新增**：
- 同一章节生成2-3个版本
- 并排展示对比
- 用户选择最佳版本或合并

**UI设计建议**：
```
┌─────────────┬─────────────┬─────────────┐
│   版本 A    │   版本 B    │   版本 C    │
│  [选中]     │             │             │
├─────────────┴─────────────┴─────────────┤
│              内容预览区域                 │
└──────────────────────────────────────────┘
```

---

### 7. 生成中断续写

**当前问题**：生成中断后需重新开始

**建议新增**：
- 保存生成进度到 IndexedDB
- 支持从中断点继续生成
- 显示已生成内容预览
- 网络恢复后自动重试

---

## 三、Prompt 工程优化

### 8. 动态 Prompt 构建 ✅ 已完成

**已实现功能**：

**支持的风格写作规范**：
- 玄幻、仙侠、都市、言情、悬疑、科幻、历史、武侠、末世、系统流

**动态构建函数**：
```javascript
// src/utils/dynamicPrompt.js

// 根据小说风格构建动态 Prompt
buildDynamicPrompt(novel, basePrompt)

// 获取风格特定的写作规范
getStyleGuideline(style)

// 获取负面提示词
getNegativePrompts(styles)

// 构建角色相关的动态提示词
buildCharacterPrompt(character)

// 构建世界观相关的动态提示词
buildWorldSettingPrompt(worldSetting)

// 构建剧情相关的动态提示词
buildPlotPrompt(plotLines, currentProgress)

// 智能构建完整的动态提示词
buildCompleteDynamicPrompt(novel, options)
```

**负面提示词系统**：
- 通用负面提示词（避免网络用语、逻辑矛盾等）
- 风格特定负面提示词（如玄幻不出现西方魔法元素）

**新增文件**：
- `src/utils/dynamicPrompt.js` - 动态 Prompt 构建工具

---

### 9. 写作风格学习 ⏳ 待实现

**当前状态**：待实现

**建议新增**：
- 用户可上传喜欢的小说片段（1-3章）
- AI分析提取写作风格特征
- 生成时模仿该风格

**风格特征提取**：
```javascript
styleProfile: {
  sentenceLength: 'medium',      // 句子长度
  descriptionLevel: 'high',      // 描写细腻度
  dialogueRatio: 0.3,            // 对话占比
  innerMonologue: 'frequent',    // 心理描写频率
  vocabulary: ['古风', '文雅'],  // 用词风格
  specialPhrases: ['...', '...'] // 特色表达
}
```

---

### 10. 负面提示词 ✅ 已完成

**已实现**：
```javascript
// src/utils/dynamicPrompt.js

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

// 获取负面提示词函数
getNegativePrompts(styles)
```

**新增文件**：
- `src/utils/dynamicPrompt.js` - 包含负面提示词系统和相关函数

---

## 四、内容质量控制

### 11. 生成后自动检测 ✅ 已完成

**已实现检测项**：

| 检测类型 | 说明 | 处理方式 |
|----------|------|----------|
| 字数检测 | 检查是否达到目标字数 | 返回字数统计和是否达标 |
| 逻辑检测 | 检查时间线、人物状态是否矛盾 | 返回问题列表 |
| 重复检测 | 检测与已有内容的重复率 | 返回重复率和重复句子 |
| 敏感词检测 | 标记敏感内容 | 返回发现的敏感词列表 |
| 连贯性检测 | 检测与上一章的衔接 | 返回连贯性评分 |

**已实现功能**：
```javascript
// src/composables/useQualityCheck.js

// 执行完整质量检测
runQualityCheck(chapter, options)

// 单项检测
checkWordCount(content, minWords)
checkRepetition(content, existingChapters)
checkSensitiveWords(content)
checkLogicConsistency(chapter, novel)
checkCoherence(chapter, previousChapter)

// 获取质量报告摘要
getQualitySummary
```

**新增文件**：
- `src/composables/useQualityCheck.js` - 内容质量检测组合式函数

---

### 12. 章节连贯性评分

**建议新增**：
- AI评估新章节与上文的连贯性（0-100分）
- 低分时提示用户并提供修改建议
- 评分维度：剧情衔接、角色一致性、风格统一

**评分标准**：
```javascript
coherenceScore: {
  plotConnection: 85,      // 剧情衔接度
  characterConsistency: 90, // 角色一致性
  styleUnity: 88,          // 风格统一度
  timelineAccuracy: 95,    // 时间线准确度
  overallScore: 89         // 综合评分
}
```

---

### 13. 自动摘要优化

**当前状态**：`buildChapterSummaryPrompt` 生成简单摘要

**建议优化**：
```javascript
// 结构化摘要
structuredSummary: {
  keyEvents: [
    '主角在青云宗外门考核中获得第一名',
    '引起长老注意，被收为内门弟子'
  ],
  characterChanges: [
    { character: '主角', change: '身份提升：外门弟子→内门弟子' },
    { character: '反派A', change: '对主角产生嫉妒' }
  ],
  foreshadowing: [
    { type: '埋设', content: '神秘老者赠送玉佩', relatedTo: '后续剧情' }
  ],
  timeline: '修炼第3年，春季'
}
```

---

## 五、批量生成优化

### 14. 智能批量生成 ✅ 已完成

**已实现策略**：
```
设置：生成10章

策略分配：
├── 第1章（前10%）：开篇策略（3000-5000字/章）
│   └── 原因：开篇需要详细铺垫
├── 第2-7章（10%-70%）：发展策略（2000-3000字/章）
│   └── 原因：剧情推进阶段
├── 第8-9章（70%-90%）：高潮策略（3000-4000字/章）
│   └── 原因：高潮章节需要详细描写
└── 第10章（90%-100%）：过渡策略（1500-2500字/章）
    └── 原因：收尾过渡，可适当精简
```

**已实现功能**：
- 智能策略分配（根据章节位置自动选择生成策略）
- 批量任务创建和执行
- 任务暂停/继续
- 进度追踪
- 失败章节跳过继续执行

**新增文件**：
- `src/utils/batchGenerator.js` - 智能批量生成组合式函数

**优势**：
- 提高长篇生成效率
- 避免上下文过长导致质量下降
- 资源合理分配

---

### 15. 生成任务队列 ✅ 已完成

**已实现数据结构**：
```javascript
// 数据库表：generationTasks
generationTask: {
  id: Number,
  novelId: Number,
  type: 'single' | 'batch',
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed',
  chapters: [
    {
      number: 1,
      status: 'pending' | 'generating' | 'completed' | 'failed',
      content: '...',
      title: '...',
      summary: '...',
      wordCount: 0
    }
  ],
  progress: 0,  // 0-100
  options: {
    minWords: 2000,
    maxWords: 3000,
    useOutline: true,
    autoSave: true
  },
  error: null,
  startedAt: String,
  completedAt: String,
  createdAt: String,
  updatedAt: String
}
```

**已实现功能**：
- 任务列表管理
- 显示每个任务状态（等待/生成中/完成/失败）
- 支持暂停/继续/取消
- 章节级别进度追踪
- 任务统计（总数、待处理、运行中、已完成、失败、暂停）

**新增文件**：
- `src/composables/useGenerationQueue.js` - 生成任务队列组合式函数
- `src/utils/dao.js` - 新增 `generationTaskDao` 数据访问对象
- `src/utils/db.js` - 新增 `generationTasks` 数据库表

---

## 六、角色与剧情管理

### 16. 角色卡片系统 ✅ 已完成

**已实现数据结构**：
```javascript
// 数据库表：characters（已创建）
character: {
  id: Number,
  novelId: Number,
  name: String,
  type: 'protagonist' | 'supporting' | 'antagonist' | 'minor',
  basicInfo: {
    age: String,
    identity: String,
    appearance: String,
    personality: String
  },
  background: String,
  goals: [String],
  abilities: [String],
  currentStatus: {
    location: String,
    condition: String,
    powerLevel: String,
    relationships: [{
      targetId: Number,
      type: String,
      value: Number,
      reason: String
    }]
  },
  appearances: [{
    chapterId: Number,
    events: [String],
    timestamp: String
  }],
  createdAt: String,
  updatedAt: String
}
```

**已实现功能**：
- 角色CRUD操作
- 角色状态更新
- 角色出场记录
- 角色关系管理
- 从小说概览自动创建角色

**新增文件**：
- `src/utils/db.js` - 新增 characters 表
- `src/utils/dao.js` - 新增 characterDao
- `src/composables/useCharacter.js` - 角色管理组合式函数

---

### 17. 剧情分支管理 ⏳ 部分完成

**已实现**：
- 数据库架构支持（可扩展）
- 章节与剧情关联的基础设施

**待实现**：
- 可视化剧情树UI
- 平行剧情线创建界面
- 主线/支线选择生成

**数据结构设计**：
```javascript
plotBranch: {
  id: Number,
  novelId: Number,
  type: 'main' | 'sub',
  name: String,
  description: String,
  chapters: [Number],
  parentBranch: Number,
  status: 'active' | 'ended' | 'merged',
  mergeTo: Number
}
```

---

### 18. 伏笔管理 ✅ 已完成

**已实现数据结构**：
```javascript
// 数据库表：foreshadowing（已创建）
foreshadowing: {
  id: Number,
  novelId: Number,
  type: 'planted' | 'resolved',
  chapterId: Number,
  content: String,
  importance: 'high' | 'medium' | 'low',
  status: 'pending' | 'resolved',
  resolvedIn: Number,
  relatedCharacters: [Number],
  notes: String,
  createdAt: String,
  updatedAt: String
}
```

**已实现功能**：
- 伏笔CRUD操作
- 伏笔状态更新（标记已回收）
- 获取待回收伏笔列表
- 获取高优先级伏笔
- 伏笔统计（总数、待回收、已回收、高优先级）

**新增文件**：
- `src/utils/db.js` - 新增 foreshadowing 表
- `src/utils/dao.js` - 新增 foreshadowingDao
- `src/composables/useForeshadowing.js` - 伏笔管理组合式函数

---

## 七、实施优先级

### 高优先级（建议优先实施）

| 功能 | 价值 | 实施难度 |
|------|------|----------|
| 上下文优化（角色状态追踪） | 核心质量提升 | 中 |
| 章节大纲预生成 | 提高可控性 | 低 |
| 生成任务队列 | 批量生成体验 | 中 |
| 动态 Prompt 构建 | 风格适配 | 低 |

### 中优先级

| 功能 | 价值 | 实施难度 |
|------|------|----------|
| 分步生成模式 | 降低生成失败率 | 中 |
| 生成后质量检测 | 内容保障 | 中 |
| 负面提示词 | 提高生成质量 | 低 |
| 智能批量生成 | 效率提升 | 中 |

### 低优先级（长期规划）

| 功能 | 价值 | 实施难度 |
|------|------|----------|
| 角色卡片系统 | 长篇支持 | 高 |
| 伏笔管理 | 高级功能 | 高 |
| 剧情分支管理 | 复杂功能 | 高 |
| 写作风格学习 | 个性化 | 高 |

---

## 八、技术实现建议

### 数据库扩展

```javascript
// db.js 新增表
db.version(2).stores({
  novels: '++id, title, createdAt, updatedAt',
  chapters: '++id, novelId, chapterNumber, createdAt, updatedAt',
  characters: '++id, novelId, name, type',
  foreshadowing: '++id, novelId, type, status',
  generationTasks: '++id, novelId, status, createdAt'
})
```

### API 扩展

```javascript
// 新增 API 函数
export async function generateChapterOutline(novel, context) { ... }
export async function checkContentQuality(content, rules) { ... }
export async function analyzeWritingStyle(sampleText) { ... }
```

### Composables 扩展

```javascript
// 新增 composables
export function useCharacter() { ... }      // 角色管理
export function useForeshadowing() { ... }  // 伏笔管理
export function useGenerationQueue() { ... } // 生成队列
export function useQualityCheck() { ... }   // 质量检测
```

---

## 九、总结

以上优化建议聚焦于小说生成的核心业务流程，从**生成质量**、**可控性**、**效率**三个维度进行优化。建议按照优先级逐步实施，每个功能完成后进行用户测试和反馈收集，持续迭代改进。
