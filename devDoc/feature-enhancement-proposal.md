# Novel-AI 功能改造建议

> 文档生成时间：2026-03-25
> 项目技术栈：Vue 3 + Vite + Pinia + Dexie (IndexedDB) + Ant Design Vue

---

## 一、项目现状分析

### 1.1 技术架构

| 层级 | 技术选型 |
|------|----------|
| 框架 | Vue 3 (Composition API) |
| 构建 | Vite 6 |
| 状态管理 | Pinia 3 |
| UI 组件库 | Ant Design Vue 4 |
| 本地存储 | Dexie (IndexedDB) |
| 路由 | Vue Router 4 |
| HTTP | Axios |

### 1.2 AI 服务商支持

- **Kimi (月之暗面)**: 默认模型 `kimi-k2-turbo-preview`
- **千问 (阿里云)**: 默认模型 `qwen3-max`
- **DeepSeek (深度求索)**: 默认模型 `deepseek-chat`
- **豆包 (字节跳动)**: 默认模型 `doubao-pro-32k-chat`

### 1.3 现有功能模块

| 功能模块 | 状态 | 实现位置 |
|---------|------|----------|
| 小说概览生成 | ✅ 完整 | `views/NovelCreate.vue` |
| 小说编辑 | ✅ 完整 | `views/NovelEdit.vue` |
| 小说列表 | ✅ 完整 | `views/NovelList.vue` |
| 小说详情 | ✅ 完整 | `views/NovelDetail.vue` |
| 章节生成 | ✅ 完整 | `views/ChapterCreate.vue` |
| 章节详情 | ✅ 完整 | `views/ChapterDetail.vue` |
| 系统设置 | ✅ 完整 | `views/Settings.vue` |
| 角色管理 | ✅ 完整 | `composables/useCharacter.js` |
| 伏笔管理 | ⚠️ 部分 | `composables/useForeshadowing.js` |
| 剧情分支 | ✅ 完整 | `composables/usePlotBranch.js` |
| 生成队列 | ✅ 完整 | `composables/useGenerationQueue.js` |
| 质量检测 | ⚠️ 部分 | `composables/useQualityCheck.js` |
| 连贯性评分 | ✅ 完整 | `composables/useCoherenceScore.js` |
| 多版本生成 | ✅ 完整 | `composables/useMultiVersion.js` |
| 断点续传 | ✅ 完整 | `composables/useResumeGeneration.js` |
| 世界观模板 | ⚠️ 部分 | `utils/worldTemplates.js` |
| 灵感增强 | ⚠️ 部分 | `utils/inspirationEnhancer.js` |

### 1.4 数据模型

```
IndexedDB Tables:
├── novels          # 小说基础信息
├── chapters        # 章节内容
├── characters      # 角色信息
├── foreshadowing   # 伏笔记录
├── generationTasks # 生成任务队列
├── timelineEvents  # 时间线事件
├── plotBranches    # 剧情分支
└── worldTemplates  # 世界观模板
```

---

## 二、核心功能增强建议

### 2.1 章节生成优化

#### 问题描述
- 当前生成策略较固定（开篇/发展/高潮/过渡）
- 字数控制依赖 AI 自觉，经常出现字数不足
- 生成内容与预期风格可能存在偏差

#### 改造方案

##### 2.1.1 分段生成模式
```
流程: 章节大纲 → 场景拆分 → 逐场景生成 → 合并润色
```

**实现思路**:
1. 先调用 AI 生成详细的章节大纲（包含 3-5 个场景）
2. 为每个场景单独生成内容
3. 最后合并所有场景，并进行衔接润色

**代码位置**: `utils/batchGenerator.js` 扩展

##### 2.1.2 字数补偿机制
```
检测 → 字数不足 → 提取关键段落 → AI 扩写 → 合并
```

**实现思路**:
1. 生成完成后检测字数
2. 若不足，提取内容较短的段落
3. 调用 AI 针对性地扩写这些段落
4. 自动合并到原内容中

**代码位置**: 新增 `utils/contentExpander.js`

##### 2.1.3 风格一致性检查
```
对比前N章风格 → 计算风格偏移度 → 生成调整建议
```

**检查维度**:
- 句式长度分布
- 用词习惯
- 节奏感（对话/描写比例）
- 情感基调

**代码位置**: 扩展 `composables/useQualityCheck.js`

##### 2.1.4 指定剧情节点生成
```
用户指定: 本章必须发生的事件A、B、C
AI 生成: 围绕这些事件展开章节
```

**UI 变更**:
在 `ChapterCreate.vue` 增加「必选事件」输入区域

---

### 2.2 伏笔系统完善

#### 问题描述
- `extractFromChapter` 函数未实现（见 `useForeshadowing.js:168`）
- 缺少伏笔回收的智能建议
- 长期未回收的伏笔没有预警机制

#### 改造方案

##### 2.2.1 实现 AI 提取伏笔
```javascript
// useForeshadowing.js 中 extractFromChapter 的实现思路
const extractFromChapter = async (chapterContent, chapterId, novelId) => {
  const messages = [
    {
      role: 'system',
      content: '你是小说编辑，请从章节中识别可能的伏笔（未解释的悬念、异常细节、神秘人物等）'
    },
    {
      role: 'user',
      content: `章节内容：\n${chapterContent}\n\n请识别其中的伏笔，返回JSON格式：\n{
        "foreshadowings": [
          {
            "content": "伏笔内容",
            "type": "悬疑/情感/剧情",
            "importance": "high/medium/low",
            "relatedCharacters": ["角色名"],
            "suggestedRecall": "建议在第X章回收"
          }
        ]
      }`
    }
  ]
  // 调用 AI 并解析结果
}
```

##### 2.2.2 伏笔关联性分析
- 自动检测伏笔与哪些角色/章节相关
- 生成章节时，提示相关的待回收伏笔

##### 2.2.3 伏笔遗漏预警
```
条件: 高优先级伏笔 + 距离埋设超过N章未回收
动作: 生成章节时弹出提醒
```

---

### 2.3 角色系统增强

#### 问题描述
- 角色状态变化缺少可视化展示
- 角色关系只能手动记录，缺少可视化
- 无法统计角色出场情况

#### 改造方案

##### 2.3.1 角色成长轨迹
```
展示内容:
- 实力等级变化曲线
- 关系变化时间线
- 重要事件列表
```

**新增组件**: `components/character/CharacterGrowthChart.vue`

##### 2.3.2 角色关系图谱
使用力导向图展示角色关系网络

**技术选型**: 可考虑 D3.js 或 vis-network

**新增组件**: `components/character/RelationshipGraph.vue`

##### 2.3.3 角色出场统计
```
统计数据:
- 各角色出场章节数
- 出场时间分布
- 与其他角色的共现频率
```

**新增组件**: `components/character/CharacterStats.vue`

##### 2.3.4 AI 角色对话模拟
```
用途: 让 AI 扮演角色进行对话，辅助角色塑造
场景: 塑造新角色时，测试角色性格是否符合预期
```

---

## 三、新功能建议

### 3.1 灵感工作台

#### 功能流程
```
灵感输入 → AI 扩写 → 引导问答 → 选择模板 → 生成概览
```

#### 新增页面
`views/InspirationWorkshop.vue`

#### 核心功能
1. **多灵感融合**: 多个创意点合并生成一个概览
2. **灵感收藏夹**: 保存未完成的灵感草稿
3. **灵感评分**: AI 评估灵感的商业潜力（创新性、市场匹配度等）

#### 数据存储
新增 IndexedDB 表: `inspirations`

---

### 3.2 智能大纲编辑器

#### 功能定位
独立的大纲编辑与可视化页面

#### 核心功能

##### 3.2.1 可视化剧情线
- 展示主线、支线的交织关系
- 支持拖拽调整顺序
- 自动检测支线未合并问题

##### 3.2.2 时间线编辑器
- 横向时间轴展示事件
- 支持拖拽调整事件时间
- 自动检测时间冲突

##### 3.2.3 章节规划器
- 批量规划章节标题
- 设置每章核心事件
- 预估字数分配

##### 3.2.4 冲突检测器
- 检测剧情逻辑矛盾
- 检测时间线冲突
- 检测角色状态不一致

#### 新增页面
`views/OutlineEditor.vue`

---

### 3.3 写作辅助工具集

#### 3.3.1 场景模板库
预设常用场景模板，帮助快速生成特定类型内容

**模板类型**:
| 类型 | 说明 |
|------|------|
| 打斗场景 | 动作描写、招式设计 |
| 对话场景 | 人物对话、情感交流 |
| 心理场景 | 内心独白、情感变化 |
| 环境场景 | 场景描写、氛围营造 |
| 转场场景 | 时空转换、情节过渡 |

**新增文件**: `utils/sceneTemplates.js`

#### 3.3.2 修辞助手
- 提供比喻、拟人等修辞建议
- 选中段落 → AI 生成修辞优化版本

#### 3.3.3 批量改名工具
- 支持全局替换角色名/地名
- 支持正则表达式
- 提供替换预览

#### 3.3.4 敏感词管理
- 可配置的敏感词库
- 自动检测敏感词
- 提供替换建议

**扩展现有**: `composables/useQualityCheck.js` 中的 `checkSensitiveWords`

#### 3.3.5 字数统计面板
```
统计维度:
- 按章节统计
- 按卷统计
- 按角色出场统计
- 日/周/月写作统计
```

---

### 3.4 版本对比功能增强

#### 现有功能
`useMultiVersion.js` 已实现基础的多版本生成

#### 增强方案

##### 3.4.1 Diff 可视化对比
使用 diff 算法高亮显示两个版本的差异

**技术选型**: diff-match-patch 或类似库

##### 3.4.2 版本 AI 评分
让 AI 对各版本进行评分，维度包括:
- 文笔流畅度
- 情节合理性
- 角色塑造
- 整体质量

##### 3.4.3 混合编辑
- 从不同版本选取段落组合
- 可视化的段落选择界面

---

## 四、用户体验优化

### 4.1 章节阅读器

#### 功能设计
- **阅读模式**: 沉浸式阅读，隐藏工具栏
- **目录导航**: 左侧章节列表快速跳转
- **书签功能**: 标记重要段落
- **批注功能**: 给章节添加笔记

#### 新增页面
`views/NovelReader.vue`

---

### 4.2 搜索与筛选

#### 4.2.1 全局搜索
- 搜索小说标题/简介
- 搜索章节内容
- 搜索角色名
- 搜索伏笔内容

**新增组件**: `components/common/GlobalSearch.vue`

#### 4.2.2 高级筛选
- 按风格筛选
- 按字数范围筛选
- 按生成时间筛选

---

### 4.3 快捷键支持

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建小说 |
| `Ctrl+G` | 开始生成 |
| `Ctrl+S` | 保存当前内容 |
| `Ctrl+E` | 编辑当前内容 |
| `Ctrl+←` | 上一章 |
| `Ctrl+→` | 下一章 |
| `Esc` | 退出当前模式 |

**实现方式**: 使用 `@vueuse/core` 的 `useMagicKeys`

---

## 五、技术架构优化

### 5.1 TypeScript 迁移

#### 迁移计划
```
Phase 1: 添加 JSDoc 类型注释（当前可行）
Phase 2: 添加 .d.ts 类型声明文件
Phase 3: 逐步迁移 .js → .ts
Phase 4: 启用严格模式
```

#### 核心类型定义
```typescript
// types/novel.ts
interface Novel {
  id: number
  title: string
  description: string
  style: string[]
  estimatedWords: string
  worldSetting: WorldSetting
  characters: Characters
  plotLines: PlotLines
  conflicts: Conflicts
  outline: Outline[]
  chapterStructure: ChapterStructure
  createdAt: string
  updatedAt: string
}

interface Chapter {
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

// ... 其他类型定义
```

---

### 5.2 错误处理增强

#### 5.2.1 API 调用重试机制
```javascript
// utils/api.js 增强
const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryOn: [408, 429, 500, 502, 503, 504]
}

async function callAIWithRetry(messages, provider, apiKey, model) {
  let lastError
  for (let i = 0; i < retryConfig.maxRetries; i++) {
    try {
      return await callAI(messages, provider, apiKey, model)
    } catch (error) {
      lastError = error
      if (!retryConfig.retryOn.includes(error.status)) {
        throw error
      }
      await sleep(retryConfig.retryDelay * Math.pow(2, i))
    }
  }
  throw lastError
}
```

#### 5.2.2 离线模式支持
- 检测网络状态
- 离线时缓存请求
- 恢复在线后自动重试

---

### 5.3 性能优化

#### 5.3.1 大内容虚拟滚动
当章节内容超过一定字数时，使用虚拟滚动

**技术选型**: `@tanstack/vue-virtual`

#### 5.3.2 章节列表分页加载
当章节数过多时，分批加载

#### 5.3.3 IndexedDB 索引优化
```javascript
// db.js 优化
db.version(4).stores({
  novels: '++id, title, createdAt, updatedAt',
  chapters: '++id, novelId, chapterNumber, createdAt, updatedAt, [novelId+chapterNumber]',
  // 添加复合索引
})
```

#### 5.3.4 流式输出优化
- 使用 `requestAnimationFrame` 替代 `setTimeout`
- 增加输出缓冲区大小
- 批量更新 DOM

---

### 5.4 测试覆盖

#### 测试框架
- **单元测试**: Vitest
- **组件测试**: @vue/test-utils
- **E2E 测试**: Playwright

#### 测试优先级
1. DAO 层测试（`utils/dao.js`）
2. Prompts 构建函数测试
3. 核心组件测试
4. E2E 关键流程测试

---

## 六、数据管理增强

### 6.1 云同步功能

#### 6.1.1 WebDAV 同步
支持坚果云、NextCloud 等 WebDAV 服务

#### 6.1.2 导出到云存储
- 阿里云 OSS
- 腾讯云 COS
- 七牛云

#### 6.1.3 多设备同步
- 冲突检测与解决
- 增量同步

---

### 6.2 协作功能

> 注意：需要后端支持

#### 功能设计
- 小说分享链接（只读/可编辑）
- 多人协作编辑
- 编辑锁定机制
- 修改历史记录

---

### 6.3 数据分析

#### 6.3.1 写作统计面板
```
统计内容:
- 日字数统计
- 总字数统计
- 生成成功率
- 平均生成时长
```

#### 6.3.2 AI 调用统计
```
统计内容:
- Token 消耗估算
- API 费用估算
- 各模型使用比例
```

#### 6.3.3 小说健康度评分
```
评分维度:
- 剧情连贯性
- 角色塑造完整性
- 伏笔回收率
- 字数达标率
```

---

## 七、UI/UX 改进

### 7.1 主题系统

#### 支持主题
- 浅色模式
- 深色模式
- 阅读模式（护眼色）

#### 实现方式
```css
/* variables.css */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1f1f1f;
  --text-secondary: #666666;
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #aaaaaa;
}
```

---

### 7.2 响应式优化

#### 断点设计
```scss
$breakpoints: (
  xs: 480px,   // 手机
  sm: 768px,   // 平板竖屏
  md: 992px,   // 平板横屏
  lg: 1200px,  // 桌面
  xl: 1920px   // 大屏
);
```

#### 移动端适配
- 阅读模式全屏
- 底部导航栏
- 手势滑动翻页

---

### 7.3 国际化

#### 支持语言
- 简体中文（默认）
- English

#### 实现方式
使用 `vue-i18n`

---

## 八、实施优先级

### 8.1 优先级矩阵

| 优先级 | 功能 | 工作量 | 价值 |
|--------|------|--------|------|
| 🔴 P0 | 伏笔 AI 提取实现 | 中 | 高 |
| 🔴 P0 | 字数补偿机制 | 中 | 高 |
| 🔴 P0 | 生成失败重试机制 | 低 | 高 |
| 🟡 P1 | 灵感工作台 | 高 | 高 |
| 🟡 P1 | 阅读模式 | 中 | 中 |
| 🟡 P1 | 全局搜索 | 中 | 中 |
| 🟡 P1 | TypeScript 迁移 | 高 | 中 |
| 🟢 P2 | 角色关系图谱 | 中 | 中 |
| 🟢 P2 | 智能大纲编辑器 | 高 | 高 |
| 🟢 P2 | 写作辅助工具集 | 中 | 中 |
| 🟢 P3 | 云同步功能 | 高 | 高 |
| 🟢 P3 | 协作功能 | 高 | 高 |

### 8.2 建议实施顺序

```
第一阶段 (1-2周):
├── 伏笔 AI 提取实现
├── 字数补偿机制
└── 生成失败重试机制

第二阶段 (2-3周):
├── 灵感工作台
├── 阅读模式
└── 全局搜索

第三阶段 (3-4周):
├── TypeScript 迁移
├── 角色关系图谱
└── 写作辅助工具集

第四阶段 (长期):
├── 智能大纲编辑器
├── 云同步功能
└── 协作功能
```

---

## 九、附录

### 9.1 相关文件索引

| 功能模块 | 主要文件 |
|---------|----------|
| 小说管理 | `composables/useNovel.js`, `views/Novel*.vue` |
| 章节管理 | `composables/useChapter.js`, `views/Chapter*.vue` |
| AI 调用 | `utils/api.js`, `composables/useAI.js` |
| Prompts | `utils/prompts.js` |
| 上下文构建 | `utils/contextBuilder.js` |
| 批量生成 | `utils/batchGenerator.js` |
| 角色管理 | `composables/useCharacter.js` |
| 伏笔管理 | `composables/useForeshadowing.js` |
| 剧情分支 | `composables/usePlotBranch.js` |
| 生成队列 | `composables/useGenerationQueue.js` |
| 质量检测 | `composables/useQualityCheck.js` |
| 连贯性评分 | `composables/useCoherenceScore.js` |
| 多版本 | `composables/useMultiVersion.js` |
| 断点续传 | `composables/useResumeGeneration.js` |
| 数据存储 | `utils/db.js`, `utils/dao.js` |
| 状态管理 | `stores/app.js` |
| 世界观模板 | `utils/worldTemplates.js` |
| 灵感增强 | `utils/inspirationEnhancer.js` |

### 9.2 数据库表结构

```javascript
// db.js
db.version(3).stores({
  novels: '++id, title, createdAt, updatedAt',
  chapters: '++id, novelId, chapterNumber, createdAt, updatedAt',
  characters: '++id, novelId, name, type, createdAt, updatedAt',
  foreshadowing: '++id, novelId, type, status, createdAt, updatedAt',
  generationTasks: '++id, novelId, status, createdAt, updatedAt',
  timelineEvents: '++id, novelId, chapterId, createdAt',
  plotBranches: '++id, novelId, type, status, createdAt, updatedAt',
  worldTemplates: '++id, category, createdAt, updatedAt'
})
```

---

*文档结束*
