<template>
  <label class="ui-field" :class="{ 'is-disabled': disabled, 'has-error': !!error }">
    <span v-if="label" class="ui-field__label">
      {{ label }}
      <span v-if="required" class="ui-field__req" aria-hidden="true">*</span>
    </span>

    <span class="ui-field__control" :class="`ui-field__control--${size}`">
      <span v-if="$slots.prefix" class="ui-field__affix">
        <slot name="prefix" />
      </span>

      <textarea
        v-if="type === 'textarea'"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :rows="rows"
        :maxlength="maxlength"
        class="ui-field__input ui-field__input--area ui-no-scrollbar"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      />
      <input
        v-else
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        class="ui-field__input"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      />

      <span v-if="$slots.suffix" class="ui-field__affix">
        <slot name="suffix" />
      </span>
    </span>

    <span v-if="error" class="ui-field__msg ui-field__msg--error">{{ error }}</span>
    <span v-else-if="hint" class="ui-field__msg">{{ hint }}</span>
  </label>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    modelValue?: string | number
    label?: string
    placeholder?: string
    type?: string
    hint?: string
    error?: string
    disabled?: boolean
    required?: boolean
    size?: 'sm' | 'md' | 'lg'
    rows?: number
    maxlength?: number
    autocomplete?: string
    inputmode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel' | 'url' | 'search'
  }>(),
  {
    modelValue: '',
    label: undefined,
    placeholder: undefined,
    type: 'text',
    hint: undefined,
    error: undefined,
    disabled: false,
    required: false,
    size: 'md',
    rows: 3,
    maxlength: undefined,
    autocomplete: undefined,
    inputmode: undefined,
  }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
const focused = ref(false)

function onInput(ev: Event) {
  emit('update:modelValue', (ev.target as HTMLInputElement | HTMLTextAreaElement).value)
}
</script>

<style scoped>
.ui-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  font-family: var(--ui-font);
}

.ui-field.is-disabled {
  opacity: 0.55;
}

.ui-field__label {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--ui-fs-xs);
  font-weight: 580;
  letter-spacing: 0.005em;
  color: var(--ui-text-soft);
}

.ui-field__req {
  color: var(--ui-danger);
}

.ui-field__control {
  display: flex;
  align-items: center;
  gap: var(--ui-s-2);
  border-radius: var(--ui-r-md);
  background-color: rgb(var(--ui-glass-strong-rgb) / calc(var(--ui-glass-strong-alpha) + 0.04));
  -webkit-backdrop-filter: blur(12px) saturate(170%);
  backdrop-filter: blur(12px) saturate(170%);
  box-shadow:
    inset 0 1px 1px var(--ui-edge-inner),
    inset 0 -1px 1px var(--ui-edge-shade),
    0 0 0 1px var(--ui-line);
  transition:
    box-shadow var(--ui-dur-base) var(--ui-ease-out),
    background-color var(--ui-dur-base) var(--ui-ease-out);
}

.ui-field__control:focus-within {
  background-color: rgb(var(--ui-glass-strong-rgb) / calc(var(--ui-glass-strong-alpha) + 0.12));
  box-shadow:
    inset 0 1px 1px var(--ui-edge-strong),
    inset 0 -1px 1px var(--ui-edge-shade),
    0 0 0 1.5px var(--ui-accent-ring),
    0 6px 18px -12px rgb(13 148 136 / 0.5);
}

.ui-field.has-error .ui-field__control {
  box-shadow:
    inset 0 1px 1px var(--ui-edge-inner),
    0 0 0 1.5px rgb(220 38 38 / 0.5);
}

.ui-field__control--sm {
  min-height: 32px;
  padding: 0 var(--ui-s-3);
}
.ui-field__control--md {
  min-height: 40px;
  padding: 0 var(--ui-s-3);
}
.ui-field__control--lg {
  min-height: 48px;
  padding: 0 var(--ui-s-4);
  border-radius: var(--ui-r-lg);
}

.ui-field__input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ui-text);
  font-family: var(--ui-font);
  font-size: var(--ui-fs-sm);
  line-height: 1.5;
  padding: 9px 0;
}

.ui-field__control--lg .ui-field__input {
  font-size: var(--ui-fs-md);
  padding: 12px 0;
}

.ui-field__input::placeholder {
  color: var(--ui-text-faint);
}

.ui-field__input--area {
  resize: vertical;
  min-height: 68px;
  max-height: 320px;
}

.ui-field__affix {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--ui-text-muted);
  font-size: var(--ui-fs-sm);
}

.ui-field__msg {
  font-size: var(--ui-fs-xs);
  line-height: 1.45;
  color: var(--ui-text-faint);
}

.ui-field__msg--error {
  color: var(--ui-danger);
}
</style>
