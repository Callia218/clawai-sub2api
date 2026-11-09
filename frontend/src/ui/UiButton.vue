<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'ui-btn',
      `ui-btn--${variant}`,
      `ui-btn--${size}`,
      {
        'ui-btn--block': block,
        'ui-btn--icon': iconOnly,
        'is-loading': loading,
      },
    ]"
    @click="onClick"
  >
    <span v-if="loading" class="ui-btn__spinner" aria-hidden="true" />
    <span v-else-if="$slots.leading" class="ui-btn__slot">
      <slot name="leading" />
    </span>
    <span v-if="!iconOnly" class="ui-btn__label"><slot /></span>
    <span v-if="$slots.trailing" class="ui-btn__slot">
      <slot name="trailing" />
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'glass' | 'ghost' | 'danger' | 'plain'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
    block?: boolean
    iconOnly?: boolean
  }>(),
  {
    variant: 'glass',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
    iconOnly: false,
  }
)

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

function onClick(ev: MouseEvent) {
  emit('click', ev)
}
</script>

<style scoped>
.ui-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ui-s-2);
  border: 0;
  border-radius: var(--ui-r-md);
  font-family: var(--ui-font);
  font-weight: 590;
  letter-spacing: -0.006em;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--ui-dur-fast) var(--ui-ease-out),
    box-shadow var(--ui-dur-fast) var(--ui-ease-out),
    transform var(--ui-dur-fast) var(--ui-ease-out),
    color var(--ui-dur-fast) var(--ui-ease-out),
    opacity var(--ui-dur-fast) var(--ui-ease-out);
}

.ui-btn:active:not(:disabled) {
  transform: scale(0.978);
}

.ui-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ui-accent-ring);
}

.ui-btn:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

/* ---------------------------------------------------------------- 尺寸 */
.ui-btn--sm {
  height: 30px;
  padding: 0 var(--ui-s-3);
  font-size: var(--ui-fs-xs);
  border-radius: var(--ui-r-sm);
}
.ui-btn--md {
  height: 38px;
  padding: 0 var(--ui-s-4);
  font-size: var(--ui-fs-sm);
}
.ui-btn--lg {
  height: 46px;
  padding: 0 var(--ui-s-6);
  font-size: var(--ui-fs-md);
  border-radius: var(--ui-r-lg);
}

.ui-btn--block {
  display: flex;
  width: 100%;
}

.ui-btn--icon {
  padding: 0;
  aspect-ratio: 1;
  width: auto;
}
.ui-btn--icon.ui-btn--sm {
  width: 30px;
}
.ui-btn--icon.ui-btn--md {
  width: 38px;
}
.ui-btn--icon.ui-btn--lg {
  width: 46px;
}

/* ---------------------------------------------------------------- 主按钮 */
.ui-btn--primary {
  color: var(--ui-accent-contrast);
  background-image: var(--ui-arc);
  background-size: 160% 160%;
  background-position: 12% 50%;
  box-shadow:
    inset 0 1px 1px rgb(255 255 255 / 0.45),
    inset 0 -1px 1px rgb(0 0 0 / 0.12),
    0 8px 20px -10px rgb(13 148 136 / 0.62);
}
.ui-btn--primary:hover:not(:disabled) {
  background-position: 88% 50%;
  box-shadow:
    inset 0 1px 1px rgb(255 255 255 / 0.55),
    inset 0 -1px 1px rgb(0 0 0 / 0.14),
    0 12px 26px -10px rgb(13 148 136 / 0.72);
}

/* ---------------------------------------------------------------- 玻璃按钮 */
.ui-btn--glass {
  color: var(--ui-text);
  background-color: rgb(var(--ui-glass-strong-rgb) / var(--ui-glass-strong-alpha));
  -webkit-backdrop-filter: blur(14px) saturate(180%);
  backdrop-filter: blur(14px) saturate(180%);
  box-shadow:
    inset 0 1px 1px var(--ui-edge-inner),
    inset 0 -1px 1px var(--ui-edge-shade),
    var(--ui-shadow-2);
}
.ui-btn--glass:hover:not(:disabled) {
  background-color: rgb(var(--ui-glass-strong-rgb) / calc(var(--ui-glass-strong-alpha) + 0.1));
  box-shadow:
    inset 0 1px 1.5px var(--ui-edge-strong),
    inset 0 -1px 1px var(--ui-edge-shade),
    var(--ui-shadow-3);
}

/* ---------------------------------------------------------------- 幽灵按钮 */
.ui-btn--ghost {
  color: var(--ui-text-soft);
  background-color: transparent;
}
.ui-btn--ghost:hover:not(:disabled) {
  color: var(--ui-text);
  background-color: var(--ui-accent-soft);
}

/* ---------------------------------------------------------------- 危险按钮 */
.ui-btn--danger {
  color: #fff;
  background-color: var(--ui-danger);
  box-shadow:
    inset 0 1px 1px rgb(255 255 255 / 0.28),
    0 8px 20px -10px rgb(220 38 38 / 0.6);
}
.ui-btn--danger:hover:not(:disabled) {
  filter: brightness(1.06);
}

/* ---------------------------------------------------------------- 纯文字 */
.ui-btn--plain {
  color: var(--ui-accent);
  background-color: transparent;
  padding-left: var(--ui-s-2);
  padding-right: var(--ui-s-2);
}
.ui-btn--plain:hover:not(:disabled) {
  color: var(--ui-accent-hover);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ---------------------------------------------------------------- 子元素 */
.ui-btn__slot,
.ui-btn__label {
  display: inline-flex;
  align-items: center;
  gap: var(--ui-s-2);
  min-width: 0;
}

.ui-btn__spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-top-color: transparent;
  animation: ui-btn-spin 620ms linear infinite;
  opacity: 0.9;
}

@keyframes ui-btn-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-btn,
  .ui-btn__spinner {
    animation-duration: 0.001ms;
    transition-duration: 0.001ms;
  }
}
</style>
