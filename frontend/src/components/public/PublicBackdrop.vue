<template>
  <div class="public-backdrop" aria-hidden="true">
    <svg class="public-backdrop-art" viewBox="0 0 1600 1200" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient :id="`${id}-sky`" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="var(--sky-top)" /><stop offset="1" stop-color="var(--sky-bottom)" /></linearGradient>
        <linearGradient :id="`${id}-blue`" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="var(--ribbon-light)" /><stop offset=".5" stop-color="var(--ribbon-mid)" /><stop offset="1" stop-color="var(--ribbon-deep)" /></linearGradient>
        <linearGradient :id="`${id}-peach`" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="var(--peach-light)" /><stop offset=".55" stop-color="var(--peach-mid)" /><stop offset="1" stop-color="var(--peach-deep)" /></linearGradient>
        <linearGradient :id="`${id}-edge`" x1="0" y1="0" x2="0" y2="1"><stop stop-color="white" stop-opacity=".8" /><stop offset="1" stop-color="white" stop-opacity="0" /></linearGradient>
      </defs>
      <rect width="1600" height="1200" :fill="`url(#${id}-sky)`" />
      <path d="M-200 920C100 560 200 450 580 605S1060 840 1800 170L1800 1400H-200Z" :fill="`url(#${id}-peach)`" />
      <path d="M-200 920C100 560 200 450 580 605S1060 840 1800 170" fill="none" :stroke="`url(#${id}-edge)`" stroke-width="3" />
      <path d="M-200 320C130 250 165 1000 650 1010S1190 490 1800 630L1800 1400H-200Z" :fill="`url(#${id}-blue)`" />
      <path d="M-200 320C130 250 165 1000 650 1010S1190 490 1800 630" fill="none" :stroke="`url(#${id}-edge)`" stroke-width="2" />
      <path d="M-100 1100C320 780 680 1260 1110 1030S1440 740 1740 880V1400H-100Z" fill="var(--foreground-ribbon)" opacity=".72" />
    </svg>
    <div class="public-backdrop-fade" />
  </div>
</template>
<script setup lang="ts">
import { useId } from 'vue'
const id = `public-landscape-${useId().replace(/:/g, '')}`
</script>
<style scoped>
.public-backdrop { --sky-top:#f4f7fd; --sky-bottom:#d9e8f9; --ribbon-light:#b4d5fa; --ribbon-mid:#8eb9eb; --ribbon-deep:#447bbc; --peach-light:#fff4ed; --peach-mid:#f4d5c9; --peach-deep:#c9c9ed; --foreground-ribbon:#d7e8f8; position:absolute; inset:0 0 auto; height:min(80rem,100%); min-height:48rem; z-index:-1; overflow:hidden; pointer-events:none; }
.public-backdrop-art { width:100%; height:100%; }
.public-backdrop-fade { position:absolute; inset:0; background:linear-gradient(180deg,transparent 45%,var(--glass-ground,#edf3fa) 100%); }
.dark .public-backdrop { --sky-top:#101c30; --sky-bottom:#203653; --ribbon-light:#274e7b; --ribbon-mid:#365a8a; --ribbon-deep:#1a3254; --peach-light:#584761; --peach-mid:#6d5260; --peach-deep:#354a72; --foreground-ribbon:#122e49; }
@media (prefers-reduced-transparency:reduce), (prefers-contrast:more) { .public-backdrop-art { opacity:.3; } }
</style>
