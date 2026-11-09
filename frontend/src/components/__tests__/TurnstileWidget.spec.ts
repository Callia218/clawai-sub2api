import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import TurnstileWidget from '../TurnstileWidget.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const scriptSelector = 'script[src*="challenges.cloudflare.com/turnstile"]'
let wrapper: VueWrapper | undefined

function installSDK() {
  const render = vi.fn<NonNullable<typeof window.turnstile>['render']>(() => 'widget-1')
  window.turnstile = { render, reset: vi.fn(), remove: vi.fn() }
  return render
}

function measureContainer(width: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, top: 0, bottom: 65, left: 0, right: width, width, height: 65,
    toJSON: () => ({}),
  })
}

function observeContainer() {
  let notify = (_width: number) => {}
  const disconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) {
      notify = (width: number) => callback(
        [{ contentRect: { width } } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      )
    }
    observe = vi.fn()
    disconnect = disconnect
  })
  return { resize: (width: number) => notify(width), disconnect }
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  delete window.turnstile
  delete window.onTurnstileLoad
  document.querySelectorAll(scriptSelector).forEach((script) => script.remove())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('TurnstileWidget', () => {
  it('shows a loading placeholder until the SDK initializes the widget', async () => {
    wrapper = mount(TurnstileWidget, { props: { siteKey: 'site-key' } })

    expect(wrapper.get('[role="status"]').text()).toBe('auth.captchaLoading')
    expect(document.querySelector(scriptSelector)).not.toBeNull()
    const container = wrapper.get('.turnstile-container').element

    const render = installSDK()
    window.onTurnstileLoad?.()
    await flushPromises()

    expect(render).toHaveBeenCalledWith(container, expect.objectContaining({ sitekey: 'site-key' }))
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.get('.turnstile-container').element).toBe(container)
  })

  it('initializes an already loaded SDK and still forwards verification', async () => {
    const render = installSDK()
    wrapper = mount(TurnstileWidget, { props: { siteKey: 'site-key' } })
    await flushPromises()

    expect(render).toHaveBeenCalledOnce()
    expect(document.querySelector(scriptSelector)).toBeNull()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)

    render.mock.calls[0]![1].callback('verified-token')
    expect(wrapper.emitted('verify')).toEqual([['verified-token']])
  })

  it('ends loading and reports a script load failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    wrapper = mount(TurnstileWidget, { props: { siteKey: 'site-key' } })

    document.querySelector(scriptSelector)!.dispatchEvent(new Event('error'))
    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.emitted('error')).toEqual([[]])
  })

  it('does not show a placeholder or load the SDK without a site key', async () => {
    wrapper = mount(TurnstileWidget, { props: { siteKey: '' } })
    await flushPromises()

    expect(wrapper.find('.turnstile-wrapper').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(document.querySelector(scriptSelector)).toBeNull()
  })

  it.each([250, 299])('uses the official compact widget at %d CSS pixels', async (width) => {
    measureContainer(width)
    const render = installSDK()
    wrapper = mount(TurnstileWidget, { props: { siteKey: 'site-key' } })
    await flushPromises()

    expect(render.mock.calls[0]![1].size).toBe('compact')
    expect(wrapper.get('.turnstile-container').classes()).toContain('turnstile-container--compact')
    expect(wrapper.emitted('expire')).toBeUndefined()
  })

  it('only restarts the challenge across the 300px boundary and invalidates the old response', async () => {
    measureContainer(320)
    const observer = observeContainer()
    const render = installSDK()
    wrapper = mount(TurnstileWidget, { props: { siteKey: 'site-key' } })
    await flushPromises()
    const initial = render.mock.calls[0]![1]
    expect(initial.size).toBe('flexible')
    initial.callback('first-token')

    observer.resize(310)
    observer.resize(300)
    expect(render).toHaveBeenCalledTimes(1)
    observer.resize(299)
    expect(window.turnstile!.remove).toHaveBeenCalledWith('widget-1')
    expect(wrapper.emitted('expire')).toEqual([[]])
    expect(render.mock.calls[1]![1].size).toBe('compact')

    initial.callback('stale-token')
    expect(wrapper.emitted('verify')).toEqual([['first-token']])
    render.mock.calls[1]![1].callback('compact-token')
    expect(wrapper.emitted('verify')).toEqual([['first-token'], ['compact-token']])
    observer.resize(250)
    observer.resize(280)
    expect(render).toHaveBeenCalledTimes(2)

    observer.resize(300)
    expect(render.mock.calls[2]![1].size).toBe('flexible')
    expect(wrapper.emitted('expire')).toHaveLength(2)
    wrapper.unmount()
    wrapper = undefined
    expect(observer.disconnect).toHaveBeenCalledOnce()
    observer.resize(250)
    expect(render).toHaveBeenCalledTimes(3)
  })

  it('keeps an explicitly compact widget compact on a wide container', async () => {
    measureContainer(250)
    const observer = observeContainer()
    const render = installSDK()
    wrapper = mount(TurnstileWidget, { props: { siteKey: 'site-key', size: 'compact' } })
    await flushPromises()
    observer.resize(500)
    expect(render).toHaveBeenCalledOnce()
    expect(render.mock.calls[0]![1].size).toBe('compact')
  })
})
