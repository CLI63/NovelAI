# Novel-AI 项目 Bug 清单

> 文档生成时间：2026-03-27
> 检查范围：utils、composables、views、components、router、stores
> 严重程度：🔴 高危 | 🟡 中危 | 🟢 低危

---

## 一、语法和逻辑错误

### 1.1 API 调用错误

**文件**: `src/utils/api.js`
**严重程度**: 🟡 中危
**问题描述**: `callAIWithRetry` 函数中 `apiClient` 未定义
```javascript
// 第 120 行
const response = await apiClient.post(...)  // ❌ apiClient 未定义
```
**修复建议**: 应该使用已定义的 `apiClient` 实例

### 1.2 变量作用域错误

**文件**: `src/composables/useForeshadowing.js`
**严重程度**: 🟡 中危
**问题描述**: `extractFromChapter` 函数中 `callAI` 导入路径错误
```javascript
// 第 8 行
import { callAI } from '@/utils/api'  // ❌ 应该从 '@/utils/api' 导入
```
**修复建议**: 确认导入路径正确

### 1.3 未定义变量引用

**文件**: `src/views/ChapterCreate.vue`
**严重程度**: 🔴 高危
**问题描述**: `afterChapterSave` 函数中引用了未定义的 `useOutline`
```javascript
// 第 456 行
const { recordTimelineEvents } = useOutline()  // ❌ useOutline 未导入
```
**修复建议**: 添加 `useOutline` 的导入

### 1.4 异步函数未正确处理

**文件**: `src/composables/useCharacter.js`
**严重程度**: 🟡 中危
**问题描述**: `extractCharacterEvents` 函数声明为同步但包含异步操作
```javascript
// 第 245 行
const extractCharacterEvents = (content, characterName) => {
  // ❌ 应该是 async 函数
}
```
**修复建议**: 改为 `async` 函数

---

## 二、类型错误

### 2.1 参数类型不匹配

**文件**: `src/utils/dao.js`
**严重程度**: 🟡 中危
**问题描述**: `chapterDao.getByNovelIdAndChapterNumber` 参数类型未验证
```javascript
async getByNovelIdAndChapterNumber(novelId, chapterNumber) {
  // ❌ 未验证 novelId 和 chapterNumber 是否为数字
  return await db.chapters.where({ novelId, chapterNumber }).first()
}
```
**修复建议**: 添加参数类型验证

### 2.2 返回值类型不一致

**文件**: `src/composables/useGenerationQueue.js`
**严重程度**: 🟢 低危
**问题描述**: `createTask` 函数返回值类型不一致
```javascript
const createTask = async (taskData) => {
  // 有时返回 id，有时返回 null
  return id  // ❌ 应该统一返回类型
}
```
**修复建议**: 统一返回 `{ success: boolean, id?: number, error?: string }`

---

## 三、空值处理问题

### 3.1 未处理 null/undefined

**文件**: `src/utils/contextBuilder.js`
**严重程度**: 🔴 高危
**问题描述**: `buildCharacterStatusContext` 未处理 `characters` 为 null 的情况
```javascript
const statusList = characters.map(char => {  // ❌ characters 可能为 null
  const status = char.currentStatus || {}
  // ...
})
```
**修复建议**: 添加空值检查 `if (!characters) return null`

### 3.2 可选链操作符缺失

**文件**: `src/views/NovelDetail.vue`
**严重程度**: 🟡 中危
**问题描述**: 访问嵌套对象时未使用可选链
```javascript
// 第 234 行
const totalChapters = novel.value.chapterStructure?.totalChapters || 0
// ❌ 应该是 novel.value?.chapterStructure?.totalChapters
```
**修复建议**: 使用可选链操作符 `?.`

### 3.3 数组访问越界

**文件**: `src/composables/useChapter.js`
**严重程度**: 🟡 中危
**问题描述**: `getPrevNextChapter` 函数未检查数组边界
```javascript
const getPrevNextChapter = (currentNumber) => {
  const currentIndex = chapters.value.findIndex(...)
  return {
    prev: currentIndex > 0 ? chapters.value[currentIndex - 1].chapterNumber : null,
    // ❌ 未检查 chapters.value[currentIndex - 1] 是否存在
  }
}
```
**修复建议**: 添加边界检查

---

## 四、异步操作问题

### 4.1 未处理 Promise 拒绝

**文件**: `src/composables/useBackgroundTask.js`
**严重程度**: 🔴 高危
**问题描述**: `createTask` 函数未捕获异步操作错误
```javascript
const createTask = async (taskData) => {
  const task = { ... }
  const id = await db.backgroundTasks.add(task)  // ❌ 未 try-catch
  return id
}
```
**修复建议**: 添加 try-catch 错误处理

### 4.2 竞态条件

**文件**: `src/views/ChapterCreate.vue`
**严重程度**: 🟡 中危
**问题描述**: `handleStreamGenerate` 函数中可能存在竞态条件
```javascript
const handleStreamGenerate = async () => {
  streamGenerating.value = true
  // ❌ 如果用户快速点击多次，可能导致多个并发请求
}
```
**修复建议**: 添加防抖或禁用按钮

### 4.3 内存泄漏

**文件**: `src/components/chapter/StreamOutput.vue`
**严重程度**: 🟡 中危
**问题描述**: `watch` 监听器未正确清理
```javascript
watch(() => props.content, (newContent) => {
  // ❌ 如果组件销毁时仍在执行，可能导致内存泄漏
})
```
**修复建议**: 使用 `onUnmounted` 清理监听器

---

## 五、数据验证问题

### 5.1 输入验证缺失

**文件**: `src/views/NovelCreate.vue`
**严重程度**: 🔴 高危
**问题描述**: 保存小说时未验证必填字段
```javascript
const handleSave = async () => {
  const id = await createNovel(novel)  // ❌ 未验证 novel 数据完整性
}
```
**修复建议**: 添加数据验证逻辑

### 5.2 SQL 注入风险

**文件**: `src/utils/dao.js`
**严重程度**: 🟡 中危
**问题描述**: `novelDao.getByTitle` 未验证输入
```javascript
async getByTitle(title) {
  return await db.novels.where('title').equals(title).first()
  // ❌ title 可能包含特殊字符
}
```
**修复建议**: 添加输入清理和验证

---

## 六、性能问题

### 6.1 不必要的重复渲染

**文件**: `src/views/NovelDetail.vue`
**严重程度**: 🟢 低危
**问题描述**: `loadData` 函数中重复加载数据
```javascript
const loadData = async () => {
  await loadNovel(id)
  if (novel.value) {
    await Promise.all([
      loadChapters(novel.value.id),
      loadCharacters(novel.value.id),
      // ❌ 每次都重新加载所有数据
    ])
  }
}
```
**修复建议**: 添加缓存机制

### 6.2 大数组操作性能

**文件**: `src/composables/useForeshadowing.js`
**严重程度**: 🟢 低危
**问题描述**: `analyzeForeshadowingRelations` 函数中多次遍历大数组
```javascript
for (const foreshadow of foreshadowings) {
  for (const [name, character] of characterNames) {
    // ❌ O(n²) 复杂度，可能导致性能问题
  }
}
```
**修复建议**: 使用 Map 优化查找

---

## 七、安全问题

### 7.1 XSS 风险

**文件**: `src/components/chapter/StreamOutput.vue`
**严重程度**: 🔴 高危
**问题描述**: 直接渲染用户输入内容
```vue
<a-textarea
  :value="content"  // ❌ 未转义用户输入
  readonly
/>
```
**修复建议**: 使用 `v-html` 时添加转义

### 7.2 敏感信息泄露

**文件**: `src/stores/app.js`
**严重程度**: 🟡 中危
**问题描述**: API Key 存储在 localStorage 中
```javascript
const updateSettings = (newSettings) => {
  localStorage.setItem('novelAISettings', JSON.stringify(settings.value))
  // ❌ API Key 明文存储
}
```
**修复建议**: 使用更安全的存储方式

---

## 八、兼容性问题

### 8.1 浏览器 API 兼容性

**文件**: `src/utils/api.js`
**严重程度**: 🟡 中危
**问题描述**: 使用了可能不兼容的 API
```javascript
const reader = response.body.getReader()  // ❌ 部分浏览器不支持
```
**修复建议**: 添加 polyfill 或降级方案

### 8.2 Vue 版本兼容性

**文件**: `src/composables/useAI.js`
**严重程度**: 🟢 低危
**问题描述**: 使用了 Vue 3.4+ 的特性
```javascript
const currentProvider = computed(() => appStore.settings.aiProvider)
// ❌ 如果使用 Vue 3.3 以下版本可能有问题
```
**修复建议**: 确认 Vue 版本要求

---

## 九、代码质量问题

### 9.1 未使用的导入

**文件**: `src/views/ChapterCreate.vue`
**严重程度**: 🟢 低危
**问题描述**: 导入了未使用的模块
```javascript
import { useResumeGeneration } from '@/composables/useResumeGeneration'
// ❌ 部分功能未使用
```
**修复建议**: 清理未使用的导入

### 9.2 重复代码

**文件**: `src/composables/useCharacter.js`
**严重程度**: 🟢 低危
**问题描述**: `extractCharacterEvents` 和 `extractCharacterStatus` 有重复逻辑
```javascript
// ❌ 两个函数有相似的正则匹配逻辑
```
**修复建议**: 提取公共函数

### 9.3 魔法数字

**文件**: `src/utils/api.js`
**严重程度**: 🟢 低危
**问题描述**: 使用了未定义的常量
```javascript
timeout: 1800000,  // ❌ 应该定义为常量
```
**修复建议**: 定义命名常量

---

## 十、测试覆盖问题

### 10.1 缺少单元测试

**严重程度**: 🟡 中危
**问题描述**: 核心业务逻辑缺少测试覆盖
- `utils/dao.js` - 数据访问层
- `utils/api.js` - API 调用层
- `composables/useAI.js` - AI 调用逻辑

**修复建议**: 添加单元测试

### 10.2 缺少集成测试

**严重程度**: 🟡 中危
**问题描述**: 关键流程缺少端到端测试
- 小说创建流程
- 章节生成流程
- 批量生成流程

**修复建议**: 添加 E2E 测试

---

## 十一、文档问题

### 11.1 缺少 JSDoc 注释

**严重程度**: 🟢 低危
**问题描述**: 部分函数缺少文档注释
```javascript
const createTask = async (taskData) => {
  // ❌ 缺少参数说明和返回值说明
}
```
**修复建议**: 添加完整的 JSDoc 注释

### 11.2 错误信息不清晰

**严重程度**: 🟢 低危
**问题描述**: 部分错误信息过于简单
```javascript
message.error('操作失败')
// ❌ 应该提供更详细的错误信息
```
**修复建议**: 提供具体的错误描述

---

## 十二、修复优先级

### 🔴 高危（需立即修复）
1. `src/views/ChapterCreate.vue` - useOutline 未导入
2. `src/utils/contextBuilder.js` - 空值处理
3. `src/composables/useBackgroundTask.js` - Promise 拒绝未处理
4. `src/views/NovelCreate.vue` - 输入验证缺失
5. `src/components/chapter/StreamOutput.vue` - XSS 风险

### 🟡 中危（建议尽快修复）
1. `src/utils/api.js` - apiClient 未定义
2. `src/composables/useForeshadowing.js` - 导入路径错误
3. `src/composables/useCharacter.js` - 异步函数声明
4. `src/utils/dao.js` - 参数类型验证
5. `src/stores/app.js` - 敏感信息存储

### 🟢 低危（可延后修复）
1. 代码质量问题
2. 性能优化
3. 文档完善
4. 测试覆盖

---

## 十三、修复建议汇总

### 13.1 立即行动项
- [ ] 修复所有高危 Bug
- [ ] 添加输入验证和错误处理
- [ ] 安全审查敏感信息存储

### 13.2 短期改进项
- [ ] 完善类型定义和验证
- [ ] 添加单元测试
- [ ] 优化性能瓶颈

### 13.3 长期规划项
- [ ] 代码重构和优化
- [ ] 完善文档
- [ ] 建立代码审查流程

---

## 十四、相关文件清单

| 文件路径 | 问题数量 | 严重程度 |
|---------|---------|---------|
| `src/utils/api.js` | 3 | 🟡 |
| `src/utils/dao.js` | 2 | 🟡 |
| `src/utils/contextBuilder.js` | 1 | 🔴 |
| `src/composables/useAI.js` | 1 | 🟢 |
| `src/composables/useCharacter.js` | 2 | 🟡 |
| `src/composables/useForeshadowing.js` | 2 | 🟡 |
| `src/composables/useGenerationQueue.js` | 1 | 🟢 |
| `src/composables/useBackgroundTask.js` | 1 | 🔴 |
| `src/views/ChapterCreate.vue` | 3 | 🔴 |
| `src/views/NovelDetail.vue` | 2 | 🟡 |
| `src/views/NovelCreate.vue` | 1 | 🔴 |
| `src/components/chapter/StreamOutput.vue` | 2 | 🔴 |
| `src/stores/app.js` | 1 | 🟡 |

---

**文档维护**
- 更新日期：2026-03-27
- 下次评审：建议每周更新
- 负责人：开发团队

**注意事项**
1. 修复 Bug 时请遵循项目编码规范
2. 修复后请添加相应的测试用例
3. 重大修改请进行代码审查
4. 及时更新本文档状态