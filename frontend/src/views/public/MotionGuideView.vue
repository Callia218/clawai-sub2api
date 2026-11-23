<template>
  <main class="motion-guide">
    <div class="guide-shell">
      <nav><router-link to="/home#capabilities">← {{ zh ? '返回产品能力' : 'Back to features' }}</router-link><PublicLocaleSwitcher /></nav>
      <header>
        <p class="kicker">{{ zh ? '交互设计笔记' : 'Interaction field notes' }} · 01–24</p>
        <h1>{{ zh ? '动效在哪里？' : 'Where does it move?' }}</h1>
        <p>{{ zh ? '按三段参考视频的时间顺序，找到每个效果在本站的位置。点条目即可前往；标有「需登录」的页面不会为了演示而开放账户数据。' : 'Find each reference in the product, in video order. Follow a row to its location. Account-only pages remain private.' }}</p>
        <router-link class="guide-primary" to="/home#motion-preview">{{ zh ? '先试播加载动效' : 'Try the loading preview' }} →</router-link>
        <p class="note">{{ zh ? '鼠标跟随使用电脑体验。开启「减少动态效果」后，内容和操作仍保留。时间点为约数，标注变体的效果不等于逐帧复刻。' : 'Pointer effects need a mouse. Reduced motion preserves content and actions. Timecodes are approximate; adaptations are not frame-matched replicas.' }}</p>
      </header>
      <section v-for="(chapter, index) in motionReferences" :key="chapter.en" :aria-labelledby="`chapter-${index}`">
        <div class="chapter-title"><small>0{{ index + 1 }}</small><h2 :id="`chapter-${index}`">{{ zh ? chapter.zh : chapter.en }}</h2></div>
        <ol><li v-for="row in chapter.rows" :key="row[0]">
          <router-link :to="row[3]" class="guide-row"><span class="time">{{ row[0] }}</span><span><strong>{{ zh ? row[1] : row[2] }}</strong><span class="action">{{ zh ? row[4] : row[5] }}</span></span><small v-if="row[3] === '/purchase'">{{ zh ? '需登录' : 'Sign in' }}</small><span v-else aria-hidden="true">↗</span></router-link>
        </li></ol>
      </section>
      <section class="skills"><h2>{{ zh ? '把这套方法带到下一个页面' : 'Use the same method on your next page' }}</h2>
        <p>{{ zh ? '包含视觉方向、动效设计、视觉评审，以及三段视频的选型索引。解压到项目的 .agents/skills/ 目录即可复用；它们提供设计规则，不更改模型权重。' : 'Includes visual direction, motion design, visual review and the video atlas. Extract the ZIP to .agents/skills/ in your project. The skills guide design without changing model weights.' }}</p>
        <a class="guide-primary" :href="bundle" download="cmlia-design-skills.zip">{{ zh ? '下载设计 Skills（ZIP）' : 'Download design skills (ZIP)' }} ↓</a>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PublicLocaleSwitcher from '@/components/public/PublicLocaleSwitcher.vue'
import { motionReferences } from './motionReferences'
import bundle from '@/assets/cmlia-design-skills.zip?url'

const { locale } = useI18n()
const zh = computed(() => locale.value.startsWith('zh'))
</script>

<style scoped>
.motion-guide { --paper:#f7f8f6; --ink:#17221c; --muted:#536158; --line:#cdd7ce; --accent:#206041; min-height:100vh; color:var(--ink); background:var(--paper); }
:global(.dark) .motion-guide { --paper:#141a16; --ink:#edf4ef; --muted:#b7c6ba; --line:#35483a; --accent:#99ddb3; }
.guide-shell { max-width:54rem; padding:22px clamp(16px,4vw,40px) 72px; margin:auto; }
.guide-shell nav,.chapter-title,.guide-row { display:flex; align-items:center; gap:16px; }
.guide-shell nav { justify-content:space-between; color:var(--accent); font-weight:650; }
.guide-shell nav button { min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:5px; border:1px solid var(--line); border-radius:9px; }
.guide-shell header { padding:clamp(44px,8vw,88px) 0 32px; }
.kicker,.chapter-title small,.time { font:600 .78rem/1.4 ui-monospace,monospace; color:var(--accent); font-variant-numeric:tabular-nums; }
.guide-shell h1 { margin:12px 0; font-size:clamp(2.7rem,6vw,4.6rem); letter-spacing:-.045em; line-height:1.1; font-weight:700; }
.guide-shell p:not(.kicker),.action { color:var(--muted); line-height:1.65; }
.guide-primary { margin:18px 0; display:inline-block; background:var(--ink); color:var(--paper); border-radius:10px; padding:12px 16px; font-weight:650; }
.note,.action,.skills p { font-size:.875rem; }
.chapter-title { margin:24px 0 8px; }
.guide-shell h2 { font-size:clamp(1.4rem,3vw,2rem); font-weight:660; }
.guide-row { padding:13px 2px; border-bottom:1px solid var(--line); }
.guide-row > :nth-child(2) { flex:1; }
.guide-row small { color:var(--muted); white-space:nowrap; }
.guide-row strong,.action { display:block; }
.guide-row strong,.skills strong { font-size:1rem; font-weight:650; }
.guide-shell a:is(:hover,:focus-visible) strong,.guide-shell nav a:hover { text-decoration:underline; }
.guide-shell a:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
.skills { margin-top:52px; }
.skills p { margin:8px 0; }
</style>
