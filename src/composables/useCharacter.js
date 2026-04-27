import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { characterDao } from '@/utils/dao'

/**
 * 转义字符串中的正则特殊字符
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 角色管理组合式函数
 * 提供角色的CRUD操作和状态追踪功能
 */
export function useCharacter() {
  const characters = ref([])
  const character = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * 加载小说的所有角色
   * @param {number} novelId - 小说ID
   */
  const loadCharacters = async (novelId) => {
    loading.value = true
    error.value = null

    try {
      const list = await characterDao.getByNovelId(novelId)
      characters.value = list
      return list
    } catch (err) {
      error.value = err.message
      console.error('加载角色失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载单个角色
   * @param {number} id - 角色ID
   */
  const loadCharacter = async (id) => {
    loading.value = true
    error.value = null

    try {
      const data = await characterDao.getById(id)
      character.value = data
      return data
    } catch (err) {
      error.value = err.message
      console.error('加载角色失败:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新角色
   * @param {Object} characterData - 角色数据
   */
  const createCharacter = async (characterData) => {
    loading.value = true
    error.value = null

    try {
      const id = await characterDao.add(characterData)
      message.success('角色创建成功！')
      return id
    } catch (err) {
      error.value = err.message
      message.error('创建角色失败：' + err.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新角色
   * @param {number} id - 角色ID
   * @param {Object} characterData - 更新的数据
   */
  const updateCharacter = async (id, characterData) => {
    loading.value = true
    error.value = null

    try {
      await characterDao.update(id, characterData)
      message.success('角色更新成功！')
      return true
    } catch (err) {
      error.value = err.message
      message.error('更新角色失败：' + err.message)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除角色
   * @param {number} id - 角色ID
   */
  const deleteCharacter = async (id) => {
    try {
      await characterDao.delete(id)
      message.success('角色删除成功！')
      return true
    } catch (err) {
      error.value = err.message
      message.error('删除角色失败：' + err.message)
      return false
    }
  }

  /**
   * 更新角色状态
   * @param {number} id - 角色ID
   * @param {Object} statusUpdate - 状态更新数据
   */
  const updateCharacterStatus = async (id, statusUpdate) => {
    try {
      await characterDao.updateStatus(id, statusUpdate)
      return true
    } catch (err) {
      console.error('更新角色状态失败:', err)
      return false
    }
  }

  /**
   * 添加角色出场记录
   * @param {number} id - 角色ID
   * @param {number} chapterId - 章节ID
   * @param {Array} events - 事件列表
   */
  const addAppearance = async (id, chapterId, events) => {
    try {
      await characterDao.addAppearance(id, chapterId, events)
      return true
    } catch (err) {
      console.error('添加出场记录失败:', err)
      return false
    }
  }

  /**
   * 更新角色关系
   * @param {number} id - 角色ID
   * @param {number} targetId - 目标角色ID
   * @param {Object} relationshipUpdate - 关系更新数据
   */
  const updateRelationship = async (id, targetId, relationshipUpdate) => {
    try {
      await characterDao.updateRelationship(id, targetId, relationshipUpdate)
      return true
    } catch (err) {
      console.error('更新角色关系失败:', err)
      return false
    }
  }

  /**
   * 从小说概览中提取并创建角色
   * @param {number} novelId - 小说ID
   * @param {Object} novelData - 小说概览数据
   */
  const createFromNovelOverview = async (novelId, novelData) => {
    try {
      const charactersToCreate = []

      // 添加主角
      if (novelData.characters?.protagonist) {
        const protagonist = novelData.characters.protagonist
        charactersToCreate.push({
          novelId,
          name: protagonist.name,
          type: 'protagonist',
          basicInfo: {
            age: protagonist.age,
            identity: protagonist.identity,
            appearance: protagonist.appearance || '',
            personality: protagonist.personality
          },
          background: protagonist.background,
          goals: protagonist.goal ? [protagonist.goal] : [],
          abilities: protagonist.specialAbility ? [protagonist.specialAbility] : [],
          currentStatus: {
            location: novelData.worldSetting?.location || '',
            condition: '正常',
            powerLevel: '',
            relationships: []
          },
          appearances: []
        })
      }

      // 添加配角
      if (novelData.characters?.supportingCharacters) {
        novelData.characters.supportingCharacters.forEach(sc => {
          charactersToCreate.push({
            novelId,
            name: sc.name,
            type: 'supporting',
            basicInfo: {
              age: '',
              identity: sc.identity,
              appearance: '',
              personality: sc.personality
            },
            background: '',
            goals: [],
            abilities: [],
            currentStatus: {
              location: '',
              condition: '正常',
              powerLevel: '',
              relationships: []
            },
            appearances: [],
            // 将 role 存储在 basicInfo 中作为角色定位
            roleInStory: sc.role
          })
        })
      }

      if (charactersToCreate.length > 0) {
        await characterDao.batchAdd(charactersToCreate)
      }

      return charactersToCreate.length
    } catch (err) {
      console.error('从概览创建角色失败:', err)
      return 0
    }
  }

  /**
   * 获取角色状态摘要（用于生成上下文）
   * @param {number} novelId - 小说ID
   */
  const getCharacterStatusSummary = async (novelId) => {
    try {
      const allCharacters = await characterDao.getByNovelId(novelId)
      
      return allCharacters.map(char => ({
        name: char.name,
        type: char.type,
        location: char.currentStatus?.location || '未知',
        condition: char.currentStatus?.condition || '正常',
        powerLevel: char.currentStatus?.powerLevel || '',
        relationships: char.currentStatus?.relationships || [],
        lastAppearance: char.appearances?.length > 0 
          ? char.appearances[char.appearances.length - 1].chapterId 
          : null
      }))
    } catch (err) {
      console.error('获取角色状态摘要失败:', err)
      return []
    }
  }

  /**
   * 按类型分组的角色
   */
  const charactersByType = computed(() => {
    const grouped = {
      protagonist: null,
      supporting: [],
      antagonist: [],
      minor: []
    }

    characters.value.forEach(char => {
      if (char.type === 'protagonist') {
        grouped.protagonist = char
      } else if (grouped[char.type]) {
        grouped[char.type].push(char)
      }
    })

    return grouped
  })

  /**
   * 获取主角
   */
  const protagonist = computed(() => {
    return characters.value.find(c => c.type === 'protagonist') || null
  })

  /**
   * 从章节内容中更新角色出场记录
   * @param {string} content - 章节内容
   * @param {number} chapterId - 章节ID
   * @param {number} novelId - 小说ID
   * @returns {Promise<Array>} 出场的角色列表
   */
  const updateAppearancesFromContent = async (content, chapterId, novelId) => {
    try {
      // 获取小说所有角色
      const allCharacters = await characterDao.getByNovelId(novelId)
      const appearedCharacters = []

      for (const char of allCharacters) {
        // 检查角色名是否在内容中出现
        const escapedName = escapeRegExp(char.name)
        const nameRegex = new RegExp(escapedName, 'g')
        const matches = content.match(nameRegex)

        if (matches && matches.length > 0) {
          // 提取角色在章节中的事件
          const events = extractCharacterEvents(content, char.name)

          // 更新角色出场记录
          await characterDao.addAppearance(char.id, chapterId, events)

          appearedCharacters.push({
            id: char.id,
            name: char.name,
            appearanceCount: matches.length,
            events
          })
        }
      }

      return appearedCharacters
    } catch (err) {
      console.error('更新角色出场记录失败:', err)
      return []
    }
  }

  /**
   * 从章节内容中更新角色状态
   * @param {string} content - 章节内容
   * @param {number} chapterId - 章节ID
   * @param {number} novelId - 小说ID
   * @returns {Promise<boolean>} 是否成功
   */
  const updateStatusesFromContent = async (content, chapterId, novelId) => {
    try {
      // 获取小说所有角色
      const allCharacters = await characterDao.getByNovelId(novelId)

      for (const char of allCharacters) {
        // 检查角色名是否在内容中出现
        if (content.includes(char.name)) {
          // 提取角色状态变化
          const statusUpdate = extractCharacterStatus(content, char)
          
          if (statusUpdate) {
            await characterDao.updateStatus(char.id, statusUpdate)
          }
        }
      }

      return true
    } catch (err) {
      console.error('更新角色状态失败:', err)
      return false
    }
  }

  /**
   * 提取角色在章节中的事件
   * @param {string} content - 章节内容
   * @param {string} characterName - 角色名
   * @returns {Array} 事件列表
   */
  const extractCharacterEvents = (content, characterName) => {
    const events = []
    const sentences = content.split(/[。！？\n]/)
    
    for (const sentence of sentences) {
      if (sentence.includes(characterName)) {
        // 简化事件描述
        const trimmed = sentence.trim()
        if (trimmed.length > 5 && trimmed.length < 100) {
          events.push(trimmed)
        }
      }
    }
    
    // 最多保留5个关键事件
    return events.slice(0, 5)
  }

  /**
   * 从内容中提取角色状态变化
   * @param {string} content - 章节内容
   * @param {Object} character - 角色对象
   * @returns {Object|null} 状态更新对象
   */
  const extractCharacterStatus = (content, character) => {
    const statusUpdate = {}
    const escapedName = escapeRegExp(character.name)

    // 检测位置变化
    const locationPatterns = [
      /来到[了]?([^，。！？]{2,10})/,
      /到达[了]?([^，。！？]{2,10})/,
      /出现在([^，。！？]{2,10})/,
      /身处([^，。！？]{2,10})/
    ]

    for (const pattern of locationPatterns) {
      const regex = new RegExp(escapedName + pattern.source)
      const match = content.match(regex)
      if (match) {
        statusUpdate.location = match[1]
        break
      }
    }

    // 检测状态变化
    const conditionPatterns = [
      { regex: /受伤|负伤|重伤/, condition: '受伤' },
      { regex: /恢复|痊愈|康复/, condition: '正常' },
      { regex: /死亡|牺牲|陨落/, condition: '死亡' },
      { regex: /突破|晋升|进阶/, condition: '突破' }
    ]

    for (const { regex, condition } of conditionPatterns) {
      const pattern = new RegExp(escapedName + regex.source)
      if (pattern.test(content)) {
        statusUpdate.condition = condition
        break
      }
    }

    // 检测实力变化
    const powerPatterns = [
      /实力[大]?[增减]/,
      /修为[大]?[增减]/,
      /境界[提升降低]/
    ]

    for (const pattern of powerPatterns) {
      const regex = new RegExp(escapedName + pattern.source)
      const match = content.match(regex)
      if (match) {
        statusUpdate.powerLevel = match[0]
        break
      }
    }
    
    return Object.keys(statusUpdate).length > 0 ? statusUpdate : null
  }

  return {
    characters,
    character,
    loading,
    error,
    charactersByType,
    protagonist,
    loadCharacters,
    loadCharacter,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    updateCharacterStatus,
    addAppearance,
    updateRelationship,
    createFromNovelOverview,
    getCharacterStatusSummary,
    updateAppearancesFromContent,
    updateStatusesFromContent
  }
}
