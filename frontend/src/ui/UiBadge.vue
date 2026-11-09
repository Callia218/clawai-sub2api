<template>
  <span :class="['ui-badge', `ui-badge--${tone}`, `ui-badge--${size}`, { 'ui-badge--glass': glass }]">
    <span v-if="dot" class="ui-badge__dot" aria-hidden="true" />
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
    size?: 'xs' | 'sm' | 'md'
    dot?: boolean
    glass?: boolean
  }>(),
  { tone: 'neutral', size: 'sm', dot: false, glass: false }
)
</script>

<style scoped>
.ui-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: var(--ui-r-pill);
  font-family: var(--ui-font);
  font-weight: 580;
  letter-spacing: 0.008em;
  white-space: nowrap;
  line-height: 1;
}

.ui-badge--xs {
  height: 18px;
  padding: 0 6px;
  font-size: var(--ui-fs-2xs);
}
.ui-badge--sm {
  height: 22px;
  padding: 0 8px;
  font-size: var(--ui-fs-2xs);
}
.ui-badge--md {
  height: 26px;
  padding: 0 10px;
  font-size: var(--ui-fs-xs);
}

.ui-badge--neutral {
  color: var(--ui-text-soft);
  background-color: var(--ui-line);
}
.ui-badge--accent {
  color: var(--ui-accent);
  background-color: var(--ui-accent-soft);
}
.ui-badge--success {
  color: var(--ui-success);
  background-color: var(--ui-success-soft);
}
.ui-badge--warning {
  color: var(--ui-warning);
  background-color: var(--ui-warning-soft);
}
.ui-badge--danger {
  color: var(--ui-danger);
  background-color: var(--ui-danger-soft);
}
.ui-badge--info {
  color: var(--ui-info);
  background-color: var(--ui-info-soft);
}

.ui-badge--glass {
  -webkit-backdrop-filter: blur(10px) saturate(170%);
  backdrop-filter: blur(10px) saturate(170%);
  box-shadow:
    inset 0 1px 0.5px var(--ui-edge-inner),
    0 0 0 1px var(--ui-line);
}

.ui-badge__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: currentColor;
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 22%, transparent);
  flex-shrink: 0;
}
</style>
