<template>
  <figure ref="stage" class="ai-demo" :class="{ 'ai-demo--quiet': reduced, 'ai-demo--paused': !running }" :aria-label="t('glassDemo.label')">
    <figcaption class="sr-only">{{ t('glassDemo.accessible') }}</figcaption>
    <div class="ai-demo-visual" aria-hidden="true">
      <div class="ai-demo-caption">
        <div class="ai-scene-dots"><span v-for="(_, index) in scenes" :key="index" :class="{ selected: sceneIndex === index }" /></div>
        <span>{{ t('glassDemo.example') }}</span>
      </div>
      <Transition name="ai-scene">
        <div :key="sceneIndex" class="ai-scene" :data-phase="phase">
          <div class="ai-window">
            <div class="ai-window-top"><div class="ai-window-lights"><i /><i /><i /></div><span>{{ sceneIndex === 0 ? 'Codex' : sceneIndex === 1 ? 'AI Workspace' : 'Terminal' }}</span><span class="ai-window-path">~/your-next-idea</span></div>
            <div class="ai-window-content">
              <div class="ai-terminal-greeting"><span class="ai-terminal-icon">{{ sceneIndex === 1 ? '✳' : '›_' }}</span><span>{{ t(`${key}.tag`) }}</span></div>
              <div class="ai-command"><span class="ai-prompt">{{ sceneIndex === 1 ? '›' : '$' }}</span><span>{{ command.slice(0, typed) }}<span v-if="phase === 0" class="ai-cursor">▌</span></span></div>
              <div class="ai-task-context" :class="{ revealed: phase >= 1 }"><span class="ai-context-dot" />{{ sceneIndex === 0 ? 'src/ · package.json · README.md' : sceneIndex === 1 ? t('glassDemo.context') : 'POST /chat/completions' }}</div>
              <div class="ai-process" :class="{ revealed: phase >= 1 }">
                <div v-for="index in 3" :key="index" class="ai-process-row" :class="{ done: phase === 2 || step >= index, current: phase === 1 && step === index - 1 }">
                  <span class="ai-step-icon"><svg v-if="phase === 2 || step >= index" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 8 3 3 7-7" /></svg><span v-else class="ai-step-dot" /></span>
                  <span>{{ t(`${key}.step${index}`) }}</span>
                </div>
              </div>
              <div class="ai-terminal-status" :class="{ revealed: phase === 2 }"><span>✓</span> {{ t('glassDemo.ready') }}<span class="ai-status-line" /></div>
            </div>
          </div>
          <div class="ai-result-space">
            <div class="ai-intelligence" :class="{ 'is-working': phase === 1, 'is-complete': phase === 2 }">
              <div class="ai-orbit ai-orbit-one" /><div class="ai-orbit ai-orbit-two" />
              <div class="ai-core"><svg viewBox="0 0 40 40" fill="none"><path d="M20 7c0 8-5 13-13 13 8 0 13 5 13 13 0-8 5-13 13-13-8 0-13-5-13-13Z" fill="currentColor" /><path d="M31 5c0 3-2 5-5 5 3 0 5 2 5 5 0-3 2-5 5-5-3 0-5-2-5-5Z" fill="currentColor" opacity=".65" /></svg></div>
            </div>
            <div class="ai-waiting" :class="{ visible: phase !== 2 }"><span>{{ t(`${key}.title`) }}</span><p>{{ t(`${key}.subtitle`) }}</p><div class="ai-thinking-dots" :class="{ visible: phase === 1 }"><i /><i /><i /></div></div>
            <div class="ai-result" :class="{ visible: phase === 2 }">
              <div class="ai-result-heading"><span class="ai-done-mark">✓</span><span>{{ t('glassDemo.result') }}</span></div>
              <h3>{{ t(`${key}.resultTitle`) }}</h3>
              <template v-if="sceneIndex === 0">
                <div class="ai-files"><div v-for="(file,index) in ['Assistant.vue','api/chat.ts','README.md']" :key="file" class="ai-result-item" :style="{ '--item-delay': `${index * 60}ms` }"><span class="ai-file-plus">+</span><code>{{ file }}</code><span>{{ t(`${key}.file${index+1}`) }}</span></div></div>
                <div class="ai-answer"><span class="ai-answer-star">✳</span>{{ t('glassDemo.codex.answer') }}</div>
              </template>
              <div v-else-if="sceneIndex === 1" class="ai-plan"><div v-for="index in 3" :key="index" class="ai-plan-row ai-result-item" :style="{ '--item-delay': `${(index-1)*60}ms` }"><span>{{ String(index).padStart(2,'0') }}</span><div><strong>{{ t(`${key}.item${index}`) }}</strong><p>{{ t(`${key}.detail${index}`) }}</p></div></div></div>
              <div v-else class="ai-response ai-result-item"><div><span class="ai-response-dot" /> application/json</div><pre><span>{</span>
  <b>"role"</b>: <em>"assistant"</em>,
  <b>"content"</b>:
    <em>"{{ t('glassDemo.api.answer') }}"</em>
<span>}</span></pre></div>
              <p class="ai-result-note">{{ t(`${key}.resultNote`) }}</p>
            </div>
          </div>
        </div>
      </Transition>
      <div class="ai-journey"><div v-for="(label,index) in ['input','processing','output']" :key="label" :class="{ active: phase === index, complete: phase > index }"><span class="ai-journey-number">{{ phase > index ? '✓' : `0${index+1}` }}</span><span>{{ t(`glassDemo.${label}`) }}</span><i v-if="index < 2" /></div></div>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const scenes = ['codex','reasoning','api'] as const
const stage = ref<HTMLElement | null>(null)
const sceneIndex = ref(0)
const phase = ref(0)
const step = ref(0)
const typed = ref(0)
const reduced = ref(false)
const running = ref(false)
const key = computed(() => `glassDemo.${scenes[sceneIndex.value]}`)
const command = computed(() => t(`${key.value}.command`))
let elapsed = 0
let previousTime = 0
let timer: ReturnType<typeof setTimeout> | undefined
let observer: IntersectionObserver | undefined
let motionPreference: MediaQueryList | undefined
let visible = false
let disposed = false
const cycleDuration = 8800

function renderFrame() {
  const withinCycle = elapsed % cycleDuration
  sceneIndex.value = Math.floor(elapsed / cycleDuration) % scenes.length
  phase.value = withinCycle < 2000 ? 0 : withinCycle < 5000 ? 1 : 2
  typed.value = Math.min(command.value.length, Math.floor(Math.max(0,withinCycle - 250) / 1450 * command.value.length))
  step.value = Math.max(0, Math.min(3, Math.floor((withinCycle - 2000) / 950)))
}
function tick() {
  if (disposed || !running.value) return
  const now = performance.now()
  elapsed += Math.min(now - previousTime, 180)
  previousTime = now
  renderFrame()
  timer = setTimeout(tick, 65)
}
function syncPlayback() {
  clearTimeout(timer)
  timer = undefined
  if (disposed) return
  running.value = visible && !document.hidden && !reduced.value
  if (reduced.value) { phase.value = 2; typed.value = command.value.length; step.value = 3; return }
  if (running.value) { previousTime = performance.now(); timer = setTimeout(tick, 65) }
}
function onMotionChange() { reduced.value = motionPreference?.matches ?? false; syncPlayback() }
// A static reduced-motion frame must still reflect a language change.
watch(command, () => {
  if (reduced.value) typed.value = command.value.length
})
onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced.value = motionPreference.matches
  motionPreference.addEventListener('change', onMotionChange)
  document.addEventListener('visibilitychange', syncPlayback)
  observer = new IntersectionObserver(([entry]) => {
    if (disposed || !entry) return
    visible = entry.isIntersecting
    syncPlayback()
  }, { threshold:.1 })
  if (stage.value) observer.observe(stage.value)
  syncPlayback()
})
onBeforeUnmount(() => { disposed = true; running.value = false; clearTimeout(timer); observer?.disconnect(); motionPreference?.removeEventListener('change', onMotionChange); document.removeEventListener('visibilitychange', syncPlayback) })
</script>

<style scoped>
.ai-demo { width:100%; max-width:65rem; margin:0 auto; text-align:left; color:var(--glass-text); }
.ai-demo-visual { position:relative; border:1px solid var(--glass-rim); border-radius:2rem; padding:1.25rem; background:linear-gradient(135deg,rgb(255 255 255 / .47),rgb(255 255 255 / .2)); box-shadow:inset 0 1px 1px rgb(255 255 255 / .9),inset 0 -1px 2px rgb(255 255 255 / .5),0 28px 80px -32px rgb(25 61 107 / .36); -webkit-backdrop-filter:blur(18px) saturate(135%); backdrop-filter:blur(18px) saturate(135%); }
.ai-demo-caption { display:flex; align-items:center; justify-content:space-between; padding:0 .4rem .9rem; font-size:.65rem; color:var(--glass-muted); letter-spacing:.035em; }
.ai-scene-dots { display:flex; gap:.35rem; }
.ai-scene-dots span { width:.35rem; height:.35rem; border-radius:50%; background:var(--glass-line); transition:background-color 200ms ease; }
.ai-scene-dots span.selected { background:var(--glass-accent); }
.ai-scene { display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,1fr); gap:1.25rem; }
.ai-window { border:1px solid rgb(255 255 255 / .3); border-radius:1.15rem; overflow:hidden; background:linear-gradient(135deg,#20314a,#122238); color:#d7e6f8; box-shadow:0 15px 30px -15px rgb(16 38 70 / .4); min-width:0; }
.ai-window-top { display:flex; flex-wrap:wrap; align-items:center; gap:.75rem; padding:.9rem 1rem; border-bottom:1px solid rgb(207 225 255 / .1); font-size:.6875rem; color:#d4e2f4; }
.ai-window-lights { display:flex; gap:.3rem; }
.ai-window-lights i { width:.45rem; height:.45rem; background:#fb8e88; border-radius:50%; }
.ai-window-lights i:nth-child(2) { background:#efcb7d; }
.ai-window-lights i:nth-child(3) { background:#91c9ad; }
.ai-window-path { min-width:0; overflow-wrap:anywhere; margin-left:auto; color:#8b9eb8; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:.6rem; }
.ai-window-content { padding:1.65rem 1.5rem 1rem; min-height:19.5rem; }
.ai-terminal-greeting { display:flex; align-items:center; gap:.6rem; font-size:.6875rem; color:#a8bcd7; margin-bottom:1.5rem; }
.ai-terminal-icon { width:1.8rem; height:1.8rem; display:grid; place-items:center; border:1px solid rgb(215 234 255 / .2); border-radius:.5rem; color:#e2f1ff; font-size:.8rem; }
.ai-command { display:flex; gap:.65rem; min-height:3.25rem; font: .8125rem/1.75 ui-monospace,SFMono-Regular,Consolas,monospace; overflow-wrap:anywhere; color:#f4f8fe; }
.ai-prompt { color:#94d4b9; flex:none; }
.ai-cursor { color:#a5c7ef; animation:ai-cursor-blink 1s steps(2,end) infinite; }
.ai-task-context { overflow-wrap:anywhere; margin:.7rem 0 1rem; display:flex; align-items:center; gap:.5rem; color:#95abc7; font:.6rem/1.6 ui-monospace,SFMono-Regular,Consolas,monospace; }
.ai-context-dot { flex:none; width:.3rem; height:.3rem; border-radius:50%; background:#86acd8; }
.ai-task-context,.ai-process,.ai-terminal-status { opacity:0; transform:translateY(5px); transition:opacity 220ms var(--ui-ease-out),transform 220ms var(--ui-ease-out); }
.revealed { opacity:1; transform:none; }
.ai-process { display:grid; gap:.8rem; }
.ai-process-row { display:flex; align-items:center; gap:.65rem; font-size:.7rem; color:#8398b5; transition:color 180ms ease; }
.ai-process-row.current { color:#e2ecfb; }
.ai-process-row.done { color:#b5d4c9; }
.ai-step-icon { width:1rem; height:1rem; display:grid; place-items:center; flex:none; }
.ai-step-icon svg { width:1rem; height:1rem; color:#97d4b8; }
.ai-step-dot { width:.35rem; height:.35rem; border-radius:50%; background:currentColor; }
.current .ai-step-dot { animation:ai-dot-pulse 1s ease-in-out infinite; }
.ai-terminal-status { margin-top:1.25rem; font-size:.6rem; display:flex; align-items:center; gap:.5rem; color:#99d3b8; }
.ai-status-line { height:1px; background:rgb(167 210 195 / .15); flex:1; }
.ai-result-space { position:relative; display:grid; grid-template-columns:minmax(0,1fr); align-items:center; min-width:0; padding:1.25rem; }
.ai-intelligence { position:absolute; width:5rem; height:5rem; left:50%; top:2rem; transform:translateX(-50%); transition:opacity 200ms ease,transform 250ms var(--ui-ease-out); }
.ai-core { position:absolute; inset:.55rem; display:grid; place-items:center; border-radius:1.2rem; color:#fff; background:linear-gradient(135deg,#8db9ed 0%,#8096e0 45%,#c4aadf 100%); border:1px solid rgb(255 255 255 / .8); box-shadow:inset 0 1px 5px #e7f4ff,0 10px 30px -8px rgb(99 120 197 / .45); }
.ai-core svg { width:2.7rem; height:2.7rem; }
.ai-orbit { position:absolute; inset:-.4rem; border:1px solid rgb(129 158 209 / .25); border-radius:1.9rem; transform:rotate(22deg); }
.ai-orbit-two { inset:-1.1rem; border-radius:2.4rem; border-color:rgb(129 158 209 / .13); transform:rotate(-14deg); }
.is-working .ai-core { animation:ai-core-breathe 1.6s var(--ui-ease-in-out) infinite; }
.is-working .ai-orbit-one { animation:ai-orbit-turn 5s linear infinite; }
.is-complete.ai-intelligence { opacity:0; transform:translate(-50%,-.5rem) scale(.9); }
.ai-waiting { position:absolute; top:9rem; left:1rem; right:1rem; text-align:center; opacity:0; transition:opacity 200ms ease; }
.ai-waiting.visible { opacity:1; }
.ai-waiting > span { font-weight:600; font-size:1.05rem; letter-spacing:-.025em; }
.ai-waiting p { margin:.7rem auto 0; max-width:17rem; font-size:.75rem; line-height:1.7; color:var(--glass-muted); }
.ai-thinking-dots { display:flex; justify-content:center; gap:.3rem; margin-top:1.25rem; opacity:0; }
.ai-thinking-dots.visible { opacity:1; }
.ai-thinking-dots i { width:.3rem; height:.3rem; background:#849bc5; border-radius:50%; animation:ai-dot-pulse 1s ease-in-out infinite; }
.ai-thinking-dots i:nth-child(2) { animation-delay:150ms; }.ai-thinking-dots i:nth-child(3) { animation-delay:300ms; }
.ai-result { min-width:0; max-width:100%; overflow-wrap:anywhere; opacity:0; transform:translateY(.65rem) scale(.98); transition:opacity 250ms var(--ui-ease-out),transform 250ms var(--ui-ease-out); }
.ai-result.visible { opacity:1; transform:none; }
.ai-result-heading { display:flex; flex-wrap:wrap; min-width:0; align-items:center; gap:.4rem; font-size:.65rem; color:var(--glass-muted); }
.ai-done-mark { display:grid; place-items:center; border-radius:50%; width:1rem; height:1rem; background:#d3ecdf; color:#286b4e; font-size:.6rem; }
.ai-result h3 { margin:.7rem 0 1.25rem; font-size:1.25rem; line-height:1.4; letter-spacing:-.035em; font-weight:650; }
.ai-files { display:grid; gap:.5rem; }
.ai-files > div { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; padding:.65rem .75rem; background:var(--glass-field); border:1px solid var(--glass-rim); border-radius:.65rem; min-width:0; }
.ai-file-plus { color:#277d5a; font-weight:600; }.ai-files code { flex:1 1 5rem; font-size:.65rem; min-width:0; overflow-wrap:anywhere; }.ai-files div > span:last-child { flex:1 1 5rem; min-width:0; font-size:.6rem; color:var(--glass-muted); text-align:right; overflow-wrap:anywhere; }
.ai-answer { display:flex; align-items:center; gap:.6rem; font-size:.7rem; margin-top:1rem; padding:.65rem .8rem; border-radius:.8rem; background:rgb(147 178 218 / .12); }
.ai-answer-star { font-size:1.15rem; color:#6c80b2; }
.ai-result-note { color:var(--glass-muted); font-size:.65rem; line-height:1.65; margin:1rem 0 0; }
.ai-plan { display:grid; gap:1rem; }.ai-plan-row { display:flex; gap:.75rem; }.ai-plan-row > span { display:grid; place-items:center; width:1.75rem; height:1.75rem; flex:none; border:1px solid var(--glass-rim); border-radius:.6rem; background:var(--glass-field); font-size:.65rem; color:var(--glass-accent); }.ai-plan strong { font-size:.75rem; font-weight:600; }.ai-plan p { font-size:.65rem; color:var(--glass-muted); margin:.15rem 0 0; }
.ai-response { min-width:0; max-width:100%; border:1px solid var(--glass-rim); border-radius:.875rem; background:var(--glass-field); padding:1rem; }.ai-response > div { display:flex; flex-wrap:wrap; min-width:0; overflow-wrap:anywhere; align-items:center; gap:.4rem; font: .6rem ui-monospace,monospace; color:var(--glass-muted); margin-bottom:.7rem; }.ai-response-dot { width:.35rem; height:.35rem; border-radius:50%; background:#3c9b72; }.ai-response pre { min-width:0; max-width:100%; font:.7rem/1.8 ui-monospace,SFMono-Regular,Consolas,monospace; white-space:pre-wrap; overflow-wrap:anywhere; }.ai-response b { font-weight:400; color:var(--glass-accent); }.ai-response em { color:#297258; font-style:normal; }
.ai-result-item { opacity:0; transform:translateY(.35rem); transition:opacity 200ms var(--ui-ease-out),transform 200ms var(--ui-ease-out); transition-delay:var(--item-delay,0ms); }.ai-result.visible .ai-result-item { opacity:1; transform:none; }
.ai-journey { display:flex; flex-wrap:wrap; justify-content:center; gap:1rem; margin-top:1.25rem; }.ai-journey > div { display:flex; align-items:center; gap:.5rem; color:var(--glass-muted); font-size:.65rem; }.ai-journey-number { width:1.4rem; height:1.4rem; border:1px solid var(--glass-line); display:grid; place-items:center; border-radius:50%; font-size:.55rem; transition:background-color 180ms ease; }.ai-journey .active { color:var(--glass-accent); }.ai-journey .active .ai-journey-number { background:var(--glass-accent); border-color:transparent; color:var(--glass-ground); }.ai-journey .complete .ai-journey-number { color:#2c7b58; }.ai-journey i { width:2rem; height:1px; background:var(--glass-line); margin-left:.5rem; }
.ai-scene-enter-active,.ai-scene-leave-active { transition:opacity 240ms ease,transform 240ms var(--ui-ease-out); }.ai-scene-leave-active { position:absolute; left:1.25rem; right:1.25rem; }.ai-scene-enter-from { opacity:0; transform:translateY(.4rem); }.ai-scene-leave-to { opacity:0; transform:translateY(-.4rem); }
.ai-demo--paused * { animation-play-state:paused !important; }
.dark .ai-demo-visual { background:linear-gradient(135deg,rgb(64 84 118 / .55),rgb(31 53 82 / .35)); box-shadow:inset 0 1px 1px rgb(230 242 255 / .25),0 28px 80px -32px rgb(2 12 28 / .6); }
.dark .ai-response em { color:#9cd7bd; }
@keyframes ai-cursor-blink { 50% { opacity:0; } }
@keyframes ai-dot-pulse { 50% { opacity:.35; transform:scale(.8); } }
@keyframes ai-core-breathe { 50% { transform:scale(1.06); } }
@keyframes ai-orbit-turn { to { transform:rotate(382deg); } }
@media (max-width:650px) {
  .ai-demo-visual { padding:.875rem; border-radius:1.5rem; }
  .ai-scene { grid-template-columns:minmax(0,1fr); gap:.25rem; }
  .ai-window-content { padding:1rem 1.1rem; min-height:17.25rem; }
  .ai-terminal-greeting { margin-bottom:1rem; }.ai-command { min-height:2.8rem; }
  .ai-result-space { min-height:19rem; padding:1.2rem .65rem; }
  .ai-intelligence { top:2rem; }.ai-waiting { top:8.5rem; }
  .ai-result h3 { font-size:1.15rem; margin-bottom:.8rem; }
  .ai-journey { gap:.5rem; margin-top:.5rem; }.ai-journey > div { gap:.3rem; font-size:.6rem; }.ai-journey i { width:.7rem; margin-left:0; }
  .ai-scene-leave-active { left:.875rem; right:.875rem; }
}
@media (prefers-reduced-motion:reduce) {
  .ai-demo * { animation:none !important; transition:none !important; }
  .ai-result,.ai-result-item { transform:none; }
}
@media (prefers-reduced-transparency:reduce), (prefers-contrast:more) { .ai-demo-visual { background:var(--glass-thick); -webkit-backdrop-filter:none; backdrop-filter:none; } }
</style>
