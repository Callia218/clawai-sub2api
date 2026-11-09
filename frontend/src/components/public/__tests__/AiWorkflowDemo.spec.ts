import { mount, type VueWrapper } from '@vue/test-utils'
import { compileStyle, parse } from 'vue/compiler-sfc'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiWorkflowDemo from '../AiWorkflowDemo.vue'
import demoSource from '../AiWorkflowDemo.vue?raw'
import en from '@/i18n/locales/en/glassDemo'
import zh from '@/i18n/locales/zh/glassDemo'

type MessageTree = { [key: string]: MessageTree | (() => string) }
function messageFunctions(messages: Record<string, unknown>): MessageTree {
  return Object.fromEntries(Object.entries(messages).map(([key, value]) => [
    key,
    typeof value === 'string' ? () => value : messageFunctions(value as Record<string, unknown>),
  ]))
}

describe('AiWorkflowDemo', () => {
  let wrapper: VueWrapper | undefined
  let observerCallback: IntersectionObserverCallback
  let motionListener: (() => void) | undefined
  let hidden = false
  const disconnect = vi.fn()
  const observe = vi.fn()
  const media = {
    matches: false,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn((_event: string, listener: () => void) => { motionListener = listener }),
    removeEventListener: vi.fn(),
  }

  function render(locale: 'en' | 'zh' = 'en') {
    const i18n = createI18n({ legacy: false, locale, messages: { en: { glassDemo: messageFunctions(en) }, zh: { glassDemo: messageFunctions(zh) } } })
    wrapper = mount(AiWorkflowDemo, { global: { plugins: [i18n], stubs: { transition: true } } })
    return i18n
  }

  async function setIntersecting(isIntersecting: boolean) {
    observerCallback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
    await nextTick()
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    hidden = false
    media.matches = false
    motionListener = undefined
    vi.clearAllMocks()
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
    vi.spyOn(window, 'matchMedia').mockReturnValue(media as unknown as MediaQueryList)
    vi.stubGlobal('IntersectionObserver', vi.fn((callback: IntersectionObserverCallback) => {
      observerCallback = callback
      return { observe, disconnect }
    }))
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('runs one loop only while on screen and stops when it leaves the viewport', async () => {
    render()
    expect(observe).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    await setIntersecting(true)
    await setIntersecting(true)
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(2100)
    expect(wrapper!.get('.ai-scene').attributes('data-phase')).toBe('1')
    await vi.advanceTimersByTimeAsync(3200)
    expect(wrapper!.get('.ai-scene').attributes('data-phase')).toBe('2')
    await vi.advanceTimersByTimeAsync(3900)
    expect(wrapper!.get('.ai-window-top').text()).toContain('AI Workspace')
    await setIntersecting(false)
    expect(vi.getTimerCount()).toBe(0)
    expect(wrapper!.classes()).toContain('ai-demo--paused')
  })

  it('pauses in a background tab and resumes without skipping the scene', async () => {
    render()
    await setIntersecting(true)
    await vi.advanceTimersByTimeAsync(5300)
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(wrapper!.get('.ai-window-top').text()).toContain('Codex')
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(65)
    expect(vi.getTimerCount()).toBe(1)
    expect(wrapper!.get('.ai-window-top').text()).toContain('Codex')
    expect(wrapper!.get('.ai-scene').attributes('data-phase')).toBe('2')
  })

  it('shows a complete static frame for reduced motion, including after a locale change', async () => {
    media.matches = true
    const i18n = render('zh')
    await setIntersecting(true)
    expect(vi.getTimerCount()).toBe(0)
    expect(wrapper!.get('.ai-scene').attributes('data-phase')).toBe('2')
    expect(wrapper!.get('.ai-command').text()).toContain(zh.codex.command)
    i18n.global.locale.value = 'en'
    await nextTick()
    expect(wrapper!.get('.ai-command').text()).toContain(en.codex.command)
    expect(wrapper!.find('.ai-cursor').exists()).toBe(false)
    media.matches = false
    motionListener?.()
    await nextTick()
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(700)
    media.matches = true
    motionListener?.()
    await nextTick()
    expect(vi.getTimerCount()).toBe(0)
    expect(wrapper!.get('.ai-scene').attributes('data-phase')).toBe('2')
    expect(wrapper!.get('.ai-command').text()).toContain(en.codex.command)
  })

  it('disconnects observers and listeners and ignores a queued observer callback after unmount', async () => {
    const removeVisibilityListener = vi.spyOn(document, 'removeEventListener')
    render()
    await setIntersecting(true)
    wrapper!.unmount()
    wrapper = undefined
    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(media.removeEventListener).toHaveBeenCalledWith('change', motionListener)
    expect(removeVisibilityListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
    await setIntersecting(true)
    motionListener?.()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(vi.getTimerCount()).toBe(0)
  })

  it('provides a static accessible description without controls or live announcements', () => {
    render()
    expect(wrapper!.get('figure').attributes('aria-label')).toBe(en.label)
    expect(wrapper!.get('figcaption').text()).toBe(en.accessible)
    expect(wrapper!.get('.ai-demo-visual').attributes('aria-hidden')).toBe('true')
    expect(wrapper!.find('button, input, a, [tabindex], [aria-live]').exists()).toBe(false)
  })

  it('keeps compiled dark-theme styles on the demo instead of the document root', () => {
    const { descriptor } = parse(demoSource)
    const style = compileStyle({ source: descriptor.styles[0].content, filename: 'AiWorkflowDemo.vue', id: 'data-v-demo', scoped: true })
    expect(style.errors).toEqual([])
    expect(style.code).toContain('.dark .ai-demo-visual[data-v-demo]')
    expect(style.code).not.toMatch(/(?:^|})\s*\.dark\s*\{/m)
  })
})

