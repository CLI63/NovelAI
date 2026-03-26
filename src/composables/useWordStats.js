import { ref } from 'vue'
import { novelDao, chapterDao } from '../utils/dao'

/**
 * 字数统计组合式函数
 * 提供多维度字数统计功能
 */
export function useWordStats() {
  const stats = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * 统计单章节数据
   * @param {Object} chapter - 章节对象
   */
  const analyzeChapter = (chapter) => {
    if (!chapter || !chapter.content) {
      return null
    }

    const content = chapter.content
    const result = {
      chapterId: chapter.id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      // 基础统计
      totalChars: content.length,
      chineseChars: (content.match(/[\u4e00-\u9fa5]/g) || []).length,
      englishChars: (content.match(/[a-zA-Z]/g) || []).length,
      numbers: (content.match(/[0-9]/g) || []).length,
      punctuation: (content.match(/[，。！？、；：""''（）【】《》…—]/g) || []).length,
      spaces: (content.match(/\s/g) || []).length,

      // 段落统计
      paragraphs: content.split(/\n+/).filter(p => p.trim()).length,

      // 句子统计
      sentences: content.split(/[。！？\n]/).filter(s => s.trim()).length,

      // 对话统计
      dialogues: Math.round((content.match(/[""「」『』]/g) || []).length / 2),
      dialogueSentences: (content.match(/[""「」『』][^""「」『』]*[""「」『』]/g) || []).length,

      // 估算阅读时间（按每分钟300字计算）
      readingTime: Math.ceil(content.length / 300)
    }

    // 计算字数（中文字符 + 英文单词数）
    const englishWords = (content.match(/[a-zA-Z]+/g) || []).length
    result.wordCount = result.chineseChars + englishWords

    // 平均句长
    result.avgSentenceLength = result.sentences > 0
      ? Math.round(result.totalChars / result.sentences)
      : 0

    // 平均段落长度
    result.avgParagraphLength = result.paragraphs > 0
      ? Math.round(result.totalChars / result.paragraphs)
      : 0

    return result
  }

  /**
   * 统计小说整体数据
   * @param {string} novelId - 小说ID
   */
  const analyzeNovel = async (novelId) => {
    if (!novelId) {
      error.value = '小说ID不能为空'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const novel = await novelDao.getById(novelId)
      if (!novel) {
        throw new Error('小说不存在')
      }

      const chapters = await chapterDao.getByNovelId(novelId)

      // 基础统计
      const novelStats = {
        novelId,
        title: novel.title,
        style: novel.style,
        estimatedWords: novel.estimatedWords,

        // 章节统计
        chapterStats: {
          total: chapters.length,
          generated: chapters.filter(c => c.content).length,
          pending: chapters.filter(c => !c.content).length
        },

        // 字数统计
        wordStats: {
          totalChars: 0,
          totalWords: 0,
          chineseChars: 0,
          englishWords: 0
        },

        // 段落统计
        paragraphStats: {
          total: 0,
          avgLength: 0
        },

        // 句子统计
        sentenceStats: {
          total: 0,
          avgLength: 0
        },

        // 对话统计
        dialogueStats: {
          total: 0,
          sentences: 0
        },

        // 阅读时间
        totalReadingTime: 0,

        // 章节详情
        chapterDetails: [],

        // 字数分布
        distribution: {
          byChapter: [],
          byVolume: []
        },

        // 趋势数据（如果章节足够多）
        trends: null
      }

      // 分析每个章节
      const chapterAnalysisResults = []
      chapters.forEach(chapter => {
        if (chapter.content) {
          const analysis = analyzeChapter(chapter)
          if (analysis) {
            chapterAnalysisResults.push(analysis)
            novelStats.wordStats.totalChars += analysis.totalChars
            novelStats.wordStats.totalWords += analysis.wordCount
            novelStats.wordStats.chineseChars += analysis.chineseChars
            novelStats.wordStats.englishWords += (analysis.wordCount - analysis.chineseChars)
            novelStats.paragraphStats.total += analysis.paragraphs
            novelStats.sentenceStats.total += analysis.sentences
            novelStats.dialogueStats.total += analysis.dialogues
            novelStats.dialogueStats.sentences += analysis.dialogueSentences
            novelStats.totalReadingTime += analysis.readingTime
          }
        }
      })

      // 计算平均值
      if (chapterAnalysisResults.length > 0) {
        novelStats.paragraphStats.avgLength = Math.round(
          novelStats.wordStats.totalChars / novelStats.paragraphStats.total
        )
        novelStats.sentenceStats.avgLength = Math.round(
          novelStats.wordStats.totalChars / novelStats.sentenceStats.total
        )
        novelStats.wordStats.avgPerChapter = Math.round(
          novelStats.wordStats.totalWords / chapterAnalysisResults.length
        )
      }

      // 章节详情
      novelStats.chapterDetails = chapterAnalysisResults

      // 字数分布（按章节）
      novelStats.distribution.byChapter = chapterAnalysisResults.map(c => ({
        chapterNumber: c.chapterNumber,
        title: c.title,
        wordCount: c.wordCount
      }))

      // 按卷分布（如果有卷信息）
      if (novel.outline && novel.outline.length > 0) {
        let currentChapter = 0
        novel.outline.forEach((volume, volumeIndex) => {
          const volumeChapters = chapterAnalysisResults.filter(
            c => c.chapterNumber > currentChapter && c.chapterNumber <= currentChapter + volume.chapters
          )
          novelStats.distribution.byVolume.push({
            volumeName: volume.volume,
            volumeIndex,
            chapterCount: volumeChapters.length,
            totalWords: volumeChapters.reduce((sum, c) => sum + c.wordCount, 0),
            avgWords: volumeChapters.length > 0
              ? Math.round(volumeChapters.reduce((sum, c) => sum + c.wordCount, 0) / volumeChapters.length)
              : 0
          })
          currentChapter += volume.chapters
        })
      }

      // 趋势分析（至少3章）
      if (chapterAnalysisResults.length >= 3) {
        novelStats.trends = analyzeTrends(chapterAnalysisResults)
      }

      // 与预期对比
      if (novel.estimatedWords) {
        const estimated = parseEstimatedWords(novel.estimatedWords)
        novelStats.comparison = {
          estimated,
          actual: novelStats.wordStats.totalWords,
          percentage: estimated > 0
            ? Math.round((novelStats.wordStats.totalWords / estimated) * 100)
            : null,
          remaining: estimated > 0
            ? Math.max(0, estimated - novelStats.wordStats.totalWords)
            : null
        }
      }

      stats.value = novelStats
      return novelStats
    } catch (err) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 解析预期字数字符串
   * @param {string} estimatedStr - 预期字数字符串，如 "100万字"
   */
  const parseEstimatedWords = (estimatedStr) => {
    if (!estimatedStr) return 0

    const match = estimatedStr.match(/(\d+(?:\.\d+)?)\s*([万亿])?字?/)
    if (!match) return 0

    const num = parseFloat(match[1])
    const unit = match[2]

    if (unit === '万') return num * 10000
    if (unit === '亿') return num * 100000000
    return num
  }

  /**
   * 分析趋势
   * @param {Array} chapterResults - 章节分析结果
   */
  const analyzeTrends = (chapterResults) => {
    if (chapterResults.length < 3) return null

    const wordCounts = chapterResults.map(c => c.wordCount)
    const avgWordCount = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length

    // 计算趋势方向
    const firstHalf = wordCounts.slice(0, Math.floor(wordCounts.length / 2))
    const secondHalf = wordCounts.slice(Math.floor(wordCounts.length / 2))
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    let trend = 'stable'
    if (secondAvg > firstAvg * 1.1) trend = 'increasing'
    else if (secondAvg < firstAvg * 0.9) trend = 'decreasing'

    // 找出最长和最短的章节
    const sorted = [...chapterResults].sort((a, b) => b.wordCount - a.wordCount)
    const longestChapter = sorted[0]
    const shortestChapter = sorted[sorted.length - 1]

    // 字数波动
    const variance = wordCounts.reduce((sum, wc) => sum + Math.pow(wc - avgWordCount, 2), 0) / wordCounts.length
    const stdDev = Math.sqrt(variance)
    const coefficient = avgWordCount > 0 ? stdDev / avgWordCount : 0

    return {
      trend,
      averageWordCount: Math.round(avgWordCount),
      longestChapter: {
        chapterNumber: longestChapter.chapterNumber,
        title: longestChapter.title,
        wordCount: longestChapter.wordCount
      },
      shortestChapter: {
        chapterNumber: shortestChapter.chapterNumber,
        title: shortestChapter.title,
        wordCount: shortestChapter.wordCount
      },
      standardDeviation: Math.round(stdDev),
      coefficientOfVariation: Math.round(coefficient * 100),
      isConsistent: coefficient < 0.3 // 变异系数小于30%认为字数较稳定
    }
  }

  /**
   * 快速统计内容
   * @param {string} content - 内容
   */
  const quickStats = (content) => {
    if (!content) {
      return {
        totalChars: 0,
        wordCount: 0,
        paragraphs: 0,
        sentences: 0
      }
    }

    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (content.match(/[a-zA-Z]+/g) || []).length
    const paragraphs = content.split(/\n+/).filter(p => p.trim()).length
    const sentences = content.split(/[。！？\n]/).filter(s => s.trim()).length

    return {
      totalChars: content.length,
      chineseChars,
      englishWords,
      wordCount: chineseChars + englishWords,
      paragraphs,
      sentences,
      readingTime: Math.ceil(content.length / 300)
    }
  }

  /**
   * 生成统计报告
   * @param {Object} novelStats - 小说统计数据
   */
  const generateReport = (novelStats) => {
    if (!novelStats) return null

    const report = {
      title: `《${novelStats.title}》字数统计报告`,
      generatedAt: new Date().toLocaleString('zh-CN'),
      summary: `共${novelStats.chapterStats.generated}章，总字数${formatNumber(novelStats.wordStats.totalWords)}字。`,
      details: []
    }

    // 章节情况
    report.details.push({
      category: '章节统计',
      items: [
        { label: '总章节数', value: `${novelStats.chapterStats.total}章` },
        { label: '已生成', value: `${novelStats.chapterStats.generated}章` },
        { label: '待生成', value: `${novelStats.chapterStats.pending}章` }
      ]
    })

    // 字数情况
    report.details.push({
      category: '字数统计',
      items: [
        { label: '总字数', value: `${formatNumber(novelStats.wordStats.totalWords)}字` },
        { label: '中文字符', value: `${formatNumber(novelStats.wordStats.chineseChars)}字` },
        { label: '英文单词', value: `${formatNumber(novelStats.wordStats.englishWords)}词` },
        { label: '平均每章', value: `${formatNumber(novelStats.wordStats.avgPerChapter || 0)}字` }
      ]
    })

    // 阅读时间
    const hours = Math.floor(novelStats.totalReadingTime / 60)
    const minutes = novelStats.totalReadingTime % 60
    report.details.push({
      category: '阅读时间',
      items: [
        { label: '预估阅读', value: hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟` }
      ]
    })

    // 预期对比
    if (novelStats.comparison) {
      report.details.push({
        category: '预期对比',
        items: [
          { label: '预期字数', value: `${formatNumber(novelStats.comparison.estimated)}字` },
          { label: '已完成', value: `${novelStats.comparison.percentage}%` },
          { label: '剩余', value: `${formatNumber(novelStats.comparison.remaining)}字` }
        ]
      })
    }

    // 趋势分析
    if (novelStats.trends) {
      const trendText = {
        increasing: '字数呈上升趋势',
        decreasing: '字数呈下降趋势',
        stable: '字数较为稳定'
      }
      report.details.push({
        category: '趋势分析',
        items: [
          { label: '整体趋势', value: trendText[novelStats.trends.trend] },
          { label: '最长章节', value: `第${novelStats.trends.longestChapter.chapterNumber}章（${formatNumber(novelStats.trends.longestChapter.wordCount)}字）` },
          { label: '最短章节', value: `第${novelStats.trends.shortestChapter.chapterNumber}章（${formatNumber(novelStats.trends.shortestChapter.wordCount)}字）` },
          { label: '字数稳定性', value: novelStats.trends.isConsistent ? '较稳定' : '波动较大' }
        ]
      })
    }

    return report
  }

  /**
   * 格式化数字
   * @param {number} num - 数字
   */
  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toLocaleString('zh-CN')
  }

  /**
   * 清除统计数据
   */
  const clearStats = () => {
    stats.value = null
    error.value = null
  }

  return {
    stats,
    loading,
    error,
    analyzeChapter,
    analyzeNovel,
    quickStats,
    generateReport,
    clearStats
  }
}

export default useWordStats
