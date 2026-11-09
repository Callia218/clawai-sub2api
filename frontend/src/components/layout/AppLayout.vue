<template>
  <AppShell ref="shellRef">
    <slot />
  </AppShell>
</template>

<script setup lang="ts">
/**
 * AppLayout —— 全站唯一的外壳入口。
 *
 * 结构级重构（2026-10-17）：
 *   旧实现 = 贴边固定侧边栏 + 贴顶 header + 平铺内容区（bg-gray-50 / bg-mesh-gradient）
 *   新实现 = 浮动玻璃侧边栏（分组导航）+ 悬浮玻璃顶栏 + 独立滚动视口（液态背景层）
 *
 * 所有页面都通过 `<AppLayout>…</AppLayout>` 包裹，因此只改这里即可让全站换骨架，
 * 页面内部逻辑与数据零改动。
 */
import { ref } from 'vue'
import AppShell from '@/shell/AppShell.vue'

const shellRef = ref<InstanceType<typeof AppShell> | null>(null)

function replayTour() {
  shellRef.value?.replayTour?.()
}

defineExpose({ replayTour })
</script>
