<template>
  <span
    class="ui-skeleton"
    :class="{ 'ui-skeleton--circle': circle }"
    :style="{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      borderRadius: circle ? '50%' : radius,
    }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string | number
    height?: string | number
    radius?: string
    circle?: boolean
  }>(),
  { width: '100%', height: 14, radius: 'var(--ui-r-sm)', circle: false }
)
</script>

<style scoped>
.ui-skeleton {
  display: block;
  position: relative;
  overflow: hidden;
  background-color: rgb(var(--ui-glass-soft-rgb) / calc(var(--ui-glass-soft-alpha) + 0.07));
  box-shadow: inset 0 0 0 1px var(--ui-line-soft);
}

.ui-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgb(255 255 255 / 0.34) 46%,
    rgb(255 255 255 / 0.06) 62%,
    transparent 100%
  );
  animation: ui-skeleton-sweep 1.5s var(--ui-ease-in-out) infinite;
}

html.dark .ui-skeleton::after,
html[data-theme='dark'] .ui-skeleton::after {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgb(255 255 255 / 0.10) 46%,
    rgb(255 255 255 / 0.02) 62%,
    transparent 100%
  );
}

@keyframes ui-skeleton-sweep {
  100% {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-skeleton::after {
    animation: none;
  }
}
</style>
