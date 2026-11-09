<template>
  <div ref="rootRef" class="ui-seg" :class="`ui-seg--${size}`" role="tablist">
    <span class="ui-seg__thumb" :style="thumbStyle" aria-hidden="true" />
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      role="tab"
      :aria-selected="modelValue === opt.value"
      :disabled="opt.disabled"
      class="ui-seg__item"
      :class="{ 'is-active': modelValue === opt.value }"
      @click="select(opt.value)"
    >
      <component :is="opt.icon" v-if="opt.icon" class="ui-seg__icon" />
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

type Opt = {
  label: string
  value: string | number
  icon?: unknown
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    options: Opt[]
    size?: 'sm' | 'md'
  }>(),
  { size: 'md' }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string | number): void }>()

const rootRef = ref<HTMLElement | null>(null)
const thumb = ref({ left: 0, width: 0, ready: false })

const thumbStyle = computed(() => ({
  transform: `translateX(${thumb.value.left}px)`,
  width: `${thumb.value.width}px`,
  opacity: thumb.value.ready ? 1 : 0,
}))

function measure() {
  const root = rootRef.value
  if (!root) return
  const active = root.querySelector<HTMLElement>('.ui-seg__item.is-active')
  if (!active) {
    thumb.value = { left: 0, width: 0, ready: false }
    return
  }
  thumb.value = {
    left: active.offsetLeft,
    width: active.offsetWidth,
    ready: true,
  }
}

function select(v: string | number) {
  if (v === props.modelValue) return
  emit('update:modelValue', v)
}

watch(
  () => props.modelValue,
  () => void nextTick(measure)
)

onMounted(() => {
  void nextTick(measure)
  if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
    new ResizeObserver(() => measure()).observe(rootRef.value)
  }
})
</script>

<style scoped>
.ui-seg {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: var(--ui-r-pill);
  background-color: rgb(var(--ui-glass-soft-rgb) / calc(var(--ui-glass-soft-alpha) + 0.06));
  -webkit-backdrop-filter: blur(14px) saturate(170%);
  backdrop-filter: blur(14px) saturate(170%);
  box-shadow:
    inset 0 1px 1px var(--ui-edge-inner),
    inset 0 -1px 1px var(--ui-edge-shade),
    0 0 0 1px var(--ui-line);
  font-family: var(--ui-font);
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}
.ui-seg::-webkit-scrollbar {
  display: none;
}

.ui-seg__thumb {
  position: absolute;
  top: 3px;
  left: 0;
  height: calc(100% - 6px);
  border-radius: var(--ui-r-pill);
  background-color: rgb(var(--ui-glass-strong-rgb) / calc(var(--ui-glass-strong-alpha) + 0.26));
  box-shadow:
    inset 0 1px 1px var(--ui-edge-strong),
    0 2px 8px -3px rgb(15 23 42 / 0.28);
  transition:
    transform var(--ui-dur-base) var(--ui-ease-spring),
    width var(--ui-dur-base) var(--ui-ease-spring),
    opacity var(--ui-dur-fast) linear;
  pointer-events: none;
}

.ui-seg__item {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  border-radius: var(--ui-r-pill);
  color: var(--ui-text-muted);
  font-family: var(--ui-font);
  font-weight: 560;
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--ui-dur-fast) var(--ui-ease-out);
}

.ui-seg--sm .ui-seg__item {
  height: 26px;
  padding: 0 10px;
  font-size: var(--ui-fs-xs);
}
.ui-seg--md .ui-seg__item {
  height: 32px;
  padding: 0 14px;
  font-size: var(--ui-fs-sm);
}

.ui-seg__item:hover:not(.is-active):not(:disabled) {
  color: var(--ui-text-soft);
}

.ui-seg__item.is-active {
  color: var(--ui-text);
  font-weight: 620;
}

.ui-seg__item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ui-seg__icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
</style>
