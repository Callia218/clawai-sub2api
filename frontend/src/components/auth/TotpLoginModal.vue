<template>
  <div class="auth-dialog-overlay">
    <section
      ref="dialogRef"
      class="auth-dialog-panel totp-dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="`${titleId}-description`"
      :aria-busy="verifying"
      tabindex="-1"
    >
      <div class="auth-dialog-symbol" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>
      <header class="auth-dialog-heading">
        <h2 :id="titleId">{{ t('profile.totp.loginTitle') }}</h2>
        <p :id="`${titleId}-description`">{{ t('profile.totp.loginHint') }}</p>
        <p v-if="userEmailMasked" class="totp-account">{{ userEmailMasked }}</p>
      </header>
      <div class="totp-code-section">
        <input
          ref="hiddenOtpInputRef"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          class="totp-autofill"
          aria-hidden="true"
          tabindex="-1"
          @input="handleHiddenOtpInput"
        />
        <div class="totp-code-grid" role="group" :aria-label="t('auth.verificationCode')">
          <input
            v-for="(_, index) in 6"
            :key="index"
            :ref="(el) => setInputRef(el, index)"
            type="text"
            maxlength="1"
            inputmode="numeric"
            pattern="[0-9]"
            autocomplete="off"
            class="totp-digit"
            :aria-label="`${t('auth.verificationCode')} ${index + 1} / 6`"
            :disabled="verifying"
            @input="handleCodeInput($event, index)"
            @keydown="handleKeydown($event, index)"
            @paste="handlePaste"
          />
        </div>
        <div class="totp-status" role="status" aria-live="polite">
          <template v-if="verifying">
            <span class="auth-dialog-spinner" aria-hidden="true"></span>
            {{ t('common.verifying') }}
          </template>
        </div>
      </div>
      <button type="button" class="auth-dialog-button auth-dialog-secondary" :disabled="verifying" @click="emit('cancel')">
        {{ t('common.cancel') }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, useId } from 'vue'
import { useAuthDialogFocus } from './useAuthDialogFocus'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'

defineProps<{
  tempToken: string
  userEmailMasked?: string
}>()

const emit = defineEmits<{
  verify: [code: string]
  cancel: []
}>()

const { t } = useI18n()
const appStore = useAppStore()

const verifying = ref(false)
const dialogRef = ref<HTMLElement | null>(null)
const titleId = `totp-title-${useId()}`
const code = ref<string[]>(['', '', '', '', '', ''])
const inputRefs = ref<(HTMLInputElement | null)[]>([])
const hiddenOtpInputRef = ref<HTMLInputElement | null>(null)

// Watch for code changes and auto-submit when 6 digits are entered
watch(
  () => code.value.join(''),
  (newCode) => {
    if (newCode.length === 6 && !verifying.value) {
      emit('verify', newCode)
    }
  }
)

defineExpose({
  setVerifying: (value: boolean) => { verifying.value = value },
  setError: (message: string) => {
    if (message) {
      appStore.showError(message)
    }
    code.value = ['', '', '', '', '', '']
    // Clear input DOM values
    inputRefs.value.forEach(input => {
      if (input) input.value = ''
    })
    // Clear hidden autofill input
    if (hiddenOtpInputRef.value) {
      hiddenOtpInputRef.value.value = ''
    }
    nextTick(() => {
      inputRefs.value[0]?.focus()
    })
  }
})

const setInputRef = (el: any, index: number) => {
  inputRefs.value[index] = el as HTMLInputElement | null
}

const handleCodeInput = (event: Event, index: number) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/[^0-9]/g, '')
  code.value[index] = value

  if (value && index < 5) {
    nextTick(() => {
      inputRefs.value[index + 1]?.focus()
    })
  }
}

// Handle autofill from password managers via the hidden autocomplete="one-time-code" input
const handleHiddenOtpInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const digits = input.value.replace(/[^0-9]/g, '').slice(0, 6).split('')

  digits.forEach((digit, i) => {
    code.value[i] = digit
    if (inputRefs.value[i]) {
      inputRefs.value[i]!.value = digit
    }
  })

  for (let i = digits.length; i < 6; i++) {
    code.value[i] = ''
    if (inputRefs.value[i]) {
      inputRefs.value[i]!.value = ''
    }
  }
}

const handleKeydown = (event: KeyboardEvent, index: number) => {
  if (event.key === 'Backspace') {
    const input = event.target as HTMLInputElement
    // If current cell is empty and not the first, move to previous cell
    if (!input.value && index > 0) {
      event.preventDefault()
      inputRefs.value[index - 1]?.focus()
    }
    // Otherwise, let the browser handle the backspace naturally
    // The input event will sync code.value via handleCodeInput
  }
}

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pastedData = event.clipboardData?.getData('text') || ''
  const digits = pastedData.replace(/[^0-9]/g, '').slice(0, 6).split('')

  // Update both the ref and the input elements
  digits.forEach((digit, index) => {
    code.value[index] = digit
    if (inputRefs.value[index]) {
      inputRefs.value[index]!.value = digit
    }
  })

  // Clear remaining inputs if pasted less than 6 digits
  for (let i = digits.length; i < 6; i++) {
    code.value[i] = ''
    if (inputRefs.value[i]) {
      inputRefs.value[i]!.value = ''
    }
  }

  const focusIndex = Math.min(digits.length, 5)
  nextTick(() => {
    inputRefs.value[focusIndex]?.focus()
  })
}

useAuthDialogFocus(dialogRef, () => true, () => {
  if (!verifying.value) emit('cancel')
}, () => inputRefs.value[0])
</script>

<style scoped src="./auth-dialog.css"></style>
