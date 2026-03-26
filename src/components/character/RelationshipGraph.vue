<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'
import { useCharacterRelation, RELATION_TYPES } from '@/composables/useCharacterRelation'

const props = defineProps({
  novelId: {
    type: Number,
    required: true
  },
  characters: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select-character', 'select-relation'])

const {
  relations,
  loading,
  loadRelations,
  createRelation,
  updateRelation,
  deleteRelation,
  generateGraphData
} = useCharacterRelation()

// 图谱容器引用
const graphContainer = ref(null)
let network = null
let nodesDataSet = null
let edgesDataSet = null

// 选中的节点/边
const selectedNode = ref(null)
const selectedEdge = ref(null)

// 关系编辑弹窗
const relationModalVisible = ref(false)
const editingRelation = ref(null)
const relationForm = ref({
  sourceId: null,
  targetId: null,
  type: 'friend',
  description: '',
  strength: 'normal',
  direction: 'mutual'
})

// 视图控制
const zoomLevel = ref(100)

// 图谱配置
const graphOptions = {
  physics: {
    enabled: true,
    solver: 'forceAtlas2Based',
    forceAtlas2Based: {
      gravitationalConstant: -50,
      centralGravity: 0.01,
      springLength: 150,
      springConstant: 0.08,
      damping: 0.4
    },
    stabilization: {
      enabled: true,
      iterations: 200,
      updateInterval: 25
    }
  },
  interaction: {
    hover: true,
    tooltipDelay: 200,
    zoomView: true,
    dragView: true,
    dragNodes: true,
    selectConnectedEdges: false
  },
  nodes: {
    borderWidth: 2,
    borderWidthSelected: 4,
    shadow: true
  },
  edges: {
    smooth: {
      enabled: true,
      type: 'continuous'
    },
    hoverWidth: 2
  },
  layout: {
    improvedLayout: true
  }
}

// 初始化图谱
const initGraph = async () => {
  if (!graphContainer.value) return

  await loadRelations(props.novelId)
  const { nodes, edges } = await generateGraphData(props.novelId)

  // 创建数据集
  nodesDataSet = new DataSet(nodes)
  edgesDataSet = new DataSet(edges)

  // 创建网络图
  network = new Network(
    graphContainer.value,
    {
      nodes: nodesDataSet,
      edges: edgesDataSet
    },
    graphOptions
  )

  // 绑定事件
  bindNetworkEvents()
}

// 绑定网络图事件
const bindNetworkEvents = () => {
  if (!network) return

  // 点击节点
  network.on('click', (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0]
      const node = nodesDataSet.get(nodeId)
      selectedNode.value = node
      selectedEdge.value = null
      emit('select-character', node?.character)
    } else if (params.edges.length > 0) {
      const edgeId = params.edges[0]
      const edge = edgesDataSet.get(edgeId)
      selectedEdge.value = edge
      selectedNode.value = null
      emit('select-relation', edge?.relation)
    } else {
      selectedNode.value = null
      selectedEdge.value = null
    }
  })

  // 双击节点 - 打开角色详情
  network.on('doubleClick', (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0]
      const node = nodesDataSet.get(nodeId)
      openRelationModal(node?.character, null)
    }
  })

  // 悬停节点
  network.on('hoverNode', (params) => {
    graphContainer.value.style.cursor = 'pointer'
  })

  network.on('blurNode', () => {
    graphContainer.value.style.cursor = 'default'
  })

  // 拖拽结束
  network.on('dragEnd', () => {
    // 可以保存节点位置
  })
}

// 打开关系编辑弹窗
const openRelationModal = (sourceCharacter = null, relation = null) => {
  if (relation) {
    // 编辑现有关系
    editingRelation.value = relation
    relationForm.value = {
      sourceId: relation.sourceId,
      targetId: relation.targetId,
      type: relation.type,
      description: relation.description || '',
      strength: relation.strength || 'normal',
      direction: relation.direction || 'mutual'
    }
  } else {
    // 创建新关系
    editingRelation.value = null
    relationForm.value = {
      sourceId: sourceCharacter?.id || null,
      targetId: null,
      type: 'friend',
      description: '',
      strength: 'normal',
      direction: 'mutual'
    }
  }
  relationModalVisible.value = true
}

// 保存关系
const handleSaveRelation = async () => {
  if (!relationForm.value.sourceId || !relationForm.value.targetId) {
    message.warning('请选择两个角色')
    return
  }

  if (relationForm.value.sourceId === relationForm.value.targetId) {
    message.warning('不能创建自引用关系')
    return
  }

  try {
    if (editingRelation.value) {
      await updateRelation(editingRelation.value.id, {
        ...relationForm.value,
        novelId: props.novelId
      })
    } else {
      await createRelation({
        ...relationForm.value,
        novelId: props.novelId
      })
    }

    relationModalVisible.value = false
    await refreshGraph()
  } catch (error) {
    console.error('保存关系失败:', error)
  }
}

// 删除关系
const handleDeleteRelation = () => {
  if (!selectedEdge.value?.relation) return

  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这个角色关系吗？',
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      await deleteRelation(selectedEdge.value.relation.id)
      selectedEdge.value = null
      await refreshGraph()
    }
  })
}

// 刷新图谱
const refreshGraph = async () => {
  const { nodes, edges } = await generateGraphData(props.novelId)

  // 更新数据集
  nodesDataSet.clear()
  nodesDataSet.add(nodes)

  edgesDataSet.clear()
  edgesDataSet.add(edges)

  network.fit({
    animation: {
      duration: 500,
      easingFunction: 'easeInOutQuad'
    }
  })
}

// 缩放控制
const handleZoomIn = () => {
  if (network) {
    const scale = network.getScale() * 1.2
    network.moveTo({ scale })
    zoomLevel.value = Math.round(scale * 100)
  }
}

const handleZoomOut = () => {
  if (network) {
    const scale = network.getScale() / 1.2
    network.moveTo({ scale })
    zoomLevel.value = Math.round(scale * 100)
  }
}

const handleFitView = () => {
  if (network) {
    network.fit({
      animation: true
    })
  }
}

// 获取角色名称
const getCharacterName = (id) => {
  const char = props.characters.find(c => c.id === id)
  return char?.name || '未知角色'
}

// 过滤可选的目标角色（排除源角色）
const availableTargetCharacters = computed(() => {
  if (!relationForm.value.sourceId) return props.characters
  return props.characters.filter(c => c.id !== relationForm.value.sourceId)
})

// 关系类型选项
const relationTypeOptions = Object.entries(RELATION_TYPES).map(([key, value]) => ({
  value: key,
  label: `${value.icon} ${value.label}`
}))

// 监听角色变化
watch(() => props.characters, async () => {
  if (network) {
    await refreshGraph()
  }
}, { deep: true })

// 生命周期
onMounted(async () => {
  await nextTick()
  await initGraph()
})

onUnmounted(() => {
  if (network) {
    network.destroy()
    network = null
  }
})

// 暴露方法给父组件
defineExpose({
  refreshGraph,
  openRelationModal
})
</script>

<template>
  <div class="relationship-graph">
    <!-- 工具栏 -->
    <div class="graph-toolbar">
      <div class="toolbar-left">
        <a-button-group>
          <a-button @click="handleZoomIn" title="放大">
            <template #icon>
              <span class="icon">🔍+</span>
            </template>
          </a-button>
          <a-button @click="handleZoomOut" title="缩小">
            <template #icon>
              <span class="icon">🔍-</span>
            </template>
          </a-button>
          <a-button @click="handleFitView" title="适应视图">
            <template #icon>
              <span class="icon">⊞</span>
            </template>
          </a-button>
        </a-button-group>

        <a-divider type="vertical" />

        <a-button type="primary" @click="openRelationModal()">
          添加关系
        </a-button>

        <a-button
          v-if="selectedEdge"
          danger
          @click="handleDeleteRelation"
        >
          删除关系
        </a-button>
      </div>

      <div class="toolbar-right">
        <span class="relation-count">
          共 {{ relations.length }} 条关系
        </span>
      </div>
    </div>

    <!-- 图谱容器 -->
    <div class="graph-wrapper">
      <a-spin :spinning="loading" tip="加载中...">
        <div ref="graphContainer" class="graph-canvas"></div>
      </a-spin>

      <!-- 空状态 -->
      <div v-if="!loading && relations.length === 0" class="empty-overlay">
        <a-empty description="暂无角色关系">
          <a-button type="primary" @click="openRelationModal()">
            添加第一个关系
          </a-button>
        </a-empty>
      </div>
    </div>

    <!-- 选中信息面板 -->
    <div v-if="selectedNode || selectedEdge" class="selection-panel">
      <div v-if="selectedNode" class="panel-content">
        <div class="panel-title">
          <span class="character-avatar">👤</span>
          <span>{{ selectedNode.character?.name }}</span>
          <a-tag :color="selectedNode.character?.type === 'protagonist' ? 'blue' : 'default'">
            {{ selectedNode.character?.type === 'protagonist' ? '主角' : '角色' }}
          </a-tag>
        </div>
        <div v-if="selectedNode.character?.basicInfo" class="panel-info">
          <p v-if="selectedNode.character.basicInfo.identity">
            <strong>身份：</strong>{{ selectedNode.character.basicInfo.identity }}
          </p>
          <p v-if="selectedNode.character.basicInfo.personality">
            <strong>性格：</strong>{{ selectedNode.character.basicInfo.personality }}
          </p>
        </div>
        <a-button type="link" @click="openRelationModal(selectedNode.character)">
          添加关系
        </a-button>
      </div>

      <div v-if="selectedEdge" class="panel-content">
        <div class="panel-title">
          <span>🔗 关系</span>
        </div>
        <div class="panel-info">
          <p>
            <strong>{{ getCharacterName(selectedEdge.relation?.sourceId) }}</strong>
            <a-tag :color="RELATION_TYPES[selectedEdge.relation?.type]?.color">
              {{ RELATION_TYPES[selectedEdge.relation?.type]?.label }}
            </a-tag>
            <strong>{{ getCharacterName(selectedEdge.relation?.targetId) }}</strong>
          </p>
          <p v-if="selectedEdge.relation?.description">
            {{ selectedEdge.relation.description }}
          </p>
        </div>
        <a-space>
          <a-button type="link" @click="openRelationModal(null, selectedEdge.relation)">
            编辑
          </a-button>
          <a-button type="link" danger @click="handleDeleteRelation">
            删除
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 关系图例 -->
    <div class="legend-panel">
      <div class="legend-title">关系类型</div>
      <div class="legend-items">
        <span
          v-for="(info, type) in RELATION_TYPES"
          :key="type"
          class="legend-item"
        >
          <span class="legend-color" :style="{ backgroundColor: info.color }"></span>
          <span>{{ info.label }}</span>
        </span>
      </div>
    </div>

    <!-- 关系编辑弹窗 -->
    <a-modal
      v-model:open="relationModalVisible"
      :title="editingRelation ? '编辑关系' : '添加关系'"
      @ok="handleSaveRelation"
      :confirmLoading="loading"
      width="500px"
    >
      <a-form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="源角色" required>
          <a-select
            v-model:value="relationForm.sourceId"
            placeholder="选择角色"
            :disabled="!!editingRelation"
          >
            <a-select-option
              v-for="char in props.characters"
              :key="char.id"
              :value="char.id"
            >
              {{ char.name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="目标角色" required>
          <a-select
            v-model:value="relationForm.targetId"
            placeholder="选择角色"
            :disabled="!!editingRelation"
          >
            <a-select-option
              v-for="char in availableTargetCharacters"
              :key="char.id"
              :value="char.id"
            >
              {{ char.name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="关系类型" required>
          <a-select v-model:value="relationForm.type">
            <a-select-option
              v-for="option in relationTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="关系强度">
          <a-radio-group v-model:value="relationForm.strength">
            <a-radio value="strong">强</a-radio>
            <a-radio value="normal">中</a-radio>
            <a-radio value="weak">弱</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="方向">
          <a-radio-group v-model:value="relationForm.direction">
            <a-radio value="mutual">双向</a-radio>
            <a-radio value="oneway">单向</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="描述">
          <a-textarea
            v-model:value="relationForm.description"
            placeholder="关系描述（可选）"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.relationship-graph {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
  position: relative;
}

.graph-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  border-radius: 8px 8px 0 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  color: var(--text-secondary);
  font-size: 13px;
}

.icon {
  font-size: 16px;
}

.graph-wrapper {
  flex: 1;
  position: relative;
  border: 1px solid var(--border-color);
  border-top: none;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  background: #fafafa;
}

.graph-canvas {
  width: 100%;
  height: 500px;
  min-height: 500px;
}

.empty-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
}

.selection-panel {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 16px;
  min-width: 250px;
  max-width: 300px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 12px;
}

.character-avatar {
  font-size: 24px;
}

.panel-info {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.panel-info p {
  margin: 4px 0;
}

.legend-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 12px 16px;
}

.legend-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 13px;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.relation-count {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
