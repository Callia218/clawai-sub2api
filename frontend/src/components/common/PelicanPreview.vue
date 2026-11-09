<template>
  <div ref="container" class="pelican-preview" :class="{ 'pelican-preview--expanded': expanded }">
    <div class="pelican-preview__viewport" :style="viewportStyle">
      <iframe
        ref="frame"
        :srcdoc="source"
        :title="title"
        :style="frameStyle"
        :data-ready="ready"
        sandbox="allow-scripts"
        referrerpolicy="no-referrer"
        loading="lazy"
        scrolling="no"
        class="pelican-preview__frame"
      ></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { buildPelicanDocument, PELICAN_BASE_WIDTH, PELICAN_BASE_HEIGHT, PELICAN_MAX_SIZE } from '@/utils/pelicanPreview'

const props = withDefaults(defineProps<{ html: string; title: string; expanded?: boolean }>(), { expanded: false })
const container = ref<HTMLElement | null>(null)
const frame = ref<HTMLIFrameElement | null>(null)
const width = ref(PELICAN_BASE_WIDTH)
const height = ref(PELICAN_BASE_HEIGHT)
const availableWidth = ref(0)
const availableHeight = ref(0)
const ready = ref(false)
const channel = crypto.randomUUID()
const source = computed(() => buildPelicanDocument(props.html, channel))
const scale = computed(() => Math.min(1, availableWidth.value / width.value || 1,
  props.expanded ? availableHeight.value / height.value || 1 : 1))
const viewportStyle = computed(() => ({ width: `${width.value * scale.value}px`, height: `${height.value * scale.value}px` }))
const frameStyle = computed(() => ({ width: `${width.value}px`, height: `${height.value}px`, transform: `scale(${scale.value})` }))
let observer: ResizeObserver | undefined

function measureContainer() {
  availableWidth.value = container.value?.clientWidth || 0
  availableHeight.value = Math.max(120, window.innerHeight - 180)
}

function onMessage(event: MessageEvent) {
  // srcdoc keeps its opaque origin. Trust only this frame for sizing, never HTML or commands.
  if (event.source !== frame.value?.contentWindow || event.data?.type !== 'pelican:dimensions' || event.data?.channel !== channel) return
  const w = event.data.width
  const h = event.data.height
  if (typeof w !== 'number' || typeof h !== 'number' || !Number.isFinite(w) || !Number.isFinite(h)) return
  if (w < PELICAN_BASE_WIDTH || h < PELICAN_BASE_HEIGHT || w > PELICAN_MAX_SIZE || h > PELICAN_MAX_SIZE) return
  width.value = Math.ceil(w)
  height.value = Math.ceil(h)
  ready.value = true
}

watch(() => props.html, () => {
  width.value = PELICAN_BASE_WIDTH
  height.value = PELICAN_BASE_HEIGHT
  ready.value = false
})
onMounted(() => {
  window.addEventListener('message', onMessage)
  window.addEventListener('resize', measureContainer)
  observer = new ResizeObserver(measureContainer)
  if (container.value) observer.observe(container.value)
  measureContainer()
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('message', onMessage)
  window.removeEventListener('resize', measureContainer)
})
</script>

<style scoped>
.pelican-preview { width: 100%; min-width: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--ui-hairline, rgb(15 23 42 / 0.13)); border-radius: 14px; background: #fff; }
.pelican-preview__viewport { position: relative; flex: none; overflow: hidden; }
.pelican-preview__frame { position: absolute; top: 0; left: 0; display: block; border: 0; background: #fff; transform-origin: top left; }
.pelican-preview--expanded { border-radius: 10px; }
</style>
