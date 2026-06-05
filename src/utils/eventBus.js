/**
 * 简单的事件总线
 * 用于跨组件通信，特别是后台任务的触发
 */
class EventBus {
  constructor() {
    this.events = {}
  }

  /**
   * 监听事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听的函数
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)

    // 返回取消监听的函数
    return () => {
      this.off(event, callback)
    }
  }

  /**
   * 取消监听
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (!this.events[event]) return
    this.events[event] = this.events[event].filter(cb => cb !== callback)
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 传递的数据
   */
  emit(event, data) {
    if (!this.events[event]) return
    this.events[event].forEach(callback => {
      try {
        callback(data)
      } catch (err) {
        console.error(`事件 ${event} 处理错误:`, err)
      }
    })
  }

  /**
   * 异步触发事件
   * 关键任务链路使用可等待版本，避免异步监听器错误被静默吞掉。
   * @param {string} event - 事件名称
   * @param {*} data - 传递的数据
   */
  async emitAsync(event, data) {
    if (!this.events[event]) return
    for (const callback of this.events[event]) {
      try {
        await callback(data)
      } catch (err) {
        console.error(`事件 ${event} 异步处理错误:`, err)
      }
    }
  }

  /**
   * 只监听一次
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  once(event, callback) {
    const onceCallback = (data) => {
      callback(data)
      this.off(event, onceCallback)
    }
    this.on(event, onceCallback)
  }
}

// 创建全局事件总线实例
export const eventBus = new EventBus()

// 预定义的事件名称
export const EVENTS = {
  // 后台任务相关
  TASK_CREATED: 'task:created',           // 任务创建
  TASK_EXECUTED: 'task:executed',         // 任务执行完成
  TASK_FAILED: 'task:failed',             // 任务执行失败
  TASK_STATUS_CHANGED: 'task:statusChanged', // 任务状态变更

  // 章节相关
  CHAPTER_SAVED: 'chapter:saved',         // 章节保存
  CHAPTER_POST_PROCESS: 'chapter:postProcess', // 章节后处理

  // 批量操作相关
  BATCH_TASK_CREATED: 'batch:taskCreated', // 批量任务创建
}

export default eventBus
