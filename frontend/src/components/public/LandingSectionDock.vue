<template>
  <nav class="section-dock" :aria-label="label" @keydown.esc="dismissHint">
    <div ref="track" class="dock-track" @pointermove="trackPointer" @pointerleave="pointer = null">
      <a v-for="(item, index) in items" :key="item.id" :href="`#${item.id}`" class="dock-hit" :aria-label="item.label" @focus="focused = index" @blur="focused = null" @click="dismissHint">
        <span class="dock-face" :style="faceStyle(index)"><Icon :name="item.icon" size="md" aria-hidden="true" /></span>
        <span class="dock-tip" :class="{ 'dock-tip--visible': nearest === index }" aria-hidden="true">{{ item.label }}</span>
      </a>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps<{ label: string; items: ReadonlyArray<{ id: string; label: string; icon: 'home' | 'grid' | 'cube' | 'creditCard' | 'terminal' | 'link' | 'book' | 'chat' }> }>()
const track = ref<HTMLElement | null>(null)
const pointer = ref<number | null>(null)
const focused = ref<number | null>(null)
const position = computed(() => pointer.value ?? focused.value)
const nearest = computed(() => position.value === null ? null : Math.round(position.value))

function trackPointer(event: PointerEvent) {
  if (event.pointerType === 'touch' || !track.value) return
  const bounds = track.value.getBoundingClientRect()
  pointer.value = Math.max(0, Math.min(props.items.length - 1, (event.clientX - bounds.left) / bounds.width * props.items.length - .5))
}
function faceStyle(index: number) {
  const distance = position.value === null ? 2 : Math.min(2, Math.abs(position.value - index))
  const influence = (1 + Math.cos(distance * Math.PI / 2)) / 2
  return { '--dock-scale': 1 + .45 * influence, '--dock-rise': `${-8 * influence}px` }
}
function dismissHint() { pointer.value = null; focused.value = null }
</script>

<style scoped>
.section-dock { position:fixed; z-index:29; bottom:max(18px,env(safe-area-inset-bottom)); left:50%; transform:translateX(-50%); padding:5px 8px; border-radius:999px; background:rgb(255 255 255 / .83); color:#16181b; border:1px solid rgb(202 205 211 / .75); box-shadow:inset 0 1px 0 white,0 4px 18px rgb(36 40 49 / .12); backdrop-filter:blur(18px); }
.dock-track { display:flex; }
.section-dock { width:max-content; max-width:calc(100% - 16px); }
.dock-track > a { flex:1 1 auto; min-width:0; }
.dock-hit { position:relative; display:grid; place-items:center; width:46px; height:44px; color:inherit; border-radius:50%; }
.dock-face { display:grid; place-items:center; width:35px; height:35px; border-radius:50%; background:linear-gradient(145deg,#fff,#fafafb); box-shadow:0 2px 5px rgb(40 44 52 / .12),inset 0 1px 0 #fff; }
.dock-tip { position:absolute; bottom:calc(100% + 15px); left:50%; transform:translateX(-50%); padding:4px 8px; color:white; background:#18191b; font:600 .69rem/1.35 system-ui,sans-serif; border-radius:5px; white-space:nowrap; pointer-events:none; opacity:0; }
.dock-tip--visible { opacity:1; }
.dock-hit:focus-visible { outline:2px solid var(--rl-accent); outline-offset:1px; }
@media (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference) {
  .dock-face { transform:translateY(var(--dock-rise)) scale(var(--dock-scale)); transition:transform 140ms cubic-bezier(.22,1,.36,1); }
}
:global(.dark) .section-dock { background:rgb(36 40 47 / .9); color:#f5f5f7; border-color:#50545c; box-shadow:inset 0 1px 0 #626670,0 4px 18px #0005; }
:global(.dark) .dock-face { background:linear-gradient(145deg,#454951,#30333b); box-shadow:0 2px 5px #0004,inset 0 1px 0 #595e67; }
@media (max-width:640px) { .section-dock { bottom:max(8px,env(safe-area-inset-bottom)); } .dock-hit { width:44px; } }
</style>
