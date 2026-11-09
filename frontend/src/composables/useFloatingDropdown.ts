import { nextTick, onUnmounted, ref, watch, type CSSProperties, type Ref } from 'vue'
import { getFloatingPanelPosition } from '@/utils/floatingPanel'
import { getPopoverLayer } from '@/utils/overlayLayer'

interface FloatingDropdownOptions {
  disabled?: () => boolean
  focusOnOpen?: Ref<HTMLElement | null>
  onClose?: () => void
  maxHeight?: number
  width?: number
  focusPanelOnOpen?: boolean
}

export function useFloatingDropdown(options: FloatingDropdownOptions = {}) {
  const isOpen = ref(false)
  const containerRef = ref<HTMLElement | null>(null)
  const triggerRef = ref<HTMLElement | null>(null)
  const panelRef = ref<HTMLElement | null>(null)
  const panelStyle = ref<CSSProperties>({ position: 'fixed', visibility: 'hidden' })
  let resizeObserver: ResizeObserver | undefined
  let restoringFocus = false
  let composing = false

  function close(restoreFocus = false) {
    if (!isOpen.value) return
    isOpen.value = false
    panelStyle.value = { ...panelStyle.value, visibility: 'hidden', pointerEvents: 'none' }
    options.onClose?.()
    if (restoreFocus && !options.disabled?.()) {
      // 输入框的 focus 事件也可能打开菜单，恢复焦点时不应重新展开。
      restoringFocus = true
      triggerRef.value?.focus({ preventScroll: true })
      restoringFocus = false
    }
  }

  function open() {
    if (restoringFocus || options.disabled?.()) return
    isOpen.value = true
  }

  function toggle() {
    if (isOpen.value) close(true)
    else open()
  }

  function updatePosition() {
    if (!isOpen.value) return
    const trigger = triggerRef.value
    if (!trigger) return close()
    const rect = trigger.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight
    let left = Math.max(0, rect.left)
    let right = Math.min(viewportWidth, rect.right)
    let top = Math.max(0, rect.top)
    let bottom = Math.min(viewportHeight, rect.bottom)
    const triggerStyle = getComputedStyle(trigger)
    if (rect.width <= 0 || rect.height <= 0 || triggerStyle.visibility === 'hidden' || triggerStyle.visibility === 'collapse') {
      return close()
    }

    // 触发器在滚动容器内完全被裁剪时，不能留下悬空的 body 浮层。
    for (let parent = trigger.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const style = getComputedStyle(parent)
      const clipsX = /auto|scroll|hidden|clip|overlay/.test(style.overflowX || style.overflow)
      const clipsY = /auto|scroll|hidden|clip|overlay/.test(style.overflowY || style.overflow)
      if (!clipsX && !clipsY) continue
      const bounds = parent.getBoundingClientRect()
      if (clipsX) {
        left = Math.max(left, bounds.left)
        right = Math.min(right, bounds.right)
      }
      if (clipsY) {
        top = Math.max(top, bounds.top)
        bottom = Math.min(bottom, bounds.bottom)
      }
    }
    if (right <= left || bottom <= top) return close()

    const maxHeight = options.maxHeight ?? 320
    const position = getFloatingPanelPosition(rect, viewportWidth, viewportHeight, {
      viewportPadding: 8,
      gap: 4,
      maxWidth: options.width ?? rect.width,
      maxHeightRatio: 1,
      mobileBreakpoint: 0,
      minComfortableHeight: Math.min(240, maxHeight)
    })
    panelStyle.value = {
      position: 'fixed',
      top: position.top === null ? undefined : `${position.top}px`,
      bottom: position.bottom === null ? undefined : `${position.bottom}px`,
      left: `${position.left}px`,
      width: `${position.width}px`,
      maxHeight: `${Math.min(maxHeight, position.maxHeight)}px`,
      zIndex: getPopoverLayer(trigger),
      visibility: 'visible',
      pointerEvents: 'auto'
    }
  }

  function handleOutsideClick(event: MouseEvent) {
    if (!isOpen.value) return
    const target = event.target
    if (!(target instanceof Node)) return
    if (containerRef.value?.contains(target) || panelRef.value?.contains(target)) return
    // 不抢走外部按钮或输入框刚获得的焦点。
    close()
  }

  function handleEscape(event: KeyboardEvent) {
    if (!isOpen.value || event.key !== 'Escape') return
    // 捕获阶段先于 BaseDialog 的 document 冒泡监听；IME 取消只拦截冒泡。
    event.stopImmediatePropagation()
    if (composing || event.isComposing || event.keyCode === 229) return
    event.preventDefault()
    close(true)
  }

  function handleCompositionStart() {
    composing = true
  }

  function handleCompositionEnd() {
    composing = false
  }

  function cleanup() {
    resizeObserver?.disconnect()
    resizeObserver = undefined
    composing = false
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('keydown', handleEscape, true)
    window.removeEventListener('compositionstart', handleCompositionStart, true)
    window.removeEventListener('compositionend', handleCompositionEnd, true)
    document.removeEventListener('click', handleOutsideClick, true)
  }

  watch(isOpen, async (opened) => {
    cleanup()
    if (!opened) return
    updatePosition()
    if (!isOpen.value) return
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, { capture: true, passive: true })
    window.addEventListener('keydown', handleEscape, true)
    window.addEventListener('compositionstart', handleCompositionStart, true)
    window.addEventListener('compositionend', handleCompositionEnd, true)
    document.addEventListener('click', handleOutsideClick, true)
    await nextTick()
    if (!isOpen.value) return
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updatePosition)
      if (triggerRef.value) resizeObserver.observe(triggerRef.value)
      if (panelRef.value) resizeObserver.observe(panelRef.value)
    }
    const focusTarget = options.focusOnOpen?.value ?? (options.focusPanelOnOpen ? panelRef.value : null)
    focusTarget?.focus({ preventScroll: true })
  }, { flush: 'post' })

  watch(() => options.disabled?.(), (disabled) => {
    if (disabled) close()
  })

  onUnmounted(cleanup)

  return { isOpen, containerRef, triggerRef, panelRef, panelStyle, open, close, toggle }
}
