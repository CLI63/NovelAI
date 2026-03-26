/**
 * 字数补偿机制 - 内容扩写工具
 * 用于检测和补偿章节字数不足的问题
 */

import { ref } from 'vue'
import { buildContentExpansionPrompt, buildParagraphExpansionPrompt } from '@/utils/prompts'
import { callAI } from '@/utils/api'

/**
 * 默认配置
 */
export const defaultExpanderConfig = {
  enabled: true,                    // 是否启用字数补偿
  threshold: 0.8,                   // 触发补偿的阈值（目标字数的百分比）
  maxExpandAttempts: 2,             // 最大扩写尝试次数
  expansionStrategy: 'paragraph',   // 扩写策略: 'paragraph' | 'whole'
  minParagraphLength: 100,          // 最小段落长度（用于识别可扩写段落）
}

/**
 * 字数检测结果
 * @typedef {Object} WordCountResult
 * @property {number} currentWords - 当前字数
 * @property {number} targetWords - 目标字数
 * @property {number} deficit - 字数差额
 * @property {number} ratio - 完成比例
 * @property {boolean} needsExpansion - 是否需要扩写
 * @property {Array<{index: number, content: string, length: number}>} paragraphs - 段落信息
 */

/**
 * 检测内容字数并分析
 * @param {string} content - 章节内容
 * @param {number} targetWords - 目标字数
 * @param {number} [minWords] - 最小字数（可选，默认为 targetWords * 0.8）
 * @returns {WordCountResult} 检测结果
 */
export function checkWordCount(content, targetWords, minWords) {
  // 移除空白字符计算实际字数
  const currentWords = countWords(content)
  const effectiveMinWords = minWords || Math.floor(targetWords * defaultExpanderConfig.threshold)
  const deficit = Math.max(0, effectiveMinWords - currentWords)
  const ratio = currentWords / targetWords

  // 段落分析
  const paragraphs = analyzeParagraphs(content)

  return {
    currentWords,
    targetWords,
    minWords: effectiveMinWords,
    deficit,
    ratio,
    needsExpansion: currentWords < effectiveMinWords,
    paragraphs
  }
}

/**
 * 计算字数（中文按字符计算，英文按单词计算）
 * @param {string} content - 内容
 * @returns {number} 字数
 */
export function countWords(content) {
  if (!content) return 0

  // 移除 Markdown 标记和空白
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`[^`]+`/g, '')        // 移除行内代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 保留链接文本
    .replace(/[#*_~>`|-]/g, '')     // 移除 Markdown 符号
    .replace(/\s+/g, '')            // 移除空白

  // 计算中文字符
  const chineseChars = (cleanContent.match(/[\u4e00-\u9fa5]/g) || []).length

  // 计算英文单词（剩余的非中文字符按单词计算）
  const remainingText = cleanContent.replace(/[\u4e00-\u9fa5]/g, ' ')
  const englishWords = (remainingText.match(/[a-zA-Z]+/g) || []).length

  return chineseChars + englishWords
}

/**
 * 分析段落
 * @param {string} content - 内容
 * @returns {Array<{index: number, content: string, length: number, canExpand: boolean}>}
 */
export function analyzeParagraphs(content) {
  if (!content) return []

  // 按换行分割段落
  const rawParagraphs = content.split(/\n\s*\n/)

  return rawParagraphs
    .map((p, index) => {
      const trimmed = p.trim()
      const length = countWords(trimmed)
      return {
        index,
        content: trimmed,
        length,
        canExpand: length >= defaultExpanderConfig.minParagraphLength && trimmed.length > 0
      }
    })
    .filter(p => p.length > 0)
}

/**
 * 选择适合扩写的段落
 * @param {Array} paragraphs - 段落数组
 * @param {number} deficit - 字数差额
 * @returns {Array} 选中的段落索引
 */
export function selectParagraphsForExpansion(paragraphs, deficit) {
  // 按长度排序，优先选择较短的段落进行扩写（有更多扩写空间）
  const expandable = paragraphs
    .filter(p => p.canExpand)
    .sort((a, b) => a.length - b.length)

  // 根据差额决定选择多少段落
  const avgExpansionPerParagraph = 300 // 每个段落预计可扩写字数
  const neededParagraphs = Math.ceil(deficit / avgExpansionPerParagraph)

  return expandable.slice(0, neededParagraphs).map(p => p.index)
}

/**
 * 执行内容扩写
 * @param {Object} novel - 小说信息
 * @param {Object} chapter - 章节信息
 * @param {number} targetWords - 目标字数
 * @param {Object} aiConfig - AI 配置 { provider, apiKey, model }
 * @param {Object} [options] - 可选配置
 * @returns {Promise<{success: boolean, content: string, expandedWords: number}>}
 */
export async function expandContent(novel, chapter, targetWords, aiConfig, options = {}) {
  const config = { ...defaultExpanderConfig, ...options }

  if (!config.enabled) {
    return { success: false, content: chapter.content, expandedWords: 0, reason: 'disabled' }
  }

  // 检测字数
  const checkResult = checkWordCount(chapter.content, targetWords)
  if (!checkResult.needsExpansion) {
    return {
      success: true,
      content: chapter.content,
      expandedWords: 0,
      reason: 'already_sufficient'
    }
  }

  // 根据策略选择扩写方式
  if (config.expansionStrategy === 'whole') {
    return await expandWholeChapter(novel, chapter, checkResult, aiConfig, config)
  } else {
    return await expandByParagraphs(novel, chapter, checkResult, aiConfig, config)
  }
}

/**
 * 整章扩写策略
 * @param {Object} novel - 小说信息
 * @param {Object} chapter - 章节信息
 * @param {WordCountResult} checkResult - 检测结果
 * @param {Object} aiConfig - AI 配置
 * @param {Object} config - 配置
 */
async function expandWholeChapter(novel, chapter, checkResult, aiConfig, config) {
  try {
    const messages = buildContentExpansionPrompt(
      novel,
      chapter,
      checkResult.targetWords,
      checkResult.currentWords
    )

    const response = await callAI(messages, aiConfig.provider, aiConfig.apiKey, aiConfig.model)

    // 解析响应 - 使用非贪婪匹配避免多个JSON对象时出错
    const jsonMatch = response.match(/\{[\s\S]*?\}(?=\s*$|\s*```)/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      const newWordCount = countWords(result.content)

      return {
        success: newWordCount >= checkResult.minWords,
        content: result.content,
        expandedWords: newWordCount - checkResult.currentWords,
        newWordCount,
        reason: 'expanded'
      }
    }

    // 如果不是 JSON，直接使用返回的内容
    const newContent = response.trim()
    const newWordCount = countWords(newContent)

    return {
      success: newWordCount >= checkResult.minWords,
      content: newContent,
      expandedWords: newWordCount - checkResult.currentWords,
      newWordCount,
      reason: 'expanded'
    }
  } catch (error) {
    console.error('整章扩写失败:', error)
    return {
      success: false,
      content: chapter.content,
      expandedWords: 0,
      reason: 'error',
      error: error.message
    }
  }
}

/**
 * 段落扩写策略
 * @param {Object} novel - 小说信息
 * @param {Object} chapter - 章节信息
 * @param {WordCountResult} checkResult - 检测结果
 * @param {Object} aiConfig - AI 配置
 * @param {Object} config - 配置
 */
async function expandByParagraphs(novel, chapter, checkResult, aiConfig, config) {
  const paragraphs = checkResult.paragraphs
  const selectedIndices = selectParagraphsForExpansion(paragraphs, checkResult.deficit)

  if (selectedIndices.length === 0) {
    // 没有合适的段落，回退到整章扩写
    return await expandWholeChapter(novel, chapter, checkResult, aiConfig, config)
  }

  let expandedContent = chapter.content
  let totalExpanded = 0
  let attempts = 0

  for (const index of selectedIndices) {
    if (attempts >= config.maxExpandAttempts) break
    if (totalExpanded >= checkResult.deficit) break

    const paragraph = paragraphs.find(p => p.index === index)
    if (!paragraph) continue

    try {
      const messages = buildParagraphExpansionPrompt(
        novel,
        chapter,
        paragraph.content,
        checkResult.deficit - totalExpanded
      )

      const response = await callAI(messages, aiConfig.provider, aiConfig.apiKey, aiConfig.model)

      // 解析响应 - 使用非贪婪匹配避免多个JSON对象时出错
      const jsonMatch = response.match(/\{[\s\S]*?\}(?=\s*$|\s*```)/)
      let expandedParagraph

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        expandedParagraph = result.content
      } else {
        expandedParagraph = response.trim()
      }

      // 替换段落
      const paragraphList = expandedContent.split(/\n\s*\n/)
      if (paragraphList[index]) {
        const originalLength = countWords(paragraphList[index])
        paragraphList[index] = expandedParagraph
        expandedContent = paragraphList.join('\n\n')

        const expandedLength = countWords(expandedParagraph)
        totalExpanded += (expandedLength - originalLength)
      }

      attempts++
    } catch (error) {
      console.error(`段落 ${index} 扩写失败:`, error)
      // 继续尝试下一个段落
    }
  }

  const finalWordCount = countWords(expandedContent)

  return {
    success: finalWordCount >= checkResult.minWords,
    content: expandedContent,
    expandedWords: totalExpanded,
    newWordCount: finalWordCount,
    reason: totalExpanded > 0 ? 'expanded' : 'no_expansion'
  }
}

/**
 * 检查并在需要时执行扩写
 * @param {Object} novel - 小说信息
 * @param {Object} chapter - 章节信息
 * @param {number} targetWords - 目标字数
 * @param {Object} aiConfig - AI 配置
 * @param {Object} [options] - 可选配置
 * @returns {Promise<{needsExpansion: boolean, result: Object}>}
 */
export async function checkAndExpand(novel, chapter, targetWords, aiConfig, options = {}) {
  const config = { ...defaultExpanderConfig, ...options }

  // 检测字数
  const checkResult = checkWordCount(chapter.content, targetWords)

  if (!checkResult.needsExpansion) {
    return {
      needsExpansion: false,
      result: {
        success: true,
        content: chapter.content,
        wordCount: checkResult.currentWords,
        reason: 'sufficient'
      }
    }
  }

  // 执行扩写
  const expandResult = await expandContent(novel, chapter, targetWords, aiConfig, config)

  return {
    needsExpansion: true,
    result: expandResult
  }
}

/**
 * 获取扩写配置
 * @param {Object} userSettings - 用户设置
 * @returns {Object} 合并后的配置
 */
export function getExpanderConfig(userSettings = {}) {
  return {
    ...defaultExpanderConfig,
    enabled: userSettings.wordCountCompensation ?? defaultExpanderConfig.enabled,
    threshold: userSettings.compensationThreshold ?? defaultExpanderConfig.threshold,
    maxExpandAttempts: userSettings.maxExpandAttempts ?? defaultExpanderConfig.maxExpandAttempts,
    expansionStrategy: userSettings.expansionStrategy ?? defaultExpanderConfig.expansionStrategy,
  }
}

/**
 * 内容扩写组合式函数
 * 提供响应式的扩写功能
 */
export function useContentExpander() {
  const expanding = ref(false)
  const lastResult = ref(null)

  /**
   * 执行扩写
   */
  const expand = async (novel, chapter, targetWords, aiConfig, options = {}) => {
    expanding.value = true
    try {
      const result = await checkAndExpand(novel, chapter, targetWords, aiConfig, options)
      lastResult.value = result
      return result
    } finally {
      expanding.value = false
    }
  }

  /**
   * 快速检测
   */
  const quickCheck = (content, targetWords) => {
    return checkWordCount(content, targetWords)
  }

  return {
    expanding,
    lastResult,
    expand,
    quickCheck,
    checkWordCount,
    countWords,
    getExpanderConfig,
    defaultExpanderConfig
  }
}
