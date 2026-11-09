<template>
  <AuthLayout>
    <div class="auth-flow">
      <header class="auth-heading">
        <h1>{{ t('auth.forgotPasswordTitle') }}</h1>
        <p class="auth-description">{{ t('auth.forgotPasswordHint') }}</p>
      </header>
      <div v-if="isSubmitted" class="auth-state">
        <div class="auth-notice auth-notice--success" role="status">
          <Icon name="checkCircle" size="lg" aria-hidden="true" />
          <h2>{{ t('auth.resetEmailSent') }}</h2>
          <p>{{ t('auth.resetEmailSentHint') }}</p>
        </div>
        <router-link to="/login" class="primary-btn btn btn-primary">
          {{ t('auth.backToLogin') }}
        </router-link>
      </div>
      <form
        ref="formRef"
        class="auth-form"
        novalidate
        @submit.prevent="handleSubmit"
        :aria-busy="isLoading"
        v-else
      >
        <p v-if="errorMessage" class="auth-notice auth-error" role="alert">
          {{ errorMessage }}
        </p>
        <div class="auth-field">
          <label for="email" class="input-label">{{ t('auth.emailLabel') }}</label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            required
            autocomplete="email"
            inputmode="email"
            autocapitalize="none"
            :spellcheck="false"
            :disabled="isLoading || !settingsLoaded"
            class="input"
            :class="{ 'input-error': errors.email }"
            :aria-invalid="!!errors.email"
            :aria-describedby="errors.email ? 'email-error' : undefined"
            :placeholder="t('auth.emailPlaceholder')"
          />
          <p v-if="errors.email" id="email-error" class="auth-error">
            {{ errors.email }}
          </p>
        </div>
        <div v-if="captchaEnabled" class="auth-captcha">
          <TurnstileWidget
            ref="turnstileRef"
            :turnstile-enabled="turnstileEnabled"
            :turnstile-site-key="turnstileSiteKey"
            :tencent-enabled="tencentCaptchaEnabled"
            :tencent-app-id="tencentCaptchaAppId"
            :tencent-region="tencentCaptchaRegion"
            :aliyun-enabled="aliyunCaptchaEnabled"
            :aliyun-scene-id="aliyunCaptchaSceneId"
            :aliyun-prefix="aliyunCaptchaPrefix"
            :aliyun-region="aliyunCaptchaRegion"
            @verify="onTurnstileVerify"
            @expire="onTurnstileExpire"
            @error="onTurnstileError"
          />
        </div>
        <p v-if="errors.turnstile" class="auth-error" role="alert">
          {{ errors.turnstile }}
        </p>
        <button
          type="submit"
          :disabled="isLoading || !settingsLoaded || (turnstileEnabled && !turnstileToken)"
          :aria-busy="isLoading"
          class="primary-btn btn btn-primary"
        >
          <span v-if="isLoading" class="auth-spinner" aria-hidden="true"></span>
          {{ isLoading ? t('auth.sendingResetLink') : t('auth.sendResetLink') }}
        </button>
      </form>
    </div>
    <template #footer>
      <p>
        {{ t('auth.rememberedPassword') }}
        <router-link to="/login" class="auth-link">{{ t('auth.signIn') }}</router-link>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
import { nextTick, computed, ref, reactive, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AuthLayout } from '@/components/layout'
import Icon from '@/components/icons/Icon.vue'
import TurnstileWidget from '@/components/CaptchaChallenge.vue'
import { useAppStore } from '@/stores'
import { getPublicSettings, forgotPassword } from '@/api/auth'

const { t } = useI18n()

// ==================== Stores ====================

const appStore = useAppStore()

// ==================== State ====================

const formRef = ref<HTMLFormElement | null>(null)

async function focusFirstInvalidField(): Promise<void> {
  await nextTick()
  formRef.value?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
}

const isLoading = ref<boolean>(false)
const settingsLoaded = ref(false)
const isSubmitted = ref<boolean>(false)
const errorMessage = ref<string>('')

// Public settings
const turnstileEnabled = ref<boolean>(false)
const turnstileSiteKey = ref<string>('')
const tencentCaptchaEnabled = ref<boolean>(false)
const tencentCaptchaAppId = ref<string>('')
const tencentCaptchaRegion = ref<string>('cn')
const aliyunCaptchaEnabled = ref<boolean>(false)
const aliyunCaptchaSceneId = ref<string>('')
const aliyunCaptchaPrefix = ref<string>('')
const aliyunCaptchaRegion = ref<string>('cn')

// Turnstile
const turnstileRef = ref<InstanceType<typeof TurnstileWidget> | null>(null)
const turnstileToken = ref<string>('')
const tencentCaptchaRandstr = ref<string>('')
const aliyunCaptchaReady = computed(
  () =>
    aliyunCaptchaEnabled.value &&
    Boolean(aliyunCaptchaSceneId.value) &&
    Boolean(aliyunCaptchaPrefix.value)
)
// 动作触发式验证码（腾讯/阿里云）：提交时弹窗验证
const actionCaptchaEnabled = computed(
  () =>
    (tencentCaptchaEnabled.value && Boolean(tencentCaptchaAppId.value)) || aliyunCaptchaReady.value
)
const captchaEnabled = computed(
  () => (turnstileEnabled.value && Boolean(turnstileSiteKey.value)) || actionCaptchaEnabled.value
)

const formData = reactive({
  email: ''
})

const errors = reactive({
  email: '',
  turnstile: ''
})

const validationToastMessage = computed(() => errors.email || errors.turnstile || '')

watch(validationToastMessage, (value, previousValue) => {
  if (value && value !== previousValue) {
    appStore.showError(value)
  }
})

// ==================== Lifecycle ====================

onMounted(async () => {
  try {
    const settings = await getPublicSettings()
    turnstileEnabled.value = settings.turnstile_enabled
    turnstileSiteKey.value = settings.turnstile_site_key || ''
    tencentCaptchaEnabled.value = settings.tencent_captcha_enabled === true
    tencentCaptchaAppId.value = settings.tencent_captcha_app_id || ''
    tencentCaptchaRegion.value = settings.tencent_captcha_region || 'cn'
    aliyunCaptchaEnabled.value = settings.aliyun_captcha_enabled === true
    aliyunCaptchaSceneId.value = settings.aliyun_captcha_scene_id || ''
    aliyunCaptchaPrefix.value = settings.aliyun_captcha_prefix || ''
    aliyunCaptchaRegion.value = settings.aliyun_captcha_region || 'cn'
  } catch (error) {
    console.error('Failed to load public settings:', error)
  } finally {
    settingsLoaded.value = true
  }
})

// ==================== Turnstile Handlers ====================

function onTurnstileVerify(token: string, randstr = ''): void {
  turnstileToken.value = token
  tencentCaptchaRandstr.value = randstr
  errors.turnstile = ''
}

function onTurnstileExpire(): void {
  turnstileToken.value = ''
  tencentCaptchaRandstr.value = ''
  errors.turnstile = t('auth.turnstileExpired')
}

function onTurnstileError(): void {
  turnstileToken.value = ''
  tencentCaptchaRandstr.value = ''
  errors.turnstile = t('auth.turnstileFailed')
}

function resetCaptchaProof(): void {
  turnstileRef.value?.reset()
  turnstileToken.value = ''
  tencentCaptchaRandstr.value = ''
  errors.turnstile = ''
}

async function acquireActionProof(): Promise<boolean> {
  if (!actionCaptchaEnabled.value) return true

  const proof = await turnstileRef.value?.verifyAction()
  if (!proof) return false

  turnstileToken.value = proof.token
  tencentCaptchaRandstr.value = proof.randstr
  return true
}

// ==================== Validation ====================

function validateForm(): boolean {
  errors.email = ''
  errors.turnstile = ''

  let isValid = true

  // Email validation
  if (!formData.email.trim()) {
    errors.email = t('auth.emailRequired')
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = t('auth.invalidEmail')
    isValid = false
  }

  // Turnstile validation
  if (turnstileEnabled.value && !turnstileToken.value) {
    errors.turnstile = t('auth.completeVerification')
    isValid = false
  }

  return isValid
}

// ==================== Form Handlers ====================

async function handleSubmit(): Promise<void> {
  if (!settingsLoaded.value || isLoading.value) return
  errorMessage.value = ''

  if (!validateForm()) {
    await focusFirstInvalidField()
    return
  }

  if (!(await acquireActionProof())) {
    return
  }

  isLoading.value = true

  try {
    await forgotPassword({
      email: formData.email,
      turnstile_token:
        turnstileEnabled.value || aliyunCaptchaEnabled.value ? turnstileToken.value : undefined,
      tencent_captcha_ticket: tencentCaptchaEnabled.value ? turnstileToken.value : undefined,
      tencent_captcha_randstr: tencentCaptchaEnabled.value ? tencentCaptchaRandstr.value : undefined
    })

    isSubmitted.value = true
    appStore.showSuccess(t('auth.resetEmailSent'))
  } catch (error: unknown) {
    const err = error as {
      message?: string
      response?: { data?: { detail?: string } }
    }

    if (err.response?.data?.detail) {
      errorMessage.value = err.response.data.detail
    } else if (err.message) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = t('auth.sendResetLinkFailed')
    }

    appStore.showError(errorMessage.value)
  } finally {
    if (captchaEnabled.value) {
      resetCaptchaProof()
    }
    isLoading.value = false
  }
}
</script>
