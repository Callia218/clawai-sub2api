<template>
  <Teleport to="body">
    <Transition name="ui-modal">
      <div v-if="open" class="ui-modal-root" :style="{ zIndex: layer }" :data-dialog-layer="layer" role="dialog" aria-modal="true" :aria-label="title">
        <div class="ui-modal__scrim" @click="onScrim" />

        <div class="ui-modal__panel" :class="`ui-modal__panel--${size}`" @click.stop>
          <header v-if="title || $slots.header" class="ui-modal__head">
            <div class="ui-modal__head-main">
              <slot name="header">
                <h3 class="ui-modal__title">{{ title }}</h3>
                <p v-if="description" class="ui-modal__desc">{{ description }}</p>
              </slot>
            </div>
            <button
              v-if="closable"
              type="button"
              class="ui-modal__close"
              aria-label="关闭"
              @click="close"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </button>
          </header>

          <div class="ui-modal__body ui-scroll">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="ui-modal__foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useDialogLayer } from '@/composables/useDialogLayer'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    closable?: boolean
    closeOnScrim?: boolean
  }>(),
  {
    title: undefined,
    description: undefined,
    size: 'md',
    closable: true,
    closeOnScrim: true,
  }
)

const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
const { layer, isTopmost } = useDialogLayer(() => props.open)

function close() {
  emit('update:open', false)
}

function onScrim() {
  if (props.closeOnScrim) close()
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape' && props.open && props.closable && isTopmost.value && !ev.defaultPrevented && !ev.isComposing) close()
}

watch(
  () => props.open,
  (v) => {
    if (typeof document === 'undefined') return
    if (v) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.ui-modal-root {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(var(--ui-s-4), env(safe-area-inset-top)) var(--ui-s-4) max(var(--ui-s-4), env(safe-area-inset-bottom));
}

.ui-modal__scrim {
  position: absolute;
  inset: 0;
  background-color: rgb(2 6 14 / 0.48);
  -webkit-backdrop-filter: blur(6px) saturate(120%);
  backdrop-filter: blur(6px) saturate(120%);
}

.ui-modal__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  max-height: min(86vh, 880px);
  max-height: min(calc(100dvh - 2rem), 880px);
  border-radius: var(--ui-r-2xl);
  background-color: rgb(var(--ui-glass-strong-rgb) / calc(var(--ui-glass-strong-alpha) + 0.34));
  -webkit-backdrop-filter: blur(var(--ui-glass-strong-blur)) saturate(var(--ui-glass-sat))
    brightness(var(--ui-glass-bright));
  backdrop-filter: blur(var(--ui-glass-strong-blur)) saturate(var(--ui-glass-sat))
    brightness(var(--ui-glass-bright));
  box-shadow:
    inset 0 1px 2px var(--ui-edge-strong),
    inset 0 -1px 1.5px var(--ui-edge-shade),
    0 0 0 1px var(--ui-line),
    var(--ui-shadow-4);
  font-family: var(--ui-font);
  overflow: hidden;
}

.ui-modal__panel--sm {
  max-width: 400px;
}
.ui-modal__panel--md {
  max-width: 560px;
}
.ui-modal__panel--lg {
  max-width: 760px;
}
.ui-modal__panel--xl {
  max-width: 1040px;
}

.ui-modal__head {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ui-s-4);
  padding: var(--ui-s-5) var(--ui-s-6) var(--ui-s-3);
  border-bottom: 1px solid var(--ui-line);
}

.ui-modal__head-main {
  min-width: 0;
}

.ui-modal__title {
  margin: 0;
  font-size: var(--ui-fs-lg);
  font-weight: 640;
  letter-spacing: -0.016em;
  color: var(--ui-text);
  overflow-wrap: anywhere;
}

.ui-modal__desc {
  margin: 4px 0 0;
  font-size: var(--ui-fs-xs);
  line-height: 1.55;
  color: var(--ui-text-muted);
}

.ui-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: 0;
  border-radius: var(--ui-r-sm);
  color: var(--ui-text-muted);
  background: transparent;
  cursor: pointer;
  transition:
    color var(--ui-dur-fast) var(--ui-ease-out),
    background-color var(--ui-dur-fast) var(--ui-ease-out);
}
.ui-modal__close:hover {
  color: var(--ui-text);
  background-color: var(--ui-line);
}
.ui-modal__close svg {
  width: 16px;
  height: 16px;
}

.ui-modal__body {
  padding: var(--ui-s-5) var(--ui-s-6);
  overflow-y: auto;
  min-height: 0;
  min-width: 0;
  overscroll-behavior: contain;
  flex: 1 1 auto;
}

.ui-modal__foot {
  display: flex;
  flex-wrap: wrap;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  gap: var(--ui-s-2);
  padding: var(--ui-s-4) var(--ui-s-6);
  border-top: 1px solid var(--ui-line);
}

/* ---------------------------------------------------------------- 过渡 */
.ui-modal-enter-active .ui-modal__panel {
  transition:
    opacity var(--ui-dur-base) var(--ui-ease-out),
    transform var(--ui-dur-base) var(--ui-ease-spring);
}
.ui-modal-leave-active .ui-modal__panel {
  transition:
    opacity var(--ui-dur-fast) var(--ui-ease-in-out),
    transform var(--ui-dur-fast) var(--ui-ease-in-out);
}
.ui-modal-enter-from .ui-modal__panel {
  opacity: 0;
  transform: translateY(14px) scale(0.97);
}
.ui-modal-leave-to .ui-modal__panel {
  opacity: 0;
  transform: translateY(6px) scale(0.985);
}
.ui-modal-enter-active .ui-modal__scrim,
.ui-modal-leave-active .ui-modal__scrim {
  transition: opacity var(--ui-dur-base) var(--ui-ease-out);
}
.ui-modal-enter-from .ui-modal__scrim,
.ui-modal-leave-to .ui-modal__scrim {
  opacity: 0;
}

@media (max-width: 640px) {
  .ui-modal-root {
    padding: 0;
    align-items: flex-end;
  }
  .ui-modal__panel {
    max-width: none;
    border-radius: var(--ui-r-2xl) var(--ui-r-2xl) 0 0;
    max-height: 92vh;
    max-height: calc(100dvh - max(1rem, env(safe-area-inset-top)));
  }
  .ui-modal__foot {
    padding-bottom: max(var(--ui-s-4), env(safe-area-inset-bottom));
  }
}
</style>
