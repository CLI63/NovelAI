# 代码审查：Bug 与逻辑不闭环问题

> 审查日期: 2026-04-24
> 范围: `src/` 下核心业务逻辑、数据访问层、组合式函数和视图组件

---

## 一、紧急 Bug（必须立即修复）

### 1. `callAI(prompt)` 传参完全错误

**位置**: [useOutline.js:671](../src/composables/useOutline.js#L671) 和 [useOutline.js:691](../src/composables/useOutline.js#L691)

**问题**: `generateOutlineWithAI` 和 `suggestPlotEvents` 调用 `callAI(prompt)`，但 `callAI` 的函数签名是：
```js
callAI(messages, provider, apiKey, model)
```
第一个参数必须是消息数组 `Array`，这里传入了字符串。且未传 `provider`/`apiKey`/`model`，会导致 API 调用直接崩溃。

**影响**: `生成大纲` 和 `AI建议生成` 功能永远失败。

**修复方案**: 使用 `generate` 方法（来自 `useAI` composable）替代，或补全参数。

---

### 2. `getRecentChapters` 返回最早章节而非最近章节

**位置**: [dao.js:54-61](../src/utils/dao.js#L54-L61)

**问题**: 
```js
.reverse()
.sortBy('chapterNumber')
.then(chapters => chapters.slice(0, count))
```
Dexie 的 `reverse()` 反转主键顺序，但 `sortBy()` 永远按升序排序且**忽略前置的 `reverse()`**。结果是 `slice(0, 3)` 拿到第 1-3 章（最旧章节）。这导致 AI 生成上下文时使用的是最早章节的内容，严重破坏剧情连贯性。

**影响范围**:
- `useFullNovelGeneration.js` 中的全本生成上下文构建
- `ChapterCreate.vue` 中单章和批量生成的上下文构建
- `getChapterSummaries` 也有相同问题

**修复方案**: 去掉 `.reverse()` 或使用自定义排序。

---

### 3. 删除小说不清理关联数据

**位置**: [useNovel.js:129-146](../src/composables/useNovel.js#L129-L146)

**问题**: `deleteNovel` 只调用了 `novelDao.delete(id)`，但以下关联表的数据未被删除：
- `characters` — 角色
- `foreshadowing` — 伏笔
- `timelineEvents` — 时间线事件
- `generationTasks` — 生成任务
- `bookmarks` — 书签
- `annotations` — 批注
- `plotLines` / `outlineEvents` — 剧情线
- `characterRelations` — 角色关系
- `backgroundTasks` — 后台任务

虽然 DAO 中有 `getByNovelId` 方法，但 `deleteNovel` 未调用级联清理。

**修复方案**: 在 `deleteNovel` 中补充所有关联表的级联删除。

---

## 二、重要 Bug（功能异常）

### 4. 章节后处理有三条不一致的路径

**位置**: 
- [useFullNovelGeneration.js:101-174](../src/composables/useFullNovelGeneration.js#L101-L174) — `runPostProcessing`
- [ChapterCreate.vue:678-864](../src/views/ChapterCreate.vue#L678-L864) — `afterChapterSave`
- [TaskCenter.vue:183-299](../src/views/TaskCenter.vue#L183-L299) — `executeChapterPostProcess`

**问题**: 系统存在三条后处理路径，做类似但不同的事情：

| 路径 | 触发方式 | 处理项数 | 缺什么 |
|------|---------|---------|--------|
| `runPostProcessing` | 全本一键生成 | 3项 | 缺结构化摘要、角色状态更新、关键词提取 |
| `afterChapterSave` | 单章/批量保存 | 8项 | 最完整 |
| `executeChapterPostProcess` | 后台任务系统 | 6项 | 缺角色变化应用、新伏笔记录 |

全本生成的章节走路径A，不生成结构化摘要。批量生成走路径B。单章创建后台任务走路径C。**同一个功能三套实现，行为不一致**。

**修复方案**: 统一为单一入口，推荐将 `afterChapterSave` 作为标准实现。

---

### 5. `reverse().sortBy()` 模式在多个 DAO 中错误

**位置**: 
- [dao.js:54-61](../src/utils/dao.js#L54-L61) — `getRecentChapters`
- [dao.js:63-74](../src/utils/dao.js#L63-L74) — `getChapterSummaries`  
- [dao.js:405-412](../src/utils/dao.js#L405-L412) — `inspirationDao.getByStatus`
- [backgroundTask.js:83-89](../src/composables/useBackgroundTask.js#L83-L89) — `getTasksByNovel`
- [backgroundTask.js:111-126](../src/composables/useBackgroundTask.js#L111-L126) — `getAllTasks`

**问题**: `.reverse().sortBy('field')` 中 `reverse()` 永远被 `sortBy()` 忽略。Dexie 的 `sortBy` 永远返回升序结果。

**影响**: 
- `getTasksByNovel` 返回旧任务在前（期望新任务在前）
- 其他方法排序不符合预期

**修复方案**: `sortBy` 后手动 `reverse()`，或对已索引字段使用 `orderBy('field').reverse()`。

---

### 6. 全本生成不支持自定义提示词

**位置**: [useFullNovelGeneration.js:265-273](../src/composables/useFullNovelGeneration.js#L265-L273)

**问题**: `useFullNovelGeneration.js` 在构建 prompt 时没有接收和传递 `customPrompt` 参数的机制。`ChapterCreate.vue` 的单章模式支持用户输入额外要求，但全本生成无法带参。

**修复方案**: 在 `start()` 方法中增加 `customPrompt` 参数，拼接到消息数组中。

---

## 三、逻辑不闭环

### 7. 批量生成无法即时暂停

**位置**: [ChapterCreate.vue:1085-1089](../src/views/ChapterCreate.vue#L1085-L1089)

**问题**: 设置 `batchPaused = true` 后，循环在下一次迭代检查该标志。但正在执行的 `await generate(messages)` **阻塞**当前章节生成，只有等当前章节完成后才能停止。对比 `useFullNovelGeneration` 有完整的 `while + Promise` 暂停机制。

---

### 8. 结构化摘要创建的伏笔字段不匹配 DAO 期望

**位置**: [ChapterCreate.vue:807-836](../src/views/ChapterCreate.vue#L807-L836)

**问题**: 调用 `createForeshadowing` 时传入的 `plantedInChapterId` 字段，而 DAO 期望的字段名是 `chapterId`。该字段值被忽略，导致伏笔无法正确关联到章节。

---

### 9. `runningTask` 析构了不存在的方法

**位置**: [ChapterCreate.vue:37-46](../src/views/ChapterCreate.vue#L37-L46)

**问题**: `useGenerationQueue()` 返回 `currentTask` 和 `hasRunningTask`，但这里析构了 `runningTask`（不存在），结果为 `undefined`。

---

### 10. 角色名正则提取未转义特殊字符

**位置**: [useCharacter.js:405-447](../src/composables/useCharacter.js#L405-L447)

**问题**: `new RegExp(charName + pattern.source)` — 如果角色名包含 `.`、`+`、`*` 等正则特殊字符，RegExp 构造会失败或产生意外匹配。且短角色名（如"小"、"大"、"一"）会误匹配大量无关内容。

---

### 11. DeepSeek temperature 设为 1.5（超出推荐范围）

**位置**: [api.js:329](../src/utils/api.js#L329)

**问题**: DeepSeek 的 `temperature` 设为 1.5。典型大模型的推荐范围在 0-1（或 0-2），1.5 已是极高值，生成内容随机性过大。

---

## 四、设计不一致

### 12. 多个 DAO 方法全表扫描

**位置**:
- `characterRelationDao.getByCharacterId`
- `characterRelationDao.getRelationBetween`
- `inspirationDao.search`

**问题**: 这些方法用 `toArray()` 加载整个表到内存再过滤，性能随数据增长急剧下降。

---

### 13. 参数校验和错误边界不统一

- `useAI.checkApiKey()` 跳转到 `/settings` 页面（有导航副作用）
- `useFullNovelGeneration.checkApiKeySetup()` 仅返回 boolean
- 有的地方调用 `checkApiKey()` 前不检查返回值直接调用 AI

---

## 附录：推荐修复顺序

1. ✅ **已修复** `callAI(prompt)` 传参错误（Bug #1）
2. ✅ **已修复** `getRecentChapters` 排序（Bug #2）
3. ✅ **已修复** 删除小说级联清理（Bug #3）
4. ✅ **已修复** 所有 `reverse().sortBy()` 模式（Bug #5）
5. ✅ **已修复** 全本生成支持 customPrompt（Bug #6）
6. ✅ **已修复** 结构化摘要字段不匹配（Bug #8）
7. ✅ **已修复** 移除无效 `runningTask` 解构（Bug #9）
8. ✅ **已修复** 角色名正则转义（Bug #10）
9. ✅ **已修复** DeepSeek temperature 降为 1.0（Bug #11）
10. ⬜ 待修复：统一章节后处理路径（Bug #4）
11. ⬜ 待修复：批量暂停机制（Bug #7）

