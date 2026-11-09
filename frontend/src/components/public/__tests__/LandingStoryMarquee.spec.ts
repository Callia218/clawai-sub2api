import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import LandingStoryMarquee from '../LandingStoryMarquee.vue'

vi.mock('vue-i18n', async (importOriginal) => {
  const { createI18n } = await importOriginal<typeof import('vue-i18n')>()
  const { default: messages } = await import('@/i18n/locales/zh/referenceLanding')
  const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh: messages } })
  return { useI18n: () => ({ t: i18n.global.t }) }
})

class IntersectionMock {
  static instances: IntersectionMock[] = []
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(private callback: IntersectionObserverCallback) { IntersectionMock.instances.push(this) }
  emit(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}
class ResizeMock {
  static instances: ResizeMock[] = []
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(private callback: ResizeObserverCallback) { ResizeMock.instances.push(this) }
  emit() { this.callback([], this as unknown as ResizeObserver) }
}

class NativeAnimationMock {
  static instances: NativeAnimationMock[] = []
  private time: number | null = 0
  timeWrites = 0
  playState = 'running'
  get currentTime() { return this.time }
  set currentTime(value: number | null) { this.time = value; this.timeWrites++ }
  play = vi.fn(() => { this.playState = 'running' })
  pause = vi.fn(() => { this.playState = 'paused' })
  cancel = vi.fn(() => { this.playState = 'idle'; this.currentTime = null })
  effect = {
    setKeyframes: vi.fn((frames: Keyframe[]) => { this.frames = frames }),
    updateTiming: vi.fn((timing: OptionalEffectTiming) => { Object.assign(this.timing, timing) }),
  }
  constructor(readonly target: Element, public frames: Keyframe[], public timing: KeyframeAnimationOptions) {
    NativeAnimationMock.instances.push(this)
  }
}
const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

let wrappers: VueWrapper[]
let cycleHeight: number
let viewportHeight: number
let hidden: boolean
let media: MediaQueryList
let mediaListeners: Set<() => void>

function mountStories(siteName?: string) {
  const wrapper = mount(LandingStoryMarquee, { props: { siteName } })
  wrappers.push(wrapper)
  const columns = wrapper.findAll<HTMLElement>('.rl-story-column').map(column => column.element)
  return { wrapper, columns }
}

function animationFor(column: HTMLElement) {
  const track = column.querySelector('.rl-story-track')
  return [...NativeAnimationMock.instances].reverse().find(animation => animation.target === track)!
}
function changeVisibility(value: boolean) {
  hidden = value
  document.dispatchEvent(new Event('visibilitychange'))
}
async function changeMotion(value: boolean) {
  Object.defineProperty(media, 'matches', { configurable: true, value })
  mediaListeners.forEach(listener => listener())
  await nextTick()
}

beforeEach(() => {
  wrappers = []
  cycleHeight = 920
  viewportHeight = 618
  hidden = false
  mediaListeners = new Set()
  IntersectionMock.instances = []
  ResizeMock.instances = []
  NativeAnimationMock.instances = []
  media = {
    matches: false,
    addEventListener: vi.fn((_type: string, listener: () => void) => mediaListeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: () => void) => mediaListeners.delete(listener)),
  } as unknown as MediaQueryList
  vi.spyOn(window, 'matchMedia').mockReturnValue(media)
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  vi.stubGlobal('IntersectionObserver', IntersectionMock)
  vi.stubGlobal('ResizeObserver', ResizeMock)
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, writable: true,
    value: vi.fn(function (this: Element, frames: Keyframe[], timing: KeyframeAnimationOptions) {
      return new NativeAnimationMock(this, frames, timing) as unknown as Animation
    }),
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const height = this.classList.contains('rl-story-set') ? cycleHeight : viewportHeight
    return { top: 0, bottom: height, height, left: 0, right: 250, width: 250, x: 0, y: 0, toJSON: () => ({}) }
  })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => viewportHeight)
})

afterEach(() => {
  wrappers.forEach(wrapper => wrapper.unmount())
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate)
  else Reflect.deleteProperty(Element.prototype, 'animate')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('LandingStoryMarquee', () => {
  it('exposes the eight illustrative reviews once, with hidden copies for the loop', () => {
    const { wrapper } = mountStories('Test Gateway')
    expect(wrapper.findAll('.rl-story-column')).toHaveLength(2)
    expect(wrapper.findAll('.rl-story-column:not([aria-hidden]) .rl-story-set:not([aria-hidden]) article')).toHaveLength(8)
    expect(wrapper.findAll('.rl-story-set')).toHaveLength(6)
    expect(wrapper.findAll('.rl-story-card')).toHaveLength(48)
    expect(wrapper.findAll('[aria-hidden="true"] article')).toHaveLength(40)
    expect(wrapper.get('aside').attributes('tabindex')).toBe('0')
    expect(wrapper.get('.rl-story-caption').text()).toBe('Test Gateway · 评价示例')
    expect(wrapper.get('aside').attributes('aria-label')).toBe('Test Gateway 评价示例')
    expect(wrapper.get('.rl-story-card > p').text()).toContain('Test Gateway 真的好用')
    expect(wrapper.get('.rl-story-card > p').text()).toContain('Codex')
    expect(wrapper.findAll('.rl-story-card > p')[6].text()).toContain('请求走 Test Gateway 网关调度')
    expect(wrapper.text()).not.toContain('Recodex')
    expect(wrapper.find('.rl-story-caption a').exists()).toBe(false)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.findAll('[role="img"]')).toHaveLength(48)
    expect(wrapper.find('button, input').exists()).toBe(false)
  })

  it('uses measured native transform loops at the original pixel speeds without a JS frame loop', () => {
    const { columns } = mountStories()
    const [left, right] = columns.map(animationFor)
    expect(NativeAnimationMock.instances).toHaveLength(2)
    for (const animation of [left, right]) {
      expect(animation.frames).toEqual([{ transform: 'translateY(0px)' }, { transform: 'translateY(-920px)' }])
      expect(animation.timing).toMatchObject({ iterations: Infinity, easing: 'linear', fill: 'none' })
      expect(animation.playState).toBe('running')
    }
    expect(left.timing.duration).toBeCloseTo(27600)
    expect(right.timing.duration).toBeCloseTo(cycleHeight / (175 / 6) * 1000)
    expect(left.currentTime).toBe(0)
    expect(right.currentTime).toBeCloseTo(Number(right.timing.duration) / 2)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(columns.map(column => column.querySelector<HTMLElement>('.rl-story-track')!.style.transform)).toEqual(['', ''])
  })

  it('keeps the phase after several repeated-set boundaries when the cycle changes', () => {
    const { columns } = mountStories()
    const animation = animationFor(columns[0])
    animation.currentTime = Number(animation.timing.duration) * 3 + 100
    cycleHeight *= 2
    ResizeMock.instances[0].emit()
    expect(animationFor(columns[0])).toBe(animation)
    expect(animation.currentTime).toBeCloseTo(200)
    expect(animation.timing.duration).toBeCloseTo(55200)
    expect(animation.cancel).not.toHaveBeenCalled()
  })

  it('pauses on hover and resumes the same animation without seeking or restarting', async () => {
    const { wrapper, columns } = mountStories()
    const animation = animationFor(columns[0])
    animation.currentTime = 1250
    await wrapper.trigger('pointerenter')
    expect(animation.playState).toBe('paused')
    const writes = animation.timeWrites
    const pauseCalls = animation.pause.mock.calls.length
    await wrapper.trigger('pointerenter')
    ResizeMock.instances[0].emit()
    expect(animation.pause).toHaveBeenCalledTimes(pauseCalls)
    await wrapper.trigger('pointerleave')
    expect(animationFor(columns[0])).toBe(animation)
    expect(animation.playState).toBe('running')
    expect(animation.currentTime).toBe(1250)
    expect(animation.timeWrites).toBe(writes)
    expect(NativeAnimationMock.instances).toHaveLength(2)
  })

  it('remains paused while focus is inside and until both focus and hover leave', async () => {
    const { wrapper, columns } = mountStories()
    const animation = animationFor(columns[0])
    await wrapper.trigger('focusin')
    expect(animation.playState).toBe('paused')
    const pauseCalls = animation.pause.mock.calls.length
    await wrapper.trigger('focusout', { relatedTarget: wrapper.get('.rl-story-card').element })
    await wrapper.trigger('pointerenter')
    await wrapper.trigger('focusout', { relatedTarget: document.body })
    expect(animation.playState).toBe('paused')
    expect(animation.pause).toHaveBeenCalledTimes(pauseCalls)
    await wrapper.trigger('pointerleave')
    expect(animation.playState).toBe('running')
  })

  it('requires both a visible page and an onscreen region before resuming', async () => {
    const { wrapper, columns } = mountStories()
    const animation = animationFor(columns[0])
    animation.currentTime = 4321
    changeVisibility(true)
    IntersectionMock.instances[0].emit(false)
    await nextTick()
    expect(wrapper.classes()).toContain('rl-stories--paused')
    expect(animation.playState).toBe('paused')
    const playCalls = animation.play.mock.calls.length
    changeVisibility(false)
    expect(animation.playState).toBe('paused')
    expect(animation.play).toHaveBeenCalledTimes(playCalls)
    IntersectionMock.instances[0].emit(true)
    expect(animation.playState).toBe('running')
    expect(animation.currentTime).toBe(4321)
  })

  it('keeps reduced-motion content at its beginning and responds to preference changes', async () => {
    await changeMotion(true)
    const { wrapper, columns } = mountStories()
    expect(NativeAnimationMock.instances).toHaveLength(0)
    expect(wrapper.classes()).toContain('rl-stories--static')
    expect(wrapper.get('.rl-story-columns').attributes('tabindex')).toBe('0')
    expect(columns.map(column => column.querySelector<HTMLElement>('.rl-story-track')!.style.transform)).toEqual(['', ''])
    await changeMotion(false)
    expect(NativeAnimationMock.instances).toHaveLength(2)
    expect(wrapper.get('.rl-story-columns').attributes('tabindex')).toBeUndefined()
    const animation = animationFor(columns[0])
    animation.currentTime = 1000
    await changeMotion(true)
    expect(animation.cancel).toHaveBeenCalledOnce()
    expect(columns.map(column => column.querySelector<HTMLElement>('.rl-story-track')!.style.transform)).toEqual(['', ''])
    await changeMotion(false)
    expect(animationFor(columns[0])).not.toBe(animation)
    expect(animationFor(columns[0]).currentTime).toBeCloseTo(1000)
    expect(animationFor(columns[0]).playState).toBe('running')
  })

  it('preserves phase, pixel speed and paused state without rebuilding after resize', async () => {
    const { wrapper, columns } = mountStories()
    const animation = animationFor(columns[0])
    animation.currentTime = 1000
    await wrapper.trigger('pointerenter')
    const playCalls = animation.play.mock.calls.length
    const pauseCalls = animation.pause.mock.calls.length
    cycleHeight *= 2
    ResizeMock.instances[0].emit()
    expect(animationFor(columns[0])).toBe(animation)
    expect(animation.currentTime).toBeCloseTo(2000)
    expect(animation.timing.duration).toBeCloseTo(55200)
    expect(animation.frames[1]).toEqual({ transform: 'translateY(-1840px)' })
    expect(animation.playState).toBe('paused')
    expect(animation.play).toHaveBeenCalledTimes(playCalls)
    expect(animation.pause).toHaveBeenCalledTimes(pauseCalls)
    const writes = animation.timeWrites
    ResizeMock.instances[0].emit()
    expect(animation.effect.setKeyframes).toHaveBeenCalledOnce()
    expect(animation.effect.updateTiming).toHaveBeenCalledOnce()
    expect(animation.timeWrites).toBe(writes)
    expect(animation.cancel).not.toHaveBeenCalled()
  })

  it('does not animate an unmeasured or too-short cycle and starts once it fits', () => {
    cycleHeight = 200
    const { columns } = mountStories()
    expect(NativeAnimationMock.instances).toHaveLength(0)
    cycleHeight = 920
    ResizeMock.instances[0].emit()
    expect(NativeAnimationMock.instances).toHaveLength(2)
    expect(animationFor(columns[0]).playState).toBe('running')
  })

  it('uses accessible static content if native animation is unavailable', () => {
    Reflect.deleteProperty(Element.prototype, 'animate')
    const { wrapper } = mountStories()
    expect(wrapper.classes()).toContain('rl-stories--static')
    expect(wrapper.get('.rl-story-columns').attributes('tabindex')).toBe('0')
    expect(wrapper.findAll('.rl-story-column:not([aria-hidden]) .rl-story-set:not([aria-hidden]) article')).toHaveLength(8)
    expect(NativeAnimationMock.instances).toHaveLength(0)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('cancels native animations and releases observers and listeners on unmount', () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const { wrapper, columns } = mountStories()
    const animations = columns.map(animationFor)
    wrapper.unmount()
    animations.forEach(animation => expect(animation.cancel).toHaveBeenCalledOnce())
    expect(IntersectionMock.instances[0].disconnect).toHaveBeenCalledOnce()
    expect(ResizeMock.instances[0].disconnect).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(mediaListeners.size).toBe(0)
    ResizeMock.instances[0].emit()
    IntersectionMock.instances[0].emit(true)
    expect(NativeAnimationMock.instances).toHaveLength(2)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })
})
