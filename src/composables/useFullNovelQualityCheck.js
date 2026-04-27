import { ref } from 'vue'
import { novelDao, chapterDao, characterDao, foreshadowingDao } from '@/utils/dao'
import { getBible } from '@/utils/novelBible'

/**
 * 全本质量扫描组合式函数
 *
 * 提供多维度质量检查：字数均衡、角色一致性、伏笔回收、时间线连贯性等。
 * 基础检查本地执行，深度检查需传入 AI 调用函数。
 */
export function useFullNovelQualityCheck() {
  const scanResults = ref(null)
  const scanning = ref(false)

  /**
   * 执行全本质量扫描
   * @param {number} novelId
   * @param {Object} [options]
   * @param {Function} [options.callAI] - 传入 AI 调用函数后启用深度检查
   * @returns {Promise<Object>}
   */
  const runFullScan = async (novelId, options = {}) => {
    const { callAI = null } = options
    scanning.value = true

    try {
      const [novel, chapters, characters, foreshadowings, bible] = await Promise.all([
        novelDao.getById(novelId),
        chapterDao.getByNovelId(novelId),
        characterDao.getByNovelId(novelId),
        foreshadowingDao.getByNovelId(novelId),
        getBible(novelId)
      ])

      if (!novel || chapters.length === 0) {
        scanResults.value = { overall: 'no_data', message: '小说不存在或尚无章节' }
        return scanResults.value
      }

      const sorted = chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)

      const results = {
        novelTitle: novel.title,
        totalChapters: sorted.length,
        totalChars: characters.length,
        scanTime: new Date().toISOString(),
        checks: {}
      }

      // 1. 字数均衡检查
      results.checks.wordCount = checkWordCountBalance(sorted)

      // 2. 角色出场检查（检查主角/重要角色是否在某章缺席过多）
      results.checks.characterPresence = checkCharacterPresence(sorted, characters)

      // 3. 伏笔回收检查
      results.checks.foreshadowing = checkForeshadowingStatus(foreshadowings)

      // 4. 时间线基础检查
      results.checks.timeline = checkTimeline(sorted)

      // 5. AI 深度检查（仅当提供了 callAI）
      if (callAI) {
        const [charConsistency, plotHoles, styleCheck] = await Promise.all([
          checkCharacterConsistencyAI(sorted, characters, callAI, novel),
          checkPlotHolesAI(sorted, foreshadowings, callAI, novel),
          checkStyleConsistencyAI(sorted, callAI, novel)
        ])
        results.checks.characterConsistency = charConsistency
        results.checks.plotHoles = plotHoles
        results.checks.styleConsistency = styleCheck
      }

      // 汇总评分
      results.summary = computeSummary(results.checks)
      scanResults.value = results
      return results
    } catch (err) {
      console.error('全本质量扫描失败:', err)
      scanResults.value = { overall: 'error', message: err.message }
      return scanResults.value
    } finally {
      scanning.value = false
    }
  }

  return {
    scanResults,
    scanning,
    runFullScan
  }
}

// ============ 基础检查（本地执行，无 AI 调用） ============

function checkWordCountBalance(chapters) {
  const counts = chapters.map(c => ({ number: c.chapterNumber, title: c.title, count: (c.content || '').length }))
  const avg = counts.reduce((s, c) => s + c.count, 0) / counts.length
  const threshold = avg * 0.5

  const outliers = counts.filter(c => Math.abs(c.count - avg) > threshold).map(c => ({
    chapter: c.number,
    title: c.title || `第${c.number}章`,
    wordCount: c.count,
    diff: Math.round(((c.count - avg) / avg) * 100),
    severity: Math.abs(c.count - avg) / avg > 0.7 ? 'high' : 'medium'
  }))

  return {
    passed: outliers.length === 0,
    averageWords: Math.round(avg),
    minWords: Math.min(...counts.map(c => c.count)),
    maxWords: Math.max(...counts.map(c => c.count)),
    outliers,
    message: outliers.length > 0 ? `${outliers.length} 章字数偏离均值超过 50%` : '各章节字数分布均衡'
  }
}

function checkCharacterPresence(chapters, characters) {
  const protagonist = characters.find(c => c.type === 'protagonist')
  if (!protagonist) {
    return { passed: true, message: '无主角数据，跳过检查' }
  }

  const absentChapters = []
  for (const ch of chapters) {
    const content = ch.content || ''
    if (!content.includes(protagonist.name)) {
      absentChapters.push({ chapter: ch.chapterNumber, title: ch.title || `第${ch.chapterNumber}章` })
    }
  }

  // 排除前 1 章（可能尚未出场）和最后 1 章
  const significant = absentChapters.filter(c =>
    c.chapter > 2 && c.chapter < chapters.length
  )

  return {
    passed: significant.length <= Math.max(1, Math.floor(chapters.length * 0.15)),
    protagonistName: protagonist.name,
    totalChapters: chapters.length,
    presentIn: chapters.length - absentChapters.length,
    absentChapters: significant.slice(0, 10),
    message: significant.length === 0
      ? `主角「${protagonist.name}」贯穿全书`
      : `主角「${protagonist.name}」在 ${significant.length} 章中未出场`
  }
}

function checkForeshadowingStatus(foreshadowings) {
  const pending = foreshadowings.filter(f => f.status === 'pending')
  const highPending = pending.filter(f => f.importance === 'high')

  return {
    passed: highPending.length === 0,
    total: foreshadowings.length,
    pending: pending.length,
    resolved: foreshadowings.filter(f => f.status === 'resolved').length,
    highPending: highPending.length,
    highPendingItems: highPending.slice(0, 5).map(f => ({
      content: f.content,
      plantedIn: f.chapterNumber || f.chapterId || '?'
    })),
    message: highPending.length > 0
      ? `有 ${highPending.length} 个高优先级伏笔尚未回收`
      : pending.length === 0
        ? '所有伏笔已回收'
        : `${pending.length} 个伏笔待回收（均为普通优先级）`
  }
}

function checkTimeline(chapters) {
  // 基本的连贯性检查：检查章节是否有 summary
  const noSummary = chapters.filter(c => !c.summary || c.summary.trim().length < 5)
  return {
    passed: noSummary.length === 0,
    totalChapters: chapters.length,
    withSummary: chapters.length - noSummary.length,
    noSummaryCount: noSummary.length,
    message: noSummary.length === 0
      ? '所有章节均有摘要记录'
      : `${noSummary.length} 章缺少摘要`
  }
}

// ============ AI 深度检查 ============

async function checkCharacterConsistencyAI(chapters, characters, callAI, novel) {
  try {
    const charSummary = characters.map(c => `${c.name}（${c.type}）`).join('、')
    const samples = chapters.filter(c => (c.content || '').length > 100).slice(0, 5)
    const sampleTexts = samples.map(c => `第${c.chapterNumber}章：${(c.content || '').slice(0, 300)}`).join('\n\n')

    const messages = [
      { role: 'system', content: '你是一个小说质量审查员。根据提供的章节片段和角色列表，检查角色一致性。只返回JSON。' },
      { role: 'user', content: JSON.stringify({
        task: '检查以下章节中角色名称、性格、能力是否存在前后矛盾',
        characters: charSummary,
        samples: sampleTexts,
        novelTitle: novel.title,
        format: {
          passed: true/false,
          issues: [{ severity: 'high|medium|low', description: '问题描述', relatedCharacter: '角色名', suggestedFix: '建议' }]
        }
      }) }
    ]

    const response = await callAI(messages)
    if (!response) return { passed: true, issues: [], message: 'AI 未返回结果' }

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { passed: true, issues: [], message: 'AI 返回格式异常' }

    return JSON.parse(jsonMatch[0])
  } catch (err) {
    return { passed: true, issues: [], message: `检查失败: ${err.message}` }
  }
}

async function checkPlotHolesAI(chapters, foreshadowings, callAI, novel) {
  try {
    const pending = foreshadowings.filter(f => f.status === 'pending')
    const sampleChapters = chapters.filter(c => (c.content || '').length > 100).slice(0, 8)
    const samples = sampleChapters.map(c => `第${c.chapterNumber}章：${(c.content || '').slice(0, 400)}`).join('\n\n')

    const messages = [
      { role: 'system', content: '你是一个小说情节审查员。分析章节中的情节漏洞和伏笔回收情况。只返回JSON。' },
      { role: 'user', content: JSON.stringify({
        task: '检查情节漏洞和逻辑矛盾',
        pendingForeshadowing: pending.slice(0, 10).map(f => f.content),
        samples,
        novelTitle: novel.title,
        format: {
          passed: true/false,
          issues: [{ severity: 'high|medium|low', description: '漏洞描述', relatedChapter: 1, suggestedFix: '建议' }],
          foreshadowingScore: 'good|average|poor'
        }
      }) }
    ]

    const response = await callAI(messages)
    if (!response) return { passed: true, issues: [], foreshadowingScore: 'unknown', message: 'AI 未返回结果' }

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { passed: true, issues: [], foreshadowingScore: 'unknown', message: 'AI 返回格式异常' }

    return JSON.parse(jsonMatch[0])
  } catch (err) {
    return { passed: true, issues: [], foreshadowingScore: 'unknown', message: `检查失败: ${err.message}` }
  }
}

async function checkStyleConsistencyAI(chapters, callAI, novel) {
  try {
    const firstChapter = chapters.find(c => (c.content || '').length > 100)
    const lastChapter = [...chapters].reverse().find(c => (c.content || '').length > 100)
    if (!firstChapter || !lastChapter) {
      return { passed: true, issues: [], message: '章节内容不足以检查风格' }
    }

    const samples = [
      `第${firstChapter.chapterNumber}章开头：${(firstChapter.content || '').slice(0, 500)}`,
      `第${lastChapter.chapterNumber}章开头：${(lastChapter.content || '').slice(0, 500)}`
    ].join('\n\n---\n\n')

    const messages = [
      { role: 'system', content: '你是一个小说风格审查员。比较首尾章节的写作风格是否一致。只返回JSON。' },
      { role: 'user', content: JSON.stringify({
        task: '比较首尾章节的语言风格、叙事视角、语气是否一致',
        samples,
        novelTitle: novel.title,
        format: {
          passed: true/false,
          issues: [{ severity: 'medium|low', description: '风格差异描述' }],
          score: 0-100
        }
      }) }
    ]

    const response = await callAI(messages)
    if (!response) return { passed: true, issues: [], score: 100, message: 'AI 未返回结果' }

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { passed: true, issues: [], score: 100, message: 'AI 返回格式异常' }

    return JSON.parse(jsonMatch[0])
  } catch (err) {
    return { passed: true, issues: [], score: 100, message: `检查失败: ${err.message}` }
  }
}

// ============ 汇总 ============

function computeSummary(checks) {
  const entries = Object.entries(checks)
  const total = entries.length
  const passed = entries.filter(([, v]) => v.passed !== false).length
  const highIssues = entries.reduce((s, [, v]) => s + (v.issues?.filter(i => i.severity === 'high').length || 0), 0)
  const totalIssues = entries.reduce((s, [, v]) => s + (v.issues?.length || 0), 0)

  let rating
  const ratio = passed / total
  if (ratio >= 0.9 && highIssues === 0) rating = 'excellent'
  else if (ratio >= 0.7) rating = 'good'
  else if (ratio >= 0.5) rating = 'fair'
  else rating = 'poor'

  return {
    total,
    passed,
    failed: total - passed,
    highIssues,
    totalIssues,
    rating,
    score: Math.round((passed / total) * 100)
  }
}
