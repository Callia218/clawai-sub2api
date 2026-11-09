<template>
  <div class="oauth-provider space-y-4">
    <button type="button" :disabled="disabled" class="oauth-provider-button btn btn-secondary w-full" @click="startLogin">
      <img v-if="providerIcon" :src="providerIcon" alt="" aria-hidden="true" class="h-6 w-6 shrink-0" width="24" height="24" />
      <span v-else
        class="oauth-provider-initial" aria-hidden="true"
      >
        {{ providerInitial }}
      </span>
      {{ t('auth.oidc.signIn', { providerName: normalizedProviderName }) }}
    </button>

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
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { OAuthLoginStart } from '@/api/auth'
import { resolveAffiliateReferralCode, storeOAuthAffiliateCode } from '@/utils/oauthAffiliate'
import { oidcProviderIcon } from '@/utils/oidcProviderIcon'

const props = withDefaults(defineProps<{
  disabled?: boolean
  affCode?: string
  providerName?: string
  showDivider?: boolean
}>(), {
  providerName: 'OIDC',
  showDivider: true
})
const emit = defineEmits<{
  start: [request: OAuthLoginStart]
}>()

const route = useRoute()
const { t } = useI18n()

const normalizedProviderName = computed(() => {
  const name = props.providerName?.trim()
  return name || 'OIDC'
})

const providerInitial = computed(() => normalizedProviderName.value.charAt(0).toUpperCase() || 'O')
const providerIcon = computed(() => oidcProviderIcon(normalizedProviderName.value))

function startLogin(): void {
  const redirectTo = (route.query.redirect as string) || '/dashboard'
  storeOAuthAffiliateCode(resolveAffiliateReferralCode(props.affCode, route.query.aff, route.query.aff_code))
  emit('start', { provider: 'oidc', params: { redirect: redirectTo } })
}
</script>

<style scoped src="./oauth-controls.css"></style>
