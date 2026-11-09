<template>
  <!-- Administrator-provided content and compact mode retain priority. -->
  <div v-if="hasHomeContent" class="min-h-screen">
    <iframe v-if="isHomeContentUrl" :src="homeContent.trim()" class="h-screen w-full border-0" allowfullscreen></iframe>
    <!-- SECURITY: HTML is an administrator-only setting. -->
    <div v-else v-html="homeContent"></div>
  </div>

  <div v-else-if="compactHomeEnabled" data-testid="compact-home" class="public-glass lg-home-compact flex flex-col">
    <PublicBackdrop />
    <header class="lg-home-compact-header border-b px-4 py-4 sm:px-6">
      <nav class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <img :src="siteLogo || '/logo.svg'" alt="Logo" class="h-9 w-9 shrink-0 rounded-lg object-contain" />
          <span class="min-w-0 truncate text-base font-semibold">{{ siteName }}</span>
        </div>
        <div class="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
          <PublicLocaleSwitcher />
          <a v-if="docUrl" :href="docUrl" target="_blank" rel="noopener noreferrer" class="glass-button lg-home-compact-icon shrink-0" :aria-label="t('home.viewDocs')" :title="t('home.viewDocs')"><Icon name="book" size="md" aria-hidden="true" /></a>
          <router-link v-if="showModelPlazaEntry" to="/model-plaza" class="glass-button shrink-0" :aria-label="t('nav.modelPlaza')" :title="t('nav.modelPlaza')"><Icon name="grid" size="md" aria-hidden="true" /><span class="hidden sm:inline">{{ t('nav.modelPlaza') }}</span></router-link>
          <button class="glass-button lg-home-compact-icon shrink-0" :aria-label="isDark ? t('home.switchToLight') : t('home.switchToDark')" :title="isDark ? t('home.switchToLight') : t('home.switchToDark')" @click="toggleTheme"><Icon :name="isDark ? 'sun' : 'moon'" size="md" aria-hidden="true" /></button>
          <router-link :to="entryPath" class="glass-button shrink-0">{{ isAuthenticated ? t('home.dashboard') : t('home.login') }}</router-link>
        </div>
      </nav>
    </header>
    <main class="flex min-w-0 flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div class="min-w-0 max-w-2xl text-center">
        <img :src="siteLogo || '/logo.svg'" alt="Logo" class="mx-auto mb-6 h-20 w-20 rounded-2xl object-contain" />
        <h1 class="[overflow-wrap:anywhere] text-3xl font-bold md:text-4xl">{{ siteName }}</h1>
        <p class="lg-home-compact-muted mt-4 whitespace-pre-wrap [overflow-wrap:anywhere] text-base">{{ siteSubtitle }}</p>
        <router-link :to="entryPath" class="glass-button glass-button--primary mt-8">{{ isAuthenticated ? t('home.goToDashboard') : t('home.login') }}</router-link>
      </div>
    </main>
    <footer class="lg-home-compact-footer lg-home-compact-muted min-w-0 border-t px-4 py-5 text-center text-sm [overflow-wrap:anywhere] sm:px-6">&copy; {{ currentYear }} {{ siteName }}</footer>
  </div>

  <ReferenceLanding v-else />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useAppStore } from '@/stores'
import PublicLocaleSwitcher from '@/components/public/PublicLocaleSwitcher.vue'
import PublicBackdrop from '@/components/public/PublicBackdrop.vue'
import ReferenceLanding from '@/components/public/ReferenceLanding.vue'
import Icon from '@/components/icons/Icon.vue'
import '@/styles/public-glass.css'
import { useTheme } from '@/composables/useTheme'
import { sanitizeUrl } from '@/utils/url'
import { FeatureFlags, isFeatureFlagEnabled } from '@/utils/featureFlags'

const { t } = useI18n()
const authStore = useAuthStore()
const appStore = useAppStore()
const { isDark, toggleTheme } = useTheme()
const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || 'AI API Gateway Platform')
const docUrl = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.doc_url || appStore.docUrl || ''))
const homeContent = computed(() => appStore.cachedPublicSettings?.home_content || '')
const hasHomeContent = computed(() => homeContent.value.trim().length > 0)
const compactHomeEnabled = computed(() => appStore.cachedPublicSettings?.compact_home_enabled === true)
const modelPlazaEnabled = computed(() => isFeatureFlagEnabled(FeatureFlags.modelPlaza))
const isHomeContentUrl = computed(() => /^https?:\/\//.test(homeContent.value.trim()))
const isAuthenticated = computed(() => authStore.isAuthenticated)
const modelPlazaRequiresAuth = computed(() => appStore.cachedPublicSettings?.model_plaza_require_auth === true)
const showModelPlazaEntry = computed(() => modelPlazaEnabled.value && (isAuthenticated.value || !modelPlazaRequiresAuth.value))
const dashboardPath = computed(() => authStore.isAdmin ? '/admin/dashboard' : '/dashboard')
const entryPath = computed(() => isAuthenticated.value ? dashboardPath.value : '/login')
const currentYear = computed(() => new Date().getFullYear())
onMounted(() => {
  authStore.checkAuth()
  if (!appStore.publicSettingsLoaded) appStore.fetchPublicSettings()
})
</script>

<style scoped>
.lg-home-compact-header,.lg-home-compact-footer { border-color:var(--glass-line); }
.lg-home-compact-muted { color:var(--glass-muted); }
.lg-home-compact .lg-home-compact-icon { width:2.75rem; min-height:2.75rem; padding:0; }
</style>
