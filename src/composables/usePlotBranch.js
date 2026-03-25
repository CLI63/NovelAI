import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import db from '@/utils/db'

/**
 * 剧情分支管理组合式函数
 * 提供剧情树可视化和分支管理功能
 */

// 扩展数据库，添加剧情分支表
const initPlotBranchTable = () => {
  // 检查是否需要添加 plotBranches 表
  if (!db.plotBranches) {
    db.version(3).stores({
      plotBranches: '++id, novelId, type, status, createdAt'
    })
  }
}

/**
 * 剧情分支数据结构
 */
const createBranchTemplate = (data = {}) => ({
  id: null,
  novelId: null,
  type: 'main', // main, sub
  name: '',
  description: '',
  chapters: [], // 关联的章节ID列表
  parentBranch: null, // 父分支ID
  status: 'active', // active, ended, merged
  mergeTo: null, // 合并到的分支ID
  color: '#1890ff', // 显示颜色
  position: { x: 0, y: 0 }, // 在树形图中的位置
  metadata: {
    startTime: '',
    endTime: '',
    keyEvents: [],
    involvedCharacters: []
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...data
})

/**
 * 剧情分支管理
 */
export function usePlotBranch() {
  const branches = ref([])
  const currentBranch = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const viewMode = ref('tree') // tree, timeline, list

  /**
   * 加载小说的所有剧情分支
   * @param {number} novelId - 小说ID
   */
  const loadBranches = async (novelId) => {
    loading.value = true
    error.value = null

    try {
      initPlotBranchTable()
      
      // 如果表存在，加载数据
      if (db.plotBranches) {
        const list = await db.plotBranches
          .where('novelId')
          .equals(novelId)
          .toArray()
        branches.value = list
      } else {
        // 如果表不存在，初始化主线
        branches.value = [createBranchTemplate({
          novelId,
          type: 'main',
          name: '主线剧情',
          description: '小说主线剧情',
          color: '#1890ff'
        })]
      }

      return branches.value
    } catch (err) {
      error.value = err.message
      console.error('加载剧情分支失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新分支
   * @param {Object} branchData - 分支数据
   */
  const createBranch = async (branchData) => {
    try {
      initPlotBranchTable()
      
      const newBranch = createBranchTemplate({
        ...branchData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      if (db.plotBranches) {
        const id = await db.plotBranches.add(newBranch)
        newBranch.id = id
      }

      branches.value.push(newBranch)
      message.success('分支创建成功！')
      
      return newBranch
    } catch (err) {
      error.value = err.message
      message.error('创建分支失败：' + err.message)
      return null
    }
  }

  /**
   * 更新分支
   * @param {number} id - 分支ID
   * @param {Object} updates - 更新数据
   */
  const updateBranch = async (id, updates) => {
    try {
      if (db.plotBranches) {
        await db.plotBranches.update(id, {
          ...updates,
          updatedAt: new Date().toISOString()
        })
      }

      const index = branches.value.findIndex(b => b.id === id)
      if (index > -1) {
        branches.value[index] = {
          ...branches.value[index],
          ...updates,
          updatedAt: new Date().toISOString()
        }
      }

      return true
    } catch (err) {
      error.value = err.message
      console.error('更新分支失败:', err)
      return false
    }
  }

  /**
   * 删除分支
   * @param {number} id - 分支ID
   */
  const deleteBranch = async (id) => {
    try {
      // 不允许删除主线
      const branch = branches.value.find(b => b.id === id)
      if (branch?.type === 'main') {
        message.warning('不能删除主线剧情')
        return false
      }

      if (db.plotBranches) {
        await db.plotBranches.delete(id)
      }

      branches.value = branches.value.filter(b => b.id !== id)
      message.success('分支已删除')
      
      return true
    } catch (err) {
      error.value = err.message
      message.error('删除分支失败')
      return false
    }
  }

  /**
   * 合并分支
   * @param {number} sourceId - 源分支ID
   * @param {number} targetId - 目标分支ID
   */
  const mergeBranch = async (sourceId, targetId) => {
    try {
      const source = branches.value.find(b => b.id === sourceId)
      const target = branches.value.find(b => b.id === targetId)

      if (!source || !target) {
        message.error('分支不存在')
        return false
      }

      // 更新源分支状态
      await updateBranch(sourceId, {
        status: 'merged',
        mergeTo: targetId
      })

      // 将源分支的章节合并到目标分支
      await updateBranch(targetId, {
        chapters: [...target.chapters, ...source.chapters]
      })

      message.success('分支合并成功！')
      return true
    } catch (err) {
      error.value = err.message
      message.error('合并分支失败')
      return false
    }
  }

  /**
   * 添加章节到分支
   * @param {number} branchId - 分支ID
   * @param {number} chapterId - 章节ID
   */
  const addChapterToBranch = async (branchId, chapterId) => {
    const branch = branches.value.find(b => b.id === branchId)
    if (!branch) return false

    if (branch.chapters.includes(chapterId)) {
      return true // 已存在
    }

    return await updateBranch(branchId, {
      chapters: [...branch.chapters, chapterId]
    })
  }

  /**
   * 从分支移除章节
   * @param {number} branchId - 分支ID
   * @param {number} chapterId - 章节ID
   */
  const removeChapterFromBranch = async (branchId, chapterId) => {
    const branch = branches.value.find(b => b.id === branchId)
    if (!branch) return false

    return await updateBranch(branchId, {
      chapters: branch.chapters.filter(id => id !== chapterId)
    })
  }

  /**
   * 获取分支树形结构
   */
  const branchTree = computed(() => {
    if (branches.value.length === 0) return null

    // 构建树形结构
    const buildTree = (parentId = null) => {
      return branches.value
        .filter(b => b.parentBranch === parentId)
        .map(branch => ({
          ...branch,
          children: buildTree(branch.id)
        }))
    }

    // 从主线开始构建
    const mainBranch = branches.value.find(b => b.type === 'main')
    if (mainBranch) {
      return {
        ...mainBranch,
        children: buildTree(mainBranch.id)
      }
    }

    return buildTree()[0] || null
  })

  /**
   * 获取分支节点列表（用于可视化）
   */
  const branchNodes = computed(() => {
    return branches.value.map((branch, index) => ({
      id: branch.id || `temp_${index}`,
      label: branch.name,
      type: branch.type,
      status: branch.status,
      color: branch.color || getDefaultColor(branch.type),
      chapterCount: branch.chapters?.length || 0,
      position: branch.position || { x: index * 200, y: 0 },
      data: branch
    }))
  })

  /**
   * 获取分支连接线（用于可视化）
   */
  const branchLinks = computed(() => {
    const links = []
    
    branches.value.forEach(branch => {
      if (branch.parentBranch) {
        const parent = branches.value.find(b => b.id === branch.parentBranch)
        if (parent) {
          links.push({
            source: branch.parentBranch,
            target: branch.id,
            type: 'parent'
          })
        }
      }
      
      if (branch.mergeTo) {
        links.push({
          source: branch.id,
          target: branch.mergeTo,
          type: 'merge',
          dashed: true
        })
      }
    })

    return links
  })

  /**
   * 获取默认颜色
   */
  const getDefaultColor = (type) => {
    const colors = {
      main: '#1890ff',
      sub: '#52c41a'
    }
    return colors[type] || '#faad14'
  }

  /**
   * 计算分支位置（自动布局）
   */
  const calculateLayout = () => {
    const nodeWidth = 180
    const nodeHeight = 80
    const horizontalGap = 40
    const verticalGap = 60

    const positions = {}
    let currentX = 0
    let currentY = 0

    // 先放置主线
    const mainBranch = branches.value.find(b => b.type === 'main')
    if (mainBranch) {
      positions[mainBranch.id] = { x: currentX, y: currentY }
      currentY += nodeHeight + verticalGap
    }

    // 放置子分支
    const subBranches = branches.value.filter(b => b.type === 'sub')
    subBranches.forEach((branch, index) => {
      if (index % 2 === 0 && index > 0) {
        currentX += nodeWidth + horizontalGap
        currentY = 0
      }
      positions[branch.id] = { x: currentX, y: currentY }
      currentY += nodeHeight + verticalGap
    })

    return positions
  }

  /**
   * 应用自动布局
   */
  const applyAutoLayout = async () => {
    const positions = calculateLayout()
    
    for (const [id, position] of Object.entries(positions)) {
      await updateBranch(Number(id), { position })
    }

    message.success('布局已更新')
  }

  /**
   * 分支统计
   */
  const branchStats = computed(() => {
    const total = branches.value.length
    const mainCount = branches.value.filter(b => b.type === 'main').length
    const subCount = branches.value.filter(b => b.type === 'sub').length
    const activeCount = branches.value.filter(b => b.status === 'active').length
    const mergedCount = branches.value.filter(b => b.status === 'merged').length

    return {
      total,
      mainCount,
      subCount,
      activeCount,
      mergedCount
    }
  })

  return {
    branches,
    currentBranch,
    loading,
    error,
    viewMode,
    branchTree,
    branchNodes,
    branchLinks,
    branchStats,
    loadBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    mergeBranch,
    addChapterToBranch,
    removeChapterFromBranch,
    calculateLayout,
    applyAutoLayout
  }
}

/**
 * 构建剧情分支选择提示词
 * @param {Object} novel - 小说信息
 * @param {Array} chapters - 已有章节
 * @param {number} targetChapterNumber - 目标章节号
 */
export function buildBranchSelectionPrompt(novel, chapters, targetChapterNumber) {
  const branchInfo = novel.plotBranches?.map(b => 
    `- ${b.name}（${b.type === 'main' ? '主线' : '支线'}）：${b.description}`
  ).join('\n') || '暂无分支'

  return [
    {
      role: 'system',
      content: `你是一位专业的小说策划师，请根据小说的剧情分支情况，判断当前章节应该属于哪个分支。`
    },
    {
      role: 'user',
      content: `【小说信息】
书名：${novel.title}
风格：${novel.style?.join('、')}

【剧情分支】
${branchInfo}

【已有章节概要】
${chapters.slice(-5).map(c => `第${c.chapterNumber}章：${c.summary || '暂无摘要'}`).join('\n')}

【当前任务】
生成第${targetChapterNumber}章

请判断这一章应该属于哪个剧情分支，并说明原因。按以下JSON格式返回：
{
  "suggestedBranch": "分支名称",
  "reason": "选择原因",
  "branchProgress": "该分支的进度描述",
  "keyPoints": ["本章在该分支中需要推进的要点"]
}

只返回JSON，不要其他文字。`
    }
  ]
}
