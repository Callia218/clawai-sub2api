import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

// Authentication dialogs live outside AuthLayout when teleported. Keep their
// keyboard focus local and return it to the initiating control when dismissed.
export function useAuthDialogFocus(
  dialog: Ref<HTMLElement | null>,
  isOpen: () => boolean,
  onEscape: () => void,
  initialFocus?: () => HTMLElement | null | undefined,
) {
  let previousFocus: HTMLElement | null = null
  let previousOverflow = ''
  let locked = false

  function focusableElements() {
    return Array.from(dialog.value?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || []).filter(element => !element.closest('[hidden], [inert], [aria-hidden="true"]'))
  }

  function onKeydown(event: KeyboardEvent) {
    if (!isOpen() || !dialog.value) return
    if (event.key === 'Escape') {
      event.preventDefault()
      onEscape()
      return
    }
    if (event.key !== 'Tab') return
    const elements = focusableElements()
    const first = elements[0]
    const last = elements[elements.length - 1]
    if (!first) {
      event.preventDefault()
      dialog.value.focus()
    } else if (event.shiftKey && (document.activeElement === first || !dialog.value.contains(document.activeElement))) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.value.contains(document.activeElement))) {
      event.preventDefault()
      first.focus()
    }
  }

  function release() {
    document.removeEventListener('keydown', onKeydown)
    if (locked) {
      document.body.style.overflow = previousOverflow
      locked = false
    }
    if (previousFocus?.isConnected) previousFocus.focus()
    previousFocus = null
  }

  watch(isOpen, async (open) => {
    if (!open) {
      release()
      return
    }
    previousFocus = document.activeElement as HTMLElement | null
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    locked = true
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    if (isOpen()) (initialFocus?.() || focusableElements()[0] || dialog.value)?.focus()
  }, { immediate: true })

  onBeforeUnmount(release)
}
