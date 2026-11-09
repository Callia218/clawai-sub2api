<template>
  <img :src="displaySource" :class="{ 'public-brand-logo--mono': isMonochrome }" alt="" @load="normalizeBackground" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ src: string }>()
const displaySource = ref(props.src)
const isMonochrome = ref(false)
watch(() => props.src, (source) => {
  isMonochrome.value = false
  displaySource.value = source
})

// Presentation only: never rewrite the administrator's uploaded logo.
// Normalize opaque, monochrome, white-backed marks; keep colored/transparent
// images untouched. Remote images without CORS safely keep their original src.
function normalizeBackground(event: Event) {
  const image = event.target as HTMLImageElement
  if (isMonochrome.value || image.getAttribute('src') !== props.src) return
  try {
    const canvas = document.createElement('canvas')
    canvas.width = Math.min(image.naturalWidth, 256)
    canvas.height = Math.min(image.naturalHeight, 256)
    if (!canvas.width || !canvas.height) return
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    let ink = 0
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4
        const [r, g, b, a] = pixels.data.subarray(i, i + 4)
        if (a < 250 || Math.max(r, g, b) - Math.min(r, g, b) > 10) return
        const edge = x === 0 || y === 0 || x === canvas.width - 1 || y === canvas.height - 1
        if (edge && Math.min(r, g, b) < 245) return
        if (r < 128) ink++
      }
    }
    if (ink < canvas.width * canvas.height * 0.01) return
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i + 3] = 255 - pixels.data[i]
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 0
    }
    context.putImageData(pixels, 0, 0)
    displaySource.value = canvas.toDataURL('image/png')
    isMonochrome.value = true
  } catch {
    // A tainted canvas or unsupported format is not a broken logo.
  }
}
</script>

<style scoped>
:global(.dark .public-brand-logo--mono) { filter: invert(1); }
</style>
