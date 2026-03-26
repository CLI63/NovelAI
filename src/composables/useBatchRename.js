import { ref } from 'vue'
import { novelDao, chapterDao, characterDao, foreshadowingDao } from '../utils/dao'

/**
 * 批量改名工具组合式函数
 * 提供全局替换角色名、地名等功能，支持正则表达式
 */
export function useBatchRename() {
  const processing = ref(false)
  const progress = ref(0)
  const results = ref(null)
  const error = ref(null)

  /**
   * 替换范围选项
   */
  const scopeOptions = [
    { value: 'all', label: '全部内容' },
    { value: 'chapters', label: '仅章节内容' },
    { value: 'characters', label: '仅角色信息' },
    { value: 'foreshadowing', label: '仅伏笔内容' },
    { value: 'novelInfo', label: '仅小说信息' }
  ]

  /**
   * 执行单个替换
   * @param {string} content - 原内容
   * @param {string} search - 搜索内容
   * @param {string} replace - 替换内容
   * @param {boolean} useRegex - 是否使用正则
   * @param {boolean} caseSensitive - 是否区分大小写
   */
  const replaceContent = (content, search, replace, useRegex = false, caseSensitive = false) => {
    if (!content || !search) return content

    try {
      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi'
        const regex = new RegExp(search, flags)
        // 使用函数形式替换，避免 $ 符号被解释为反向引用
        return content.replace(regex, () => replace)
      } else {
        if (caseSensitive) {
          return content.split(search).join(replace)
        } else {
          const lowerSearch = search.toLowerCase()
          const lowerContent = content.toLowerCase()
          let result = ''
          let lastIndex = 0

          let index
          while ((index = lowerContent.indexOf(lowerSearch, lastIndex)) !== -1) {
            result += content.slice(lastIndex, index) + replace
            lastIndex = index + search.length
          }
          result += content.slice(lastIndex)
          return result
        }
      }
    } catch (err) {
      console.error('替换失败:', err)
      return content
    }
  }

  /**
   * 预览替换结果
   * @param {string} content - 内容
   * @param {string} search - 搜索内容
   * @param {string} replace - 替换内容
   * @param {boolean} useRegex - 是否使用正则
   * @param {boolean} caseSensitive - 是否区分大小写
   * @returns {Object} 预览结果
   */
  const previewReplace = (content, search, replace, useRegex = false, caseSensitive = false) => {
    if (!content || !search) {
      return { matches: 0, preview: content, highlights: [] }
    }

    try {
      let matches = 0
      const highlights = []
      let preview = content

      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi'
        const regex = new RegExp(search, flags)
        preview = content.replace(regex, (match, offset) => {
          matches++
          highlights.push({ match, offset, replacement: replace })
          // 使用固定字符串替换，避免 $ 符号问题
          return `【${replace}】`
        })
      } else {
        if (caseSensitive) {
          let index = 0
          while ((index = content.indexOf(search, index)) !== -1) {
            matches++
            highlights.push({ match: search, offset: index, replacement: replace })
            index += search.length
          }
          preview = content.split(search).join(`【${replace}】`)
        } else {
          const lowerSearch = search.toLowerCase()
          const lowerContent = content.toLowerCase()
          let index = 0
          let lastIndex = 0
          let result = ''

          while ((index = lowerContent.indexOf(lowerSearch, lastIndex)) !== -1) {
            result += content.slice(lastIndex, index) + `【${replace}】`
            highlights.push({ match: content.slice(index, index + search.length), offset: index, replacement: replace })
            matches++
            lastIndex = index + search.length
          }
          result += content.slice(lastIndex)
          preview = result
        }
      }

      return { matches, preview, highlights }
    } catch (err) {
      return { matches: 0, preview: content, highlights: [], error: err.message }
    }
  }

  /**
   * 在小说信息中替换
   * @param {Object} novel - 小说对象
   * @param {string} search - 搜索内容
   * @param {string} replace - 替换内容
   * @param {Object} options - 选项
   */
  const replaceInNovelInfo = async (novel, search, replace, options = {}) => {
    const { useRegex = false, caseSensitive = false } = options
    const changes = []

    // 需要替换的字段
    const fieldsToReplace = ['title', 'description']
    const updatedNovel = { ...novel }

    fieldsToReplace.forEach(field => {
      if (updatedNovel[field]) {
        const original = updatedNovel[field]
        const updated = replaceContent(original, search, replace, useRegex, caseSensitive)
        if (original !== updated) {
          changes.push({
            field,
            type: 'novel',
            original,
            updated,
            novelId: novel.id
          })
          updatedNovel[field] = updated
        }
      }
    })

    // 替换世界观设定
    if (updatedNovel.worldSetting) {
      const worldSettingStr = JSON.stringify(updatedNovel.worldSetting)
      const updated = replaceContent(worldSettingStr, search, replace, useRegex, caseSensitive)
      if (worldSettingStr !== updated) {
        try {
          updatedNovel.worldSetting = JSON.parse(updated)
          changes.push({
            field: 'worldSetting',
            type: 'novel',
            novelId: novel.id
          })
        } catch (e) {
          console.error('世界观设定替换后JSON解析失败')
        }
      }
    }

    // 替换剧情线
    if (updatedNovel.plotLines) {
      const plotLinesStr = JSON.stringify(updatedNovel.plotLines)
      const updated = replaceContent(plotLinesStr, search, replace, useRegex, caseSensitive)
      if (plotLinesStr !== updated) {
        try {
          updatedNovel.plotLines = JSON.parse(updated)
          changes.push({
            field: 'plotLines',
            type: 'novel',
            novelId: novel.id
          })
        } catch (e) {
          console.error('剧情线替换后JSON解析失败')
        }
      }
    }

    // 保存更新
    if (changes.length > 0) {
      await novelDao.update(novel.id, updatedNovel)
    }

    return changes
  }

  /**
   * 在章节中替换
   * @param {string} novelId - 小说ID
   * @param {string} search - 搜索内容
   * @param {string} replace - 替换内容
   * @param {Object} options - 选项
   */
  const replaceInChapters = async (novelId, search, replace, options = {}) => {
    const { useRegex = false, caseSensitive = false, onProgress } = options
    const chapters = await chapterDao.getByNovelId(novelId)
    const changes = []

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      const updatedChapter = { ...chapter }
      let chapterChanged = false

      // 替换章节内容
      if (chapter.content) {
        const updated = replaceContent(chapter.content, search, replace, useRegex, caseSensitive)
        if (chapter.content !== updated) {
          updatedChapter.content = updated
          chapterChanged = true
          changes.push({
            type: 'chapter',
            field: 'content',
            chapterId: chapter.id,
            chapterNumber: chapter.chapterNumber,
            novelId
          })
        }
      }

      // 替换章节标题
      if (chapter.title) {
        const updated = replaceContent(chapter.title, search, replace, useRegex, caseSensitive)
        if (chapter.title !== updated) {
          updatedChapter.title = updated
          chapterChanged = true
          changes.push({
            type: 'chapter',
            field: 'title',
            chapterId: chapter.id,
            chapterNumber: chapter.chapterNumber,
            novelId
          })
        }
      }

      // 替换章节总结
      if (chapter.summary) {
        const updated = replaceContent(chapter.summary, search, replace, useRegex, caseSensitive)
        if (chapter.summary !== updated) {
          updatedChapter.summary = updated
          chapterChanged = true
          changes.push({
            type: 'chapter',
            field: 'summary',
            chapterId: chapter.id,
            chapterNumber: chapter.chapterNumber,
            novelId
          })
        }
      }

      if (chapterChanged) {
        await chapterDao.update(chapter.id, updatedChapter)
      }

      // 更新进度
      if (onProgress) {
        onProgress(i + 1, chapters.length)
      }
    }

    return changes
  }

  /**
   * 在角色信息中替换
   * @param {string} novelId - 小说ID
   * @param {string} search - 搜索内容
   * @param {string} replace - 替换内容
   * @param {Object} options - 选项
   */
  const replaceInCharacters = async (novelId, search, replace, options = {}) => {
    const { useRegex = false, caseSensitive = false, renameCharacterName = false } = options
    const characters = await characterDao.getByNovelId(novelId)
    const changes = []

    for (const character of characters) {
      const updatedCharacter = { ...character }
      let characterChanged = false

      // 如果是角色名称本身的替换
      if (renameCharacterName && character.name === search) {
        updatedCharacter.name = replace
        characterChanged = true
        changes.push({
          type: 'character',
          field: 'name',
          characterId: character.id,
          characterName: character.name,
          novelId
        })
      }

      // 替换角色描述字段
      const fieldsToReplace = ['identity', 'personality', 'background', 'goal', 'specialAbility']
      fieldsToReplace.forEach(field => {
        if (character[field]) {
          const updated = replaceContent(character[field], search, replace, useRegex, caseSensitive)
          if (character[field] !== updated) {
            updatedCharacter[field] = updated
            characterChanged = true
            changes.push({
              type: 'character',
              field,
              characterId: character.id,
              characterName: character.name,
              novelId
            })
          }
        }
      })

      if (characterChanged) {
        await characterDao.update(character.id, updatedCharacter)
      }
    }

    return changes
  }

  /**
   * 在伏笔中替换
   * @param {string} novelId - 小说ID
   * @param {string} search - 搜索内容
   * @param {string} replace - 替换内容
   * @param {Object} options - 选项
   */
  const replaceInForeshadowing = async (novelId, search, replace, options = {}) => {
    const { useRegex = false, caseSensitive = false } = options
    const foreshadowings = await foreshadowingDao.getByNovelId(novelId)
    const changes = []

    for (const f of foreshadowings) {
      const updated = { ...f }
      let changed = false

      // 替换伏笔内容
      if (f.content) {
        const newContent = replaceContent(f.content, search, replace, useRegex, caseSensitive)
        if (f.content !== newContent) {
          updated.content = newContent
          changed = true
          changes.push({
            type: 'foreshadowing',
            field: 'content',
            foreshadowingId: f.id,
            novelId
          })
        }
      }

      // 替换伏笔描述
      if (f.description) {
        const newDesc = replaceContent(f.description, search, replace, useRegex, caseSensitive)
        if (f.description !== newDesc) {
          updated.description = newDesc
          changed = true
          changes.push({
            type: 'foreshadowing',
            field: 'description',
            foreshadowingId: f.id,
            novelId
          })
        }
      }

      if (changed) {
        await foreshadowingDao.update(f.id, updated)
      }
    }

    return changes
  }

  /**
   * 执行批量替换
   * @param {string} novelId - 小说ID
   * @param {string} search - 搜索内容
   * @param {string} replace - 替换内容
   * @param {Object} options - 选项
   */
  const executeBatchRename = async (novelId, search, replace, options = {}) => {
    if (!novelId || !search) {
      error.value = '参数不完整'
      return null
    }

    const {
      scope = 'all',
      useRegex = false,
      caseSensitive = false,
      renameCharacterName = false
    } = options

    processing.value = true
    progress.value = 0
    error.value = null
    results.value = null

    const allChanges = []

    try {
      // 获取小说信息
      const novel = await novelDao.getById(novelId)
      if (!novel) {
        throw new Error('小说不存在')
      }

      // 验证正则表达式
      if (useRegex) {
        try {
          new RegExp(search)
        } catch (e) {
          throw new Error('正则表达式语法错误: ' + e.message)
        }
      }

      // 按范围执行替换
      if (scope === 'all' || scope === 'novelInfo') {
        const changes = await replaceInNovelInfo(novel, search, replace, { useRegex, caseSensitive })
        allChanges.push(...changes)
        progress.value = 20
      }

      if (scope === 'all' || scope === 'chapters') {
        const changes = await replaceInChapters(novelId, search, replace, {
          useRegex,
          caseSensitive,
          onProgress: (current, total) => {
            progress.value = 20 + (current / total) * 50
          }
        })
        allChanges.push(...changes)
      }

      if (scope === 'all' || scope === 'characters') {
        const changes = await replaceInCharacters(novelId, search, replace, {
          useRegex,
          caseSensitive,
          renameCharacterName
        })
        allChanges.push(...changes)
        progress.value = 80
      }

      if (scope === 'all' || scope === 'foreshadowing') {
        const changes = await replaceInForeshadowing(novelId, search, replace, {
          useRegex,
          caseSensitive
        })
        allChanges.push(...changes)
        progress.value = 100
      }

      results.value = {
        success: true,
        totalChanges: allChanges.length,
        changes: allChanges,
        search,
        replace,
        scope
      }

      return results.value
    } catch (err) {
      error.value = err.message
      results.value = {
        success: false,
        error: err.message
      }
      return null
    } finally {
      processing.value = false
    }
  }

  /**
   * 获取替换统计
   * @param {string} novelId - 小说ID
   * @param {string} search - 搜索内容
   * @param {Object} options - 选项
   */
  const getReplaceStats = async (novelId, search, options = {}) => {
    const { useRegex = false, caseSensitive = false } = options

    if (!novelId || !search) {
      return null
    }

    try {
      const stats = {
        novelInfo: { count: 0, fields: [] },
        chapters: { count: 0, items: [] },
        characters: { count: 0, items: [] },
        foreshadowing: { count: 0, items: [] },
        totalMatches: 0
      }

      // 统计小说信息中的匹配
      const novel = await novelDao.getById(novelId)
      if (novel) {
        const fields = ['title', 'description']
        fields.forEach(field => {
          if (novel[field]) {
            const { matches } = previewReplace(novel[field], search, '', useRegex, caseSensitive)
            if (matches > 0) {
              stats.novelInfo.count += matches
              stats.novelInfo.fields.push({ field, matches })
              stats.totalMatches += matches
            }
          }
        })
      }

      // 统计章节中的匹配
      const chapters = await chapterDao.getByNovelId(novelId)
      for (const chapter of chapters) {
        let chapterMatches = 0
        if (chapter.content) {
          const { matches } = previewReplace(chapter.content, search, '', useRegex, caseSensitive)
          chapterMatches += matches
        }
        if (chapter.title) {
          const { matches } = previewReplace(chapter.title, search, '', useRegex, caseSensitive)
          chapterMatches += matches
        }
        if (chapterMatches > 0) {
          stats.chapters.count += chapterMatches
          stats.chapters.items.push({
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            matches: chapterMatches
          })
          stats.totalMatches += chapterMatches
        }
      }

      // 统计角色中的匹配
      const characters = await characterDao.getByNovelId(novelId)
      for (const char of characters) {
        let charMatches = 0
        const fields = ['name', 'identity', 'personality', 'background']
        fields.forEach(field => {
          if (char[field]) {
            const { matches } = previewReplace(char[field], search, '', useRegex, caseSensitive)
            charMatches += matches
          }
        })
        if (charMatches > 0) {
          stats.characters.count += charMatches
          stats.characters.items.push({
            name: char.name,
            matches: charMatches
          })
          stats.totalMatches += charMatches
        }
      }

      // 统计伏笔中的匹配
      const foreshadowings = await foreshadowingDao.getByNovelId(novelId)
      for (const f of foreshadowings) {
        let fMatches = 0
        if (f.content) {
          const { matches } = previewReplace(f.content, search, '', useRegex, caseSensitive)
          fMatches += matches
        }
        if (f.description) {
          const { matches } = previewReplace(f.description, search, '', useRegex, caseSensitive)
          fMatches += matches
        }
        if (fMatches > 0) {
          stats.foreshadowing.count += fMatches
          stats.totalMatches += fMatches
        }
      }

      return stats
    } catch (err) {
      console.error('获取替换统计失败:', err)
      return null
    }
  }

  /**
   * 清除结果
   */
  const clearResults = () => {
    results.value = null
    error.value = null
    progress.value = 0
  }

  return {
    processing,
    progress,
    results,
    error,
    scopeOptions,
    executeBatchRename,
    previewReplace,
    getReplaceStats,
    replaceContent,
    clearResults
  }
}

export default useBatchRename
