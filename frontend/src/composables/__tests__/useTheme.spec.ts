import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initializeTheme, setTheme, useTheme } from '../useTheme'

describe('theme synchronization', () => {
  let stop: (() => void) | undefined
  let onSystemChange: (() => void) | undefined
  const media = {
    matches: false,
    addEventListener: vi.fn((_event: string, listener: () => void) => { onSystemChange = listener }),
    removeEventListener: vi.fn(),
  }

  function expectTheme(dark: boolean) {
    expect(document.documentElement.classList.contains('dark')).toBe(dark)
    expect(document.documentElement.dataset.theme).toBe(dark ? 'dark' : 'light')
    expect(document.documentElement.matches('.dark, [data-theme="dark"]')).toBe(dark)
  }

  beforeEach(() => {
    media.matches = false
    onSystemChange = undefined
    vi.clearAllMocks()
    localStorage.removeItem('theme')
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.theme
    vi.spyOn(window, 'matchMedia').mockReturnValue(media as unknown as MediaQueryList)
  })

  afterEach(() => {
    stop?.()
    vi.restoreAllMocks()
    localStorage.removeItem('theme')
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.theme
  })

  it('repairs stale selector state at startup and keeps all consumers reactive', () => {
    localStorage.setItem('theme', 'light')
    document.documentElement.classList.add('dark')
    document.documentElement.dataset.theme = 'dark'
    stop = initializeTheme()
    const first = useTheme()
    const second = useTheme()
    expectTheme(false)
    first.toggleTheme()
    expectTheme(true)
    expect(second.isDark.value).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
    second.toggleTheme()
    expectTheme(false)
    expect(first.isDark.value).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
    expect(media.addEventListener).toHaveBeenCalledTimes(1)
  })

  it('follows system changes without overriding an explicit choice', () => {
    media.matches = true
    stop = initializeTheme()
    expectTheme(true)
    media.matches = false
    onSystemChange?.()
    expectTheme(false)
    setTheme('light')
    media.matches = true
    onSystemChange?.()
    expectTheme(false)
    setTheme('system')
    expect(localStorage.getItem('theme')).toBeNull()
    expectTheme(true)
    media.matches = false
    onSystemChange?.()
    expectTheme(false)
  })

  it('accepts a stored system mode and synchronizes changes from another tab', () => {
    media.matches = true
    localStorage.setItem('theme', 'system')
    stop = initializeTheme()
    expectTheme(true)
    localStorage.setItem('theme', 'light')
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'light' }))
    expectTheme(false)
    localStorage.removeItem('theme')
    window.dispatchEvent(new StorageEvent('storage', { key: null }))
    expectTheme(true)
  })

  it('adopts changes from a legacy public-page switcher on the next layout mount', () => {
    stop = initializeTheme()
    localStorage.setItem('theme', 'dark')
    const nextLayout = useTheme()
    expect(nextLayout.isDark.value).toBe(true)
    expectTheme(true)
    localStorage.setItem('theme', 'light')
    media.matches = true
    onSystemChange?.()
    expectTheme(false)
  })

  it('applies the current selection even when persisting it is blocked', () => {
    stop = initializeTheme()
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage blocked') })
    expect(() => setTheme('dark')).not.toThrow()
    expectTheme(true)
  })

  it('removes application-lifetime subscriptions during teardown', () => {
    const removeStorage = vi.spyOn(window, 'removeEventListener')
    stop = initializeTheme()
    stop()
    expect(media.removeEventListener).toHaveBeenCalledWith('change', onSystemChange)
    expect(removeStorage).toHaveBeenCalledWith('storage', expect.any(Function))
    localStorage.setItem('theme', 'dark')
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'dark' }))
    expectTheme(false)
  })

  it('supports the legacy system-theme listener API', () => {
    const legacyMedia = { matches: true, addListener: vi.fn(), removeListener: vi.fn() }
    vi.mocked(window.matchMedia).mockReturnValue(legacyMedia as unknown as MediaQueryList)
    stop = initializeTheme()
    expectTheme(true)
    const change = legacyMedia.addListener.mock.calls[0][0]
    legacyMedia.matches = false
    change()
    expectTheme(false)
    stop()
    expect(legacyMedia.removeListener).toHaveBeenCalledWith(change)
  })
})
