<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { callAI } from '../utils/api'
import { buildChapterGenerationPrompt, buildContentSupplementPrompt } from '../utils/prompts'
import { novelDao, chapterDao } from '../utils/dao'
import { message, Modal } from 'ant-design-vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

const novel = ref(null)
const existingChapters = ref([])
const generating = ref(false)
const generatedChapters = ref(null)
const feedback = ref('')
const customPrompt = ref('')

const chapterCount = ref(1)
const minWords = ref(2000)
const maxWords = ref(3000)

const nextChapterNumber = computed(() => {
  return existingChapters.value.length + 1
})

const progress = computed(() => {
  if (!novel.value || !novel.value.chapterStructure.totalChapters) return 0
  return Math.round(
    (existingChapters.value.length / novel.value.chapterStructure.totalChapters) * 100,
  )
})

const loadNovel = async () => {
  try {
    novel.value = await novelDao.getById(parseInt(route.params.id))
    if (!novel.value) {
      message.error('小说不存在')
      router.push('/')
      return
    }
    await loadChapters()

    minWords.value = parseInt(novel.value.chapterStructure.minWordsPerChapter) || 2000
    maxWords.value = parseInt(novel.value.chapterStructure.maxWordsPerChapter) || 3000
  } catch (error) {
    message.error('加载小说失败')
  }
}

const loadChapters = async () => {
  try {
    existingChapters.value = await chapterDao.getByNovelId(novel.value.id)
  } catch (error) {
    message.error('加载章节失败')
  }
}

const handleGenerate = async () => {
  if (chapterCount.value < 1) {
    message.warning('生成章节数量至少为1')
    return
  }

  if (minWords.value > maxWords.value) {
    message.warning('最小字数不能大于最大字数')
    return
  }

  const apiKey = appStore.getCurrentApiKey()
  if (!apiKey) {
    message.warning('请先在设置中配置API Key')
    router.push('/settings')
    return
  }

  generating.value = true
  try {
    const recentChapters = await chapterDao.getRecentChapters(novel.value.id, 3)
    const chapterSummaries = await chapterDao.getChapterSummaries(novel.value.id, 100)

    const messages = buildChapterGenerationPrompt(
      novel.value,
      recentChapters,
      chapterSummaries,
      chapterCount.value,
      minWords.value,
      maxWords.value,
    )

    if (customPrompt.value.trim()) {
      messages.push({
        role: 'user',
        content: `用户提示词：${customPrompt.value}`,
      })
    }

    const model =
      appStore.settings.aiProvider === 'kimi'
        ? appStore.settings.kimiModel
        : appStore.settings.qianwenModel
    const response = await callAI(messages, appStore.settings.aiProvider, apiKey, model)

    console.log('AI原始响应:', response)
    console.log('响应类型:', typeof response)

    try {
      let parsedData = null

      try {
        parsedData = JSON.parse(response)
      } catch (directParseError) {
        console.log('直接解析失败，尝试提取JSON内容')

        let jsonStr = response.trim()

        let jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          jsonMatch = jsonStr.match(/\[[\s\S]*\]/)
        }

        if (jsonMatch) {
          jsonStr = jsonMatch[0]
          console.log('提取的JSON字符串:', jsonStr)

          jsonStr = jsonStr.replace(/\\n/g, '\n')
          jsonStr = jsonStr.replace(/\\"/g, '"')
          jsonStr = jsonStr.replace(/\\'/g, "'")

          try {
            parsedData = JSON.parse(jsonStr)
          } catch (extractedParseError) {
            console.log('提取后解析仍然失败，尝试修复JSON')

            let fixedJsonStr = jsonStr

            const openBraces = (fixedJsonStr.match(/\{/g) || []).length
            const closeBraces = (fixedJsonStr.match(/\}/g) || []).length
            const openBrackets = (fixedJsonStr.match(/\[/g) || []).length
            const closeBrackets = (fixedJsonStr.match(/\]/g) || []).length

            console.log('括号统计:', { openBraces, closeBraces, openBrackets, closeBrackets })

            for (let i = 0; i < openBraces - closeBraces; i++) {
              fixedJsonStr += '}'
            }
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              fixedJsonStr += ']'
            }

            console.log('修复后的JSON字符串:', fixedJsonStr)

            try {
              parsedData = JSON.parse(fixedJsonStr)
              console.log('修复后解析成功')
            } catch (fixedParseError) {
              console.error('修复后仍然解析失败:', fixedParseError.message)
              throw new Error('AI返回的JSON格式无法解析，请重试或减少生成章节数量')
            }
          }
        } else {
          throw new Error('无法从AI响应中提取有效的JSON格式')
        }
      }

      console.log('解析后的数据:', parsedData)
      console.log('数据结构检查:', {
        hasChapters: !!parsedData.chapters,
        chaptersIsArray: Array.isArray(parsedData.chapters),
        chaptersLength: parsedData.chapters?.length,
        isArray: Array.isArray(parsedData),
      })

      if (parsedData.chapters && Array.isArray(parsedData.chapters)) {
        const chaptersWithNumbers = parsedData.chapters.map((chapter, index) => ({
          ...chapter,
          chapterNumber: nextChapterNumber.value + index,
        }))
        generatedChapters.value = { chapters: chaptersWithNumbers }

        const underMinWords = chaptersWithNumbers.filter((ch) => ch.content.length < minWords.value)
        if (underMinWords.length > 0) {
          message.warning({
            content: `生成成功！但有 ${underMinWords.length} 个章节字数不足 ${minWords.value} 字，建议增加提示词重新生成或手动补充内容。`,
            duration: 5,
          })
        } else {
          message.success('生成成功！')
        }
        // 滚动到页面顶部
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (Array.isArray(parsedData)) {
        const chaptersWithNumbers = parsedData.map((chapter, index) => ({
          ...chapter,
          chapterNumber: nextChapterNumber.value + index,
        }))
        generatedChapters.value = { chapters: chaptersWithNumbers }

        const underMinWords = chaptersWithNumbers.filter((ch) => ch.content.length < minWords.value)
        if (underMinWords.length > 0) {
          message.warning({
            content: `生成成功！但有 ${underMinWords.length} 个章节字数不足 ${minWords.value} 字，建议增加提示词重新生成或手动补充内容。`,
            duration: 5,
          })
        } else {
          message.success('生成成功！')
        }
        // 滚动到页面顶部
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        console.error('解析后的数据结构:', parsedData)
        message.error('AI返回格式错误，请重试')
      }
    } catch (parseError) {
      console.error('JSON解析错误:', parseError)
      console.error('错误堆栈:', parseError.stack)
      message.error(parseError.message || 'AI返回格式错误，请重试')
    }
  } catch (error) {
    message.error('生成失败：' + error.message)
  } finally {
    generating.value = false
  }
}

const handleRegenerate = async () => {
  if (!feedback.value.trim() && !customPrompt.value.trim()) {
    message.warning('请输入修改意见或提示词')
    return
  }

  const apiKey = appStore.getCurrentApiKey()
  if (!apiKey) {
    message.warning('请先在设置中配置API Key')
    router.push('/settings')
    return
  }

  generating.value = true
  try {
    const recentChapters = await chapterDao.getRecentChapters(novel.value.id, 3)
    const chapterSummaries = await chapterDao.getChapterSummaries(novel.value.id, 100)

    const messages = buildChapterGenerationPrompt(
      novel.value,
      recentChapters,
      chapterSummaries,
      chapterCount.value,
      minWords.value,
      maxWords.value,
    )

    if (customPrompt.value.trim() || feedback.value.trim()) {
      let additionalPrompt = ''
      if (customPrompt.value.trim()) {
        additionalPrompt += `用户提示词：${customPrompt.value}\n\n`
      }
      if (feedback.value.trim()) {
        additionalPrompt += `用户反馈：${feedback.value}\n\n`
      }

      if (generatedChapters.value && generatedChapters.value.chapters) {
        const underMinWords = generatedChapters.value.chapters.filter(
          (ch) => ch.content.length < minWords.value,
        )
        if (
          underMinWords.length > 0 &&
          !customPrompt.value.includes('字数') &&
          !customPrompt.value.includes('细节')
        ) {
          additionalPrompt += `字数增强提示：请确保每章内容充实饱满，达到最少字数要求。可以增加人物心理描写、环境氛围渲染、对话细节、背景介绍等丰富内容。`
        }
      }

      if (additionalPrompt) {
        messages.push({
          role: 'user',
          content: additionalPrompt,
        })
      }
    }

    const model =
      appStore.settings.aiProvider === 'kimi'
        ? appStore.settings.kimiModel
        : appStore.settings.qianwenModel
    const response = await callAI(messages, appStore.settings.aiProvider, apiKey, model)

    console.log('AI原始响应:', response)
    console.log('响应类型:', typeof response)

    try {
      let parsedData = null

      try {
        parsedData = JSON.parse(response)
      } catch (directParseError) {
        console.log('直接解析失败，尝试提取JSON内容')

        let jsonStr = response.trim()

        let jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          jsonMatch = jsonStr.match(/\[[\s\S]*\]/)
        }

        if (jsonMatch) {
          jsonStr = jsonMatch[0]
          console.log('提取的JSON字符串:', jsonStr)

          jsonStr = jsonStr.replace(/\\n/g, '\n')
          jsonStr = jsonStr.replace(/\\"/g, '"')
          jsonStr = jsonStr.replace(/\\'/g, "'")

          try {
            parsedData = JSON.parse(jsonStr)
          } catch (extractedParseError) {
            console.log('提取后解析仍然失败，尝试修复JSON')

            let fixedJsonStr = jsonStr

            const openBraces = (fixedJsonStr.match(/\{/g) || []).length
            const closeBraces = (fixedJsonStr.match(/\}/g) || []).length
            const openBrackets = (fixedJsonStr.match(/\[/g) || []).length
            const closeBrackets = (fixedJsonStr.match(/\]/g) || []).length

            console.log('括号统计:', { openBraces, closeBraces, openBrackets, closeBrackets })

            for (let i = 0; i < openBraces - closeBraces; i++) {
              fixedJsonStr += '}'
            }
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              fixedJsonStr += ']'
            }

            console.log('修复后的JSON字符串:', fixedJsonStr)

            try {
              parsedData = JSON.parse(fixedJsonStr)
              console.log('修复后解析成功')
            } catch (fixedParseError) {
              console.error('修复后仍然解析失败:', fixedParseError.message)
              throw new Error('AI返回的JSON格式无法解析，请重试或减少生成章节数量')
            }
          }
        } else {
          throw new Error('无法从AI响应中提取有效的JSON格式')
        }
      }

      console.log('解析后的数据:', parsedData)
      console.log('数据结构检查:', {
        hasChapters: !!parsedData.chapters,
        chaptersIsArray: Array.isArray(parsedData.chapters),
        chaptersLength: parsedData.chapters?.length,
        isArray: Array.isArray(parsedData),
      })

      if (parsedData.chapters && Array.isArray(parsedData.chapters)) {
        const chaptersWithNumbers = parsedData.chapters.map((chapter, index) => ({
          ...chapter,
          chapterNumber: nextChapterNumber.value + index,
        }))
        generatedChapters.value = { chapters: chaptersWithNumbers }

        const underMinWords = chaptersWithNumbers.filter((ch) => ch.content.length < minWords.value)
        if (underMinWords.length > 0) {
          message.warning({
            content: `重新生成成功！但有 ${underMinWords.length} 个章节字数不足 ${minWords.value} 字。`,
            duration: 5,
          })
          if (!customPrompt.value.trim()) {
            customPrompt.value = '请增加更多细节描写、对话内容、心理活动描述，确保每章内容充实饱满'
          }
        } else {
          message.success('重新生成成功！')
        }

        feedback.value = ''
        if (underMinWords.length === 0 && customPrompt.value.includes('请增加更多细节描写')) {
          customPrompt.value = ''
        }
      } else if (Array.isArray(parsedData)) {
        const chaptersWithNumbers = parsedData.map((chapter, index) => ({
          ...chapter,
          chapterNumber: nextChapterNumber.value + index,
        }))
        generatedChapters.value = { chapters: chaptersWithNumbers }

        const underMinWords = chaptersWithNumbers.filter((ch) => ch.content.length < minWords.value)
        if (underMinWords.length > 0) {
          message.warning({
            content: `重新生成成功！但有 ${underMinWords.length} 个章节字数不足 ${minWords.value} 字。`,
            duration: 5,
          })
          if (!customPrompt.value.trim()) {
            customPrompt.value = '请增加更多细节描写、对话内容、心理活动描述，确保每章内容充实饱满'
          }
        } else {
          message.success('重新生成成功！')
        }

        feedback.value = ''
        if (underMinWords.length === 0 && customPrompt.value.includes('请增加更多细节描写')) {
          customPrompt.value = ''
        }
      } else {
        console.error('解析后的数据结构:', parsedData)
        message.error('AI返回格式错误，请重试')
      }
    } catch (parseError) {
      console.error('JSON解析错误:', parseError)
      console.error('错误堆栈:', parseError.stack)
      message.error(parseError.message || 'AI返回格式错误，请重试')
    }
  } catch (error) {
    message.error('生成失败：' + error.message)
  } finally {
    generating.value = false
  }
}

const handleSave = async () => {
  if (!generatedChapters.value || !generatedChapters.value.chapters) {
    message.warning('请先生成章节')
    return
  }

  const underMinWords = generatedChapters.value.chapters.filter(
    (ch) => ch.content.length < minWords.value,
  )
  if (underMinWords.length > 0) {
    Modal.confirm({
      title: '⚠️ 字数不足提示',
      content: `有 ${underMinWords.length} 个章节字数不足 ${minWords.value} 字，是否仍要保存？`,
      okText: '确认保存',
      cancelText: '取消',
      onOk: async () => {
        await doSaveChapters()
      },
    })
    return
  }

  await doSaveChapters()
}

const doSaveChapters = async () => {
  try {
    for (const chapter of generatedChapters.value.chapters) {
      await chapterDao.add({
        novelId: novel.value.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        content: chapter.content,
        summary: chapter.summary,
        wordCount: chapter.content.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    message.success(`成功保存 ${generatedChapters.value.chapters.length} 个章节！`)
    router.push(`/novel/${novel.value.id}`)
  } catch (error) {
    message.error('保存失败：' + error.message)
  }
}

const handleCancel = () => {
  router.push(`/novel/${novel.value.id}`)
}

const addQuickPrompt = (text) => {
  if (customPrompt.value) {
    customPrompt.value += '，' + text
  } else {
    customPrompt.value = text
  }
}

const addQuickFeedback = (text) => {
  if (feedback.value) {
    feedback.value += '，' + text
  } else {
    feedback.value = text
  }
}

/**
 * 补充章节内容
 * @param {number} chapterIndex - 章节索引
 */
const handleSupplementContent = async (chapterIndex) => {
  const chapter = generatedChapters.value.chapters[chapterIndex]
  if (!chapter) return

  const apiKey = appStore.getCurrentApiKey()
  if (!apiKey) {
    message.warning('请先在设置中配置API Key')
    router.push('/settings')
    return
  }

  const currentWords = chapter.content.length
  const targetWords = minWords.value

  if (currentWords >= targetWords) {
    message.info('当前章节字数已达标，无需补充')
    return
  }

  // 设置补充状态
  if (!generatedChapters.value.supplementing) {
    generatedChapters.value.supplementing = {}
  }
  generatedChapters.value.supplementing[chapterIndex] = true

  try {
    const messages = buildContentSupplementPrompt(novel.value, chapter, targetWords, currentWords)
    const model =
      appStore.settings.aiProvider === 'kimi'
        ? appStore.settings.kimiModel
        : appStore.settings.qianwenModel
    const response = await callAI(messages, appStore.settings.aiProvider, apiKey, model)

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0])
      if (parsedData.content) {
        generatedChapters.value.chapters[chapterIndex].content = parsedData.content
        message.success(`内容补充成功！当前字数：${parsedData.content.length}字`)
      }
    } else {
      message.error('AI返回格式错误，请重试')
    }
  } catch (error) {
    message.error('补充失败：' + error.message)
  } finally {
    generatedChapters.value.supplementing[chapterIndex] = false
  }
}

/**
 * 一键补充所有字数不足的章节
 */
const handleSupplementAll = async () => {
  const underMinWords = generatedChapters.value.chapters.filter(
    (ch) => ch.content.length < minWords.value
  )

  if (underMinWords.length === 0) {
    message.info('所有章节字数已达标')
    return
  }

  Modal.confirm({
    title: '批量补充内容',
    content: `检测到 ${underMinWords.length} 个章节字数不足，是否逐一补充？这可能需要较长时间。`,
    okText: '开始补充',
    cancelText: '取消',
    onOk: async () => {
      for (let i = 0; i < generatedChapters.value.chapters.length; i++) {
        const chapter = generatedChapters.value.chapters[i]
        if (chapter.content.length < minWords.value) {
          await handleSupplementContent(i)
        }
      }
      message.success('批量补充完成！')
    },
  })
}

onMounted(() => {
  loadNovel()
})
</script>

<template>
  <div class="chapter-create-page">
    <template v-if="novel">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-left">
          <a-button type="text" class="back-btn" @click="handleCancel">
            <template #icon>
              <span class="back-icon">←</span>
            </template>
          </a-button>
          <div class="header-info">
            <h1 class="page-title">✍️ AI 生成章节</h1>
            <p class="page-subtitle">为《{{ novel.title }}》创作新章节</p>
          </div>
        </div>
        <a-tag color="purple" class="novel-tag">{{ novel.genre }}</a-tag>
      </div>

      <!-- 步骤条 -->
      <div class="steps-section">
        <a-steps :current="generatedChapters ? 1 : 0" class="create-steps">
          <a-step title="配置参数" description="设置生成参数" />
          <a-step title="确认章节" description="调整并保存章节" />
        </a-steps>
      </div>

      <!-- 配置参数步骤 -->
      <div v-if="!generatedChapters" class="step-content">
        <!-- 信息提示和进度合并 -->
        <a-row :gutter="16" class="info-stats-section">
          <a-col :span="12">
            <div class="info-card">
              <div class="info-header">
                <span class="info-icon">🤖</span>
                <span class="info-title">AI 智能生成</span>
              </div>
              <p class="info-desc">
                AI将根据小说概览、最近3章完整内容和前100章章节总结来生成新章节，确保剧情连贯性。
              </p>
              <div class="info-tags">
                <a-tag v-if="minWords && maxWords" color="orange" class="info-tag">
                  📝 {{ minWords }} - {{ maxWords }} 字/章
                </a-tag>
                <a-tag v-if="chapterCount > 0" color="green" class="info-tag">
                  📚 生成 {{ chapterCount }} 章 (第{{ nextChapterNumber }}章起)
                </a-tag>
              </div>
            </div>
          </a-col>
          <a-col :span="12">
            <div class="stats-card">
              <div class="stats-header">
                <span class="stats-icon">📊</span>
                <span class="stats-title">当前进度</span>
              </div>
              <div class="progress-wrapper">
                <a-progress
                  :percent="progress"
                  :success="{ percent: progress }"
                  :format="
                    () => `${existingChapters.length}/${novel.chapterStructure.totalChapters}章`
                  "
                  stroke-color="linear-gradient(90deg, #667eea 0%, #764ba2 100%)"
                  class="custom-progress"
                  style="width: 96%"
                />
              </div>
              <div class="progress-detail">
                <span class="progress-text">已完成 {{ progress }}%</span>
                <span class="progress-remaining"
                  >还剩
                  {{ novel.chapterStructure.totalChapters - existingChapters.length }} 章</span
                >
              </div>
              <div class="recent-chapters-mini">
                <span class="recent-label">最近章节:</span>
                <span v-if="existingChapters.length === 0" class="recent-empty">暂无章节</span>
                <span v-else class="recent-list-mini">
                  <span
                    v-for="(ch, index) in existingChapters.slice(-2).reverse()"
                    :key="ch.id"
                    class="recent-item-mini"
                  >
                    第{{ ch.chapterNumber }}章{{
                      index < existingChapters.slice(-2).length - 1 ? '、' : ''
                    }}
                  </span>
                </span>
              </div>
            </div>
          </a-col>
        </a-row>

        <!-- 配置表单 -->
        <a-card :bordered="false" class="config-card">
          <a-form layout="vertical" class="config-form">
            <div class="form-section">
              <h3 class="section-title">
                <span class="section-icon">⚙️</span>
                生成配置
              </h3>
              <a-row :gutter="24">
                <a-col :span="8">
                  <a-form-item label="生成章节数量">
                    <a-input-number
                      v-model:value="chapterCount"
                      :min="1"
                      :max="10"
                      size="large"
                      class="config-input"
                    />
                    <div class="input-hint">一次最多生成10章</div>
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="最小字数">
                    <a-input-number
                      v-model:value="minWords"
                      :min="500"
                      :max="10000"
                      size="large"
                      class="config-input"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="最大字数">
                    <a-input-number
                      v-model:value="maxWords"
                      :min="500"
                      :max="10000"
                      size="large"
                      class="config-input"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </div>

            <a-divider />

            <div class="form-section">
              <h3 class="section-title">
                <span class="section-icon">💡</span>
                提示词（可选）
              </h3>
              <a-form-item>
                <a-textarea
                  v-model:value="customPrompt"
                  placeholder="可以输入额外的提示词来指导AI生成，例如：增加一些对话、描述环境氛围等"
                  :rows="4"
                  class="prompt-textarea"
                />
                <div class="quick-prompts">
                  <span class="quick-label">快速提示词：</span>
                  <div class="quick-tags">
                    <a-tag
                      class="prompt-tag"
                      @click="addQuickPrompt('增加更多对话内容，丰富人物互动')"
                    >
                      💬 增加对话
                    </a-tag>
                    <a-tag class="prompt-tag" @click="addQuickPrompt('增加环境描写和氛围渲染')">
                      🌄 环境描写
                    </a-tag>
                    <a-tag class="prompt-tag" @click="addQuickPrompt('增加人物心理活动和内心独白')">
                      💭 心理描写
                    </a-tag>
                    <a-tag class="prompt-tag" @click="addQuickPrompt('增加背景故事和细节描述')">
                      📖 背景故事
                    </a-tag>
                  </div>
                </div>
              </a-form-item>
            </div>

            <div class="form-actions">
              <a-space size="large">
                <a-button
                  type="primary"
                  size="large"
                  @click="handleGenerate"
                  :loading="generating"
                  class="generate-btn"
                >
                  <template #icon>
                    <span class="btn-icon">✨</span>
                  </template>
                  AI 生成章节
                </a-button>
                <a-button size="large" @click="handleCancel" class="cancel-btn">
                  取消返回
                </a-button>
              </a-space>
            </div>
          </a-form>
        </a-card>
      </div>

      <!-- 确认章节步骤 -->
      <div v-else class="step-content">
        <a-form layout="vertical" class="review-form">
          <div class="chapters-list">
            <a-card
              v-for="(chapter, index) in generatedChapters.chapters"
              :key="index"
              :bordered="false"
              class="chapter-card"
            >
              <template #title>
                <div class="chapter-card-header">
                  <span class="chapter-number-badge">第{{ chapter.chapterNumber }}章</span>
                  <span class="chapter-card-title">{{ chapter.title }}</span>
                </div>
              </template>
              <template #extra>
                <a-tag
                  :color="chapter.content.length >= minWords ? 'success' : 'warning'"
                  class="word-tag"
                >
                  {{ chapter.content.length.toLocaleString() }} 字
                </a-tag>
              </template>

              <a-form-item label="章节标题" class="form-item-compact">
                <a-input v-model:value="chapter.title" size="large" class="title-input" />
              </a-form-item>

              <a-form-item label="章节内容" class="form-item-compact">
                <div class="content-header">
                  <span class="content-hint">字数要求: {{ minWords }} - {{ maxWords }} 字</span>
                  <div class="content-actions">
                    <a-tag
                      :color="chapter.content.length >= minWords ? 'success' : 'warning'"
                      class="word-status"
                    >
                      {{ chapter.content.length }} 字
                      <span v-if="chapter.content.length < minWords" class="word-remaining">
                        (还需 {{ minWords - chapter.content.length }} 字)
                      </span>
                    </a-tag>
                    <a-button
                      v-if="chapter.content.length < minWords"
                      type="link"
                      size="small"
                      :loading="generatedChapters.supplementing && generatedChapters.supplementing[index]"
                      @click="handleSupplementContent(index)"
                      class="supplement-btn"
                    >
                      AI补充内容
                    </a-button>
                  </div>
                </div>
                <a-textarea v-model:value="chapter.content" :rows="12" class="content-textarea" />
              </a-form-item>

              <a-form-item label="章节总结" class="form-item-compact">
                <a-textarea
                  v-model:value="chapter.summary"
                  :rows="3"
                  placeholder="请输入章节总结（50-100字，精炼概括本章主要情节）"
                  class="summary-textarea"
                />
              </a-form-item>
            </a-card>
          </div>

          <a-divider class="section-divider" />

          <a-alert
            v-if="generatedChapters.chapters.length > 0"
            message="📋 章节信息"
            :description="`当前显示第 ${generatedChapters.chapters[0].chapterNumber} 章到第 ${generatedChapters.chapters[generatedChapters.chapters.length - 1].chapterNumber} 章，共 ${generatedChapters.chapters.length} 章。`"
            type="info"
            show-icon
            class="chapter-info-alert"
          />

          <div class="form-section feedback-section">
            <h3 class="section-title">
              <span class="section-icon">🔄</span>
              修改意见（可选）
            </h3>
            <a-form-item>
              <a-textarea
                v-model:value="feedback"
                placeholder="如果不满意，可以输入修改意见，让AI重新生成..."
                :rows="4"
                class="feedback-textarea"
              />
              <div class="quick-prompts">
                <span class="quick-label">快速修改建议：</span>
                <div class="quick-tags">
                  <a-tag
                    class="prompt-tag"
                    @click="addQuickFeedback('请增加更多对话内容，丰富人物互动')"
                  >
                    💬 增加对话
                  </a-tag>
                  <a-tag class="prompt-tag" @click="addQuickFeedback('请增加环境描写和氛围渲染')">
                    🌄 环境描写
                  </a-tag>
                  <a-tag
                    class="prompt-tag"
                    @click="addQuickFeedback('请增加人物心理活动和内心独白')"
                  >
                    💭 心理描写
                  </a-tag>
                  <a-tag
                    class="prompt-tag"
                    @click="addQuickFeedback('请增加背景故事和细节描述，确保内容充实')"
                  >
                    📖 丰富内容
                  </a-tag>
                  <a-tag
                    class="prompt-tag"
                    @click="addQuickFeedback('请确保每章内容达到最少字数要求')"
                  >
                    ✅ 字数达标
                  </a-tag>
                </div>
              </div>
            </a-form-item>
          </div>

          <div class="form-actions review-actions">
            <a-space size="large">
              <a-button type="primary" size="large" @click="handleSave" class="save-btn">
                <template #icon>
                  <span class="btn-icon">💾</span>
                </template>
                保存章节
              </a-button>
              <a-button
                v-if="generatedChapters.chapters.some(ch => ch.content.length < minWords)"
                size="large"
                @click="handleSupplementAll"
                class="supplement-all-btn"
              >
                <template #icon>
                  <span class="btn-icon">📝</span>
                </template>
                一键补充字数
              </a-button>
              <a-button
                size="large"
                @click="handleRegenerate"
                :loading="generating"
                class="regenerate-btn-secondary"
              >
                <template #icon>
                  <span class="btn-icon">🔄</span>
                </template>
                AI 重新生成
              </a-button>
              <a-button size="large" @click="generatedChapters = null" class="back-btn-secondary">
                返回配置
              </a-button>
            </a-space>
          </div>
        </a-form>
      </div>
    </template>
  </div>
</template>

<style scoped>
.chapter-create-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(240, 147, 251, 0.3);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: none;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-3px);
}

.back-icon {
  font-size: 18px;
  color: white;
}

.header-info {
  color: white;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 2px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-subtitle {
  font-size: 13px;
  opacity: 0.9;
  margin: 0;
}

.novel-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white !important;
}

/* 步骤条 */
.steps-section {
  margin-bottom: 16px;
  padding: 12px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.create-steps :deep(.ant-steps-item-title) {
  font-weight: 600;
  font-size: 14px;
}

.create-steps :deep(.ant-steps-item-description) {
  font-size: 12px;
}

.create-steps :deep(.ant-steps-item-icon) {
  width: 28px;
  height: 28px;
  line-height: 28px;
  font-size: 14px;
}

/* 信息提示和进度合并区域 */
.info-stats-section {
  margin-bottom: 12px;
}

.info-card {
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  height: 100%;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.info-icon {
  font-size: 20px;
}

.info-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.info-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.info-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  height: 100%;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.stats-icon {
  font-size: 18px;
}

.stats-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.progress-wrapper {
  margin-bottom: 8px;
}

.progress-detail {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 12px;
}

.progress-text {
  color: #667eea;
  font-weight: 600;
}

.progress-remaining {
  color: #999;
}

.recent-chapters-mini {
  padding-top: 10px;
  border-top: 1px dashed #e8e8e8;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.recent-label {
  color: #999;
  font-weight: 500;
}

.recent-empty {
  color: #ccc;
  font-style: italic;
}

.recent-list-mini {
  color: #667eea;
}

.recent-item-mini {
  font-weight: 500;
}

/* 配置卡片 */
.config-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.config-form {
  padding: 20px 24px;
}

.form-section {
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.section-icon {
  font-size: 18px;
}

.config-input {
  width: 100%;
  border-radius: 8px;
}

.input-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.prompt-textarea,
.feedback-textarea {
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
}

.quick-prompts {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.quick-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.prompt-tag {
  cursor: pointer;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 16px;
  transition: all 0.3s ease;
}

.prompt-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.form-actions {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.generate-btn {
  height: 44px;
  padding: 0 32px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.generate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.cancel-btn {
  height: 44px;
  padding: 0 24px;
  border-radius: 10px;
  font-size: 15px;
}

.btn-icon {
  margin-right: 6px;
}

/* 审阅表单 */
.review-form {
  padding: 0;
}

.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chapter-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.chapter-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-bottom: 1px solid #e8e8e8;
  padding: 12px 16px;
  min-height: 48px;
}

.chapter-card :deep(.ant-card-body) {
  padding: 16px;
}

.chapter-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chapter-number-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 3px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.chapter-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.word-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
}

.form-item-compact {
  margin-bottom: 12px;
}

.form-item-compact :deep(.ant-form-item-label) {
  font-weight: 500;
  padding-bottom: 4px;
}

.form-item-compact :deep(.ant-form-item-label > label) {
  font-size: 13px;
}

.title-input {
  border-radius: 8px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.content-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.supplement-btn {
  color: #667eea;
  font-size: 12px;
  padding: 0 8px;
}

.supplement-btn:hover {
  color: #764ba2;
}

.content-hint {
  font-size: 12px;
  color: #999;
}

.word-status {
  font-size: 12px;
}

.word-remaining {
  margin-left: 4px;
  font-size: 11px;
}

.content-textarea {
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif;
  resize: vertical;
}

.summary-textarea {
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
}

.section-divider {
  margin: 20px 0;
}

.chapter-info-alert {
  margin-bottom: 16px;
  border-radius: 8px;
}

.feedback-section {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 16px;
}

.review-actions {
  padding-top: 0;
  border-top: none;
}

.save-btn {
  height: 44px;
  padding: 0 32px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(82, 196, 26, 0.4);
  transition: all 0.3s ease;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(82, 196, 26, 0.5);
}

.regenerate-btn-secondary {
  height: 44px;
  padding: 0 24px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
}

.supplement-all-btn {
  height: 44px;
  padding: 0 24px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  border: none;
  color: white;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
  transition: all 0.3s ease;
}

.supplement-all-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
  color: white;
}

.back-btn-secondary {
  height: 44px;
  padding: 0 24px;
  border-radius: 10px;
  font-size: 15px;
}

/* 响应式 */
@media (max-width: 768px) {
  .chapter-create-page {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
    text-align: center;
    padding: 12px 16px;
  }

  .header-left {
    flex-direction: column;
  }

  .stats-section :deep(.ant-col) {
    margin-bottom: 12px;
  }

  .config-form {
    padding: 16px;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
