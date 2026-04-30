# 项目审查报告

生成时间：2026-04-30  
项目路径：`D:\VUE2026\novel-ai`

## 1. 审查范围

本次审查覆盖以下内容：

- 项目结构、路由、Pinia 状态和 Dexie 数据层
- 小说创建、章节生成、全本生成、阅读器、后台任务等主业务链路
- 本地运行可达性验证
- 当前工作区代码的静态审查

本次没有执行 `npm run build`，符合仓库约束。  
本次已确认 `http://localhost:5173` 可以正常返回首页，首页首屏渲染无控制台报错。

## 2. 总体结论

项目整体功能面较完整，首页和基础导航可以启动，核心页面结构也基本成型。  
但当前存在几处会直接影响业务闭环的高优先级问题，主要集中在“后台任务自动执行”“章节后处理结果落库”“时间线数据模型使用错误”三类。

结论可以概括为：

- 页面能跑起来，但部分关键业务链路并没有真正闭环
- 若用户依赖后台任务自动完成后处理，当前实现会出现任务创建成功但不执行的情况
- 若用户依赖时间线、伏笔、角色变化这类结构化能力，当前数据结果会出现缺失或落错表

## 3. 已确认的正向结果

- `localhost:5173` 首页可访问，HTTP 返回 200
- 首页首屏可正常渲染，未发现首屏运行时异常
- 主体架构清晰，模块拆分基本合理
- Dexie v9 schema 已完整声明所有表，较旧版本方案更稳妥
- 删除章节已改为 `chapterDao.deleteCascade`，级联删除方向是正确的

## 4. 核心问题

### P1 后台任务不会自动执行，业务链路停在“创建任务”阶段

状态：已修复（2026-04-30）

问题描述：

- 单章保存后会创建 `chapter_post_process` 任务，并触发 `TASK_CREATED`
- 批量后处理也会创建任务，并触发 `TASK_CREATED`
- 全本生成后同样会创建后处理任务，并触发 `TASK_CREATED`
- 但全局后台面板只在收到 `TASK_CREATED` 时刷新列表，没有自动调用 `executeTask()` 或 `executeAllPending()`
- 当前真正执行任务的入口只剩下用户手动点击“执行待处理”

证据位置：

- `src/views/ChapterCreate.vue:622-639`
- `src/components/chapter/ChapterList.vue:145-156`
- `src/composables/useFullNovelGeneration.js:106-116`
- `src/components/chapter/GlobalFullGenerationPanel.vue:152-168`
- `src/components/chapter/GlobalFullGenerationPanel.vue:297-300`

影响：

- 章节保存后，后处理不会自动跑
- 全本生成结束后，用户以为“后台继续执行”，实际上任务可能一直停留在 `pending`
- 批量后处理和全本生成的结果完整性依赖用户额外点击后台面板，业务不闭环

建议优先级：最高

建议修复：

- 在接收到 `TASK_CREATED` 后，增加自动消费逻辑
- 至少对 `chapter_post_process` 这类明确可自动执行的任务直接调用 `executeTask()`
- 若保留手动模式，也应明确区分“仅入队”和“自动执行”

修复说明：

- 已在 `src/composables/useBackgroundTaskPanel.js` 增加自动执行队列 `scheduleAutoRun()`
- 已在 `src/components/chapter/GlobalFullGenerationPanel.vue` 中将 `TASK_CREATED` 事件从“仅刷新列表”改为“刷新并自动调度执行”
- 面板初始化时也会自动消费已有 `pending` 任务，避免页面刷新后任务悬挂

### P1 章节后处理里的“AI 提取新伏笔”只计数，不真正写入数据库

状态：已修复（2026-04-30）

问题描述：

- `processChapter()` 的第 2 步会调用 `extractForeshadowing()`
- 返回值只用于统计 `count`
- 这些新伏笔没有调用 `foreshadowingDao.add()` 落库

证据位置：

- `src/utils/chapterPostProcessor.js:64-76`

影响：

- UI 层可能显示“提取成功 X 个伏笔”，但数据库里没有对应记录
- 用户后续在伏笔管理、上下文构建、全本质量检查中看不到这部分结果
- 这是典型的“表面成功，实际无数据”的业务假闭环

建议优先级：最高

建议修复：

- 在 `extractForeshadowing()` 返回后，统一将结果映射为 `foreshadowingDao.add()` 批量写入
- 与结构化摘要里的 `newForeshadowing` 记录逻辑合并，避免双通道重复或遗漏

修复说明：

- 已在 `src/utils/chapterPostProcessor.js` 中新增 `persistExtractedForeshadowings()`
- 现在 AI 提取出的伏笔会真实写入 `foreshadowing` 表，不再只是更新统计数字

### P1 时间线记录写错到 `outlineEvents`，而不是 `timelineEvents`

状态：已修复（2026-04-30）

问题描述：

- 系统已经有专门的 `timelineEvents` 表和 `timelineEventDao`
- 但 `recordTimelineEvents()` 实际写入的是 `outlineEventDao.add()`
- 这会把时间线事件混入大纲事件体系

证据位置：

- `src/utils/chapterPostProcessor.js:299-323`
- `src/utils/dao.js:307-333`
- `src/utils/dao.js:811-848`

影响：

- 时间线功能和大纲事件功能的数据边界被打乱
- 读取 `timelineEvents` 的地方拿不到这些记录
- 大纲相关页面可能混入并不属于剧情规划的数据

建议优先级：最高

建议修复：

- `recordTimelineEvents()` 改为写入 `timelineEventDao.add()`
- 明确区分“剧情规划事件”和“章节实际发生事件”
- 补一次迁移或兼容清洗逻辑，处理已经写入 `outlineEvents` 的旧数据

修复说明：

- 已在 `src/utils/chapterPostProcessor.js` 中将时间线记录改为写入 `timelineEventDao`
- 新生成的数据将进入正确的 `timelineEvents` 表

剩余建议：

- 历史上误写入 `outlineEvents` 的旧数据不会自动迁移，如需清洗可后续补迁移脚本

### P1 批量后处理任务即使手动执行一次，也只会拆子任务，不会把子任务继续跑完

状态：已修复（2026-04-30）

问题描述：

- `executeBatchChapterProcess()` 的实现只是为每个章节创建 `CHAPTER_POST_PROCESS` 子任务
- 父任务随后会标记完成
- 但这些新建子任务不会在同一轮执行中继续被消费

证据位置：

- `src/composables/useBackgroundTaskPanel.js:100-131`
- `src/composables/useBackgroundTaskPanel.js:216-223`

影响：

- 用户点击一次“执行待处理”，批量任务只完成“拆任务”
- 用户至少还要再点一次，子任务才有机会继续执行
- UI 上容易形成“批量任务已完成”的误导

建议优先级：高

建议修复：

- 父任务执行时直接串行执行子任务
- 或者在创建子任务后立即对新任务继续调度，而不是等待下一轮人工触发

修复说明：

- 已在 `src/composables/useBackgroundTaskPanel.js` 中将批量后处理改为“创建子任务后立即串行执行”
- 现在用户执行一次批量任务即可完整跑完当轮子任务，不再需要二次点击

### P2 结构化摘要中的角色变化几乎不会真正更新角色

状态：已修复（2026-04-30）

问题描述：

- `normalizeStructuredSummary()` 只保留了 `character`、`change`、`type`
- 后续应用角色变化时却判断 `change.characterId`
- 由于标准化结果里没有 `characterId`，这段逻辑基本不会命中

证据位置：

- `src/utils/chapterPostProcessor.js:129-142`
- `src/utils/chapterPostProcessor.js:331-338`

影响：

- 结构化摘要里识别出的角色变化不会真正反映到角色数据
- 角色状态、角色卡片、上下文构建的连续性会受影响

建议优先级：中高

建议修复：

- 在标准化后通过角色名匹配现有角色并补齐 `characterId`
- 或改为直接使用 `character` 字段进行检索更新

修复说明：

- 已在 `src/utils/chapterPostProcessor.js` 中新增 `resolveCharacterId()`
- 现在会按角色名匹配现有角色并写回备注，避免 `characterId` 缺失导致完全不生效

### P2 阅读器注册了全局键盘事件，但没有卸载清理

状态：已修复（2026-04-30）

问题描述：

- 阅读器在 `onMounted()` 中注册了 `document.addEventListener('keydown', handleKeydown)`
- 组件销毁时没有对应的 `removeEventListener`

证据位置：

- `src/views/NovelReader.vue:257-260`

影响：

- 多次进入和退出阅读器后，事件监听可能重复绑定
- 键盘左右翻章、Esc 关闭设置等行为可能越来越异常

建议优先级：中

建议修复：

- 在 `onUnmounted()` 中补充 `document.removeEventListener('keydown', handleKeydown)`

修复说明：

- 已在 `src/views/NovelReader.vue` 中补充事件解绑

### P1 章节后处理在刷新页面后会永久停留“处理中”

状态：已修复（2026-04-30）

问题描述：

- 任务执行开始时会先把 `backgroundTasks.status` 写成 `running`
- 但实际执行流程只存在于当前页面会话内，刷新页面后这段内存执行流会直接中断
- 页面重新加载后，初始化逻辑只会自动消费 `pending` 任务，不会接管数据库里遗留的 `running` 任务
- 结果就是任务实际早已中断，但章节列表和后台面板仍会长期显示“处理中”

证据位置：

- `src/composables/useBackgroundTaskPanel.js:191-260`
- `src/components/chapter/GlobalFullGenerationPanel.vue:141-149`
- `src/composables/useBackgroundTask.js:249-252`

影响：

- 用户刷新页面后，会误以为章节后处理仍在继续执行
- 章节状态无法自动恢复，形成“假运行、真卡死”
- 后续再次触发同章节后处理时，也容易与旧状态混淆

建议优先级：最高

建议修复：

- 页面初始化时识别数据库中遗留的 `running` 任务
- 将这类“中断任务”恢复为 `pending`，再重新进入自动调度
- 同时让章节列表订阅任务状态事件，保证任务恢复后界面能同步更新

修复说明：

- 已在 `src/composables/useBackgroundTask.js` 中新增 `getRunningTasks()` 和 `recoverInterruptedTasks()`
- 已在 `src/composables/useBackgroundTaskPanel.js` 中新增中断任务恢复与 `pending` 任务续跑逻辑
- 已在 `src/components/chapter/GlobalFullGenerationPanel.vue` 初始化阶段先恢复中断任务，再恢复待执行任务
- 已在 `src/components/chapter/ChapterList.vue` 中补充任务事件监听，确保状态从“处理中”正确刷新到最终态

### P1 全本生成刷新页面后任务丢失，无法恢复

状态：已修复（2026-04-30）

问题描述：

- “生成全本”入口原先直接调用 `useGlobalFullNovelGeneration().start()` 内部的内存执行流
- 页面上的全本生成面板展示状态也依赖同一个内存单例
- 页面一旦刷新，这条执行流会中断，面板状态也会一起消失
- 与之相对，章节后处理走的是 `backgroundTasks` 持久任务，因此刷新后还能恢复

证据位置：

- `src/views/NovelDetail.vue:67-88`
- `src/views/NovelCreate.vue:265-283`
- `src/composables/useGlobalFullNovelGeneration.js`
- `src/composables/useBackgroundTaskPanel.js:188-201`

影响：

- 用户刷新页面后，看不到全本生成任务
- 全本生成会从“面板中消失”，与章节后处理的恢复行为不一致
- 即使已经生成了一部分章节，也缺少统一的任务入口来续跑和展示进度

建议优先级：最高

建议修复：

- 将“生成全本”启动入口统一纳入 `FULL_NOVEL_GENERATION` 后台任务
- 后台执行时复用同一个全局生成实例，避免任务执行状态和面板显示状态分裂
- 页面初始化时根据 `backgroundTasks` 中最近的全本生成任务恢复面板快照

修复说明：

- 已在 `src/composables/useGlobalFullNovelGeneration.js` 中将启动逻辑改为“创建 `FULL_NOVEL_GENERATION` 任务并发出 `TASK_CREATED` 事件”
- 已在 `src/composables/useBackgroundTaskPanel.js` 中改为使用全局全本生成实例执行任务，并持续把 `progress/results/errors` 回写到任务数据
- 已在 `src/components/chapter/GlobalFullGenerationPanel.vue` 中增加全本生成任务快照恢复逻辑，刷新后可从任务数据恢复面板并自动续跑

## 5. 运行验证说明

本次运行验证确认了以下事实：

- 开发服务可在本地 `5173` 端口启动
- 首页可正常渲染
- 首屏无运行时报错

本次未把“需要真实 AI API 返回”的链路作为通过项认定，原因如下：

- 章节生成、全本生成、后处理依赖真实模型返回
- 当前最核心的问题并不在 AI 可用性，而在任务调度和落库逻辑本身
- 即使 AI 完全正常，上述业务缺陷依然会出现

## 6. 修复优先级建议

当前已完成修复：

1. 后台任务自动执行
2. 章节后处理伏笔落库
3. 时间线写入正确表
4. 批量后处理父任务继续执行子任务
5. 结构化摘要角色变化应用
6. 阅读器键盘事件解绑
7. 页面刷新后中断的章节后处理任务自动恢复
8. 页面刷新后全本生成任务不再丢失，可恢复展示并续跑

后续仍建议关注：

1. 旧数据中误写到 `outlineEvents` 的历史时间线记录清理
2. 任务系统是否还需要更明确的“自动/手动”模式区分
3. 用真实 AI 返回结果做一轮完整回归，重点关注重复伏笔写入和角色备注格式

## 7. 最终结论

当前项目不是“不能用”，而是“主界面可运行，但几个关键业务闭环仍然断开”。  
如果只看页面和基础 CRUD，项目已经具备一定完成度；但如果按“小说生成后应自动补全结构化信息并持续可用”的目标来衡量，当前还存在明显缺口。

一句话总结：

当前最核心的问题不是少功能，而是“任务已创建但未自动执行，数据已分析但未真正落库，时间线已生成但写进了错误的数据模型”。
