import { afterEach, describe, expect, it, vi } from 'vitest'
import { START_LOCATION, type RouteLocationNormalized } from 'vue-router'
import { scrollBehavior } from '../scrollBehavior'

const home = { ...START_LOCATION, name: 'Home', path: '/home' } as RouteLocationNormalized
const login = { ...START_LOCATION, name: 'Login', path: '/login' } as RouteLocationNormalized
const saved = { left: 0, top: 872 }
function navigation(type: string) {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type } as PerformanceNavigationTiming])
}
afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})
describe('Home scroll policy', () => {
  it('ignores a persisted history scroll on an initial home refresh', async () => {
    navigation('reload')
    expect(await scrollBehavior(home, START_LOCATION, saved)).toEqual({ left: 0, top: 0, behavior: 'instant' })
  })
  it('refreshes to the hero even when the address contains a section hash', async () => {
    navigation('reload')
    expect(await scrollBehavior({ ...home, hash: '#connection' }, START_LOCATION, saved)).toMatchObject({ top: 0 })
  })
  it('keeps back/forward restoration in an already-refreshed document', async () => {
    navigation('reload')
    expect(await scrollBehavior(home, login, saved)).toMatchObject(saved)
  })
  it('keeps document back/forward restoration', async () => {
    navigation('back_forward')
    expect(await scrollBehavior(home, START_LOCATION, saved)).toMatchObject(saved)
  })
  it('allows a new direct link to an existing homepage section', async () => {
    navigation('navigate')
    document.body.innerHTML = '<section id="connection"></section>'
    expect(await scrollBehavior({ ...home, hash: '#connection' }, START_LOCATION, null)).toEqual({ el: '#connection', top: 108, behavior: 'instant' })
  })
  it('keeps anchors below a wrapped mobile navigation', async () => {
    navigation('navigate')
    document.body.innerHTML = '<header class="hp__top"></header><section id="connection"></section>'
    vi.spyOn(document.querySelector('.hp__top')!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 360, 146))
    expect(await scrollBehavior({ ...home, hash: '#connection' }, START_LOCATION, null)).toMatchObject({ top: 166 })
  })
  it('waits for the initial application mount before resolving a hash', async () => {
    navigation('navigate')
    const result = scrollBehavior({ ...home, hash: '#connection' }, START_LOCATION, null)
    document.body.innerHTML = '<section id="connection"></section>'
    expect(await result).toMatchObject({ el: '#connection' })
  })
  it('ignores a nonexistent section without throwing', async () => {
    navigation('navigate')
    expect(await scrollBehavior({ ...home, hash: '#missing' }, START_LOCATION, null)).toEqual({ top: 0 })
  })
  it('does not change saved positions for other routes', async () => {
    navigation('reload')
    expect(await scrollBehavior(login, START_LOCATION, saved)).toEqual(saved)
  })
})
