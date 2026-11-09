<template>
  <div class="oauth-provider space-y-4">
    <button type="button" :disabled="buttonDisabled" class="oauth-provider-button btn btn-secondary w-full" @click="startLogin">
      <span
        class="oauth-provider-initial oauth-provider-wechat" aria-hidden="true"
      >
        W
      </span>
      {{ t('auth.oidc.signIn', { providerName }) }}
    </button>

    <p
      v-if="disabledHint"
      data-testid="wechat-oauth-hint"
      class="oauth-provider-hint" role="status"
    >
      {{ disabledHint }}
    </p>

    <div v-if="showDivider" class="oauth-divider">
      <div class="oauth-divider-line" aria-hidden="true"></div>
      <span class="oauth-divider-label">
        {{ t('auth.oauthOrContinue') }}
      </span>
      <div class="oauth-divider-line" aria-hidden="true"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { resolveWeChatOAuthStart, type OAuthLoginStart } from '@/api/auth'
import { useAppStore } from '@/stores'
import { resolveAffiliateReferralCode, storeOAuthAffiliateCode } from '@/utils/oauthAffiliate'

const props = withDefaults(defineProps<{
  disabled?: boolean
  affCode?: string
  showDivider?: boolean
}>(), {
  showDivider: true,
})
const emit = defineEmits<{
  start: [request: OAuthLoginStart]
}>()

const appStore = useAppStore()
const route = useRoute()
const { t, locale } = useI18n()
const providerName = computed(() => t('auth.wechatProviderName'))

function localizeWeChatHint(zh: string, en: string): string {
  return locale.value.startsWith('zh') ? zh : en
}

const resolvedStart = computed(() => resolveWeChatOAuthStart(appStore.cachedPublicSettings))
const buttonDisabled = computed(() => props.disabled || resolvedStart.value.mode === null)
const disabledHint = computed(() => {
  if (props.disabled) {
    return ''
  }
  switch (resolvedStart.value.unavailableReason) {
    case 'external_browser_required':
      return t('auth.oauthFlow.wechatSystemBrowserOnly')
    case 'wechat_browser_required':
      return t('auth.oauthFlow.wechatBrowserOnly')
    case 'native_app_required':
      return localizeWeChatHint(
        '当前仅配置微信移动应用登录，需要在原生 App 中通过微信 SDK 发起授权。',
        'This site only has WeChat mobile app login configured. Continue from the native app through the WeChat SDK.',
      )
    case 'not_configured':
      return t('auth.oauthFlow.wechatNotConfigured')
    default:
      return ''
  }
})

onMounted(() => {
  if (!appStore.cachedPublicSettings && !appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }
})

function startLogin(): void {
  if (buttonDisabled.value || !resolvedStart.value.mode) {
    return
  }
  const redirectTo = (route.query.redirect as string) || '/dashboard'
  storeOAuthAffiliateCode(resolveAffiliateReferralCode(props.affCode, route.query.aff, route.query.aff_code))
  const mode = resolvedStart.value.mode
  emit('start', {
    provider: 'wechat',
    params: { mode, redirect: redirectTo }
  })
}
</script>

<style scoped src="./oauth-controls.css"></style>
