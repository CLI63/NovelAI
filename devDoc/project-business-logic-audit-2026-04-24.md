# AI小说生成 Web 项目业务/功能闭环与 Bug 排查报告

生成时间：2026-04-24  
项目类型：Vue 3 + Pinia + Dexie(IndexedDB) + 多模型 AI 小说生成 Web 应用

## 一、审查范围

本次排查重点覆盖以下闭环：

1. 小说创建闭环
2. 章节生成闭环（单章 / 批量 / 全本）
3. 章节后处理闭环（摘要 / 伏笔 / 角色 / 时间线 / 小说圣经）
4. 阅读闭环
5. 大纲与剧情线闭环
6. 任务中心与后台任务闭环
7. 数据持久化与一致性问题

重点查看文件包括：

- [src/views/NovelCreate.vue](../src/views/NovelCreate.vue)
- [src/views/NovelDetail.vue](../src/views/NovelDetail.vue)
- [src/views/ChapterCreate.vue](../src/views/ChapterCreate.vue)
- [src/views/ChapterDetail.vue](../src/views/ChapterDetail.vue)
- [src/views/TaskCenter.vue](../src/views/TaskCenter.vue)
- [src/views/NovelReader.vue](../src/views/NovelReader.vue)
- [src/composables/useFullNovelGeneration.js](../src/composables/useFullNovelGeneration.js)
- [src/utils/chapterPostProcessor.js](../src/utils/chapterPostProcessor.js)
- [src/utils/contextBuilder.js](../src/utils/contextBuilder.js)
- [src/utils/novelBible.js](../src/utils/novelBible.js)
- [src/utils/dao.js](../src/utils/dao.js)
- [src/utils/db.js](../src/utils/db.js)

---

## 二、总体结论

### 2.1 优点

这个项目的业务野心很大，而且主链路已经比较完整：

- 有完整的小说创建 → 章节生成 → 阅读 → 后处理 → 质量扫描链路
- 已实现本地持久化，核心实体比较齐全
- 有角色、伏笔、剧情线、时间线、结构化摘要、小说圣经等增强机制
- 已区分“生成任务”和“后台后处理任务”两套任务体系

### 2.2 总体判断

**项目主业务“基本成型，但没有完全闭环”。**

更准确地说：

- **功能面看是“可用但不稳”**：主功能很多，但多处闭环断裂或半闭环
- **数据面看是“局部一致、整体容易漂移”**：同一业务在不同入口走了不同实现
- **任务面看是“有调度雏形，但可靠性不足”**
- **后处理面看是“设计先进，但落地不一致”**

### 2.3 风险等级

- P0：0 个（原 2 个已于 2026-04-27 修复）
- P1：1 个
- P2：8 个
- P3：若干

其中最值得优先处理的是：

1. 删除章节/删除小说后的关联数据清理不完整，容易留下脏数据
2. 任务中心依然兼任执行器，后台任务自动化可靠性不足
3. Dexie schema 升级定义方式仍需核实，存在潜在数据结构风险

---

## 三、业务闭环审查

## 3.1 小说创建闭环

涉及文件：

- [src/views/NovelCreate.vue](../src/views/NovelCreate.vue)
- [src/composables/useNovel.js](../src/composables/useNovel.js)
- [src/composables/useCharacter.js](../src/composables/useCharacter.js)
- [src/composables/useForeshadowing.js](../src/composables/useForeshadowing.js)

### 当前链路

当前流程基本是：

1. 输入灵感
2. AI 生成小说概览 JSON
3. 保存小说主表
4. 自动抽取角色
5. 自动抽取伏笔
6. 自动抽取角色关系
7. 跳转小说详情页

### 判断

**这一段主链路基本闭环。**

### 发现的问题

#### 问题 1：AI JSON 解析脆弱，失败时缺少兜底恢复

在 [src/views/NovelCreate.vue:93-105](../src/views/NovelCreate.vue#L93-L105) 与 [src/views/NovelCreate.vue:136-146](../src/views/NovelCreate.vue#L136-L146)，通过正则直接提取 `{...}` 再 `JSON.parse`。

风险：

- 模型输出夹带解释文本时容易解析失败
- 未做字段级校验
- 某些字段若类型异常，会在后续保存时悄悄被 `sanitizeForDB` 或 `String/Number` 吃掉

影响：中  
等级：P2

#### 问题 2：创建后没有立即建立“大纲实体”与“剧情线实体”

虽然小说概览里已有 `outline`、`plotLines` 信息，但保存小说时只是把这些内容塞进 novel 记录本身 [src/views/NovelCreate.vue:156-171](../src/views/NovelCreate.vue#L156-L171)，并没有同步创建 outlines / plotLines / outlineEvents 表的数据。

结果：

- 小说创建页生成的大纲信息，与 OutlineEditor 所依赖的数据表不是同一个来源
- 用户进入大纲编辑器后，可能看到的是空状态或需要二次构建

结论：**创建小说 → 大纲系统，这条链路没有完全闭环。**

影响：高  
等级：P1

---

## 3.2 单章生成闭环

涉及文件：

- [src/views/ChapterCreate.vue](../src/views/ChapterCreate.vue)
- [src/utils/chapterPostProcessor.js](../src/utils/chapterPostProcessor.js)

### 当前链路

单章生成流程相对完整：

1. 加载最近章节、摘要、角色、伏笔、时间线上下文
2. AI 生成章节（支持流式/大纲模式）
3. 保存章节
4. 创建后台任务 `chapter_post_process`
5. 发送事件给任务中心自动执行
6. 后处理补全摘要、伏笔、角色、时间线、小说圣经

### 判断

**单章生成链路接近闭环，是目前最完整的一条业务路径。**

### 发现的问题

#### 问题 3：章节保存后只创建后台任务，不保证一定有人消费

在 [src/views/ChapterCreate.vue:622-640](../src/views/ChapterCreate.vue#L622-L640)，保存章节后是：

- 创建 background task
- 通过 eventBus 发 `TASK_CREATED`

但真正执行任务依赖 [src/views/TaskCenter.vue:380-397](../src/views/TaskCenter.vue#L380-L397) 中的监听器。

这意味着：

- 如果当前用户不在任务中心页面，是否能稳定自动执行，依赖事件是否恰好有人监听
- eventBus 是页面内内存总线，不是持久调度器
- 页面刷新/切路由后，任务可能只是“存在于 IndexedDB 中”，但没有立即执行

虽然任务中心会在挂载后检查 pending task，但这不是“实时自动执行”，而是“依赖任务中心页面生命周期”。

结论：**单章后处理是弱闭环，不是强闭环。**

影响：高  
等级：P1

#### 问题 4：`afterChapterSave` 和后台任务路径并存，容易重复处理

[src/views/ChapterCreate.vue:664-693](../src/views/ChapterCreate.vue#L664-L693) 中定义了直接调用 `processChapter()` 的 `afterChapterSave`，批量生成时会直接用；但单章保存又是创建后台任务。

这导致：

- 同一个“章节后处理”业务有两套入口
- 可能一条路径同步执行，一条路径异步排队
- 后续维护时很容易出现“改了一边，漏了一边”

影响：中高  
等级：P1

---

## 3.3 批量生成闭环

涉及文件：

- [src/views/ChapterCreate.vue](../src/views/ChapterCreate.vue)
- [src/composables/useGenerationQueue.js](../src/composables/useGenerationQueue.js)
- [src/composables/useResumeGeneration.js](../src/composables/useResumeGeneration.js)

### 当前链路

批量生成流程：

1. 创建 generationTasks 任务
2. 逐章生成内容
3. 逐章保存
4. 保存后直接调用 `afterChapterSave`
5. 更新任务进度
6. 支持暂停/恢复

### 判断

**批量生成总体逻辑比单章更完整，但任务系统设计上仍然半闭环。**

### 发现的问题

#### 问题 5：generationTasks 与 backgroundTasks 双轨并存，职责边界不够清晰

当前项目同时存在：

- `generationTasks`：批量生成任务 [src/composables/useGenerationQueue.js](../src/composables/useGenerationQueue.js)
- `backgroundTasks`：章节后处理/全本生成任务 [src/composables/useBackgroundTask.js](../src/composables/useBackgroundTask.js)

问题不在“双轨”，而在于：

- 单章、批量、全本三条链路没有统一采用同一种调度方式
- 批量生成是“前台页面循环执行”，不是后台 worker / 可恢复调度器
- 任务表持久化了状态，但执行器并不稳定绑定到任务系统本身

影响：中高  
等级：P1

#### 问题 6：章节号默认通过 `chapters.length + 1` 推算，删除中间章节后可能错位

[ src/composables/useChapter.js:171-173 ](../src/composables/useChapter.js#L171-L173) 使用：

- `nextChapterNumber = chapters.length + 1`

如果用户删除第 5 章，仍保留 1,2,3,4,6，那么下一章会变成 6，而不是 7，造成章节号冲突风险。

这会影响：

- 新章节创建
- 伏笔 resolvedIn 逻辑
- 阅读顺序
- 后处理索引

影响：高  
等级：P1  
状态：**已修复（2026-04-27）**

修复说明：
- 已将 [src/composables/useChapter.js](../src/composables/useChapter.js) 的下一章节号计算改为“现有最大章节号 + 1”，不再使用数组长度推算
- 已同步修复 [src/views/NovelDetail.vue](../src/views/NovelDetail.vue) 手动回收伏笔时的 `resolvedIn` 预测值，改为基于最大章节号计算
- 已修复 [src/views/TaskCenter.vue](../src/views/TaskCenter.vue) 批量章节后处理子任务缺少 `chapterNumber` 的问题，避免批量后处理时因任务数据不完整而加载章节失败
- 已修复 [src/utils/prompts.js](../src/utils/prompts.js) 批量生成提示词中使用 `recentChapters.length + 1` 的章节号文案偏差
- 已在 [src/utils/dao.js](../src/utils/dao.js) 为章节新增/更新增加 `(novelId, chapterNumber)` 业务防重校验，避免写入重复章节号

剩余风险：
- 数据库层仍未建立真正的唯一索引，因此当前属于“DAO 层已拦截、底层存储未强约束”
- 如果未来出现绕过 `chapterDao` 直接写 `db.chapters` 的代码，仍有可能写入脏数据；建议后续配合 Dexie 迁移补上唯一性约束或统一写入口

---

## 3.4 全本生成闭环

涉及文件：

- [src/views/NovelCreate.vue](../src/views/NovelCreate.vue)
- [src/views/NovelDetail.vue](../src/views/NovelDetail.vue)
- [src/views/TaskCenter.vue](../src/views/TaskCenter.vue)
- [src/composables/useFullNovelGeneration.js](../src/composables/useFullNovelGeneration.js)

### 当前链路

系统里实际上有两条“全本生成”路径：

1. 创建小说页里的“保存并一键生成全本”  
   - 直接调用 `fullGen.start()`
2. 小说详情页里的“全本生成任务”  
   - 创建 `backgroundTasks.full_novel_generation`
   - 由任务中心执行

### 判断

**这是本项目最明显的半闭环区域。**

### 发现的问题

#### 问题 7：创建页全本生成完成判断写错，UI 完成态可能永远不成立

在 [src/views/NovelCreate.vue:273-279](../src/views/NovelCreate.vue#L273-L279)：

```js
await fullGen.start(id, fullGenPrompt.value)
if (fullGen.phase === 'completed') {
  ...
}
```

但 `useFullNovelGeneration` 里 `phase` 是 `ref`，正确判断应该是 `fullGen.phase.value === 'completed'`。  
同样 `results` 也是 ref，`fullGen.results.length` 也不对，应为 `fullGen.results.value.length`。

结果：

- 全本生成结束后弹窗可能不自动关闭
- 不会自动跳转阅读器
- 成功提示章节数可能取不到

这是一个**确定性 bug**。

影响：高  
等级：P0  
状态：**已修复（2026-04-27）**

修复说明：
- 已在 [src/views/NovelCreate.vue:273-279](../src/views/NovelCreate.vue#L273-L279) 改为正确读取 `ref` 的 `.value`
- 完成提示同步改为“全本生成完成，章节后处理将在后台继续执行”，避免用户误以为后处理已同步结束

#### 问题 8：全本生成主流程没有真正执行章节后处理

在 [src/composables/useFullNovelGeneration.js:103-114](../src/composables/useFullNovelGeneration.js#L103-L114) 定义了 `runPostProcessing()`，但在 `start()` 主循环中没有被调用。

也就是说，全本生成虽然：

- 会生成章节
- 会保存摘要

但**不会自动更新**：

- 伏笔
- 角色出场
- 角色状态
- 伏笔回收
- 时间线
- 小说圣经增量知识

而创建页单章、批量生成是会跑后处理的。

结果：

- 不同入口生成出的小说，数据完整度不一致
- 全本生成后，后续章节上下文构建会变弱
- 质量扫描、伏笔管理、角色状态页会出现缺失

这是**核心业务闭环断裂**。

影响：极高  
等级：P0  
状态：**已修复（2026-04-27）**

修复说明：
- 已移除全本生成里未接入的同步 `runPostProcessing()` 路径
- 改为在 [src/composables/useFullNovelGeneration.js](../src/composables/useFullNovelGeneration.js) 每章保存成功后立即创建 `chapter_post_process` 后台任务
- 复用 [src/composables/useBackgroundTask.js](../src/composables/useBackgroundTask.js) 与 [src/utils/eventBus.js](../src/utils/eventBus.js) 现有链路，由 [src/views/TaskCenter.vue](../src/views/TaskCenter.vue) 异步执行后处理
- 这样既补上了全本生成后的业务闭环，也避免了重型章节后处理阻塞全本生成主流程
- 同时新增了任务去重保护，避免续跑/重试时对同一章节重复创建 pending/running/completed 的后处理任务

#### 问题 9：全本生成有两套入口，但行为不一致

- 创建页：直接同步执行 `useFullNovelGeneration`
- 任务中心：通过后台任务执行 `useFullNovelGeneration`

而且两个入口的“完成处理”和“跳转行为”也不同。

这是典型的“同名功能、两套实现”。

影响：高  
等级：P1  
状态：**已修复（2026-04-27）**

修复说明：
- 已将 [src/views/NovelDetail.vue](../src/views/NovelDetail.vue) 的“生成全本”入口改为直接复用 `useFullNovelGeneration()` 与 [src/components/chapter/FullGenerationProgress.vue](../src/components/chapter/FullGenerationProgress.vue)
- 现在创建页与详情页都采用同一套“前台生成 + 进度弹窗 + 完成后跳转阅读器”的交互语义
- 两个入口的成功提示文案已统一为“全本生成完成，章节后处理将在后台继续执行”，避免对后处理完成态产生误解
- 可选提示词输入也已同步补到详情页，减少入口能力差异


---

## 3.5 章节后处理闭环

涉及文件：

- [src/utils/chapterPostProcessor.js](../src/utils/chapterPostProcessor.js)
- [src/views/ChapterDetail.vue](../src/views/ChapterDetail.vue)
- [src/views/TaskCenter.vue](../src/views/TaskCenter.vue)

### 当前设计

系统本来已经抽象出统一后处理器 `processChapter()`，这是正确方向。

它覆盖：

1. 结构化摘要
2. 新伏笔提取
3. 角色出场记录
4. 角色状态更新
5. 伏笔回收
6. 时间线记录
7. 结构化摘要中的角色变化
8. 结构化摘要中的新伏笔
9. 小说圣经更新

### 判断

**设计上是闭环的，但实际落地不是。**

### 发现的问题

#### 问题 10：章节详情页“重新处理”没有复用统一 postProcessor

原实现中，[src/views/ChapterDetail.vue](../src/views/ChapterDetail.vue) 手动实现了一遍后处理步骤，而不是直接调用 `processChapter()`。

后果：

- 与统一处理器逻辑不一致
- 没有更新小说圣经
- 字段命名不同：这里曾使用 `results.foreshadowing`，统一处理器使用 `foreshadowingExtract`
- 将来新增处理步骤时，这里容易漏改

影响：高  
等级：P1  
状态：**已修复（2026-04-27）**

修复说明：
- 已将 [src/views/ChapterDetail.vue](../src/views/ChapterDetail.vue) 的“重新处理”入口改为直接复用 [src/utils/chapterPostProcessor.js](../src/utils/chapterPostProcessor.js) 中的 `processChapter()`
- 已同步修正结果面板字段，改为读取 `foreshadowingExtract`
- 这样章节详情页、单章生成、任务中心三条路径现在共享同一套章节后处理流水线，避免后续继续分叉

#### 问题 11：时间线写入存在两种不同模型，概念混用

- `chapterPostProcessor` 写的是 `timelineEvents` 表 [src/utils/chapterPostProcessor.js:298-326](../src/utils/chapterPostProcessor.js#L298-L326)
- `useOutline` 里又有 `recordTimelineEvents`，写的是 `outlineEvents` / 剧情线事件 [src/composables/useOutline.js] 和 [src/utils/contextBuilder.js:389-405](../src/utils/contextBuilder.js#L389-L405)

更糟的是 [src/views/ChapterDetail.vue:257-258](../src/views/ChapterDetail.vue#L257-L258) 调用 `useOutline().recordTimelineEvents(content, chapterId, novelId)` 的参数语义看起来和 [src/utils/contextBuilder.js:389-405](../src/utils/contextBuilder.js#L389-L405) 完全不同。

说明：

- “时间线事件”与“大纲事件”概念没有彻底分层
- 同名能力在不同上下文里表示不同数据结构

影响：高  
等级：P1

---

## 四、功能闭环审查

## 4.1 阅读功能

涉及文件：

- [src/views/NovelReader.vue](../src/views/NovelReader.vue)

### 判断

**阅读主功能基本闭环。**

支持：

- 目录跳转
- 上一章下一章
- 阅读进度
- 书签
- 批注
- 阅读设置

### 风险点

#### 问题 12：阅读进度保存依赖章节 watch，但没有处理组件卸载清理键盘事件

在 [src/views/NovelReader.vue:256-260](../src/views/NovelReader.vue#L256-L260) 注册了 `document.addEventListener('keydown', handleKeydown)`，但当前片段未看到 `onUnmounted` 清理。

若确实未清理，则路由多次进入退出可能造成重复绑定。

影响：中  
等级：P2

---

## 4.2 角色 / 伏笔 / 详情管理

涉及文件：

- [src/views/NovelDetail.vue](../src/views/NovelDetail.vue)
- [src/composables/useCharacter.js](../src/composables/useCharacter.js)
- [src/composables/useForeshadowing.js](../src/composables/useForeshadowing.js)

### 判断

**基础 CRUD 闭环是有的，但语义一致性有问题。**

#### 问题 13：伏笔回收字段 `resolvedIn` 语义不统一

原实现中，`resolvedIn` 在不同入口里同时承担“章节 ID”和“章节号”两种语义。

这会导致：

- 有些记录的 `resolvedIn` 是 chapterId
- 有些记录的 `resolvedIn` 是 chapterNumber
- 后续展示、分析、统计都无法可靠解释

这是**明确的数据语义 bug**。

影响：高  
等级：P1  
状态：**已部分修复（2026-04-27）**

修复说明：
- 已扩展 [src/utils/dao.js](../src/utils/dao.js) 的 `foreshadowingDao.markResolved(...)`，在保留 `resolvedIn` 的同时新增 `resolvedInChapterNumber`
- 已修复自动回收路径，统一写入 `resolvedIn = chapterId` 与 `resolvedInChapterNumber = chapter.chapterNumber`
- 已修复 [src/views/NovelDetail.vue](../src/views/NovelDetail.vue) 手动回收逻辑，不再把预测章节号直接塞进 `resolvedIn`
- 已修复 [src/composables/useForeshadowing.js](../src/composables/useForeshadowing.js)、[src/utils/contextBuilder.js](../src/utils/contextBuilder.js)、[src/utils/novelBible.js](../src/utils/novelBible.js) 等展示/上下文构建逻辑，优先使用明确的章节号字段

剩余风险：
- 历史数据里可能仍存在旧格式的 `resolvedIn`
- `chapterId` / `plantedInChapter` / `resolvedInChapterNumber` 三套字段仍然并存，后续最好继续做一次完整字段收敛与迁移

#### 问题 14：角色状态和出场记录更新是基于简单文本匹配，误判概率较高

见 [src/composables/useCharacter.js:305-455](../src/composables/useCharacter.js#L305-L455) 与 [src/utils/chapterPostProcessor.js:209-271](../src/utils/chapterPostProcessor.js#L209-L271)。

当前使用：

- 角色名正则匹配
- 固定句式匹配位置/状态

会出现：

- 同名误伤
- 代称无法识别
- 一章多次状态变化只保留第一个命中

这更偏“能力不足”而非编码 bug，但会直接影响后处理可靠性。

影响：中  
等级：P2

---

## 4.3 大纲 / 剧情线 / 冲突检测

涉及文件：

- [src/composables/useOutline.js](../src/composables/useOutline.js)
- [src/views/NovelDetail.vue](../src/views/NovelDetail.vue)

### 判断

**大纲系统是独立子系统，但和主生成链路集成不够深。**

主要问题：

1. 小说创建页生成的 outline/plotLines 没有自动拆入 outline 表体系
2. 章节生成时虽然支持 outline prompt，但与大纲编辑器中的 plotLine/event 并未形成强绑定
3. 冲突检测存在，但更像“辅助工具”，不是生成前/保存前的硬约束

结论：**这是功能存在，但业务闭环不强。**

影响：中  
等级：P2

---

## 五、数据一致性与持久化问题

## 5.1 Dexie schema 升级写法可疑

文件：[src/utils/db.js](../src/utils/db.js)

原实现中，`db.version(9).stores(...)` 只声明了 `novelBibles`，没有把 v8 其余表一并带上。这种写法会让 Dexie 的新版本 schema 定义变得高度可疑，存在“升级后只剩部分表声明”的风险。

影响：高  
等级：P1  
状态：**已修复（2026-04-27）**

修复说明：
- 已将 [src/utils/db.js](../src/utils/db.js) 的 v9 schema 改为完整声明所有已有表，并追加 `novelBibles`
- 这样 v9 现在明确表示“在 v8 全量 schema 基础上新增 novelBibles”，避免 schema 版本漂移

剩余建议：
- 后续若继续升级版本，仍应保持“每个新版本完整声明当前全部表结构”的模式
- 如果要补唯一索引或新字段索引，建议通过下一版 schema 统一处理

## 5.2 删除章节时未清理关联数据

文件：[src/composables/useChapter.js](../src/composables/useChapter.js)

原实现中，[src/composables/useChapter.js](../src/composables/useChapter.js) 删除章节只执行 `chapterDao.delete(id)`，没有同步处理章节关联数据，容易留下脏引用。

影响：高  
等级：P1  
状态：**已修复（2026-04-27）**

修复说明：
- 已在 [src/utils/dao.js](../src/utils/dao.js) 为章节新增 `deleteCascade(id)`
- 现在删除章节时会同步清理：
  - `backgroundTasks`
  - `bookmarks`
  - `annotations`
  - `outlineEvents`
  - `timelineEvents`
  - 本章埋设的 `foreshadowing`
  - 角色 `appearances` 中对该章节的出场记录
- 对 `resolvedIn` 指向该章节的伏笔，现已自动回退为 `pending`，并清空 `resolvedIn` / `resolvedInChapterNumber`
- [src/composables/useChapter.js](../src/composables/useChapter.js) 已改为调用 `chapterDao.deleteCascade(id)`

剩余风险：
- 章节删除后，角色 `currentStatus` 若曾由该章节推动更新，目前仍不会自动逆向回滚
- 如果后续要做到“完全可逆”，需要进一步补状态重建机制

## 5.3 删除小说时清理比删除章节更完整，但仍可能漏 novelBibles

原实现中，[src/composables/useNovel.js](../src/composables/useNovel.js) 已清理很多关联表，但缺少 `novelBibles` 删除。

影响：中  
等级：P2  
状态：**已修复（2026-04-27）**

修复说明：
- 已在 [src/composables/useNovel.js](../src/composables/useNovel.js) 的删除链路中补上 `db.novelBibles.where('novelId').equals(id).delete()`
- 这样删除小说时，小说圣经不会再残留孤儿数据

---

## 六、任务系统问题

## 6.1 任务中心不是调度中心，而更像“任务管理页”

文件：[src/views/TaskCenter.vue](../src/views/TaskCenter.vue)

现在的 backgroundTasks 执行实际依赖 TaskCenter 页面的挂载与事件监听：

- 挂载后检查 pending tasks [src/views/TaskCenter.vue:370-382](../src/views/TaskCenter.vue#L370-L382)
- 监听 `TASK_CREATED` 并自动执行 [src/views/TaskCenter.vue:391-397](../src/views/TaskCenter.vue#L391-L397)

这意味着：

- 任务系统没有真正独立的 executor
- 离开任务中心页面后，自动消费能力变弱
- eventBus 是瞬时消息，不具备持久队列语义

影响：高  
等级：P1

## 6.2 批量章节后处理只是“拆成多个单任务”，但父任务本身没有真实执行价值

[ src/views/TaskCenter.vue:255-278 ](../src/views/TaskCenter.vue#L255-L278) 中，批量章节处理任务本质只是批量创建子任务。

这会导致：

- 父任务完成 ≠ 子任务全部处理完成
- UI 看到“批量处理完成”，实际上只是“任务拆分完成”

属于典型的“状态误导”。

影响：中高  
等级：P2

---

## 七、明确 Bug 清单

## P0

### Bug A：全本生成完成状态判断错误

位置：
- [src/views/NovelCreate.vue:273-279](../src/views/NovelCreate.vue#L273-L279)

问题：
- 把 `ref` 当普通值判断：`fullGen.phase === 'completed'`
- 把 `ref` 数组当普通数组取长度：`fullGen.results.length`

结果：
- 生成完成后不会按预期自动收尾

建议：
- 改成 `fullGen.phase.value === 'completed'`
- 改成 `fullGen.results.value.length`

### Bug B：全本生成未执行章节后处理

位置：
- [src/composables/useFullNovelGeneration.js](../src/composables/useFullNovelGeneration.js)

问题：
- 定义了 `runPostProcessing()` 却未在 `start()` 主流程调用

结果：
- 全本生成章节数据与其他生成入口不一致

建议：
- 每章保存成功后统一调用 `processChapter()` 或 `runPostProcessing()`

## P1

### Bug C：伏笔 `resolvedIn` 字段语义混乱（已部分修复）

位置：
- [src/views/NovelDetail.vue](../src/views/NovelDetail.vue)
- [src/utils/dao.js](../src/utils/dao.js)
- [src/composables/useForeshadowing.js](../src/composables/useForeshadowing.js)
- [src/utils/contextBuilder.js](../src/utils/contextBuilder.js)
- [src/utils/novelBible.js](../src/utils/novelBible.js)

说明：
- 新增 `resolvedInChapterNumber` 后，自动回收、手动回收、展示层和上下文构建层已基本对齐
- 但历史数据兼容与字段彻底收敛仍未完成

### Bug D：章节删除未做级联清理

位置：
- [src/composables/useChapter.js:150-166](../src/composables/useChapter.js#L150-L166)

### Bug E：章节后处理存在多实现分叉（已大幅收敛）

位置：
- [src/utils/chapterPostProcessor.js](../src/utils/chapterPostProcessor.js)
- [src/views/ChapterDetail.vue](../src/views/ChapterDetail.vue)

说明：
- `ChapterDetail` 的“重新处理”已改为复用统一 `processChapter()`
- 仍有单章/批量/任务执行路径的执行机制差异，属于剩余架构问题，不再是原始的逻辑分叉 bug

### Bug F：nextChapterNumber 算法在删除章节后可能冲突（已修复）

位置：
- [src/composables/useChapter.js](../src/composables/useChapter.js)

### Bug G：TaskCenter 才是后台任务执行器，任务自动化不可靠

位置：
- [src/views/TaskCenter.vue](../src/views/TaskCenter.vue)
- [src/utils/eventBus.js](../src/utils/eventBus.js)

## P2

### Bug H：创建小说后未同步建立 outline/plotLine/outlineEvent 体系

### Bug I：批量任务父任务完成态和子任务完成态脱节

### Bug J：时间线与大纲事件模型混用

### Bug K：JSON 解析策略脆弱

### Bug L：删除小说可能漏删 novelBible

### Bug M：阅读页键盘事件可能未清理

---

## 八、建议的修复优先级

## 第一优先级（今天就该修）

1. 统一两条全本生成入口的行为与收尾逻辑
2. 补齐删除章节的级联清理
3. 核实并修正 Dexie v9 schema 定义
4. 让 backgroundTasks 具备不依赖 TaskCenter 页面存在的执行机制
5. 继续收敛伏笔章节引用字段，处理历史数据兼容

## 第二优先级（本周应完成）

6. 补齐删除章节的级联清理
7. 核实并修正 Dexie v9 schema 定义
8. 把小说创建页的 outline 数据真正落表到大纲系统
9. 让 backgroundTasks 具备不依赖 TaskCenter 页面存在的执行机制

## 第三优先级（后续演进）

10. 合并 generationTasks / backgroundTasks 的职责模型
11. 统一时间线事件与大纲事件的数据边界
12. 提升 AI JSON 解析容错能力和字段校验
13. 提升角色/伏笔抽取逻辑准确率

---

## 九、最终结论

这个项目不是“不能用”，而是**功能很多，但系统一致性还没完全跟上**。

从产品视角看，它已经具备一个 AI 小说生产工具的雏形；  
从工程视角看，目前最突出的问题不是“少功能”，而是：

- 同一业务多入口实现不一致
- 后处理闭环没有彻底统一
- 任务系统缺少真正稳定的执行器
- 数据字段语义有漂移

### 一句话结论

**这是一个“主功能已跑通，但跨模块闭环仍存在断点”的项目，尤其全本生成、章节后处理、任务执行与数据一致性是当前最核心的修复方向。**

---

## 十、建议的后续动作

如果继续推进，建议下一步按下面顺序处理：

1. 先修 P0/P1，确保主流程真正闭环
2. 再统一后处理入口，去掉重复实现
3. 然后梳理任务系统，明确“谁负责调度、谁负责执行、谁负责展示”
4. 最后再做生成质量与体验优化

如果需要，我下一步可以继续直接帮你输出一份：

- **可执行修复清单版**（按文件拆分）
- 或者 **直接开始修这些 P0/P1 问题**
