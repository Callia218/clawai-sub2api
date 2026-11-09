import { onBeforeUnmount, onMounted, onUpdated, ref, watch, type Ref } from 'vue'

/** Progressive enhancement: every section is readable before an optional reveal. */
export function useLandingMotion(root: Ref<HTMLElement | null>) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const still = ref(media.matches)
  const animations = new Set<Animation>()
  const revealed = new WeakSet<Element>()
  const pendingReveals = new Set<Element>()
  let observed = new WeakSet<Element>()
  let revealObserver: IntersectionObserver | undefined
  let headerObserver: ResizeObserver | undefined
  let element: HTMLElement | null = null
  let header: HTMLElement | null = null

  const finishReveals = () => {
    // No fill or hidden inline styles: cancellation restores the visible base.
    animations.forEach(animation => {
      animation.onfinish = null
      animation.oncancel = null
      animation.cancel()
    })
    animations.clear()
    pendingReveals.clear()
  }
  const updateHeader = () => {
    if (!element || document.hidden) return
    const height = header?.getBoundingClientRect().height ?? 0
    element.style.setProperty('--hp-scroll-offset', `${height + 20}px`)
  }
  const playReveal = (target: Element) => {
    if (still.value || !element?.contains(target) || typeof target.animate !== 'function') return
    const animation = target.animate([
      { opacity: 0.35, transform: 'translateY(24px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
    animations.add(animation)
    animation.onfinish = () => animations.delete(animation)
    animation.oncancel = () => animations.delete(animation)
  }
  const observeReveals = () => {
    if (!element || !revealObserver) return
    element.querySelectorAll('[data-reveal]').forEach(target => {
      if (revealed.has(target) || observed.has(target)) return
      observed.add(target)
      revealObserver?.observe(target)
    })
  }
  const syncPreference = () => { still.value = media.matches }
  const syncVisibility = () => {
    if (document.hidden) {
      animations.forEach(animation => animation.pause())
      return
    }
    if (!still.value) {
      animations.forEach(animation => animation.play())
      pendingReveals.forEach(playReveal)
    }
    pendingReveals.clear()
    updateHeader()
  }
  const disconnect = () => {
    revealObserver?.disconnect()
    headerObserver?.disconnect()
    revealObserver = undefined
    headerObserver = undefined
    observed = new WeakSet<Element>()
    finishReveals()
    element?.style.removeProperty('--hp-scroll-offset')
    element = null
    header = null
  }
  const connect = (nextRoot: HTMLElement | null) => {
    if (element === nextRoot) return
    disconnect()
    element = nextRoot
    if (!element) return
    header = element.querySelector<HTMLElement>('.hp__top')
    if (header && typeof ResizeObserver !== 'undefined') {
      headerObserver = new ResizeObserver(updateHeader)
      headerObserver.observe(header)
    }
    updateHeader()
    // Missing observer or animation APIs leave all content readable.
    if (typeof IntersectionObserver === 'undefined') return
    revealObserver = new IntersectionObserver(entries => {
      if (element !== nextRoot) return
      entries.forEach(entry => {
        if (!entry.isIntersecting || !element?.contains(entry.target) || revealed.has(entry.target)) return
        revealed.add(entry.target)
        revealObserver?.unobserve(entry.target)
        if (still.value) return
        if (document.hidden) pendingReveals.add(entry.target)
        else playReveal(entry.target)
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' })
    observeReveals()
  }
  // Template refs can attach after mount; v-if sections can arrive on later renders.
  watch(root, connect, { flush: 'post', immediate: true })
  onUpdated(observeReveals)
  watch(still, value => {
    if (value) finishReveals()
  }, { flush: 'sync' })
  onMounted(() => {
    syncPreference()
    media.addEventListener?.('change', syncPreference)
    document.addEventListener('visibilitychange', syncVisibility)
    window.addEventListener('resize', updateHeader, { passive: true })
    connect(root.value)
  })
  onBeforeUnmount(() => {
    disconnect()
    media.removeEventListener?.('change', syncPreference)
    document.removeEventListener('visibilitychange', syncVisibility)
    window.removeEventListener('resize', updateHeader)
  })
  return { still }
}
