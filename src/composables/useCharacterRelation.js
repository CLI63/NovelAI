import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { characterRelationDao, characterDao } from '@/utils/dao'

/**
 * 角色关系类型定义
 */
export const RELATION_TYPES = {
  family: { label: '家人', color: '#1890ff', icon: '👨‍👩‍👧‍👦' },
  friend: { label: '朋友', color: '#52c41a', icon: '🤝' },
  enemy: { label: '敌人', color: '#f5222d', icon: '⚔️' },
  lover: { label: '恋人', color: '#eb2f96', icon: '💕' },
  mentor: { label: '师徒', color: '#722ed1', icon: '📚' },
  rival: { label: '竞争对手', color: '#fa8c16', icon: '🎯' },
  ally: { label: '盟友', color: '#13c2c2', icon: '🛡️' },
  subordinate: { label: '上下级', color: '#2f54eb', icon: '📋' },
  other: { label: '其他', color: '#8c8c8c', icon: '🔗' }
}

/**
 * 角色关系管理组合式函数
 * 提供角色关系的 CRUD 操作和图谱数据生成功能
 */
export function useCharacterRelation() {
  const relations = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * 加载小说的所有角色关系
   * @param {number} novelId - 小说ID
   */
  const loadRelations = async (novelId) => {
    loading.value = true
    error.value = null

    try {
      const list = await characterRelationDao.getByNovelId(novelId)
      relations.value = list
      return list
    } catch (err) {
      error.value = err.message
      console.error('加载角色关系失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新的角色关系
   * @param {Object} relationData - 关系数据
   */
  const createRelation = async (relationData) => {
    loading.value = true
    error.value = null

    try {
      // 检查是否已存在相同的关系
      const existing = await characterRelationDao.getRelationBetween(
        relationData.sourceId,
        relationData.targetId
      )

      if (existing) {
        message.warning('这两个角色之间已存在关系')
        return null
      }

      const id = await characterRelationDao.add(relationData)
      message.success('关系创建成功！')
      return id
    } catch (err) {
      error.value = err.message
      message.error('创建关系失败：' + err.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新角色关系
   * @param {number} id - 关系ID
   * @param {Object} relationData - 更新的数据
   */
  const updateRelation = async (id, relationData) => {
    loading.value = true
    error.value = null

    try {
      await characterRelationDao.update(id, relationData)
      message.success('关系更新成功！')
      return true
    } catch (err) {
      error.value = err.message
      message.error('更新关系失败：' + err.message)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除角色关系
   * @param {number} id - 关系ID
   */
  const deleteRelation = async (id) => {
    try {
      await characterRelationDao.delete(id)
      message.success('关系删除成功！')
      return true
    } catch (err) {
      error.value = err.message
      message.error('删除关系失败：' + err.message)
      return false
    }
  }

  /**
   * 批量创建角色关系（用于 AI 提取）
   * @param {Array} relationsData - 关系数组
   */
  const batchCreateRelations = async (relationsData) => {
    try {
      await characterRelationDao.batchAdd(relationsData)
      return relationsData.length
    } catch (err) {
      console.error('批量创建关系失败:', err)
      return 0
    }
  }

  /**
   * 生成图谱数据
   * @param {number} novelId - 小说ID
   * @returns {Object} 图谱数据 { nodes, edges }
   */
  const generateGraphData = async (novelId) => {
    try {
      const [charactersList, relationsList] = await Promise.all([
        characterDao.getByNovelId(novelId),
        characterRelationDao.getByNovelId(novelId)
      ])

      // 创建节点映射
      const characterMap = new Map()
      charactersList.forEach(c => {
        characterMap.set(c.id, c)
      })

      // 生成节点数据
      const nodes = charactersList.map(character => ({
        id: character.id,
        label: character.name,
        title: `${character.name}\n${RELATION_TYPES[character.type]?.label || '角色'}`,
        color: {
          background: getNodeColor(character.type),
          border: getNodeBorderColor(character.type),
          highlight: {
            background: getNodeColor(character.type),
            border: '#1890ff'
          }
        },
        font: {
          color: '#333',
          size: 14,
          face: 'Arial'
        },
        shape: character.type === 'protagonist' ? 'dot' : 'ellipse',
        size: character.type === 'protagonist' ? 30 : 25,
        character: character
      }))

      // 生成边数据
      const edges = relationsList.map(relation => ({
        id: relation.id,
        from: relation.sourceId,
        to: relation.targetId,
        label: RELATION_TYPES[relation.type]?.label || relation.type,
        color: {
          color: RELATION_TYPES[relation.type]?.color || '#8c8c8c',
          highlight: '#1890ff'
        },
        font: {
          size: 12,
          align: 'middle'
        },
        arrows: relation.direction === 'oneway' ? 'to' : undefined,
        dashes: relation.strength === 'weak',
        width: relation.strength === 'strong' ? 3 : relation.strength === 'weak' ? 1 : 2,
        relation: relation
      }))

      return { nodes, edges }
    } catch (err) {
      console.error('生成图谱数据失败:', err)
      return { nodes: [], edges: [] }
    }
  }

  /**
   * 获取角色的所有关系
   * @param {number} characterId - 角色ID
   */
  const getCharacterRelations = (characterId) => {
    return relations.value.filter(
      r => r.sourceId === characterId || r.targetId === characterId
    )
  }

  /**
   * 获取关系统计数据
   */
  const relationStats = computed(() => {
    const stats = {}
    Object.keys(RELATION_TYPES).forEach(type => {
      stats[type] = relations.value.filter(r => r.type === type).length
    })
    return stats
  })

  return {
    relations,
    loading,
    error,
    relationStats,
    loadRelations,
    createRelation,
    updateRelation,
    deleteRelation,
    batchCreateRelations,
    generateGraphData,
    getCharacterRelations
  }
}

/**
 * 根据角色类型获取节点颜色
 */
function getNodeColor(type) {
  const colors = {
    protagonist: '#e6f7ff',
    supporting: '#f6ffed',
    antagonist: '#fff1f0',
    minor: '#fafafa'
  }
  return colors[type] || '#fafafa'
}

/**
 * 根据角色类型获取节点边框颜色
 */
function getNodeBorderColor(type) {
  const colors = {
    protagonist: '#1890ff',
    supporting: '#52c41a',
    antagonist: '#f5222d',
    minor: '#d9d9d9'
  }
  return colors[type] || '#d9d9d9'
}
