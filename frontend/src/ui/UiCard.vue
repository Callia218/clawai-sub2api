<template>
  <component
    :is="as"
    ref="cardRef"
    :class="[
      'ui-card',
      `ui-card--${variant}`,
      `ui-card--pad-${padding}`,
      { 'ui-card--interactive': interactive, 'ui-card--flush': flush },
    ]"
    @pointermove="trackPointer"
    @pointerleave="resetPointer"
  >
    <header v-if="$slots.header || title" class="ui-card__head">
      <div class="ui-card__head-main">
        <slot name="header">
          <h3 class="ui-card__title">{{ title }}</h3>
          <p v-if="subtitle" class="ui-card__subtitle">{{ subtitle }}</p>
        </slot>
      </div>
      <div v-if="$slots.actions" class="ui-card__actions">
        <slot name="actions" />
      </div>
    </header>

    <div :class="flush ? 'ui-card__body-flush' : 'ui-card__body'">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="ui-card__foot">
      <slot name="footer" />
    </footer>
  </component>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    as?: string
    variant?: 'glass' | 'strong' | 'soft' | 'plain'
    padding?: 'none' | 'sm' | 'md' | 'lg'
    title?: string
    subtitle?: string
    interactive?: boolean
    flush?: boolean
  }>(),
  {
    as: 'section',
    variant: 'glass',
    padding: 'md',
    title: undefined,
    subtitle: undefined,
    interactive: false,
    flush: false,
  }
)

const cardRef = ref<HTMLElement | null>(null)

function trackPointer(ev: PointerEvent) {
  const el = cardRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  el.style.setProperty('--ui-mx', `${((ev.clientX - rect.left) / rect.width) * 100}%`)
  el.style.setProperty('--ui-my', `${((ev.clientY - rect.top) / rect.height) * 100}%`)
}

function resetPointer() {
  const el = cardRef.value
  if (!el) return
  el.style.setProperty('--ui-mx', '22%')
  el.style.setProperty('--ui-my', '6%')
}
</script>

<style scoped>
.ui-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: var(--ui-r-xl);
  color: var(--ui-text);
  font-family: var(--ui-font);
  transition:
    box-shadow var(--ui-dur-base) var(--ui-ease-out),
    transform var(--ui-dur-base) var(--ui-ease-out);
}

/* ---------------------------------------------------------------- 变体 */
.ui-card--glass {
  position: relative;
  isolation: isolate;
  background-color: rgb(var(--ui-glass-rgb) / var(--ui-glass-alpha));
  -webkit-backdrop-filter: blur(var(--ui-glass-blur)) saturate(var(--ui-glass-sat))
    brightness(var(--ui-glass-bright));
  backdrop-filter: blur(var(--ui-glass-blur)) saturate(var(--ui-glass-sat))
    brightness(var(--ui-glass-bright));
  box-shadow:
    inset 0 1px 1.5px var(--ui-edge-inner),
    inset 0 -1px 1px var(--ui-edge-shade),
    var(--ui-shadow-3);
}

.ui-card--strong {
  position: relative;
  isolation: isolate;
  background-color: rgb(var(--ui-glass-strong-rgb) / var(--ui-glass-strong-alpha));
  -webkit-backdrop-filter: blur(var(--ui-glass-strong-blur)) saturate(var(--ui-glass-sat))
    brightness(var(--ui-glass-bright));
  backdrop-filter: blur(var(--ui-glass-strong-blur)) saturate(var(--ui-glass-sat))
    brightness(var(--ui-glass-bright));
  box-shadow:
    inset 0 1px 2px var(--ui-edge-strong),
    inset 0 -1px 1.5px var(--ui-edge-shade),
    var(--ui-shadow-4);
}

.ui-card--soft {
  position: relative;
  isolation: isolate;
  background-color: rgb(var(--ui-glass-soft-rgb) / var(--ui-glass-soft-alpha));
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  backdrop-filter: blur(14px) saturate(160%);
  box-shadow:
    inset 0 1px 1px var(--ui-edge-inner),
    var(--ui-shadow-2);
}

.ui-card--plain {
  background-color: transparent;
  box-shadow: none;
}

/* 边缘折射 + 镜面高光 */
.ui-card--glass::before,
.ui-card--strong::before,
.ui-card--soft::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    152deg,
    var(--ui-edge-strong) 0%,
    var(--ui-edge) 26%,
    transparent 52%,
    var(--ui-edge-shade) 78%,
    var(--ui-edge) 100%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.ui-card--glass::after,
.ui-card--strong::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: radial-gradient(
    120% 90% at var(--ui-mx, 22%) var(--ui-my, 6%),
    rgb(255 255 255 / 0.30) 0%,
    rgb(255 255 255 / 0.08) 34%,
    transparent 68%
  );
  pointer-events: none;
}

/* scoped 下祖先选择器直接写 html.dark 即可，Vue 只会给末级加 [data-v-x] */
html.dark .ui-card--glass::after,
html.dark .ui-card--strong::after,
html[data-theme='dark'] .ui-card--glass::after,
html[data-theme='dark'] .ui-card--strong::after {
  background: radial-gradient(
    120% 90% at var(--ui-mx, 22%) var(--ui-my, 6%),
    rgb(255 255 255 / 0.14) 0%,
    rgb(255 255 255 / 0.04) 36%,
    transparent 70%
  );
}

.ui-card--interactive {
  cursor: pointer;
}
.ui-card--interactive:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 2px var(--ui-edge-strong),
    inset 0 -1px 1.5px var(--ui-edge-shade),
    var(--ui-shadow-4),
    0 0 0 1px var(--ui-accent-ring);
}

/* ---------------------------------------------------------------- 内边距 */
.ui-card--pad-none {
  padding: 0;
}
.ui-card--pad-sm {
  padding: var(--ui-s-3);
}
.ui-card--pad-md {
  padding: var(--ui-s-5);
}
.ui-card--pad-lg {
  padding: var(--ui-s-6) var(--ui-s-8);
}

@media (max-width: 720px) {
  .ui-card--pad-lg {
    padding: var(--ui-s-5);
  }
}

/* ---------------------------------------------------------------- 结构 */
.ui-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ui-s-4);
  margin-bottom: var(--ui-s-4);
}

.ui-card__head-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ui-card__title {
  margin: 0;
  font-size: var(--ui-fs-lg);
  font-weight: 640;
  line-height: var(--ui-lh-snug);
  letter-spacing: -0.014em;
  color: var(--ui-text);
}

.ui-card__subtitle {
  margin: 0;
  font-size: var(--ui-fs-xs);
  line-height: var(--ui-lh-normal);
  color: var(--ui-text-muted);
}

.ui-card__actions {
  display: flex;
  align-items: center;
  gap: var(--ui-s-2);
  flex-shrink: 0;
}

.ui-card__body {
  min-width: 0;
  flex: 1 1 auto;
}

.ui-card__body-flush {
  min-width: 0;
  flex: 1 1 auto;
  margin: calc(var(--ui-s-5) * -1);
  margin-top: 0;
}

.ui-card__foot {
  margin-top: var(--ui-s-4);
  padding-top: var(--ui-s-3);
  border-top: 1px solid var(--ui-line);
}
</style>
