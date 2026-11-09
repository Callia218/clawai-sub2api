<template>
  <div class="shell">
    <ShellBackdrop />

    <ShellRail />

    <div class="shell__body" :class="{ 'shell__body--rail-collapsed': collapsed }">
      <ShellTopbar />

      <main ref="viewportRef" class="shell__viewport ui-scroll">
        <div class="shell__content">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/styles/onboarding.css'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore, useAuthStore, useOnboardingStore } from '@/stores'
import { useOnboardingTour } from '@/composables/useOnboardingTour'
import ShellBackdrop from './ShellBackdrop.vue'
import ShellRail from './ShellRail.vue'
import ShellTopbar from './ShellTopbar.vue'

const route = useRoute()
const viewportRef = ref<HTMLElement | null>(null)

// 内层滚动容器不会触发 router 的 scrollBehavior（那只管 window），
// 所以换页后必须自己把内容区拉回顶部，否则新页面会停在上一页的滚动位置。
watch(
  () => route.fullPath,
  () => {
    const el = viewportRef.value
    if (!el) return
    const prev = el.style.scrollBehavior
    el.style.scrollBehavior = 'auto'
    el.scrollTop = 0
    el.style.scrollBehavior = prev
  }
)

const appStore = useAppStore()
const authStore = useAuthStore()
const onboardingStore = useOnboardingStore()

const collapsed = computed(() => appStore.sidebarCollapsed)
const isAdmin = computed(() => authStore.user?.role === 'admin')

const { replayTour } = useOnboardingTour({
  storageKey: isAdmin.value ? 'admin_guide' : 'user_guide',
  autoStart: true,
})

onMounted(() => {
  onboardingStore.setReplayCallback(replayTour)
})

defineExpose({ replayTour })
</script>

<style scoped>
.shell {
  position: relative;
  /* Keep navigation and glass stacking contexts below body-level dialogs. */
  isolation: isolate;
  min-height: 100vh;
  min-height: 100dvh;
  font-family: var(--ui-font);
  color: var(--ui-text);
  background-color: var(--ui-canvas);
}

/* ------------------------------------------------------------------ 主体 */
.shell__body {
  position: relative;
  z-index: 10;
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--ui-s-3);
  /* 锁成视口高度：让 .shell__viewport 拿到确定的剩余高度，
     否则它会被内容撑满、自己滚不动，而 overscroll-behavior:contain
     又会拦住滚轮向文档传递 → 整页无法下滑。 */
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  padding: var(--ui-s-4) var(--ui-s-4) 0;
  margin-left: calc(var(--ui-panel-w) + var(--ui-s-4) * 2);
  transition: margin-left var(--ui-dur-slow) var(--ui-ease-out);
}

.shell__body--rail-collapsed {
  margin-left: calc(var(--ui-rail-w) + var(--ui-s-4) * 2);
}

/* ------------------------------------------------------------------ 内容区 */
.shell__viewport {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: var(--ui-s-4);
  scroll-behavior: smooth;
}

.shell__content {
  width: 100%;
  min-width: 0;
  max-width: var(--ui-content-max);
  margin: 0 auto;
  padding-bottom: var(--ui-s-8);
}

/* Table pages use the actual space below the floating toolbar. */
.shell__content:has(> .table-page-layout) {
  height: 100%;
  padding-bottom: 0;
}

:global(body.modal-open) .shell__viewport {
  overflow: hidden;
}

/* ------------------------------------------------------------------ 响应式 */
@media (max-width: 1023px) {
  .shell__body,
  .shell__body--rail-collapsed {
    margin-left: 0;
    padding: var(--ui-s-3) var(--ui-s-3) 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shell__body {
    transition: none;
  }
  .shell__viewport {
    scroll-behavior: auto;
  }
}
</style>
