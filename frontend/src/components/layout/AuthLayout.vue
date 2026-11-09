<template>
  <div class="public-glass auth-surface" :data-input="inputMethod" @pointerdown.capture="inputMethod = 'pointer'" @keydown.capture="inputMethod = 'keyboard'">
    <PublicBackdrop />
    <a class="glass-skip" href="#auth-main">{{ t('glass.nav.skip') }}</a>
    <header class="auth-top">
      <nav class="auth-nav glass-panel" :aria-label="t('glass.nav.home')">
        <router-link to="/home" class="auth-brand"><PublicBrandLogo :src="siteLogo || '/logo.svg'" /><span>{{ siteName }}</span></router-link>
        <div class="auth-nav-actions">
          <PublicLocaleSwitcher />
          <router-link to="/home" class="auth-back glass-button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m14 7-5 5 5 5" /></svg>{{ t('glass.auth.backHome') }}</router-link>
        </div>
      </nav>
    </header>
    <main id="auth-main" class="auth-main" tabindex="-1">
      <section class="auth-panel glass-panel">
        <div class="auth-content"><slot /></div>
        <div v-if="$slots.footer" class="auth-footer"><slot name="footer" /></div>
      </section>
    </main>
    <footer class="auth-copyright"><span>&copy; {{ currentYear }} {{ siteName }}</span><a href="mailto:9768379@gmail.com">{{ t('glass.nav.help') }} <span aria-hidden="true">↗</span></a></footer>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import { sanitizeUrl } from '@/utils/url'
import PublicBrandLogo from '@/components/common/PublicBrandLogo.vue'
import PublicBackdrop from '@/components/public/PublicBackdrop.vue'
import PublicLocaleSwitcher from '@/components/public/PublicLocaleSwitcher.vue'
import '@/styles/public-glass.css'
const { t } = useI18n()
const appStore = useAppStore()
const inputMethod = ref('keyboard')
const siteName = computed(() => appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const currentYear = new Date().getFullYear()
onMounted(() => { if (!appStore.publicSettingsLoaded) void appStore.fetchPublicSettings() })
</script>
