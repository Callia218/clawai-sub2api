<template>
  <aside ref="root" class="rl-stories" :aria-label="t('referenceLanding.stories.label', { siteName: props.siteName })" :class="{ 'rl-stories--paused': paused, 'rl-stories--static': staticMode }" tabindex="0"
    @pointerenter="hovered = true" @pointerleave="hovered = false" @focusin="focused = true" @focusout="onFocusOut">
    <p class="rl-story-caption">{{ t('referenceLanding.stories.caption', { siteName: props.siteName }) }}</p>
    <div class="rl-story-columns" :tabindex="staticMode ? 0 : undefined">
      <div v-for="(column, index) in columns" :key="index" class="rl-story-column" :aria-hidden="index === 1 ? true : undefined">
        <div class="rl-story-track">
          <div v-for="copy in 3" :key="copy" class="rl-story-set" :aria-hidden="copy > 1 ? true : undefined">
            <article v-for="story in column" :key="story.id" class="glass-panel rl-story-card">
              <div class="rl-story-heading">
                <span class="glass-control rl-story-avatar" aria-hidden="true">
                  <span>{{ story.name.slice(0, 1) }}</span>
                </span>
                <div class="rl-story-author"><h2>{{ story.name }}</h2><span>{{ story.role }}</span></div>
                <span class="glass-control rl-story-tag">{{ story.tag }}</span>
              </div>
              <span class="rl-story-rating" role="img" :aria-label="t('referenceLanding.stories.rating')">
                <svg v-for="star in 5" :key="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 14.94 8.46 21.52 9.42 16.76 14.06 17.88 20.61 12 17.52 6.12 20.61 7.24 14.06 2.48 9.42 9.06 8.46Z" /></svg>
              </span>
              <p>{{ story.text }}</p>
            </article>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{ siteName?: string }>(), { siteName: 'ChatGPT' })
const { t } = useI18n()
const root = ref<HTMLElement | null>(null)
const visible = ref(true)
const pageVisible = ref(!document.hidden)
const hovered = ref(false)
const focused = ref(false)
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const reducedMotion = ref(motionQuery.matches)
const nativeMotionSupported = typeof Element.prototype.animate === 'function'
const staticMode = computed(() => reducedMotion.value || !nativeMotionSupported)
const paused = computed(() => !visible.value || !pageVisible.value || hovered.value || focused.value || staticMode.value)
let observer: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined
let mounted = false
type ScrollColumn = {
  element: HTMLElement
  track: HTMLElement
  firstSet: HTMLElement
  speed: number
  duration: number
  progress: number
  distance: number
  animation?: Animation
  running: boolean
}
let scrollColumns: ScrollColumn[] = []
const syncVisibility = () => { pageVisible.value = !document.hidden }
const syncMotionPreference = () => { reducedMotion.value = motionQuery.matches }
const onFocusOut = (event: FocusEvent) => {
  focused.value = event.relatedTarget instanceof Node && !!root.value?.contains(event.relatedTarget)
}
const stories = computed(() => (['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'] as const).map(id => ({
  id,
  name: t(`referenceLanding.stories.${id}Name`),
  role: t(`referenceLanding.stories.${id}Role`),
  text: t(`referenceLanding.stories.${id}Text`, { siteName: props.siteName }),
  tag: t(`referenceLanding.stories.${id}Tag`),
})))
const columns = computed(() => [stories.value, stories.value])

const readProgress = (column: ScrollColumn) => {
  const time = column.animation?.currentTime
  if (typeof time !== 'number' || !Number.isFinite(time) || column.duration <= 0) return column.progress
  return ((time % column.duration) + column.duration) % column.duration / column.duration
}
const stop = (column: ScrollColumn) => {
  column.progress = readProgress(column)
  column.animation?.cancel()
  column.animation = undefined
  column.running = false
  column.track.style.removeProperty('transform')
}
const syncPlayback = () => {
  if (!mounted) return
  for (const column of scrollColumns) {
    if (staticMode.value) {
      stop(column)
      continue
    }
    const shouldRun = !paused.value && column.distance > 0
    if (!column.animation || shouldRun === column.running) continue
    shouldRun ? column.animation.play() : column.animation.pause()
    column.running = shouldRun
  }
}
const keyframes = (distance: number) => [
  { transform: 'translateY(0px)' },
  { transform: `translateY(-${distance}px)` },
]
const measure = () => {
  if (!mounted) return
  if (staticMode.value) {
    scrollColumns.forEach(stop)
    return
  }
  for (const column of scrollColumns) {
    const distance = column.firstSet.getBoundingClientRect().height
    if (distance <= 0 || distance * 2 < column.element.clientHeight) {
      stop(column)
      column.distance = 0
      continue
    }
    // An unchanged measurement must not restart or seek an existing animation.
    if (column.animation && Math.abs(distance - column.distance) < 0.01) continue
    const progress = readProgress(column)
    const duration = distance / column.speed * 1000
    if (column.animation) {
      const effect = column.animation.effect as KeyframeEffect
      effect.setKeyframes(keyframes(distance))
      effect.updateTiming({ duration })
      column.animation.currentTime = progress * duration
    } else {
      column.animation = column.track.animate(keyframes(distance), { duration, iterations: Infinity, easing: 'linear', fill: 'none' })
      // Resolve the time before pausing an animation with an infinite end time.
      column.animation.currentTime = progress * duration
      column.animation.pause()
      column.running = false
    }
    column.distance = distance
    column.duration = duration
    column.progress = progress
  }
  syncPlayback()
}
watch(paused, syncPlayback, { flush: 'sync' })
watch(staticMode, measure, { flush: 'post' })

onMounted(() => {
  mounted = true
  scrollColumns = Array.from(root.value?.querySelectorAll<HTMLElement>('.rl-story-column') ?? []).map((element, index) => ({
    element,
    track: element.querySelector<HTMLElement>('.rl-story-track')!,
    firstSet: element.querySelector<HTMLElement>('.rl-story-set')!,
    speed: index === 0 ? 100 / 3 : 175 / 6,
    duration: 0,
    progress: index === 0 ? 0 : 0.5,
    distance: 0,
    running: false,
  }))
  document.addEventListener('visibilitychange', syncVisibility)
  motionQuery.addEventListener?.('change', syncMotionPreference)
  window.addEventListener('resize', measure, { passive: true })
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure)
    for (const column of scrollColumns) {
      resizeObserver.observe(column.element)
      resizeObserver.observe(column.firstSet)
    }
  }
  if (typeof IntersectionObserver !== 'undefined' && root.value) {
    observer = new IntersectionObserver(entries => {
      visible.value = entries.some(entry => entry.isIntersecting)
    }, { threshold: 0 })
    observer.observe(root.value)
  }
  measure()
  document.fonts?.ready.then(() => { if (mounted) measure() })
})
onBeforeUnmount(() => {
  mounted = false
  scrollColumns.forEach(stop)
  observer?.disconnect()
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', syncVisibility)
  motionQuery.removeEventListener?.('change', syncMotionPreference)
  window.removeEventListener('resize', measure)
})
</script>
