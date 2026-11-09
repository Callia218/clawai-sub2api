<template>
  <div v-if="siteKey" class="turnstile-wrapper relative">
    <div
      v-if="loading"
      role="status"
      class="absolute inset-0 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 dark:border-dark-600 dark:bg-dark-700 dark:text-gray-400"
    >
      {{ t('auth.captchaLoading') }}
    </div>
    <div ref="containerRef" class="turnstile-container" :class="{ 'turnstile-container--compact': renderedSize === 'compact' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface TurnstileRenderOptions {
  sitekey: string
  callback: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'flexible'
}

interface TurnstileAPI {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI
    onTurnstileLoad?: () => void
  }
}

const props = withDefaults(
  defineProps<{
    siteKey: string
    theme?: 'light' | 'dark' | 'auto'
    size?: 'normal' | 'compact' | 'flexible'
  }>(),
  {
    theme: 'auto',
    size: 'flexible'
  }
)

const emit = defineEmits<{
  (e: 'verify', token: string): void
  (e: 'expire'): void
  (e: 'error'): void
}>()

const { t } = useI18n()
const loading = ref(true)
const containerRef = ref<HTMLElement | null>(null)
const widgetId = ref<string | null>(null)
const scriptLoaded = ref(false)
const renderedSize = ref(props.size)
let resizeObserver: ResizeObserver | undefined
let renderGeneration = 0
let unmounted = false

const resolveSize = (width: number) => {
  // Flexible and normal Turnstile widgets both require at least 300 CSS px.
  // Use the SDK's compact layout instead of clipping or scaling its iframe.
  return width > 0 && width < 300 ? 'compact' : props.size
}

const loadScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      scriptLoaded.value = true
      resolve()
      return
    }

    // Check if script is already loading
    const existingScript = document.querySelector('script[src*="turnstile"]')
    if (existingScript) {
      window.onTurnstileLoad = () => {
        scriptLoaded.value = true
        resolve()
      }
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
    script.async = true
    script.defer = true

    window.onTurnstileLoad = () => {
      scriptLoaded.value = true
      resolve()
    }

    script.onerror = () => {
      reject(new Error('Failed to load Turnstile script'))
    }

    document.head.appendChild(script)
  })
}

// Turnstile 的 theme:'auto' 只读 prefers-color-scheme，而本站是手动切主题
// （html.dark / html[data-theme="dark"]），两者不同步 → 暗色页面上会冒出一块白底组件。
// 这里把 'auto' 解析成站点真实主题。
const resolveTheme = (): 'light' | 'dark' | 'auto' => {
  if (props.theme !== 'auto') return props.theme
  const el = document.documentElement
  const isDark = el.classList.contains('dark') || el.getAttribute('data-theme') === 'dark'
  return isDark ? 'dark' : 'light'
}

const renderWidget = (size = resolveSize(containerRef.value?.getBoundingClientRect().width ?? 0)) => {
  if (unmounted || !window.turnstile || !containerRef.value || !props.siteKey) {
    return
  }
  const generation = ++renderGeneration

  // Remove existing widget if any
  if (widgetId.value) {
    // The previous response belongs to the removed widget and cannot be reused.
    emit('expire')
    try {
      window.turnstile.remove(widgetId.value)
    } catch {
      // Ignore errors when removing
    }
    widgetId.value = null
  }

  // Clear container
  containerRef.value.innerHTML = ''
  renderedSize.value = size

  widgetId.value = window.turnstile.render(containerRef.value, {
    sitekey: props.siteKey,
    callback: (token: string) => {
      if (unmounted || generation !== renderGeneration) return
      emit('verify', token)
    },
    'expired-callback': () => {
      if (unmounted || generation !== renderGeneration) return
      emit('expire')
    },
    'error-callback': () => {
      if (unmounted || generation !== renderGeneration) return
      emit('error')
    },
    theme: resolveTheme(),
    size
  })
}

const reset = () => {
  if (window.turnstile && widgetId.value) {
    window.turnstile.reset(widgetId.value)
  }
}

// Expose reset method to parent
defineExpose({ reset })

onMounted(async () => {
  if (!props.siteKey) {
    return
  }

  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width <= 0) return
      const nextSize = resolveSize(entry.contentRect.width)
      // Width changes within the same SDK layout must not restart a challenge.
      if (widgetId.value && nextSize !== renderedSize.value) renderWidget(nextSize)
    })
    resizeObserver.observe(containerRef.value)
  }

  try {
    await loadScript()
    renderWidget()
  } catch (error) {
    console.error('Failed to initialize Turnstile:', error)
    emit('error')
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  unmounted = true
  resizeObserver?.disconnect()
  if (window.turnstile && widgetId.value) {
    try {
      window.turnstile.remove(widgetId.value)
    } catch {
      // Ignore errors when removing
    }
  }
})

// Re-render only when SDK configuration changes, not on each resize.
watch(
  () => [props.siteKey, props.size] as const,
  ([newKey]) => {
    if (newKey && scriptLoaded.value) {
      renderWidget()
    }
  },
  { flush: 'post' }
)
</script>

<style scoped>
.turnstile-wrapper {
  width: 100%;
}

.turnstile-container {
  width: 100%;
  min-height: 65px;
}

.turnstile-container--compact {
  min-height: 140px;
}
</style>
