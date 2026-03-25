/**
 * 世界观模板库
 * 提供预设的世界观模板，支持自定义保存
 */

import { ref } from 'vue'
import db from './db'

/**
 * 预设世界观模板
 */
export const worldTemplates = {
  // 修仙体系
  'xiuxian': {
    id: 'xiuxian',
    name: '修仙体系',
    description: '经典的东方修仙世界观，包含完整的境界体系和宗门设定',
    category: '东方玄幻',
    powerSystem: {
      name: '修仙境界',
      levels: [
        { name: '练气期', description: '初入修仙，感应天地灵气', lifespan: '150年' },
        { name: '筑基期', description: '铸造道基，凝聚真元', lifespan: '300年' },
        { name: '金丹期', description: '凝结金丹，法力大增', lifespan: '500年' },
        { name: '元婴期', description: '元婴出窍，神通广大', lifespan: '1000年' },
        { name: '化神期', description: '元婴化神，感悟天地', lifespan: '2000年' },
        { name: '渡劫期', description: '渡天劫，飞升在即', lifespan: '5000年' },
        { name: '大乘期', description: '圆满之境，即将飞升', lifespan: '万年' }
      ],
      breakthrough: {
        requirements: ['灵石', '丹药', '功法', '机缘'],
        risks: ['走火入魔', '天劫', '心魔']
      }
    },
    socialStructure: {
      organizations: [
        { type: '宗门', description: '修仙者的主要聚集地，传承功法' },
        { type: '家族', description: '血脉传承的修仙世家' },
        { type: '散修', description: '无门无派的独立修仙者' },
        { type: '魔道', description: '修炼邪术的修仙者' }
      ],
      hierarchy: '境界为尊，实力说话'
    },
    specialElements: {
      resources: ['灵石', '灵草', '灵矿', '灵兽'],
      items: ['法宝', '丹药', '符箓', '阵法'],
      locations: ['洞天福地', '秘境', '遗迹', '禁地'],
      concepts: ['灵根', '道心', '因果', '劫难']
    },
    rules: {
      cultivation: '吸收天地灵气，淬炼肉身灵魂',
      combat: '法术对拼，法宝争锋',
      advancement: '突破境界需要资源和机缘'
    }
  },

  // 魔法体系
  'magic': {
    id: 'magic',
    name: '魔法体系',
    description: '西方奇幻魔法世界观，包含魔法学院和魔法体系',
    category: '西方奇幻',
    powerSystem: {
      name: '魔法等级',
      levels: [
        { name: '魔法学徒', description: '初学魔法，掌握基础咒语', mana: '100' },
        { name: '初级法师', description: '能够独立施法', mana: '500' },
        { name: '中级法师', description: '掌握多系魔法', mana: '2000' },
        { name: '高级法师', description: '魔法造诣深厚', mana: '10000' },
        { name: '魔导师', description: '能够自创魔法', mana: '50000' },
        { name: '大魔导师', description: '魔法巅峰', mana: '100000' },
        { name: '法圣', description: '接近神明的存在', mana: '无限' }
      ],
      elements: ['火', '水', '风', '土', '光', '暗', '雷', '冰', '空间', '时间'],
      breakthrough: {
        requirements: ['魔力积累', '魔法知识', '实战经验', '魔法材料'],
        risks: ['魔力反噬', '精神崩溃', '元素失控']
      }
    },
    socialStructure: {
      organizations: [
        { type: '魔法学院', description: '培养魔法师的学府' },
        { type: '魔法公会', description: '魔法师的组织' },
        { type: '王国', description: '世俗政权' },
        { type: '教会', description: '光明神的信徒组织' }
      ],
      hierarchy: '魔法等级决定地位'
    },
    specialElements: {
      resources: ['魔力水晶', '魔法草药', '魔兽材料', '魔法矿石'],
      items: ['法杖', '魔法书', '魔药', '魔法道具'],
      locations: ['魔法塔', '秘境', '魔兽森林', '遗迹'],
      concepts: ['魔力', '元素', '契约', '禁咒']
    },
    rules: {
      cultivation: '冥想积累魔力，学习魔法知识',
      combat: '魔法对轰，战术配合',
      advancement: '魔力积累和魔法理解并重'
    }
  },

  // 科幻体系
  'scifi': {
    id: 'scifi',
    name: '星际科幻体系',
    description: '未来星际时代世界观，包含科技等级和星际文明',
    category: '科幻',
    powerSystem: {
      name: '科技等级',
      levels: [
        { name: '行星文明', description: '能够利用母星能源', tech: '一级文明' },
        { name: '恒星文明', description: '能够利用恒星能源', tech: '二级文明' },
        { name: '星系文明', description: '能够利用星系能源', tech: '三级文明' },
        { name: '宇宙文明', description: '能够进行星际旅行', tech: '四级文明' },
        { name: '维度文明', description: '能够跨越维度', tech: '五级文明' }
      ],
      breakthrough: {
        requirements: ['科技突破', '资源积累', '文明进化', 'AI辅助'],
        risks: ['科技灾难', 'AI叛变', '文明战争']
      }
    },
    socialStructure: {
      organizations: [
        { type: '星际联邦', description: '多个星系的联合政府' },
        { type: '星际公司', description: '跨星系商业组织' },
        { type: 'AI联盟', description: '人工智能组织' },
        { type: '反抗军', description: '反抗统治的组织' }
      ],
      hierarchy: '科技实力决定地位'
    },
    specialElements: {
      resources: ['能源矿', '稀有金属', '反物质', '暗物质'],
      items: ['星舰', '机甲', 'AI', '基因药剂'],
      locations: ['空间站', '殖民星球', '虫洞', '黑洞'],
      concepts: ['跃迁', '时间膨胀', '平行宇宙', '量子纠缠']
    },
    rules: {
      cultivation: '科技研发和基因进化',
      combat: '星舰战斗和机甲对决',
      advancement: '科技突破和文明升级'
    }
  },

  // 武侠体系
  'wuxia': {
    id: 'wuxia',
    name: '武侠体系',
    description: '传统武侠世界观，包含江湖门派和武功体系',
    category: '武侠',
    powerSystem: {
      name: '武功境界',
      levels: [
        { name: '初窥门径', description: '刚入门的武者', internal: '微弱' },
        { name: '略有小成', description: '掌握基本武功', internal: '初成' },
        { name: '登堂入室', description: '武功有所成就', internal: '小成' },
        { name: '炉火纯青', description: '武功精熟', internal: '大成' },
        { name: '登峰造极', description: '武功大成', internal: '圆满' },
        { name: '返璞归真', description: '天人合一', internal: '化境' }
      ],
      breakthrough: {
        requirements: ['内功修炼', '武学领悟', '实战经验', '机缘'],
        risks: ['走火入魔', '内力反噬', '经脉受损']
      }
    },
    socialStructure: {
      organizations: [
        { type: '门派', description: '传承武学的组织' },
        { type: '世家', description: '武学世家' },
        { type: '帮会', description: '江湖帮派' },
        { type: '朝廷', description: '官方势力' }
      ],
      hierarchy: '武功高低决定江湖地位'
    },
    specialElements: {
      resources: ['灵药', '秘籍', '神兵', '丹药'],
      items: ['兵器', '暗器', '秘籍', '丹药'],
      locations: ['名山', '古刹', '秘境', '禁地'],
      concepts: ['内力', '经脉', '穴位', '轻功']
    },
    rules: {
      cultivation: '修炼内功，练习招式',
      combat: '招式对决，内力比拼',
      advancement: '武学领悟和内功积累'
    }
  },

  // 末世体系
  'postapocalypse': {
    id: 'postapocalypse',
    name: '末世体系',
    description: '灾难后的末世世界观，包含变异和生存体系',
    category: '末世',
    powerSystem: {
      name: '进化等级',
      levels: [
        { name: '普通人', description: '未进化的幸存者', ability: '无' },
        { name: '觉醒者', description: '开始觉醒能力', ability: '单一能力' },
        { name: '进化者', description: '能力显著增强', ability: '多能力' },
        { name: '高阶进化', description: '能力强大', ability: '领域' },
        { name: '终极进化', description: '接近完美生命', ability: '规则' }
      ],
      breakthrough: {
        requirements: ['变异源', '进化药剂', '生死战斗', '基因优化'],
        risks: ['变异失败', '理智丧失', '基因崩溃']
      }
    },
    socialStructure: {
      organizations: [
        { type: '幸存者营地', description: '小型幸存者聚集地' },
        { type: '基地', description: '大型防御设施' },
        { type: '掠夺者', description: '掠夺资源的暴徒' },
        { type: '变异者', description: '变异生物群体' }
      ],
      hierarchy: '实力和资源决定地位'
    },
    specialElements: {
      resources: ['食物', '水源', '药品', '武器', '能源'],
      items: ['武器', '防护装备', '进化药剂', '通讯设备'],
      locations: ['废墟城市', '军事基地', '地下避难所', '变异区域'],
      concepts: ['变异', '进化', '感染', '净化']
    },
    rules: {
      cultivation: '吸收变异能量，基因进化',
      combat: '能力对决，装备配合',
      advancement: '战斗进化或药剂辅助'
    }
  },

  // 都市异能体系
  'urban_ability': {
    id: 'urban_ability',
    name: '都市异能体系',
    description: '现代都市背景下的异能世界观',
    category: '都市异能',
    powerSystem: {
      name: '异能等级',
      levels: [
        { name: 'F级', description: '异能觉醒初期', power: '微弱' },
        { name: 'E级', description: '异能初步掌控', power: '弱' },
        { name: 'D级', description: '异能熟练运用', power: '中等' },
        { name: 'C级', description: '异能强大', power: '强' },
        { name: 'B级', description: '异能精深', power: '很强' },
        { name: 'A级', description: '异能巅峰', power: '极强' },
        { name: 'S级', description: '超越常理', power: '灾难级' }
      ],
      types: ['元素控制', '精神系', '强化系', '特殊系'],
      breakthrough: {
        requirements: ['异能修炼', '实战磨练', '精神突破', '资源辅助'],
        risks: ['异能暴走', '精神崩溃', '能力失控']
      }
    },
    socialStructure: {
      organizations: [
        { type: '异能局', description: '官方异能管理机构' },
        { type: '异能学院', description: '培养异能者' },
        { type: '异能家族', description: '血脉传承的异能世家' },
        { type: '地下组织', description: '非法异能组织' }
      ],
      hierarchy: '异能等级决定地位'
    },
    specialElements: {
      resources: ['异能晶石', '觉醒药剂', '修炼功法', '异能装备'],
      items: ['异能武器', '防护装备', '辅助道具', '通讯设备'],
      locations: ['异能学院', '秘境', '异能战场', '遗迹'],
      concepts: ['觉醒', '异能', '精神力', '领域']
    },
    rules: {
      cultivation: '冥想修炼，实战提升',
      combat: '异能对决，战术配合',
      advancement: '精神突破和异能进化'
    }
  }
}

/**
 * 获取所有世界观模板
 */
export function getAllWorldTemplates() {
  return Object.values(worldTemplates)
}

/**
 * 根据ID获取世界观模板
 * @param {string} id - 模板ID
 */
export function getWorldTemplateById(id) {
  return worldTemplates[id] || null
}

/**
 * 根据分类获取世界观模板
 * @param {string} category - 分类名称
 */
export function getWorldTemplatesByCategory(category) {
  return Object.values(worldTemplates).filter(t => t.category === category)
}

/**
 * 获取所有分类
 */
export function getWorldTemplateCategories() {
  const categories = new Set()
  Object.values(worldTemplates).forEach(t => categories.add(t.category))
  return Array.from(categories)
}

/**
 * 应用世界观模板到小说设定
 * @param {Object} template - 世界观模板
 * @param {Object} customSettings - 自定义设置（覆盖模板）
 */
export function applyWorldTemplate(template, customSettings = {}) {
  const base = {
    era: template.socialStructure?.organizations?.[0]?.type || '',
    location: '',
    powerSystem: template.powerSystem?.levels?.map(l => l.name).join('→') || '',
    socialStructure: template.socialStructure?.hierarchy || '',
    specialElements: Object.values(template.specialElements || {}).flat().join('、')
  }
  
  return { ...base, ...customSettings }
}

/**
 * 世界观模板管理组合式函数
 */
export function useWorldTemplates() {
  const templates = ref([])
  const customTemplates = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * 加载所有模板（包括自定义模板）
   */
  const loadTemplates = async () => {
    loading.value = true
    try {
      // 加载预设模板
      templates.value = getAllWorldTemplates()
      
      // 加载自定义模板（从数据库）
      // 这里假设有一个 worldTemplates 表
      // const custom = await db.worldTemplates.toArray()
      // customTemplates.value = custom
      
      return [...templates.value, ...customTemplates.value]
    } catch (err) {
      error.value = err.message
      console.error('加载世界观模板失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存自定义模板
   * @param {Object} template - 模板数据
   */
  const saveCustomTemplate = async (template) => {
    try {
      const newTemplate = {
        ...template,
        id: `custom_${Date.now()}`,
        isCustom: true,
        createdAt: new Date().toISOString()
      }
      
      // await db.worldTemplates.add(newTemplate)
      customTemplates.value.push(newTemplate)
      
      return newTemplate
    } catch (err) {
      error.value = err.message
      console.error('保存自定义模板失败:', err)
      return null
    }
  }

  /**
   * 删除自定义模板
   * @param {string} id - 模板ID
   */
  const deleteCustomTemplate = async (id) => {
    try {
      // await db.worldTemplates.delete(id)
      customTemplates.value = customTemplates.value.filter(t => t.id !== id)
      return true
    } catch (err) {
      error.value = err.message
      console.error('删除自定义模板失败:', err)
      return false
    }
  }

  return {
    templates,
    customTemplates,
    loading,
    error,
    loadTemplates,
    saveCustomTemplate,
    deleteCustomTemplate,
    getAllWorldTemplates,
    getWorldTemplateById,
    getWorldTemplatesByCategory,
    getWorldTemplateCategories,
    applyWorldTemplate
  }
}
