/**
 * clawAI UI · 设计系统统一出口
 *
 * 用法：
 *   import { UiButton, UiCard, UiField } from '@/ui'
 *   // 样式令牌由 main.ts 一次性引入 '@/ui/tokens.css' + '@/ui/base.css'
 *
 * 约定：
 *   - 新页面/新组件一律使用 ui-* 组件与 --ui-* 令牌
 *   - 禁止在新代码里使用旧的 .btn / .card / .input 全局类
 */

export { default as UiButton } from './UiButton.vue'
export { default as UiCard } from './UiCard.vue'
export { default as UiField } from './UiField.vue'
export { default as UiBadge } from './UiBadge.vue'
export { default as UiSegmented } from './UiSegmented.vue'
export { default as UiStat } from './UiStat.vue'
export { default as UiEmpty } from './UiEmpty.vue'
export { default as UiSkeleton } from './UiSkeleton.vue'
export { default as UiModal } from './UiModal.vue'
export { default as UiSwitch } from './UiSwitch.vue'
export { default as UiTable } from './UiTable.vue'

export type { UiTableColumn } from './UiTable.vue'
