<template>
  <button type="button" class="glass-button public-locale" :aria-label="`${t('glass.nav.language')}: ${locale === 'zh' ? 'English' : '中文'}`" :disabled="switching" @click="switchLocale">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><ellipse cx="12" cy="12" rx="3.7" ry="8.5" /><path d="M3.5 12h17" /></svg>
    <span>{{ locale === 'zh' ? 'EN' : '中' }}</span>
  </button>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import { useAppStore } from '@/stores'
const { locale, t } = useI18n()
const switching = ref(false)
const appStore = useAppStore()
async function switchLocale() {
  if (switching.value) return
  switching.value = true
  try { await setLocale(locale.value === 'zh' ? 'en' : 'zh') }
  catch { appStore.showError(t('common.error')) }
  finally { switching.value = false }
}
</script>
<style scoped>
.public-locale { min-width:4.25rem; padding-inline:.85rem; }
.public-locale svg { width:1.15rem; height:1.15rem; flex:none; }
.public-locale span { font-size:.75rem; font-weight:600; }
</style>
