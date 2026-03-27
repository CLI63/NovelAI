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

  /**
   * 从小说概览中提取并创建角色关系
   * @param {number} novelId - 小说ID
   * @param {Object} characters - 小说概览中的角色信息
   * @returns {Promise<number>} 创建的关系数量
   */
  const createRelationsFromNovelOverview = async (novelId, characters) => {
    try {
      if (!characters) return 0

      // 获取已创建的角色列表
      const createdCharacters = await characterDao.getByNovelId(novelId)
      if (!createdCharacters.length) return 0

      const relations = []
      const characterMap = new Map()
      
      // 建立角色名称到ID的映射
      createdCharacters.forEach(char => {
        characterMap.set(char.name, char.id)
      })

      // 分析主角与配角之间的关系
      if (characters.protagonist && characters.supportingCharacters) {
        const protagonistName = characters.protagonist.name
        const protagonistId = characterMap.get(protagonistName)

        if (protagonistId) {
          for (const supporting of characters.supportingCharacters) {
            const supportingId = characterMap.get(supporting.name)
            
            if (supportingId) {
              // 从角色定位分析关系类型
              const relationType = analyzeRelationType(supporting.role)
              
              if (relationType) {
                relations.push({
                  novelId,
                  sourceId: protagonistId,
                  targetId: supportingId,
                  type: relationType,
                  description: supporting.role || '',
                  strength: 'medium',
                  direction: 'bidirectional'
                })
              }
            }
          }
        }
      }

      // 分析配角之间的关系（如果有描述）
      if (characters.supportingCharacters && characters.supportingCharacters.length > 1) {
        for (let i = 0; i < characters.supportingCharacters.length; i++) {
          for (let j = i + 1; j < characters.supportingCharacters.length; j++) {
            const char1 = characters.supportingCharacters[i]
            const char2 = characters.supportingCharacters[j]
            
            // 检查是否有共同的关键词暗示关系
            const relationType = analyzeRelationBetweenCharacters(char1, char2)
            
            if (relationType) {
              const id1 = characterMap.get(char1.name)
              const id2 = characterMap.get(char2.name)
              
              if (id1 && id2) {
                relations.push({
                  novelId,
                  sourceId: id1,
                  targetId: id2,
                  type: relationType,
                  description: '',
                  strength: 'medium',
                  direction: 'bidirectional'
                })
              }
            }
          }
        }
      }

      // 批量创建关系
      if (relations.length > 0) {
        await characterRelationDao.batchAdd(relations)
      }

      return relations.length
    } catch (err) {
      console.error('从概览创建角色关系失败:', err)
      return 0
    }
  }

  /**
   * 分析角色定位，判断与主角的关系类型
   * @param {string} role - 角色定位描述
   * @returns {string|null} 关系类型
   */
  const analyzeRelationType = (role) => {
    if (!role || typeof role !== 'string') return null

    const roleLower = role.toLowerCase()

    // 关系关键词映射
    const relationPatterns = [
      { patterns: ['朋友', '挚友', '好友', '伙伴', '同伴'], type: 'friend' },
      { patterns: ['敌人', '对手', '仇人', '反派'], type: 'enemy' },
      { patterns: ['恋人', '爱人', '情侣', '妻子', '丈夫', '女友', '男友'], type: 'lover' },
      { patterns: ['师父', '师傅', '老师', '导师', '师尊'], type: 'mentor' },
      { patterns: ['徒弟', '弟子', '学生', '门徒'], type: 'mentor' },
      { patterns: ['家人', '父亲', '母亲', '兄弟', '姐妹', '儿子', '女儿', '父母'], type: 'family' },
      { patterns: ['竞争对手', '竞争者', '宿敌'], type: 'rival' },
      { patterns: ['盟友', '同盟', '合作'], type: 'ally' },
      { patterns: ['下属', '部下', '随从', '仆人'], type: 'subordinate' },
      { patterns: ['上司', '领导', '老板', '主人'], type: 'subordinate' }
    ]

    for (const { patterns, type } of relationPatterns) {
      for (const pattern of patterns) {
        if (roleLower.includes(pattern)) {
          return type
        }
      }
    }

    // 默认关系类型
    return 'other'
  }

  /**
   * 分析两个配角之间的关系
   * @param {Object} char1 - 角色1
   * @param {Object} char2 - 角色2
   * @returns {string|null} 关系类型
   */
  const analyzeRelationBetweenCharacters = (char1, char2) => {
    // 简单的关系分析：检查身份关键词
    const identity1 = (char1.identity || '').toLowerCase()
    const identity2 = (char2.identity || '').toLowerCase()
    
    // 师徒关系
    if ((identity1.includes('师') && identity2.includes('徒')) ||
        (identity1.includes('徒') && identity2.includes('师'))) {
      return 'mentor'
    }
    
    // 家族关系
    if (identity1.includes('家族') && identity2.includes('家族')) {
      return 'family'
    }

    return null
  }

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
    createRelationsFromNovelOverview,
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
