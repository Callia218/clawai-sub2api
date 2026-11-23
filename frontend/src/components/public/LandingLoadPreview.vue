<template>
  <div class="load-preview">
    <p>{{ t('referenceLanding.preview.note') }}</p>
    <div class="preview-controls">
      <button type="button" @click="togglePlayback">{{ t(playing ? 'referenceLanding.preview.pause' : 'referenceLanding.preview.play') }}</button>
      <label><span>{{ t('referenceLanding.preview.timeline') }}</span><input type="range" min="0" max="100" step="1" :value="progress" @input="scrub" /></label>
      <output aria-hidden="true">{{ progress }}%</output>
    </div>
    <div class="preview-frame"><ModelPlazaContent :response="sample" :loading="progress < 100" :percent="progress" :paused="!playing" embedded preview /></div>
    <span role="status" class="sr-only">{{ progress === 100 ? t('referenceLanding.preview.status') : '' }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ModelPlazaResponse } from '@/api/modelPlaza'
import ModelPlazaContent from '@/components/modelPlaza/ModelPlazaContent.vue'

const { t } = useI18n()
const progress = ref(0)
const playing = ref(false)
let frame = 0
const sample = computed<ModelPlazaResponse>(() => ({ description: '', groups: [{
  id: 1, name: t('referenceLanding.preview.group'), description: '', platform: 'openai',
  subscription_type: 'standard', rate_multiplier: 1, peak_rate_enabled: false, peak_start: '', peak_end: '', peak_rate_multiplier: 1,
  is_exclusive: false, image_rate_independent: false, image_rate_multiplier: 1, video_rate_independent: false,
  video_rate_multiplier: 1, long_context_pricing_enabled: false,
  models: ['sample-chat', 'sample-vision'].map(name => ({ name, platform: 'openai', pricing: null, official_pricing: null }))
}] }))
function stop() { cancelAnimationFrame(frame); playing.value = false }
function scrub(event: Event) { stop(); progress.value = (event.target as HTMLInputElement).valueAsNumber }
function togglePlayback() {
  if (playing.value) { stop(); return }
  if (progress.value === 100) progress.value = 0
  const start = performance.now() - progress.value * 30
  playing.value = true
  const advance = (now: number) => {
    progress.value = Math.min(100, Math.max(0, Math.floor((now - start) / 30)))
    if (progress.value === 100) stop()
    else frame = requestAnimationFrame(advance)
  }
  frame = requestAnimationFrame(advance)
}
function suspend() { if (document.hidden) stop() }
onMounted(() => document.addEventListener('visibilitychange', suspend))
onBeforeUnmount(() => { stop(); document.removeEventListener('visibilitychange', suspend) })
</script>

<style scoped>
.load-preview { padding:0 16px 16px; min-width:0; }
.load-preview > p { color:var(--glass-muted); font-size:.875rem; line-height:1.6; }
.preview-controls { display:flex; align-items:center; gap:12px; margin:14px 0; font-size:.8rem; }
.preview-controls button { padding:8px 12px; min-height:44px; border-radius:9px; color:var(--ref-button-ink); background:var(--ref-button); font-weight:650; }
.preview-controls label { display:grid; gap:2px; flex:1; min-width:36px; }
.preview-controls input { width:100%; min-height:26px; accent-color:var(--rl-accent); }
.preview-controls output { font-variant-numeric:tabular-nums; min-width:4ch; text-align:end; }
.preview-frame { max-height:24rem; overflow:auto; border-radius:12px; text-align:start; overscroll-behavior:contain; }
</style>
