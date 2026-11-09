<template>
  <div v-if="mode === 'checkbox' && documents.length > 0" class="agreement-checkbox">
    <div class="agreement-checkbox-row">
      <input
        :id="consentId"
        type="checkbox"
        :checked="accepted"
        class="agreement-consent"
        @change="handleCheckboxChange"
      />
      <p class="agreement-copy">
        <label :for="consentId">{{ t('legal.loginAgreementPrompt.checkboxPrefix') }}</label>
        <template v-for="(doc, index) in documents" :key="doc.id || doc.title">
          <RouterLink :to="documentRoute(doc)" target="_blank" rel="noopener noreferrer" class="agreement-link">{{ doc.title }}</RouterLink>
          <span v-if="index < documents.length - 1">{{ t('legal.loginAgreementPrompt.documentSeparator') }}</span>
        </template>
      </p>
    </div>
  </div>
  <div v-else-if="!accepted && documents.length > 0" class="agreement-notice">
    <div class="agreement-notice-copy">
      <strong>{{ t('legal.loginAgreementPrompt.noticeTitle') }}</strong>
      <p>{{ t('legal.loginAgreementPrompt.noticeDescription') }}</p>
    </div>
    <button type="button" class="agreement-open" @click="emit('open')">{{ t('legal.loginAgreementPrompt.viewTerms') }}</button>
  </div>
  <Teleport to="body">
    <div v-if="dialogVisible" class="auth-dialog-overlay">
      <section
        ref="dialogRef"
        class="auth-dialog-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="`${titleId}-description`"
        tabindex="-1"
      >
        <div class="auth-dialog-symbol" aria-hidden="true"><Icon name="shield" size="md" /></div>
        <header class="auth-dialog-heading">
          <h2 :id="titleId">{{ t('legal.loginAgreementPrompt.dialogTitle') }}</h2>
          <p :id="`${titleId}-description`">{{ t('legal.loginAgreementPrompt.dialogDescription', { date: updatedAt || t('legal.loginAgreementPrompt.recently') }) }}</p>
          <span v-if="updatedAt" class="agreement-updated">{{ updatedAt }}</span>
        </header>
        <p class="agreement-documents-label">{{ t('legal.loginAgreementPrompt.relatedDocuments') }}</p>
        <div class="agreement-documents">
          <RouterLink
            v-for="(doc, index) in documents"
            :key="doc.id || doc.title"
            :to="documentRoute(doc)"
            target="_blank"
            rel="noopener noreferrer"
            class="agreement-document"
          >
            <Icon :name="documentIcon(index, doc.title)" size="sm" aria-hidden="true" />
            <span class="agreement-document-title">{{ doc.title }}</span>
            <Icon name="externalLink" size="sm" aria-hidden="true" />
          </RouterLink>
        </div>
        <footer class="auth-dialog-footer">
          <button type="button" class="auth-dialog-button auth-dialog-secondary" @click="emit('reject')">{{ t('legal.loginAgreementPrompt.reject') }}</button>
          <button type="button" class="auth-dialog-button" @click="emit('accept')">{{ t('legal.loginAgreementPrompt.accept') }}</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useAuthDialogFocus } from './useAuthDialogFocus'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import type { LoginAgreementDocument } from '@/types'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  accepted: boolean
  documents: LoginAgreementDocument[]
  mode: 'modal' | 'checkbox' | string
  updatedAt?: string
  visible: boolean
}>(), {
  updatedAt: ''
})

const emit = defineEmits<{
  accept: []
  reject: []
  open: []
}>()

const dialogRef = ref<HTMLElement | null>(null)
const instanceId = useId()
const titleId = `agreement-title-${instanceId}`
const consentId = `agreement-consent-${instanceId}`
const dialogVisible = computed(() => props.visible && documents.value.length > 0)
const documents = computed(() => props.documents.filter((doc) => doc.title.trim()))
const updatedAt = computed(() => props.updatedAt || '')
const accepted = computed(() => props.accepted)
const mode = computed(() => props.mode === 'checkbox' ? 'checkbox' : 'modal')

useAuthDialogFocus(dialogRef, () => dialogVisible.value, () => emit('reject'))

function documentRoute(doc: LoginAgreementDocument) {
  return {
    name: 'LegalDocument',
    params: {
      documentId: doc.id || doc.title,
    },
  }
}

function handleCheckboxChange(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) {
    emit('accept')
  } else {
    emit('reject')
  }
}

function documentIcon(index: number, title: string): 'document' | 'shield' | 'globe' | 'cog' {
  const normalizedTitle = title.toLowerCase()
  if (
    normalizedTitle.includes('policy') ||
    normalizedTitle.includes('privacy') ||
    title.includes('政策') ||
    title.includes('隐私')
  ) {
    return 'shield'
  }
  if (
    normalizedTitle.includes('country') ||
    normalizedTitle.includes('region') ||
    title.includes('国家') ||
    title.includes('地区')
  ) {
    return 'globe'
  }
  if (index === 3) {
    return 'cog'
  }
  return 'document'
}
</script>

<style scoped src="./auth-dialog.css"></style>
