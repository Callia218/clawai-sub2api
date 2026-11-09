<template>
  <div class="ui-stat" :class="{ 'ui-stat--compact': compact }">
    <div class="ui-stat__top">
      <span class="ui-stat__label">{{ label }}</span>
      <span v-if="$slots.icon" class="ui-stat__icon">
        <slot name="icon" />
      </span>
    </div>

    <div class="ui-stat__value-row">
      <span class="ui-stat__value ui-num">{{ value }}</span>
      <span v-if="unit" class="ui-stat__unit">{{ unit }}</span>
      <span
        v-if="delta !== undefined && delta !== null"
        class="ui-stat__delta"
        :class="deltaTone"
      >
        {{ delta > 0 ? '+' : '' }}{{ delta }}{{ deltaSuffix }}
      </span>
    </div>

    <div v-if="hint || $slots.hint" class="ui-stat__hint">
      <slot name="hint">{{ hint }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    unit?: string
    hint?: string
    delta?: number | null
    deltaSuffix?: string
    invertDelta?: boolean
    compact?: boolean
  }>(),
  {
    unit: undefined,
    hint: undefined,
    delta: undefined,
    deltaSuffix: '%',
    invertDelta: false,
    compact: false,
  }
)

const deltaTone = computed(() => {
  if (props.delta === undefined || props.delta === null || props.delta === 0) return ''
  const positive = props.delta > 0
  const good = props.invertDelta ? !positive : positive
  return good ? 'is-good' : 'is-bad'
})
</script>

<style scoped>
.ui-stat {
  display: flex;
  flex-direction: column;
  gap: var(--ui-s-2);
  min-width: 0;
  font-family: var(--ui-font);
}

.ui-stat--compact {
  gap: 4px;
}

.ui-stat__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ui-s-2);
}

.ui-stat__label {
  font-size: var(--ui-fs-xs);
  font-weight: 560;
  color: var(--ui-text-muted);
  letter-spacing: 0.004em;
}

.ui-stat__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--ui-r-sm);
  color: var(--ui-accent);
  background-color: var(--ui-accent-soft);
  flex-shrink: 0;
}

.ui-stat__value-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  flex-wrap: wrap;
}

.ui-stat__value {
  font-size: var(--ui-fs-2xl);
  font-weight: 680;
  line-height: 1.1;
  letter-spacing: -0.028em;
  color: var(--ui-text);
}

.ui-stat--compact .ui-stat__value {
  font-size: var(--ui-fs-xl);
}

.ui-stat__unit {
  font-size: var(--ui-fs-xs);
  font-weight: 560;
  color: var(--ui-text-faint);
}

.ui-stat__delta {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: var(--ui-r-pill);
  font-size: var(--ui-fs-2xs);
  font-weight: 620;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
  background-color: var(--ui-line);
}

.ui-stat__delta.is-good {
  color: var(--ui-success);
  background-color: var(--ui-success-soft);
}
.ui-stat__delta.is-bad {
  color: var(--ui-danger);
  background-color: var(--ui-danger-soft);
}

.ui-stat__hint {
  font-size: var(--ui-fs-2xs);
  line-height: 1.45;
  color: var(--ui-text-faint);
}
</style>
