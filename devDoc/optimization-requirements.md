# AI小说生成器 - 优化需求文档

**文档版本**: 1.1
**创建日期**: 2026-03-26
**更新日期**: 2026-03-26
**对应项目版本**: v2.0.0

---

## 📋 文档目的

本文档基于对项目代码的全面审查，识别功能衔接中的问题，并提出具体的优化需求。旨在提升用户体验、完善功能流程、增强系统稳定性。

---

## 🔍 现状分析

### 项目架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      AI小说生成器 v2.0.0                      │
├─────────────────────────────────────────────────────────────┤
│  前端层: Vue 3.5 + Ant Design Vue + Pinia                    │
│  数据层: Dexie (IndexedDB) - 7版本数据库                      │
│  AI层: Kimi / 千问 / DeepSeek / 豆包 多提供商支持              │
├─────────────────────────────────────────────────────────────┤
│  核心模块:                                                   │
│  • 小说管理 (NovelList/NovelCreate/NovelDetail/NovelEdit)    │
│  • 章节生成 (ChapterCreate/ChapterDetail)                    │
│  • 角色管理 (Character + RelationshipGraph)                  │
│  • 大纲编辑 (OutlineEditor + TimelineEditor)                 │
│  • 伏笔追踪 (Foreshadowing)                                  │
│  • 灵感工作台 (InspirationWorkshop)                          │
│  • 写作工具 (WritingTools)                                   │
│  • 阅读器 (NovelReader)                                      │
└─────────────────────────────────────────────────────────────┘
```

### 当前问题分类

| 优先级 | 问题类型 | 数量 | 影响范围 |
|--------|----------|------|----------|
| P0 (高) | 功能衔接缺陷 | 3 | 核心流程 |
| P1 (中) | 体验优化 | 5 | 交互体验 |
| P2 (低) | 代码质量 | 4 | 维护性 |

---

## 🔴 P0 - 高优先级优化需求（含功能断裂修复）

### 需求0: 修复核心功能衔接断裂（紧急）

**问题描述**
经过代码审查发现，系统中存在关键功能衔接断裂：

| 功能 | 方法是否存在 | 是否被调用 | 状态 |
|------|-------------|-----------|------|
| 角色信息导入角色管理 | ✅ `createFromNovelOverview` | ❌ 否 | **断裂** |
| 伏笔自动提取 | ✅ `extractFromChapter` | ❌ 否 | **断裂** |
| 角色关系自动创建 | ❌ 无 | ❌ 否 | **缺失** |

**断裂点分析**

1. **小说创建时角色未导入**
   ```javascript
   // NovelCreate.vue handleSave 方法（第99-126行）
   const handleSave = async () => {
     const id = await createNovel(novel)
     if (id) {
       // ❌ 缺少：自动创建角色
       // ❌ 缺少：自动提取伏笔
       router.push(`/novel/${id}`)
     }
   }
   ```

2. **章节生成后伏笔未提取**
   ```javascript
   // ChapterCreate.vue 章节保存后
   // ❌ 缺少：自动调用 extractFromChapter
   // ❌ 缺少：更新角色出场记录
   // ❌ 缺少：检查伏笔回收
   ```

3. **角色关系完全未处理**
   - 小说概览中的角色关系未提取
   - 角色创建时 relationships 数组为空

**优化目标**
```
生成概览 → 保存小说 → 提取角色 → 创建角色表记录
                    → 提取关系 → 创建关系表记录
                    → 提取潜在伏笔 → 创建伏笔表记录

生成章节 → 保存章节 → 更新角色出场记录
                    → 自动提取新伏笔 → 创建伏笔记录
                    → 更新角色状态（位置、关系变化等）
                    → 标记已回收的伏笔
```

**具体需求**

1. **修复 NovelCreate.vue**
   ```javascript
   // 修改 handleSave 方法
   const handleSave = async () => {
     if (!generatedOverview.value) {
       message.warning('请先生成小说概览')
       return
     }

     const novel = { ... }
     const id = await createNovel(novel)
     
     if (id) {
       // 新增：自动创建角色
       const { createFromNovelOverview } = useCharacter()
       const characterCount = await createFromNovelOverview(id, generatedOverview.value)
       if (characterCount > 0) {
         message.success(`已自动创建 ${characterCount} 个角色`)
       }
       
       // 新增：从概览中提取潜在伏笔
       const { extractFromNovelOverview } = useForeshadowing()
       const foreshadowingCount = await extractFromNovelOverview(
         id,
         generatedOverview.value.plotLines,
         generatedOverview.value.outline
       )
       if (foreshadowingCount > 0) {
         message.success(`已从概览中提取 ${foreshadowingCount} 个潜在伏笔`)
       }
       
       // 新增：提取角色关系
       const { createRelationsFromNovelOverview } = useCharacterRelation()
       const relationCount = await createRelationsFromNovelOverview(
         id,
         generatedOverview.value.characters
       )
       if (relationCount > 0) {
         message.success(`已自动创建 ${relationCount} 个角色关系`)
       }
       
       router.push(`/novel/${id}`)
     }
   }
   ```

2. **新增 useForeshadowing.extractFromNovelOverview**
   ```javascript
   /**
    * 从小说概览中提取潜在伏笔
    * @param {number} novelId - 小说ID
    * @param {Object} plotLines - 剧情线信息
    * @param {Array} outline - 大纲信息
    */
   const extractFromNovelOverview = async (novelId, plotLines, outline) => {
     const foreshadowings = []
     
     // 从主线剧情中提取
     if (plotLines?.main) {
       // AI分析主线剧情，提取潜在伏笔点
       const mainForeshadowings = await analyzePlotForForeshadowing(
         plotLines.main,
         'main'
       )
       foreshadowings.push(...mainForeshadowings)
     }
     
     // 从支线剧情中提取
     if (plotLines?.sub?.length) {
       for (const subPlot of plotLines.sub) {
         const subForeshadowings = await analyzePlotForForeshadowing(
           subPlot,
           'sub'
         )
         foreshadowings.push(...subForeshadowings)
       }
     }
     
     // 从大纲中提取
     if (outline?.length) {
       for (const volume of outline) {
         if (volume.summary) {
           const volumeForeshadowings = await analyzePlotForForeshadowing(
             volume.summary,
             'outline'
           )
           foreshadowings.push(...volumeForeshadowings)
         }
       }
     }
     
     // 保存提取的伏笔
     const saved = []
     for (const fs of foreshadowings) {
       const id = await foreshadowingDao.add({
         novelId,
         content: fs.content,
         type: fs.type || 'plot',
         importance: fs.importance || 'medium',
         description: fs.description,
         relatedCharacters: fs.relatedCharacters || [],
         status: 'pending',
         source: 'overview'
       })
       saved.push(id)
     }
     
     return saved.length
   }
   ```

3. **修复 ChapterCreate.vue 章节保存后处理**
   ```javascript
   // 在章节保存成功后添加
   const afterChapterSave = async (chapterId, content) => {
     const novelId = novel.value.id
     
     // 1. 提取新伏笔
     const { extractFromChapter } = useForeshadowing()
     const newForeshadowings = await extractFromChapter(
       content,
       chapterId,
       novelId
     )
     
     // 2. 更新角色出场
     const { updateAppearancesFromContent } = useCharacter()
     const appearedCharacters = await updateAppearancesFromContent(
       content,
       chapterId,
       novelId
     )
     
     // 3. 更新角色状态（位置、关系变化）
     const { updateStatusesFromContent } = useCharacter()
     await updateStatusesFromContent(content, chapterId, novelId)
     
     // 4. 检查伏笔回收
     const { checkForeshadowingResolution } = useForeshadowing()
     const resolvedForeshadowings = await checkForeshadowingResolution(
       content,
       novelId,
       chapterId
     )
     
     if (resolvedForeshadowings.length > 0) {
       message.success(`检测到 ${resolvedForeshadowings.length} 个伏笔已回收`)
     }
     
     // 5. 记录时间线事件
     const { recordTimelineEvents } = useOutline()
     await recordTimelineEvents(content, chapterId, novelId)
   }
   ```

4. **新增角色关系提取**
   ```javascript
   // useCharacterRelation.js 新增
   const createRelationsFromNovelOverview = async (novelId, characters) => {
     const relations = []
     
     // 分析角色之间的关系描述
     if (characters?.protagonist && characters?.supportingCharacters) {
       const protagonist = characters.protagonist
       
       for (const supporting of characters.supportingCharacters) {
         // 从role描述中提取关系类型
         const relationType = analyzeRelationType(
           supporting.role,
           protagonist.identity
         )
         
         if (relationType) {
           relations.push({
             novelId,
             sourceId: protagonist.id, // 需要在创建后获取
             targetId: supporting.id,
             type: relationType,
             description: supporting.role
           })
         }
       }
     }
     
     // 批量创建关系
     for (const relation of relations) {
       await characterRelationDao.add(relation)
     }
     
     return relations.length
   }
   ```

**验收标准**
- [x] 小说创建后自动在角色管理中创建角色
- [x] 小说创建后自动从概览提取伏笔
- [x] 小说创建后自动创建角色关系
- [x] 章节生成后自动提取新伏笔
- [x] 章节生成后自动更新角色出场记录
- [x] 章节生成后自动检查伏笔回收
- [x] 每个操作都有相应的成功提示

---

### 需求0.5: 已实现但未集成的功能模块（紧急）

**问题描述**
代码审查发现，有**5个完整的Composables已实现但从未在任何Vue组件中使用**，这些功能完全被"遗忘"了：

| Composable | 功能 | 代码行数 | 使用情况 |
|------------|------|---------|---------|
| `useStructuredSummary` | 结构化摘要生成 | 387行 | ❌ **未使用** |
| `useCoherenceScore` | 章节连贯性评分 | 362行 | ❌ **未使用** |
| `useMultiVersion` | 多版本生成对比 | 279行 | ❌ **未使用** |
| `usePlotBranch` | 剧情分支管理 | 468行 | ❌ **未使用** |
| `useResumeGeneration` | 断点续写功能 | ~400行 | ❌ **未使用** |

**具体分析**

1. **结构化摘要 (`useStructuredSummary`)**
   - 功能：AI自动分析章节，提取关键事件、角色变化、伏笔、时间线等
   - 价值：极大提升章节摘要质量，为后续生成提供更好的上下文
   - 现状：章节生成后只保存简单summary字段，未调用此功能

2. **连贯性评分 (`useCoherenceScore`)**
   - 功能：AI评估章节间的剧情衔接、角色一致性、风格统一度等
   - 价值：自动发现剧情漏洞、角色OOC等问题
   - 现状：完全未集成，用户无法使用

3. **多版本生成 (`useMultiVersion`)**
   - 功能：同一章节生成2-3个版本，支持对比选择
   - 价值：给用户更多选择，提升内容质量
   - 现状：ChapterCreate中未提供此选项

4. **剧情分支 (`usePlotBranch`)**
   - 功能：管理剧情树、分支可视化、分支合并
   - 价值：支持多结局、平行世界等复杂剧情结构
   - 现状：数据库表存在，但无UI入口

5. **断点续写 (`useResumeGeneration`)**
   - 功能：生成中断后自动恢复，从上次位置继续
   - 价值：提升批量生成稳定性
   - 现状：未集成到生成流程

**修复需求**

1. **ChapterCreate.vue 集成结构化摘要**
   ```javascript
   // 章节保存后
   const { generateStructuredSummary } = useStructuredSummary()
   const summary = await generateStructuredSummary(
     { content, title, chapterNumber },
     novel.value,
     generate
   )
   if (summary) {
     chapter.structuredSummary = summary
     chapter.summary = generatePlainSummary(summary)
   }
   ```

2. **ChapterDetail.vue 添加连贯性评分**
   ```vue
   <template>
     <!-- 添加评分面板 -->
     <a-card title="章节连贯性评分">
       <a-button @click="runCoherenceScore">开始评分</a-button>
       <div v-if="scoreResult">
         <a-progress :percent="scoreResult.overallScore" />
         <!-- 显示各维度评分 -->
       </div>
     </a-card>
   </template>
   ```

3. **ChapterCreate.vue 添加多版本生成选项**
   ```vue
   <a-form-item label="生成模式">
     <a-radio-group v-model:value="generateMode">
       <a-radio value="single">单版本</a-radio>
       <a-radio value="multi">多版本对比</a-radio>
     </a-radio-group>
   </a-form-item>
   ```

4. **NovelDetail.vue 添加剧情分支入口**
   ```vue
   <a-tab-pane key="branches" tab="剧情分支">
     <PlotBranchManager :novel-id="novel.id" />
   </a-tab-pane>
   ```

5. **ChapterCreate.vue 集成断点续写**
   ```javascript
   // 生成开始时检查
   const { checkSavedProgress, resumeGeneration } = useResumeGeneration()
   const savedProgress = await checkSavedProgress(novel.value.id)
   if (savedProgress) {
     Modal.confirm({
       title: '发现未完成的生成任务',
       content: `上次生成到第${savedProgress.lastChapter}章，是否继续？`,
       onOk: () => resumeGeneration(savedProgress)
     })
   }
   ```

**验收标准**
- [x] 章节生成后自动生成结构化摘要 ✅ (已集成到 ChapterCreate.vue afterChapterSave)
- [x] 章节详情页可进行连贯性评分 ✅ (已添加到 ChapterDetail.vue)
- [ ] 章节生成支持多版本模式 (可选功能，暂未实现)
- [x] 小说详情页有剧情分支管理入口 ✅ (已添加到 NovelDetail.vue)
- [x] 生成中断后可断点续写 ✅ (已集成到 ChapterCreate.vue)

---

### 需求1: 灵感到小说的直接转化

**问题描述**
灵感工作台(`InspirationWorkshop`)支持灵感的AI扩写、评分、融合，但无法直接将灵感转化为小说。用户需要手动复制内容到创建页面。

**当前流程**
```
用户灵感 → AI扩写 → 手动复制 → 创建小说 → 粘贴灵感 → 生成概览
```

**优化目标**
```
用户灵感 → AI扩写 → [一键创建小说] → 自动填充 → 生成概览
```

**具体需求**

1. **添加"从灵感创建"按钮**
   - 位置: `InspirationWorkshop.vue` 每个灵感卡片
   - 交互: 点击后弹出确认对话框
   - 数据传递: 将 `inspiration.expandedContent || inspiration.content` 传递到 `NovelCreate`

2. **修改路由跳转**
   ```javascript
   // 在 InspirationWorkshop.vue 中添加
   const handleCreateNovelFromInspiration = (inspiration) => {
     router.push({
       path: '/novel/create',
       query: { 
         inspirationId: inspiration.id,
         fromInspiration: 'true'
       }
     })
   }
   ```

3. **NovelCreate页面接收参数**
   ```javascript
   // NovelCreate.vue 修改
   onMounted(async () => {
     const inspirationId = route.query.inspirationId
     if (inspirationId) {
       const inspiration = await loadInspiration(inspirationId)
       if (inspiration) {
         idea.value = inspiration.expandedContent || inspiration.content
         // 可选：自动触发生成
         // handleGenerate()
       }
     }
   })
   ```

4. **UI设计**
   - 灵感卡片添加操作按钮组："扩写" | "问答" | "创建小说"
   - "创建小说"按钮使用 `BookOutlined` 图标
   - 添加提示：`"将使用扩写后的内容作为创作灵感"`

**验收标准**
- [ ] 灵感卡片显示"创建小说"按钮
- [ ] 点击后跳转到创建页面并自动填充内容
- [ ] 保留原灵感状态（标记为`used`）
- [ ] 创建成功后提示用户并跳转小说详情页

---

### 需求2: 大纲事件与章节生成的联动

**问题描述**
大纲编辑器(`OutlineEditor`)中可以创建详细的剧情线和事件节点，但这些事件无法在章节生成时被引用。用户需要手动记忆或复制事件内容。

**当前流程**
```
创建大纲 → 添加事件 → 生成章节 → 手动回忆事件 → 输入prompt
```

**优化目标**
```
创建大纲 → 添加事件 → 生成章节 → 系统自动关联事件 → 智能生成
```

**具体需求**

1. **章节生成页面显示大纲事件**
   - 修改: `ChapterCreate.vue`
   - 在生成配置区域添加"大纲事件"折叠面板
   - 显示当前规划章节对应的事件列表

2. **自动匹配事件**
   ```javascript
   // ChapterCreate.vue
   const matchedEvents = computed(() => {
     if (!plotLines.value) return []
     // 查找plannedChapter匹配的事件
     return plotLines.value.flatMap(pl => 
       pl.events?.filter(e => e.plannedChapter === nextChapterNumber.value) || []
     )
   })
   ```

3. **上下文构建器集成**
   ```javascript
   // contextBuilder.js 添加
   export async function buildOutlineContext(novelId, targetChapterNumber) {
     const plotLines = await plotLineDao.getByNovelId(novelId)
     const events = plotLines.flatMap(pl => 
       pl.events?.filter(e => e.plannedChapter === targetChapterNumber) || []
     )
     return { events }
   }
   ```

4. **Prompt增强**
   ```javascript
   // prompts.js 修改 buildStreamChapterPrompt
   if (context.outlineEvents?.length) {
     contextPrompt += `\n【本章需包含的剧情事件】:\n`
     context.outlineEvents.forEach(e => {
       contextPrompt += `- ${e.title}: ${e.description}\n`
     })
   }
   ```

5. **UI设计**
   ```vue
   <a-collapse-panel header="📋 大纲事件 (2个)" key="outline">
     <a-timeline>
       <a-timeline-item 
         v-for="event in matchedEvents" 
         :key="event.id"
         :color="event.importance === 'high' ? 'red' : 'blue'"
       >
         <div class="event-item">
           <span class="event-title">{{ event.title }}</span>
           <a-tag size="small">{{ event.importance }}</a-tag>
           <p class="event-desc">{{ event.description }}</p>
         </div>
       </a-timeline-item>
     </a-timeline>
   </a-collapse-panel>
   ```

**验收标准**
- [ ] ChapterCreate页面显示大纲事件面板
- [ ] 自动匹配当前章节号对应的事件
- [ ] 生成prompt包含事件信息
- [ ] 高优先级事件视觉突出

---

### 需求3: 章节详情页快捷入口优化

**问题描述**
`NovelDetail.vue`页面中的功能入口（大纲编辑、章节生成等）分散在不同Tab中，操作路径较长。

**优化需求**

1. **添加悬浮快捷操作栏**
   ```vue
   <!-- NovelDetail.vue 添加 -->
   <div class="quick-actions">
     <a-float-button-group shape="square" :style="{ right: '24px', bottom: '24px' }">
       <a-float-button 
         tooltip="生成新章节" 
         @click="goToCreate(novel.id)"
       >
         <template #icon><PlusOutlined /></template>
       </a-float-button>
       <a-float-button 
         tooltip="编辑大纲" 
         @click="handleOpenOutline"
       >
         <template #icon><EditOutlined /></template>
       </a-float-button>
       <a-float-button 
         tooltip="开始阅读" 
         @click="handleStartReading"
       >
         <template #icon><ReadOutlined /></template>
       </a-float-button>
     </a-float-button-group>
   </div>
   ```

2. **统计卡片点击跳转**
   - 点击"已生成章节数" → 跳转到章节Tab
   - 点击"角色数" → 跳转到角色Tab
   - 点击"伏笔数" → 跳转到伏笔Tab

**验收标准**
- [ ] 悬浮按钮组显示在右下角
- [ ] 三个快捷入口功能正常
- [ ] 统计卡片可点击跳转

---

## 🎯 P1 - 中优先级优化需求

### 需求4: 批量生成控制面板增强

**问题描述**
批量生成功能存在但控制面板简单，无法查看任务详情、进度详情、失败重试等。

**具体需求**

1. **任务队列可视化**
   ```vue
   <!-- NovelDetail.vue 生成任务Tab增强 -->
   <a-timeline>
     <a-timeline-item 
       v-for="task in tasks" 
       :key="task.id"
       :color="getTaskColor(task.status)"
     >
       <a-card size="small">
         <div class="task-header">
           <span>第{{ task.startChapter }}章 - 第{{ task.endChapter }}章</span>
           <a-tag :color="getTaskColor(task.status)">{{ task.status }}</a-tag>
         </div>
         <a-progress :percent="task.progress" size="small" />
         <div class="task-actions">
           <a-button 
             v-if="task.status === 'paused'" 
             size="small" 
             @click="resumeTask(task.id)"
           >继续</a-button>
           <a-button 
             v-if="task.status === 'running'" 
             size="small" 
             @click="pauseTask(task.id)"
           >暂停</a-button>
           <a-button 
             v-if="task.status === 'failed'" 
             size="small" 
             type="primary"
             @click="retryTask(task)"
           >重试</a-button>
         </div>
       </a-card>
     </a-timeline-item>
   </a-timeline>
   ```

2. **批量设置持久化**
   ```javascript
   // useGenerationQueue.js 添加
   const saveBatchSettings = (settings) => {
     localStorage.setItem('batchSettings', JSON.stringify(settings))
   }
   
   const loadBatchSettings = () => {
     const saved = localStorage.getItem('batchSettings')
     return saved ? JSON.parse(saved) : defaultSettings
   }
   ```

**验收标准**
- [ ] 任务列表显示进度和操作按钮
- [ ] 支持暂停/继续/重试
- [ ] 批量设置保存到localStorage

---

### 需求5: 角色关系图谱交互增强

**问题描述**
`RelationshipGraph.vue`使用vis-network展示角色关系，但缺乏交互功能，无法直接编辑关系。

**具体需求**

1. **图谱点击交互**
   ```javascript
   // RelationshipGraph.vue
   network.on('click', (params) => {
     if (params.nodes.length > 0) {
       const nodeId = params.nodes[0]
       selectedCharacter.value = characters.value.find(c => c.id === nodeId)
       characterModalVisible.value = true
     }
   })
   ```

2. **关系线右键菜单**
   ```javascript
   network.on('oncontext', (params) => {
     params.event.preventDefault()
     const edgeId = network.getEdgeAt(params.pointer.DOM)
     if (edgeId) {
       contextMenuVisible.value = true
       contextMenuPosition.value = { x: params.event.clientX, y: params.event.clientY }
       selectedEdge.value = edges.value.find(e => e.id === edgeId)
     }
   })
   ```

3. **添加/删除关系**
   - 拖拽连线创建关系
   - 右键删除关系
   - 关系编辑弹窗

**验收标准**
- [ ] 点击节点显示角色详情
- [ ] 右键关系线显示操作菜单
- [ ] 支持拖拽创建关系

---

### 需求6: 阅读器体验优化

**问题描述**
`NovelReader.vue`基础功能完整，但缺少一些提升阅读体验的常用功能。

**具体需求**

1. **自动滚动阅读**
   ```javascript
   // useReader.js 添加
   const autoScroll = ref(false)
   const scrollSpeed = ref(50) // px/s
   
   let scrollInterval = null
   const startAutoScroll = () => {
     autoScroll.value = true
     scrollInterval = setInterval(() => {
       window.scrollBy(0, 1)
     }, 1000 / scrollSpeed.value)
   }
   ```

2. **字体大小快捷键**
   - Ctrl/Cmd + +/- 调整字体大小
   - 重置快捷键 Ctrl/Cmd + 0

3. **章节预加载**
   ```javascript
   // NovelReader.vue
   watch(chapter, async (newChapter) => {
     if (newChapter && nextChapter.value) {
       // 预加载下一章
       await preloadChapter(novel.value.id, nextChapter.value)
     }
   })
   ```

4. **阅读时间预估**
   ```javascript
   const readingTime = computed(() => {
     const wordCount = chapter.value?.wordCount || 0
     const minutes = Math.ceil(wordCount / 500) // 假设500字/分钟
     return minutes
   })
   ```

**验收标准**
- [ ] 自动滚动功能可用
- [ ] 字体快捷键有效
- [ ] 下一章预加载
- [ ] 显示预计阅读时间

---

### 需求7: 敏感词检测增强

**问题描述**
`useSensitiveWords.js`提供基础检测，但缺少上下文感知和智能替换建议。

**具体需求**

1. **上下文感知检测**
   ```javascript
   // useSensitiveWords.js
   export function detectWithContext(content, context = {}) {
     const results = detectSensitiveWords(content)
     // 根据上下文判断是否为误报
     return results.map(r => ({
       ...r,
       confidence: calculateConfidence(r, context)
     }))
   }
   ```

2. **智能替换建议**
   ```javascript
   const replacementSuggestions = {
     '杀': ['击败', '制服', '消灭'],
     '死': ['逝去', '陨落', '牺牲'],
     // ...
   }
   ```

3. **批量替换UI**
   ```vue
   <a-list :data-source="detectedWords">
     <template #renderItem="{ item }">
       <a-list-item>
         <span class="word">{{ item.word }}</span>
         <a-select v-model:value="item.replacement" style="width: 120px">
           <a-select-option 
             v-for="suggestion in item.suggestions" 
             :key="suggestion"
             :value="suggestion"
           >
             {{ suggestion }}
           </a-select-option>
         </a-select>
       </a-list-item>
     </template>
   </a-list>
   ```

**验收标准**
- [ ] 上下文感知降低误报
- [ ] 提供智能替换建议
- [ ] 批量替换功能可用

---

### 需求8: 写作工具模板扩展

**问题描述**
`sceneTemplates.js`中的场景模板数量较少，用户自定义能力有限。

**具体需求**

1. **模板市场**
   - 内置模板分类展示
   - 用户自定义模板保存
   - 模板导入/导出

2. **模板编辑器**
   ```vue
   <a-modal title="创建模板" v-model:visible="templateModalVisible">
     <a-form>
       <a-form-item label="模板名称">
         <a-input v-model:value="newTemplate.name" />
       </a-form-item>
       <a-form-item label="分类">
         <a-select v-model:value="newTemplate.category">
           <a-select-option value="combat">战斗</a-select-option>
           <a-select-option value="dialogue">对话</a-select-option>
           <!-- ... -->
         </a-select>
       </a-form-item>
       <a-form-item label="模板内容">
         <a-textarea 
           v-model:value="newTemplate.template"
           :rows="6"
           placeholder="使用 {{变量名}} 定义变量"
         />
       </a-form-item>
     </a-form>
   </a-modal>
   ```

3. **模板变量可视化编辑**
   - 自动识别 `{{variable}}` 格式
   - 生成对应的表单输入项

**验收标准**
- [ ] 用户可创建自定义模板
- [ ] 模板保存到localStorage或数据库
- [ ] 变量自动识别并生成表单

---

## 🎯 P2 - 低优先级优化需求

### 需求9: TypeScript类型定义补充

**问题描述**
项目使用JS但部分复杂数据结构缺少类型定义，不利于维护。

**具体需求**

1. **核心数据结构类型**
   ```typescript
   // types/novel.ts
   export interface Novel {
     id: number
     title: string
     description: string
     style: string[]
     estimatedWords: string
     worldSetting: WorldSetting
     characters: CharacterData
     plotLines: PlotLines
     chapterStructure: ChapterStructure
     createdAt: string
     updatedAt: string
   }
   
   export interface Chapter {
     id: number
     novelId: number
     chapterNumber: number
     title: string
     content: string
     summary: string
     wordCount: number
     createdAt: string
     updatedAt: string
   }
   ```

2. **JSDoc注释完善**
   ```javascript
   /**
    * 创建新小说
    * @param {Object} novelData - 小说数据
    * @param {string} novelData.title - 小说标题
    * @param {string} novelData.description - 小说简介
    * @returns {Promise<number|null>} 返回小说ID或null
    */
   const createNovel = async (novelData) => { ... }
   ```

**验收标准**
- [ ] 核心数据结构有类型定义文件
- [ ] 所有公共方法有完整JSDoc

---

### 需求10: 性能优化

**问题描述**
部分页面数据量大时可能出现性能问题。

**具体需求**

1. **虚拟滚动**
   - `NovelList.vue` 小说列表
   - `ChapterList.vue` 章节列表
   - `InspirationWorkshop.vue` 灵感列表

2. **数据懒加载**
   ```javascript
   // 章节内容分段加载
   const loadChapterContent = async (chapterId, offset = 0, limit = 5000) => {
     // 分段加载大章节内容
   }
   ```

3. **图片/图谱懒加载**
   - 关系图谱按需渲染
   - 阅读器内容虚拟滚动

**验收标准**
- [ ] 大数据列表使用虚拟滚动
- [ ] 章节内容按需加载
- [ ] 图谱大数据量不卡顿

---

### 需求11: 错误处理与日志

**问题描述**
部分异步操作缺少完善的错误处理和用户反馈。

**具体需求**

1. **全局错误边界**
   ```vue
   <!-- App.vue -->
   <error-boundary>
     <router-view />
   </error-boundary>
   ```

2. **操作日志记录**
   ```javascript
   // utils/logger.js
   export const logger = {
     info: (msg, data) => {
       console.log(`[INFO] ${msg}`, data)
       // 可扩展发送到日志服务器
     },
     error: (msg, error) => {
       console.error(`[ERROR] ${msg}`, error)
     }
   }
   ```

3. **用户友好错误提示**
   - 网络错误：提示检查网络
   - AI API错误：提示检查API Key或重试
   - 数据库错误：提示清除数据或刷新

**验收标准**
- [ ] 全局错误捕获
- [ ] 关键操作有日志记录
- [ ] 错误提示用户友好

---

### 需求12: 数据导入导出增强

**问题描述**
`Settings.vue`中有基础的数据导出，但缺少格式选择和选择性导出。

**具体需求**

1. **选择性导出**
   ```vue
   <a-checkbox-group v-model:value="exportOptions">
     <a-checkbox value="novels">小说数据</a-checkbox>
     <a-checkbox value="chapters">章节内容</a-checkbox>
     <a-checkbox value="characters">角色信息</a-checkbox>
     <a-checkbox value="inspirations">灵感记录</a-checkbox>
     <a-checkbox value="settings">用户设置</a-checkbox>
   </a-checkbox-group>
   ```

2. **多种格式支持**
   - JSON (完整数据)
   - Markdown (仅小说内容)
   - TXT (纯文本)
   - Word (DOCX格式)

3. **增量导出**
   - 只导出自上次导出后的变化
   - 按时间范围导出

**验收标准**
- [ ] 可选择导出内容类型
- [ ] 支持Markdown和Word格式
- [ ] 增量导出功能

---

## 📊 实施计划建议

### 第一阶段 (1-2周)
- [需求1] 灵感到小说的直接转化
- [需求3] 章节详情页快捷入口
- [需求9] 基础类型定义

### 第二阶段 (2-3周)
- [需求2] 大纲事件与章节生成联动
- [需求4] 批量生成控制面板
- [需求11] 错误处理增强

### 第三阶段 (3-4周)
- [需求5] 角色关系图谱增强
- [需求6] 阅读器体验优化
- [需求7] 敏感词检测增强

### 第四阶段 (按需)
- [需求8] 写作工具模板扩展
- [需求10] 性能优化
- [需求12] 数据导入导出增强

---

## 📝 附录

### 相关文件清单

| 模块 | 主要文件 |
|------|----------|
| 小说管理 | `useNovel.js`, `NovelList.vue`, `NovelCreate.vue`, `NovelDetail.vue` |
| 章节生成 | `useChapter.js`, `ChapterCreate.vue`, `ChapterDetail.vue`, `batchGenerator.js` |
| 大纲编辑 | `useOutline.js`, `OutlineEditor.vue`, `contextBuilder.js` |
| 角色管理 | `useCharacter.js`, `useCharacterRelation.js`, `RelationshipGraph.vue` |
| 灵感工作台 | `useInspiration.js`, `InspirationWorkshop.vue` |
| AI集成 | `useAI.js`, `api.js`, `prompts.js` |

### 数据库表关系图

```
novels (1) ────< (N) chapters
       │
       ├────< (N) characters
       │            │
       │            └──< (N) characterRelations
       │
       ├────< (N) foreshadowing
       │
       ├────< (N) plotLines ──< (N) outlineEvents
       │
       ├────< (N) timelineEvents
       │
       ├────< (N) generationTasks
       │
       ├────< (N) bookmarks
       │
       └────< (N) annotations

inspirations (独立表)
worldTemplates (独立表)
```

---

**文档维护**
- 更新日期: 2026-03-26
- 下次评审: 待确定
- 负责人: 开发团队
