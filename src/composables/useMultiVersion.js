import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'

/**
 * 多版本生成对比组合式函数
 * 支持同一章节生成多个版本进行对比选择
 */
export function useMultiVersion() {
  const versions = ref([])
  const generating = ref(false)
  const currentGeneratingIndex = ref(-1)
  const selectedVersion = ref(null)
  const comparisonMode = ref('sideBySide') // sideBySide, tabView, diff

  /**
   * 生成多个版本
   * @param {number} count - 版本数量（2-3）
   * @param {Function} generateFn - 生成函数
   * @param {Object} params - 生成参数
   */
  const generateMultipleVersions = async (count, generateFn, params) => {
    if (count < 2 || count > 3) {
      message.warning('版本数量必须是2-3个')
      return []
    }

    generating.value = true
    versions.value = []
    selectedVersion.value = null

    const results = []

    for (let i = 0; i < count; i++) {
      currentGeneratingIndex.value = i
      
      try {
        // 为每个版本添加不同的随机种子或风格微调
        const versionParams = {
          ...params,
          versionIndex: i,
          versionHint: getVersionHint(i)
        }

        const result = await generateFn(versionParams)
        
        const version = {
          id: `v${i + 1}`,
          index: i,
          label: `版本 ${String.fromCharCode(65 + i)}`, // A, B, C
          content: result.content,
          title: result.title,
          wordCount: result.content?.length || 0,
          summary: result.summary || '',
          generatedAt: new Date().toISOString(),
          selected: false
        }

        versions.value.push(version)
        results.push(version)
      } catch (err) {
        console.error(`版本 ${i + 1} 生成失败:`, err)
        message.error(`版本 ${i + 1} 生成失败`)
      }
    }

    generating.value = false
    currentGeneratingIndex.value = -1

    return results
  }

  /**
   * 获取版本提示（用于区分不同版本）
   * @param {number} index - 版本索引
   */
  const getVersionHint = (index) => {
    const hints = [
      '注重情节推进，节奏明快',
      '注重细节描写，氛围感强',
      '注重人物刻画，对话丰富'
    ]
    return hints[index] || ''
  }

  /**
   * 选择版本
   * @param {string} versionId - 版本ID
   */
  const selectVersion = (versionId) => {
    versions.value.forEach(v => {
      v.selected = v.id === versionId
    })
    selectedVersion.value = versions.value.find(v => v.id === versionId)
    return selectedVersion.value
  }

  /**
   * 合并多个版本
   * @param {Array} versionIds - 要合并的版本ID列表
   * @param {Object} mergeConfig - 合并配置
   */
  const mergeVersions = (versionIds, mergeConfig = {}) => {
    const toMerge = versions.value.filter(v => versionIds.includes(v.id))
    
    if (toMerge.length < 2) {
      message.warning('至少需要选择2个版本进行合并')
      return null
    }

    // 简单的合并策略：按段落交替或按配置合并
    const mergedContent = mergeConfig.strategy === 'alternate'
      ? mergeAlternately(toMerge, mergeConfig)
      : mergeSequentially(toMerge, mergeConfig)

    const mergedVersion = {
      id: `merged_${Date.now()}`,
      label: '合并版本',
      content: mergedContent,
      wordCount: mergedContent.length,
      mergedFrom: versionIds,
      mergedAt: new Date().toISOString(),
      selected: true
    }

    versions.value.push(mergedVersion)
    selectedVersion.value = mergedVersion

    return mergedVersion
  }

  /**
   * 交替合并
   */
  const mergeAlternately = (versions, config) => {
    const paragraphsList = versions.map(v => v.content.split('\n\n'))
    const maxParagraphs = Math.max(...paragraphsList.map(p => p.length))
    const result = []

    for (let i = 0; i < maxParagraphs; i++) {
      // 从每个版本取对应段落
      for (let j = 0; j < paragraphsList.length; j++) {
        if (paragraphsList[j][i]) {
          result.push(paragraphsList[j][i])
        }
      }
    }

    return result.join('\n\n')
  }

  /**
   * 顺序合并
   */
  const mergeSequentially = (versions, config) => {
    // 按配置的段落范围从不同版本取内容
    const result = []
    
    if (config.sections) {
      config.sections.forEach(section => {
        const version = versions.find(v => v.id === section.versionId)
        if (version) {
          const paragraphs = version.content.split('\n\n')
          const selected = paragraphs.slice(section.start, section.end)
          result.push(...selected)
        }
      })
    } else {
      // 默认：取第一个版本的前半部分和最后一个版本的后半部分
      const first = versions[0].content.split('\n\n')
      const last = versions[versions.length - 1].content.split('\n\n')
      const mid = Math.floor(first.length / 2)
      
      result.push(...first.slice(0, mid))
      result.push(...last.slice(mid))
    }

    return result.join('\n\n')
  }

  /**
   * 删除版本
   * @param {string} versionId - 版本ID
   */
  const deleteVersion = (versionId) => {
    const index = versions.value.findIndex(v => v.id === versionId)
    if (index > -1) {
      versions.value.splice(index, 1)
      if (selectedVersion.value?.id === versionId) {
        selectedVersion.value = null
      }
    }
  }

  /**
   * 清空所有版本
   */
  const clearVersions = () => {
    versions.value = []
    selectedVersion.value = null
  }

  /**
   * 获取版本对比数据
   */
  const comparisonData = computed(() => {
    if (versions.value.length < 2) return null

    return {
      wordCounts: versions.value.map(v => ({
        label: v.label,
        value: v.wordCount
      })),
      summaries: versions.value.map(v => ({
        label: v.label,
        summary: v.summary || '暂无摘要'
      })),
      selectedId: selectedVersion.value?.id
    }
  })

  /**
   * 导出选中的版本
   */
  const exportSelected = () => {
    if (!selectedVersion.value) {
      message.warning('请先选择一个版本')
      return null
    }

    return {
      content: selectedVersion.value.content,
      title: selectedVersion.value.title,
      wordCount: selectedVersion.value.wordCount,
      summary: selectedVersion.value.summary
    }
  }

  return {
    versions,
    generating,
    currentGeneratingIndex,
    selectedVersion,
    comparisonMode,
    comparisonData,
    generateMultipleVersions,
    selectVersion,
    mergeVersions,
    deleteVersion,
    clearVersions,
    exportSelected
  }
}

/**
 * 构建多版本生成提示词
 * @param {Object} baseParams - 基础参数
 * @param {number} versionIndex - 版本索引
 * @param {string} versionHint - 版本提示
 */
export function buildMultiVersionPrompt(baseParams, versionIndex, versionHint) {
  const { novel, chapterNumber, minWords, maxWords } = baseParams
  
  const styleVariations = [
    '注重情节推进，节奏明快，多使用动作描写',
    '注重细节描写，氛围感强，多使用环境描写',
    '注重人物刻画，对话丰富，多使用心理描写'
  ]

  return {
    ...baseParams,
    additionalInstructions: `
【本版本特色】
${styleVariations[versionIndex] || ''}

${versionHint ? `特别提示：${versionHint}` : ''}
    `.trim()
  }
}
