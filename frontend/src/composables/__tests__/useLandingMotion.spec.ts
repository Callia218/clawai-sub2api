import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useLandingMotion } from '../useLandingMotion'

class IntersectionMock {
  static instances: IntersectionMock[] = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  constructor(private callback: IntersectionObserverCallback) {
    IntersectionMock.instances.push(this)
  }
  emit(target: Element, isIntersecting: boolean) {
    this.callback([{ target, isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}

class ResizeMock {
  static instances: ResizeMock[] = []
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(private callback: ResizeObserverCallback) {
    ResizeMock.instances.push(this)
  }
  emit() { this.callback([], this as unknown as ResizeObserver) }
}

const rect = (height: number) => ({ top: 0, bottom: height, height, left: 0, right: 1440, width: 1440, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
let mediaListeners: Set<() => void>
let media: MediaQueryList
let hidden: boolean
let wrappers: VueWrapper[]

function makeScene() {
  const element = document.createElement('div')
  element.innerHTML = '<header class="hp__top"></header><h2 data-reveal="heading">Visible heading</h2>'
  const header = element.querySelector<HTMLElement>('.hp__top')!
  const heading = element.querySelector<HTMLElement>('[data-reveal]')!
  const geometry = { headerHeight: 48 }
  const headerRect = vi.spyOn(header, 'getBoundingClientRect').mockImplementation(() => rect(geometry.headerHeight))
  document.body.appendChild(element)
  return { element, header, heading, geometry, headerRect }
}

function mountMotion(initial: HTMLElement | null) {
  let motion!: ReturnType<typeof useLandingMotion>
  let root!: Ref<HTMLElement | null>
  const renderVersion = ref(0)
  const wrapper = mount(defineComponent({
    setup() {
      root = ref(initial)
      motion = useLandingMotion(root)
      return () => h('div', renderVersion.value)
    },
  }))
  wrappers.push(wrapper)
  return { wrapper, motion, root, renderVersion }
}

function changePreference(reduce: boolean) {
  Object.defineProperty(media, 'matches', { configurable: true, value: reduce })
  mediaListeners.forEach(listener => listener())
}

function changeVisibility(isHidden: boolean) {
  hidden = isHidden
  document.dispatchEvent(new Event('visibilitychange'))
}

function mockAnimation(target: Element) {
  const animation = { cancel: vi.fn(), pause: vi.fn(), play: vi.fn(), onfinish: null, oncancel: null } as unknown as Animation
  const animate = vi.fn(() => animation)
  Object.defineProperty(target, 'animate', { configurable: true, value: animate })
  return { animation, animate }
}

function addSection(element: HTMLElement) {
  const section = document.createElement('section')
  section.dataset.reveal = ''
  section.textContent = 'New readable section'
  element.appendChild(section)
  return section
}

beforeEach(() => {
  wrappers = []
  hidden = false
  mediaListeners = new Set()
  IntersectionMock.instances = []
  ResizeMock.instances = []
  media = {
    matches: false,
    addEventListener: vi.fn((_type: string, listener: () => void) => mediaListeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: () => void) => mediaListeners.delete(listener)),
  } as unknown as MediaQueryList
  vi.spyOn(window, 'matchMedia').mockReturnValue(media)
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  vi.stubGlobal('IntersectionObserver', IntersectionMock)
  vi.stubGlobal('ResizeObserver', ResizeMock)
})

afterEach(() => {
  wrappers.forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useLandingMotion', () => {
  it('keeps sections readable and reveals each only on its first intersection', () => {
    const scene = makeScene()
    const { animate } = mockAnimation(scene.heading)
    const addListener = vi.spyOn(window, 'addEventListener')
    mountMotion(scene.element)
    const observer = IntersectionMock.instances[0]
    expect(IntersectionMock.instances).toHaveLength(1)
    expect(scene.heading.style.cssText).toBe('')
    observer.emit(scene.heading, false)
    expect(animate).not.toHaveBeenCalled()
    observer.emit(scene.heading, true)
    observer.emit(scene.heading, false)
    observer.emit(scene.heading, true)
    expect(animate).toHaveBeenCalledOnce()
    expect(animate).toHaveBeenCalledWith([
      { opacity: 0.35, transform: 'translateY(24px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
    expect(observer.unobserve).toHaveBeenCalledWith(scene.heading)
    expect(scene.heading.style.cssText).toBe('')
    expect(addListener.mock.calls.some(([type]) => type === 'scroll')).toBe(false)
    expect(scene.element.style.getPropertyValue('--hp-progress')).toBe('')
  })

  it('honors reduced motion before a root attaches and never replays an already seen section', () => {
    Object.defineProperty(media, 'matches', { configurable: true, value: true })
    const scene = makeScene()
    const { animate } = mockAnimation(scene.heading)
    const { motion } = mountMotion(scene.element)
    expect(motion.still.value).toBe(true)
    const observer = IntersectionMock.instances[0]
    observer.emit(scene.heading, true)
    expect(animate).not.toHaveBeenCalled()
    changePreference(false)
    expect(motion.still.value).toBe(false)
    observer.emit(scene.heading, true)
    expect(animate).not.toHaveBeenCalled()
    expect(scene.heading.style.cssText).toBe('')
  })

  it('cancels active and queued reveals when reduced motion is enabled', () => {
    const scene = makeScene()
    const pending = addSection(scene.element)
    const active = mockAnimation(scene.heading)
    const queued = mockAnimation(pending)
    const { motion } = mountMotion(scene.element)
    const observer = IntersectionMock.instances[0]
    observer.emit(scene.heading, true)
    changeVisibility(true)
    observer.emit(pending, true)
    changePreference(true)
    expect(motion.still.value).toBe(true)
    expect(active.animation.cancel).toHaveBeenCalledOnce()
    expect(active.animation.onfinish).toBeNull()
    expect(active.animation.oncancel).toBeNull()
    changeVisibility(false)
    changePreference(false)
    observer.emit(pending, true)
    expect(active.animation.play).not.toHaveBeenCalled()
    expect(queued.animate).not.toHaveBeenCalled()
    expect(scene.heading.style.cssText).toBe('')
    expect(pending.style.cssText).toBe('')
  })

  it('pauses active reveals and defers new reveals while the tab is hidden', () => {
    const scene = makeScene()
    const pending = addSection(scene.element)
    const active = mockAnimation(scene.heading)
    const queued = mockAnimation(pending)
    mountMotion(scene.element)
    const observer = IntersectionMock.instances[0]
    observer.emit(scene.heading, true)
    changeVisibility(true)
    expect(active.animation.pause).toHaveBeenCalledOnce()
    observer.emit(pending, true)
    expect(queued.animate).not.toHaveBeenCalled()
    scene.geometry.headerHeight = 80
    scene.headerRect.mockClear()
    window.dispatchEvent(new Event('resize'))
    ResizeMock.instances[0].emit()
    expect(scene.headerRect).not.toHaveBeenCalled()
    changeVisibility(false)
    expect(active.animation.play).toHaveBeenCalledOnce()
    expect(queued.animate).toHaveBeenCalledOnce()
    expect(scene.element.style.getPropertyValue('--hp-scroll-offset')).toBe('100px')
    observer.emit(pending, true)
    expect(queued.animate).toHaveBeenCalledOnce()
  })

  it('does not animate a pending section that was removed before the tab becomes visible', () => {
    hidden = true
    const scene = makeScene()
    const { animate } = mockAnimation(scene.heading)
    mountMotion(scene.element)
    IntersectionMock.instances[0].emit(scene.heading, true)
    scene.heading.remove()
    changeVisibility(false)
    expect(animate).not.toHaveBeenCalled()
  })

  it('observes sections inserted by a later Vue render without replaying earlier sections', async () => {
    const scene = makeScene()
    const first = mockAnimation(scene.heading)
    const { renderVersion } = mountMotion(scene.element)
    const observer = IntersectionMock.instances[0]
    observer.emit(scene.heading, true)
    const later = addSection(scene.element)
    const second = mockAnimation(later)
    renderVersion.value++
    await nextTick()
    expect(observer.observe.mock.calls.map(([target]) => target)).toEqual([scene.heading, later])
    observer.emit(later, true)
    renderVersion.value++
    await nextTick()
    observer.emit(scene.heading, true)
    expect(observer.observe).toHaveBeenCalledTimes(2)
    expect(first.animate).toHaveBeenCalledOnce()
    expect(second.animate).toHaveBeenCalledOnce()
  })

  it('updates anchor clearance when the header resizes without reading scroll geometry', () => {
    const scene = makeScene()
    mountMotion(scene.element)
    expect(scene.element.style.getPropertyValue('--hp-scroll-offset')).toBe('68px')
    expect(ResizeMock.instances[0].observe).toHaveBeenCalledOnce()
    expect(ResizeMock.instances[0].observe).toHaveBeenCalledWith(scene.header)
    scene.geometry.headerHeight = 120
    ResizeMock.instances[0].emit()
    expect(scene.element.style.getPropertyValue('--hp-scroll-offset')).toBe('140px')
    scene.headerRect.mockClear()
    window.dispatchEvent(new Event('scroll'))
    expect(scene.headerRect).not.toHaveBeenCalled()
  })

  it('supports a delayed template ref and remains readable when observers are unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    vi.stubGlobal('ResizeObserver', undefined)
    const scene = makeScene()
    const { animate } = mockAnimation(scene.heading)
    const { root } = mountMotion(null)
    root.value = scene.element
    await nextTick()
    expect(scene.element.style.getPropertyValue('--hp-scroll-offset')).toBe('68px')
    expect(scene.heading.style.cssText).toBe('')
    expect(animate).not.toHaveBeenCalled()
    scene.geometry.headerHeight = 100
    window.dispatchEvent(new Event('resize'))
    expect(scene.element.style.getPropertyValue('--hp-scroll-offset')).toBe('120px')
  })

  it('leaves content visible if the Web Animations API is unavailable', () => {
    const scene = makeScene()
    Object.defineProperty(scene.heading, 'animate', { configurable: true, value: undefined })
    mountMotion(scene.element)
    expect(() => IntersectionMock.instances[0].emit(scene.heading, true)).not.toThrow()
    expect(scene.heading.style.cssText).toBe('')
  })

  it('cleans up animations, observers, anchor styles and listeners on root replacement and unmount', async () => {
    const first = makeScene()
    const second = makeScene()
    const active = mockAnimation(first.heading)
    const next = mockAnimation(second.heading)
    const removeWindow = vi.spyOn(window, 'removeEventListener')
    const removeDocument = vi.spyOn(document, 'removeEventListener')
    const { wrapper, root } = mountMotion(first.element)
    const oldObserver = IntersectionMock.instances[0]
    oldObserver.emit(first.heading, true)
    root.value = second.element
    await nextTick()
    expect(oldObserver.disconnect).toHaveBeenCalledOnce()
    expect(ResizeMock.instances[0].disconnect).toHaveBeenCalledOnce()
    expect(active.animation.cancel).toHaveBeenCalledOnce()
    expect(first.element.style.getPropertyValue('--hp-scroll-offset')).toBe('')
    oldObserver.emit(second.heading, true)
    expect(next.animate).not.toHaveBeenCalled()
    IntersectionMock.instances[1].emit(second.heading, true)
    wrapper.unmount()
    wrappers = wrappers.filter(item => item !== wrapper)
    expect(next.animation.cancel).toHaveBeenCalledOnce()
    expect(second.element.style.getPropertyValue('--hp-scroll-offset')).toBe('')
    expect(mediaListeners.size).toBe(0)
    expect(removeWindow.mock.calls.some(([type]) => type === 'resize')).toBe(true)
    expect(removeDocument.mock.calls.some(([type]) => type === 'visibilitychange')).toBe(true)
    expect(IntersectionMock.instances.every(observer => observer.disconnect.mock.calls.length === 1)).toBe(true)
    expect(ResizeMock.instances.every(observer => observer.disconnect.mock.calls.length === 1)).toBe(true)
    second.headerRect.mockClear()
    window.dispatchEvent(new Event('resize'))
    changeVisibility(true)
    changeVisibility(false)
    expect(second.headerRect).not.toHaveBeenCalled()
    expect(next.animation.pause).not.toHaveBeenCalled()
    expect(next.animation.play).not.toHaveBeenCalled()
  })

  it('releases completed animations so later visibility changes do not restart them', () => {
    const scene = makeScene()
    const { animation } = mockAnimation(scene.heading)
    mountMotion(scene.element)
    IntersectionMock.instances[0].emit(scene.heading, true)
    animation.onfinish?.call(animation, new Event('finish') as AnimationPlaybackEvent)
    changeVisibility(true)
    changeVisibility(false)
    expect(animation.pause).not.toHaveBeenCalled()
    expect(animation.play).not.toHaveBeenCalled()
  })
})
