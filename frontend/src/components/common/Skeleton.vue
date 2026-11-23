<template>
  <div
    :class="[
      'skeleton-block bg-gray-200 dark:bg-dark-700',
      variant === 'circle' ? 'rounded-full' : 'rounded-lg',
      customClass
    ]"
    :style="style"
  ></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'rect' | 'circle' | 'text'
  width?: string | number
  height?: string | number
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'rect',
  width: '100%'
})

const customClass = computed(() => props.class || '')

const style = computed(() => {
  const s: Record<string, string> = {}
  
  if (props.width) {
    s.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  
  if (props.height) {
    s.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  } else if (props.variant === 'text') {
    s.height = '1em'
    s.marginTop = '0.25em'
    s.marginBottom = '0.25em'
  }
  
  return s
})
</script>

<style scoped>
.skeleton-block { position: relative; overflow: hidden; }
@media (prefers-reduced-motion: no-preference) {
  .skeleton-block::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(100deg, transparent 20%, rgb(255 255 255 / .38), transparent 80%);
    animation: skeleton-sweep 1500ms linear infinite;
  }
  :global(.dark) .skeleton-block::after { opacity: .24; }
  @keyframes skeleton-sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
}
</style>
