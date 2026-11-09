<template>
  <AuthLayout>
    <div class="auth-flow">
      <header class="auth-heading">
        <h1>{{ t('auth.resetPasswordTitle') }}</h1>
        <p class="auth-description">{{ t('auth.resetPasswordHint') }}</p>
      </header>
      <div v-if="isInvalidLink" class="auth-state">
        <div class="auth-notice auth-notice--warning" role="status">
          <Icon name="exclamationCircle" size="lg" aria-hidden="true" />
          <h2>{{ t('auth.invalidResetLink') }}</h2>
          <p>{{ t('auth.invalidResetLinkHint') }}</p>
        </div>
        <router-link to="/forgot-password" class="primary-btn btn btn-primary">
          {{ t('auth.requestNewResetLink') }}
        </router-link>
      </div>
      <div v-else-if="isSuccess" class="auth-state">
        <div class="auth-notice auth-notice--success" role="status">
          <Icon name="checkCircle" size="lg" aria-hidden="true" />
          <h2>{{ t('auth.passwordResetSuccess') }}</h2>
          <p>{{ t('auth.passwordResetSuccessHint') }}</p>
        </div>
        <router-link to="/login" class="primary-btn btn btn-primary">
          {{ t('auth.signIn') }}
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
            :value="email"
            type="email"
            autocomplete="email"
            readonly
            class="input"
          />
        </div>
        <div class="auth-field">
          <label for="password" class="input-label">{{ t('auth.newPassword') }}</label>
          <div class="auth-control">
            <input
              id="password"
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="new-password"
              :disabled="isLoading"
              class="input auth-input-action"
              :class="{ 'input-error': errors.password }"
              :aria-invalid="!!errors.password"
              :aria-describedby="errors.password ? 'password-error password-hint' : 'password-hint'"
              :placeholder="t('auth.newPasswordPlaceholder')"
            />
            <button
              type="button"
              class="auth-reveal"
              :disabled="isLoading"
              :aria-label="t(showPassword ? 'glass.auth.hidePassword' : 'glass.auth.showPassword')"
              :aria-pressed="showPassword"
              aria-controls="password"
              @click="showPassword = !showPassword"
            >
              <Icon :name="showPassword ? 'eyeOff' : 'eye'" size="md" aria-hidden="true" />
            </button>
          </div>
          <p id="password-hint" class="auth-hint">
            {{ t('auth.passwordHint') }}
          </p>
          <p v-if="errors.password" id="password-error" class="auth-error">
            {{ errors.password }}
          </p>
        </div>
        <div class="auth-field">
          <label for="confirmPassword" class="input-label">{{ t('auth.confirmPassword') }}</label>
          <div class="auth-control">
            <input
              id="confirmPassword"
              v-model="formData.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              required
              autocomplete="new-password"
              :disabled="isLoading"
              class="input auth-input-action"
              :class="{ 'input-error': errors.confirmPassword }"
              :aria-invalid="!!errors.confirmPassword"
              :aria-describedby="errors.confirmPassword ? 'confirmPassword-error' : undefined"
              :placeholder="t('auth.confirmPasswordPlaceholder')"
            />
            <button
              type="button"
              class="auth-reveal"
              :disabled="isLoading"
              :aria-label="
                t(showConfirmPassword ? 'glass.auth.hidePassword' : 'glass.auth.showPassword')
              "
              :aria-pressed="showConfirmPassword"
              aria-controls="confirmPassword"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <Icon :name="showConfirmPassword ? 'eyeOff' : 'eye'" size="md" aria-hidden="true" />
            </button>
          </div>
          <p v-if="errors.confirmPassword" id="confirmPassword-error" class="auth-error">
            {{ errors.confirmPassword }}
          </p>
        </div>
        <button
          type="submit"
          :disabled="isLoading"
          :aria-busy="isLoading"
          class="primary-btn btn btn-primary"
        >
          <span v-if="isLoading" class="auth-spinner" aria-hidden="true"></span>
          {{ isLoading ? t('auth.resettingPassword') : t('auth.resetPassword') }}
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
import { nextTick, ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AuthLayout } from '@/components/layout'
import Icon from '@/components/icons/Icon.vue'
import { useAppStore } from '@/stores'
import { resetPassword } from '@/api/auth'

const { t } = useI18n()

// ==================== Router & Stores ====================

const route = useRoute()
const appStore = useAppStore()

// ==================== State ====================

const formRef = ref<HTMLFormElement | null>(null)

async function focusFirstInvalidField(): Promise<void> {
  await nextTick()
  formRef.value?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
}

const isLoading = ref<boolean>(false)
const isSuccess = ref<boolean>(false)
const errorMessage = ref<string>('')
const showPassword = ref<boolean>(false)
const showConfirmPassword = ref<boolean>(false)

// URL parameters
const email = ref<string>('')
const token = ref<string>('')

const formData = reactive({
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  password: '',
  confirmPassword: ''
})

const validationToastMessage = computed(() => errors.password || errors.confirmPassword || '')

watch(validationToastMessage, (value, previousValue) => {
  if (value && value !== previousValue) {
    appStore.showError(value)
  }
})

// Check if the reset link is valid (has email and token)
const isInvalidLink = computed(() => !email.value || !token.value)

// ==================== Lifecycle ====================

onMounted(() => {
  // Get email and token from URL query parameters
  email.value = (route.query.email as string) || ''
  token.value = (route.query.token as string) || ''

  if (!email.value || !token.value) {
    appStore.showError(t('auth.invalidResetLink'))
  }
})

// ==================== Validation ====================

function validateForm(): boolean {
  errors.password = ''
  errors.confirmPassword = ''

  let isValid = true

  // Password validation
  if (!formData.password) {
    errors.password = t('auth.passwordRequired')
    isValid = false
  } else if (formData.password.length < 6) {
    errors.password = t('auth.passwordMinLength')
    isValid = false
  }

  // Confirm password validation
  if (!formData.confirmPassword) {
    errors.confirmPassword = t('auth.confirmPasswordRequired')
    isValid = false
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = t('auth.passwordsDoNotMatch')
    isValid = false
  }

  return isValid
}

// ==================== Form Handlers ====================

async function handleSubmit(): Promise<void> {
  errorMessage.value = ''

  if (!validateForm()) {
    await focusFirstInvalidField()
    return
  }

  isLoading.value = true

  try {
    await resetPassword({
      email: email.value,
      token: token.value,
      new_password: formData.password
    })

    isSuccess.value = true
    appStore.showSuccess(t('auth.passwordResetSuccess'))
  } catch (error: unknown) {
    const err = error as {
      message?: string
      response?: { data?: { detail?: string; code?: string } }
    }

    // Check for invalid/expired token error
    if (err.response?.data?.code === 'INVALID_RESET_TOKEN') {
      errorMessage.value = t('auth.invalidOrExpiredToken')
    } else if (err.response?.data?.detail) {
      errorMessage.value = err.response.data.detail
    } else if (err.message) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = t('auth.resetPasswordFailed')
    }

    appStore.showError(errorMessage.value)
  } finally {
    isLoading.value = false
  }
}
</script>
