import { START_LOCATION, type RouterScrollBehavior } from 'vue-router'

export const scrollBehavior: RouterScrollBehavior = async (to, from, savedPosition) => {
  if (to.name === 'Home') {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    // Vue Router also supplies history.state.scroll on a document reload.
    // Only ignore it for the first Home navigation after an actual refresh.
    // Later back/forward navigation in that same document must still restore.
    if (from === START_LOCATION && navigation?.type === 'reload') {
      return { left: 0, top: 0, behavior: 'instant' }
    }
    if (savedPosition) return { ...savedPosition, behavior: 'instant' }
    if (to.hash) {
      // bootstrap mounts after router.isReady(); the initial hash target may
      // not exist until the next frame. No timers or forced repeated scrolling.
      if (from === START_LOCATION) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      if (document.getElementById(to.hash.slice(1))) {
        const headerHeight = document.querySelector('.hp__top')?.getBoundingClientRect().height
        return { el: to.hash, top: headerHeight ? headerHeight + 20 : 108, behavior: 'instant' }
      }
    }
  }
  return savedPosition || { top: 0 }
}
