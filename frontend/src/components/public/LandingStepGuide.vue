<template>
  <div class="guide-layout">
    <div class="guide-heading rl-section-heading">
      <h2 id="start-title">{{ t('referenceLanding.start.title') }}</h2>
      <p>{{ t('referenceLanding.start.description') }}</p>
      <div v-if="cue" aria-hidden="true" class="guide-plate glass-panel">
        <div class="guide-grid" />
        <div class="guide-count">
          <span class="guide-window"><span class="guide-reel" :style="{ transform: `translateY(-${100 * active / steps.length}%)` }"><span v-for="(step, index) in steps" :key="step.id">{{ pad(index + 1) }}</span></span></span>
          <small>/ {{ pad(steps.length) }}</small>
        </div>
        <div :key="cue.label" class="guide-readout"><span class="guide-label" :data-label="cue.label" /><code>{{ cue.snippet }}</code></div>
      </div>
    </div>
    <ol ref="list" class="rl-steps guide-steps">
      <li v-for="(step, index) in steps" :key="step.id" :class="{ 'guide-current': index === active }" @focusin="active = index">
        <span class="rl-step-number" aria-hidden="true">{{ index + 1 }}</span>
        <h3>{{ step.title }}</h3><p>{{ step.desc }}</p>
        <div class="rl-step-links">
          <router-link :to="step.to" class="rl-text-link">{{ step.action }}<Icon name="arrowRight" size="sm" aria-hidden="true" /></router-link>
          <router-link v-if="step.id === 'account' && showRegister" to="/register" class="rl-text-link">{{ t('glass.home.steps.registerAction') }}</router-link>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps<{
  steps: { id: string; title: string; desc: string; to: string; action: string }[]
  showRegister: boolean
}>()
const { t } = useI18n()
const active = ref(0)
const list = ref<HTMLOListElement | null>(null)
const pad = (value: number) => String(value).padStart(2, '0')
const cues: Record<string, { label: string; snippet: string }> = {
  account: { label: 'WORKSPACE', snippet: 'workspace / account' },
  model: { label: 'MODEL', snippet: 'GET /models' },
  key: { label: 'API KEY', snippet: 'Authorization: Bearer …' },
  connect: { label: 'REQUEST', snippet: 'POST /chat/completions' }
}
const cue = computed(() => cues[props.steps[active.value]?.id ?? ''])
const wideMotion = window.matchMedia('(min-width: 901px) and (min-height: 590px) and (prefers-reduced-motion: no-preference)')
let observer: IntersectionObserver | undefined
function observeSteps() {
  observer?.disconnect()
  if (!list.value || !wideMotion.matches || typeof IntersectionObserver === 'undefined') return
  const rows = Array.from(list.value.children)
  const readingLine = Math.round(window.innerHeight * .46)
  const bottom = window.innerHeight - readingLine - 2
  observer = new IntersectionObserver(entries => {
    const current = entries.find(entry => entry.isIntersecting)
    if (current) active.value = rows.indexOf(current.target)
  }, { rootMargin: `-${readingLine}px 0px -${bottom}px 0px` })
  rows.forEach(row => observer?.observe(row))
}
onMounted(() => {
  observeSteps()
  wideMotion.addEventListener('change', observeSteps)
  window.addEventListener('resize', observeSteps)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  wideMotion.removeEventListener('change', observeSteps)
  window.removeEventListener('resize', observeSteps)
})
</script>

<style scoped>
.guide-plate { display:none; }
@media (min-width:901px) and (min-height:590px) and (prefers-reduced-motion:no-preference) {
  .guide-layout { display:grid; grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr); gap:clamp(48px,7vw,100px); align-items:start; }
  .guide-layout .guide-heading { position:sticky; top:calc(var(--hp-scroll-offset,100px) + 24px); margin:0; text-align:left; }
  .guide-layout .guide-heading p { margin-inline:0; }
  .guide-plate { position:relative; isolation:isolate; overflow:hidden; display:grid; gap:18px; max-width:24rem; padding:24px; margin-top:26px; border-radius:22px; }
  .guide-grid { position:absolute; inset:-20px; z-index:-1; background:radial-gradient(circle,var(--rl-line) 1px,transparent 1.5px) 0 0/14px 14px; mask-image:linear-gradient(90deg,transparent,#000); }
  .guide-count { display:flex; align-items:baseline; gap:9px; font-size:clamp(2.4rem,4vw,3.75rem); line-height:1; font-weight:650; letter-spacing:-.04em; font-variant-numeric:tabular-nums; }
  .guide-window { overflow:hidden; height:1em; }
  .guide-reel { display:grid; transition:transform 240ms var(--ui-ease-out); }
  .guide-count small,.guide-label { color:var(--rl-muted); font:600 .7rem/1.5 ui-monospace,monospace; letter-spacing:.08em; }
  .guide-readout { display:grid; gap:3px; }
  .guide-label::after { content:attr(data-label); animation:guide-decode 160ms step-end; }
  .guide-readout code { justify-self:start; font-size:.8125rem; animation:guide-type 300ms steps(14,end); }
  .guide-layout .guide-steps { margin:0; grid-template-columns:1fr; gap:0; }
  .guide-steps li { padding:22px 0 22px 20px; border-inline-start:2px solid var(--rl-line); }
  .guide-steps .guide-current { border-color:var(--rl-accent); }
  .guide-steps .rl-step-number { margin-bottom:8px; }
  @keyframes guide-decode { 0% { content:'· / :'; } 50% { content:'· : /'; } }
  @keyframes guide-type { from { clip-path:inset(0 100% 0 0); } to { clip-path:inset(0); } }
  @supports (animation-timeline: view()) {
    .guide-layout { view-timeline-name:--guide-scroll; }
    .guide-grid { animation:guide-depth 1s linear both; animation-timeline:--guide-scroll; }
    @keyframes guide-depth { from { transform:translateY(-14px); } to { transform:translateY(14px); } }
  }
}
</style>
