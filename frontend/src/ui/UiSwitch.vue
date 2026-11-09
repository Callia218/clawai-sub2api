<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    class="ui-switch"
    :class="[`ui-switch--${size}`, { 'is-on': modelValue }]"
    @click="toggle"
  >
    <span class="ui-switch__track">
      <span class="ui-switch__thumb" />
    </span>
    <span v-if="label" class="ui-switch__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    disabled?: boolean
    size?: 'sm' | 'md'
    label?: string
  }>(),
  { disabled: false, size: 'md', label: undefined }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<style scoped>
.ui-switch {
  display: inline-flex;
  align-items: center;
  gap: var(--ui-s-2);
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-family: var(--ui-font);
  color: var(--ui-text-soft);
}

.ui-switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ui-switch__track {
  position: relative;
  display: inline-flex;
  align-items: center;
  border-radius: var(--ui-r-pill);
  background-color: rgb(var(--ui-glass-soft-rgb) / calc(var(--ui-glass-soft-alpha) + 0.14));
  box-shadow:
    inset 0 1px 2px var(--ui-edge-shade),
    0 0 0 1px var(--ui-line);
  transition: background-color var(--ui-dur-base) var(--ui-ease-out);
}

.ui-switch--sm .ui-switch__track {
  width: 34px;
  height: 20px;
  padding: 2px;
}
.ui-switch--md .ui-switch__track {
  width: 42px;
  height: 25px;
  padding: 2.5px;
}

.ui-switch__thumb {
  display: block;
  border-radius: 50%;
  background: #fff;
  box-shadow:
    0 1px 2px rgb(15 23 42 / 0.28),
    0 0 0 0.5px rgb(15 23 42 / 0.06);
  transition: transform var(--ui-dur-base) var(--ui-ease-spring);
}

.ui-switch--sm .ui-switch__thumb {
  width: 16px;
  height: 16px;
}
.ui-switch--md .ui-switch__thumb {
  width: 20px;
  height: 20px;
}

.ui-switch.is-on .ui-switch__track {
  background-image: var(--ui-arc);
  box-shadow:
    inset 0 1px 1px rgb(255 255 255 / 0.42),
    0 4px 12px -6px rgb(13 148 136 / 0.7);
}

.ui-switch--sm.is-on .ui-switch__thumb {
  transform: translateX(14px);
}
.ui-switch--md.is-on .ui-switch__thumb {
  transform: translateX(17px);
}

.ui-switch__label {
  font-size: var(--ui-fs-sm);
  font-weight: 540;
}

.ui-switch:focus-visible .ui-switch__track {
  box-shadow:
    inset 0 1px 2px var(--ui-edge-shade),
    0 0 0 3px var(--ui-accent-ring);
}
</style>
