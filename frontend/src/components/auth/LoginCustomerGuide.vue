<template>
  <div class="access-guide">
    <h2>{{ t('accessGuide.title') }}</h2>
    <p class="access-guide__intro">{{ t('accessGuide.intro', { site: siteName }) }}</p>

    <dl class="access-guide__capabilities">
      <div>
        <dt>{{ t('accessGuide.keysTitle') }}</dt>
        <dd>{{ t('accessGuide.keysDescription') }}</dd>
      </div>
      <div>
        <dt>{{ t('accessGuide.modelsTitle') }}</dt>
        <dd>{{ t('accessGuide.modelsDescription') }}</dd>
      </div>
      <div>
        <dt>{{ t('accessGuide.usageTitle') }}</dt>
        <dd>{{ t('accessGuide.usageDescription') }}</dd>
      </div>
    </dl>

    <section class="access-guide__start" aria-labelledby="access-start-title">
      <h3 id="access-start-title">{{ t('accessGuide.startTitle') }}</h3>
      <p v-if="settingsReady && backendModeEnabled">{{ t('accessGuide.backendModeNote') }}</p>
      <p v-else-if="settingsReady && !registrationEnabled">{{ t('accessGuide.registrationClosed') }}</p>
      <p v-else-if="settingsReady && invitationCodeEnabled">{{ t('accessGuide.invitationStart') }}</p>
      <p v-else>{{ t('accessGuide.startDescription') }}</p>
      <p v-if="paymentEnabled" class="access-guide__payment">{{ t('accessGuide.paymentNote') }}</p>
      <div class="access-guide__links">
        <router-link to="/home#quick-start">{{ t('accessGuide.readGuide') }}<Icon name="arrowRight" size="sm" /></router-link>
        <router-link to="/home#connection">{{ t('accessGuide.connectionGuide') }}</router-link>
      </div>
    </section>

    <nav class="access-guide__support" :aria-label="t('accessGuide.supportTitle')">
      <a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a>
      <router-link to="/home#questions" class="access-guide__faq">{{ t('accessGuide.readFAQ') }}</router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
const appStore = useAppStore()
const settings = computed(() => appStore.cachedPublicSettings)
const settingsReady = computed(() => appStore.publicSettingsLoaded)
const siteName = computed(() => settings.value?.site_name || appStore.siteName || 'Sub2API')
const registrationEnabled = computed(() => settings.value?.registration_enabled === true)
const invitationCodeEnabled = computed(() => settings.value?.invitation_code_enabled === true)
const backendModeEnabled = computed(() => settings.value?.backend_mode_enabled === true)
const paymentEnabled = computed(() =>
  !backendModeEnabled.value &&
  settings.value?.payment_enabled === true &&
  settings.value?.payment_balance_disabled !== true
)

// The public onboarding pages use the site owner's confirmed support email.
const supportEmail = '9768379@gmail.com'
</script>

<style scoped>
.access-guide { color:var(--auth-text); }
.access-guide h2 { max-width:11em; margin:0; font-size:48px; font-weight:500; line-height:1.1; letter-spacing:-.025em; text-wrap:balance; }
.access-guide__intro { max-width:42ch; margin:24px 0 0; font-size:17px; line-height:1.6; color:var(--auth-muted); text-wrap:pretty; }
.access-guide__capabilities { margin:32px 0 0; display:grid; gap:16px; }
.access-guide__capabilities > div { display:grid; grid-template-columns:100px minmax(0,1fr); align-items:baseline; column-gap:20px; }
.access-guide__capabilities dt { font-size:14px; line-height:1.6; font-weight:500; }
.access-guide__capabilities dd { margin:0; font-size:14px; line-height:1.7; color:var(--auth-muted); }
.access-guide__start { margin-top:28px; padding-top:24px; border-top:1px solid var(--auth-line); }
.access-guide h3 { margin:0; font-size:17px; font-weight:500; line-height:1.5; letter-spacing:-.01em; }
.access-guide__start > p { margin:8px 0 0; font-size:14px; line-height:1.7; color:var(--auth-muted); }
.access-guide__start > .access-guide__payment { margin-top:8px; }
.access-guide__links { display:flex; flex-wrap:wrap; column-gap:24px; margin-top:8px; }
.access-guide__links a { display:inline-flex; align-items:center; gap:5px; min-height:44px; font-size:14px; color:var(--auth-blue); }
.access-guide__support { display:flex; align-items:center; flex-wrap:wrap; gap:0 24px; margin-top:20px; padding-top:12px; border-top:1px solid var(--auth-line); }
.access-guide__support a { display:inline-flex; align-items:center; min-height:44px; font-size:14px; line-height:1.5; color:var(--auth-blue); overflow-wrap:anywhere; }
.access-guide a:hover { text-decoration:underline; text-underline-offset:4px; }
.access-guide a { text-decoration-color:transparent; text-underline-offset:4px; transition:color 160ms ease, text-decoration-color 160ms ease, opacity 160ms ease; }
.access-guide a:hover { text-decoration-color:currentColor; }
.access-guide a:active { opacity:.72; }
.access-guide__links a :deep(svg) { transition:transform 160ms var(--auth-arrival,cubic-bezier(.16,1,.3,1)); }
.access-guide__links a:hover :deep(svg) { transform:translateX(3px); }
.access-guide a:focus-visible { outline:2px solid var(--auth-blue); outline-offset:4px; border-radius:2px; }
@media (min-width:761px) and (max-width:1000px) { .access-guide h2 { font-size:44px; } .access-guide__capabilities > div { grid-template-columns:1fr; row-gap:3px; } .access-guide__intro { font-size:17px; } }
@media (max-width:760px) { .access-guide h2 { max-width:14em; font-size:32px; line-height:1.16; } .access-guide__intro { margin-top:16px; font-size:17px; } .access-guide__capabilities { margin-top:28px; gap:18px; } .access-guide__capabilities > div { grid-template-columns:92px minmax(0,1fr); column-gap:14px; } .access-guide__start { margin-top:28px; padding-top:24px; } }
@media (prefers-reduced-motion:reduce) { .access-guide a { transition-duration:120ms; } .access-guide__links a :deep(svg), .access-guide__links a:hover :deep(svg) { transition:none; transform:none; } }
</style>
