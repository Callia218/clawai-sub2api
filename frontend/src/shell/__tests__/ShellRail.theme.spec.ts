import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ShellRail from '../ShellRail.vue'
import { initializeTheme } from '@/composables/useTheme'

vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/dashboard' }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores', () => ({
  useAppStore: () => ({
    sidebarCollapsed: false,
    mobileOpen: false,
    sidebarScrollTop: 0,
    siteName: 'Example',
    siteLogo: '',
    siteVersion: '',
    publicSettingsLoaded: true,
    toggleSidebar: vi.fn(),
    setMobileOpen: vi.fn(),
  }),
}))
vi.mock('../useShellNav', () => ({
  useShellNav: () => ({
    sections: [],
    homePath: '/dashboard',
    isActive: () => false,
    isGroupActive: () => false,
    isGroupExpanded: () => false,
    handleGroupClick: vi.fn(),
    handleMenuItemClick: vi.fn(),
  }),
}))
vi.mock('@/components/common/VersionBadge.vue', () => ({ default: { template: '<span />' } }))

describe('ShellRail immediate theme switching', () => {
  let wrapper: VueWrapper | undefined
  let stop: (() => void) | undefined

  beforeEach(() => {
    localStorage.setItem('theme', 'dark')
    document.documentElement.classList.add('dark')
    document.documentElement.dataset.theme = 'dark'
    stop = initializeTheme()
  })

  afterEach(() => {
    wrapper?.unmount()
    stop?.()
    localStorage.removeItem('theme')
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.theme
  })

  it('clears every dark-theme selector immediately on click, then switches back without reloading', async () => {
    wrapper = mount(ShellRail, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' }, Icon: true } },
    })
    await wrapper.get('button[title="nav.lightMode"]').trigger('click')
    expect(document.documentElement.matches('.dark, [data-theme="dark"]')).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
    await wrapper.get('button[title="nav.darkMode"]').trigger('click')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
