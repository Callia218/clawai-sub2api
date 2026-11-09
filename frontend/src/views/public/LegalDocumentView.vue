<template>
  <div class="public-glass legal-page">
    <PublicBackdrop />
    <a class="glass-skip" href="#legal-main">{{ t('glass.nav.skip') }}</a>
    <header class="legal-header">
      <nav class="legal-nav glass-panel" :aria-label="t('glass.nav.home')">
        <RouterLink to="/home" class="legal-brand" :aria-label="settings ? siteName : t('glass.nav.home')">
          <template v-if="settings">
            <img :src="siteLogo || '/logo.svg'" alt="" class="legal-logo" />
            <span>{{ siteName }}</span>
          </template>
          <template v-else>
            <span class="legal-skeleton legal-skeleton--logo" aria-hidden="true"></span>
            <span class="legal-skeleton legal-skeleton--name" aria-hidden="true"></span>
          </template>
        </RouterLink>
        <RouterLink to="/login" class="glass-button glass-button--primary">{{ t('home.login') }}</RouterLink>
      </nav>
    </header>

    <main id="legal-main" class="legal-main" tabindex="-1">
      <div v-if="loading" class="legal-loading" role="status" :aria-label="t('common.loading')">
        <span class="auth-spinner" aria-hidden="true"></span>
      </div>
      <section v-else-if="loadError" class="legal-state legal-state--error glass-panel" role="alert">
        <h1>{{ t('legal.loadFailed') }}</h1>
        <p>{{ t('legal.retryLater') }}</p>
      </section>
      <section v-else-if="!currentDocument" class="legal-state glass-panel">
        <span class="legal-document-symbol glass-control" aria-hidden="true"><Icon name="document" size="md" /></span>
        <h1>{{ t('legal.notFound') }}</h1>
        <p>{{ t('legal.notFoundDescription') }}</p>
      </section>
      <article v-else class="legal-article glass-panel">
        <header class="legal-document-header">
          <span class="legal-document-symbol glass-control" aria-hidden="true"><Icon :name="documentIcon" size="md" /></span>
          <div class="legal-title-block">
            <p class="legal-document-type">{{ documentTypeLabel }}</p>
            <h1>{{ currentDocument.title }}</h1>
            <p v-if="updatedAt" class="legal-updated">{{ t('legal.updatedAt', { date: updatedAt }) }}</p>
          </div>
        </header>
        <div v-if="hasContent" class="legal-document-content" v-html="renderedHtml"></div>
        <p v-else class="legal-empty">{{ t('legal.empty') }}</p>
      </article>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import PublicBackdrop from '@/components/public/PublicBackdrop.vue'
import '@/styles/public-glass.css'
import { getLocale } from '@/i18n'
import { sanitizeUrl } from '@/utils/url'
import { useAppStore } from '@/stores/app'
import type { LoginAgreementDocument } from '@/types'
import zhAdminCompliance from '../../../../docs/legal/admin-compliance.zh.md?raw'
import enAdminCompliance from '../../../../docs/legal/admin-compliance.en.md?raw'

type LegalDocumentIcon = 'document' | 'shield' | 'globe' | 'cog'

const route = useRoute()
const { t } = useI18n()
const appStore = useAppStore()
const settings = computed(() => appStore.cachedPublicSettings)
const loading = ref(!settings.value)
const loadError = ref(false)

marked.setOptions({
  breaks: true,
  gfm: true,
})

const documentId = computed(() => String(route.params.documentId || ''))
const isAdminComplianceDocument = computed(() => documentId.value === 'admin-compliance')
const documents = computed(() => settings.value?.login_agreement_documents ?? [])
const siteName = computed(() => settings.value?.site_name || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(settings.value?.site_logo || '', {
  allowRelative: true,
  allowDataUrl: true,
}))
const updatedAt = computed(() =>
  isAdminComplianceDocument.value ? '' : settings.value?.login_agreement_updated_at || ''
)
const documentTypeLabel = computed(() =>
  isAdminComplianceDocument.value ? t('legal.adminCompliance') : t('legal.loginAgreement')
)

const currentDocument = computed<LoginAgreementDocument | null>(() => {
  if (isAdminComplianceDocument.value) {
    return {
      id: 'admin-compliance',
      title: t('adminCompliance.title'),
      content_md: getLocale() === 'zh' ? zhAdminCompliance : enAdminCompliance
    }
  }
  const id = documentId.value
  if (!id) {
    return null
  }
  return documents.value.find((doc) => doc.id === id) ?? null
})

const hasContent = computed(() => Boolean(currentDocument.value?.content_md?.trim()))

const renderedHtml = computed(() => {
  const content = currentDocument.value?.content_md?.trim() || ''
  if (!content) {
    return ''
  }
  const html = marked.parse(content) as string
  return DOMPurify.sanitize(html)
})

const documentIcon = computed<LegalDocumentIcon>(() => {
  const title = currentDocument.value?.title || ''
  if (title.includes('政策') || title.includes('隐私')) {
    return 'shield'
  }
  if (title.includes('国家') || title.includes('地区')) {
    return 'globe'
  }
  if (title.includes('特定')) {
    return 'cog'
  }
  return 'document'
})

onMounted(async () => {
  loadError.value = false
  const loadedSettings = await appStore.fetchPublicSettings()
  if (!loadedSettings) {
    loadError.value = true
  }
  loading.value = false
})
</script>

<style scoped>
.legal-header { padding: calc(1.25rem + env(safe-area-inset-top, 0px)) max(1.25rem, env(safe-area-inset-right, 0px)) 0 max(1.25rem, env(safe-area-inset-left, 0px)); }
.legal-nav { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; max-width: 70rem; min-height: 4rem; margin-inline: auto; padding: .5rem .625rem .5rem 1.25rem; }
.legal-brand { display: flex; align-items: center; gap: .75rem; min-width: 0; flex: 1 1 10rem; color: var(--glass-text); font-size: 1.0625rem; font-weight: 650; letter-spacing: -.025em; overflow-wrap: anywhere; }
.legal-brand span { min-width: 0; }
.legal-logo { flex: none; width: 2rem; height: 2rem; object-fit: contain; }
.legal-nav > .glass-button { flex-shrink: 0; }
.legal-skeleton { display: block; border: 1px solid var(--glass-control-edge); background: var(--glass-control-fill); border-radius: .75rem; }
.legal-skeleton--logo { flex: none; width: 2rem; height: 2rem; }
.legal-skeleton--name { width: 7rem; height: 1.25rem; }
.legal-main { width: min(100%, 56rem); margin-inline: auto; padding: 3rem max(1.25rem, env(safe-area-inset-right, 0px)) calc(3rem + env(safe-area-inset-bottom, 0px)) max(1.25rem, env(safe-area-inset-left, 0px)); outline: none; }
.legal-loading { display: grid; place-items: center; min-height: 20rem; }
.legal-loading .auth-spinner { width: 1.75rem; height: 1.75rem; color: var(--glass-accent); }
.legal-article, .legal-state { padding: clamp(1.5rem, 5vw, 3rem); }
.legal-state h1 { margin-top: 1.25rem; color: var(--glass-text); font-size: 1.5rem; font-weight: 650; }
.legal-state p { margin-top: .75rem; color: var(--glass-muted); line-height: 1.75; }
.legal-state--error h1 { color: #a42b23; }
.dark .legal-state--error h1 { color: #ffc8c2; }
.legal-document-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 2rem; padding-bottom: 1.75rem; border-bottom: 1px solid var(--glass-line); }
.legal-document-symbol { display: grid; place-items: center; flex: none; width: 3rem; height: 3rem; border-radius: 1rem; }
.legal-title-block { min-width: 0; }
.legal-document-type { color: var(--glass-accent); font-size: .8125rem; font-weight: 600; }
.legal-title-block h1 { margin-top: .625rem; color: var(--glass-text); font-size: clamp(1.75rem, 4vw, 2.25rem); font-weight: 650; line-height: 1.3; letter-spacing: -.025em; text-wrap: balance; }
.legal-updated { margin-top: .875rem; color: var(--glass-muted); font-size: .8125rem; line-height: 1.6; }
.legal-empty { padding: 2.5rem 1rem; color: var(--glass-muted); text-align: center; font-size: .875rem; }
.legal-document-content { color: var(--glass-text); font-size: 1rem; line-height: 1.85; overflow-wrap: anywhere; }
.legal-document-content :deep(:is(h1,h2,h3,h4)) { color: var(--glass-text); font-weight: 650; line-height: 1.35; text-wrap: balance; }
.legal-document-content :deep(h1) { margin: 2rem 0 1rem; padding-bottom: .75rem; border-bottom: 1px solid var(--glass-line); font-size: 1.875rem; }
.legal-document-content :deep(h2) { margin: 1.75rem 0 .75rem; font-size: 1.5rem; }
.legal-document-content :deep(h3) { margin: 1.5rem 0 .625rem; font-size: 1.25rem; }
.legal-document-content :deep(h4) { margin: 1.25rem 0 .5rem; font-size: 1.125rem; }
.legal-document-content :deep(p) { margin-bottom: 1rem; }
.legal-document-content :deep(a) { color: var(--glass-accent); text-decoration: underline; text-underline-offset: .25em; }
.legal-document-content :deep(:is(ul,ol)) { margin-bottom: 1rem; padding-left: 1.5rem; }
.legal-document-content :deep(ul) { list-style: disc; }
.legal-document-content :deep(ol) { list-style: decimal; }
.legal-document-content :deep(li) { margin-bottom: .25rem; }
.legal-document-content :deep(blockquote) { margin-block: 1.25rem; padding-left: 1rem; border-left: 3px solid var(--glass-line); color: var(--glass-muted); }
.legal-document-content :deep(code) { border-radius: .375rem; padding: .125rem .375rem; background: var(--glass-control-fill); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .875em; }
.legal-document-content :deep(pre) { margin-block: 1.25rem; overflow-x: auto; border: 1px solid var(--glass-control-edge); border-radius: 1rem; padding: 1rem; background: var(--glass-control-fill); }
.legal-document-content :deep(pre code) { padding: 0; background: transparent; color: inherit; }
.legal-document-content :deep(table) { display: block; width: 100%; margin-block: 1.25rem; overflow-x: auto; border-collapse: collapse; }
.legal-document-content :deep(:is(th,td)) { border: 1px solid var(--glass-line); padding: .625rem .75rem; text-align: left; }
.legal-document-content :deep(th) { background: var(--glass-control-fill); font-weight: 600; }
.legal-document-content :deep(img) { max-width: 100%; height: auto; margin-block: 1.25rem; border-radius: 1rem; }
.legal-document-content :deep(hr) { margin-block: 1.75rem; border-color: var(--glass-line); }
@media (max-width: 540px) {
  .legal-header { padding: calc(.75rem + env(safe-area-inset-top, 0px)) .75rem 0; }
  .legal-nav { padding-left: 1rem; gap: .5rem; }
  .legal-main { padding: 1.5rem .875rem calc(2rem + env(safe-area-inset-bottom, 0px)); }
  .legal-document-header { flex-wrap: wrap; }
  .legal-title-block { flex-basis: 100%; }
}
</style>
