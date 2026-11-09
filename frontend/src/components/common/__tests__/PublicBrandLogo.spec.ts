import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PublicBrandLogo from '../PublicBrandLogo.vue'

const source = 'data:image/png;base64,original'
function canvasMock(color = false, transparent = false) {
  const pixels = new Uint8ClampedArray(4 * 4 * 4).fill(255)
  pixels[20] = 0
  pixels[21] = color ? 180 : 0
  pixels[22] = 0
  if (transparent) pixels[3] = 0
  const putImageData = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(), getImageData: () => ({ data: pixels }), putImageData
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,transparent')
  return { pixels, putImageData }
}
async function load(wrapper: ReturnType<typeof mount>) {
  Object.defineProperties(wrapper.element, { naturalWidth: { value: 4 }, naturalHeight: { value: 4 } })
  await wrapper.trigger('load')
}
afterEach(() => vi.restoreAllMocks())
describe('public logo presentation', () => {
  it('removes an opaque white background without changing the configured source', async () => {
    const { pixels, putImageData } = canvasMock()
    const wrapper = mount(PublicBrandLogo, { props: { src: source } })
    await load(wrapper)
    expect(wrapper.attributes('src')).toBe('data:image/png;base64,transparent')
    expect(wrapper.classes()).toContain('public-brand-logo--mono')
    expect(pixels[3]).toBe(0)
    expect(pixels[23]).toBe(255)
    expect(putImageData).toHaveBeenCalledOnce()
    expect(wrapper.props('src')).toBe(source)
    await wrapper.setProps({ src: '/new-brand.svg' })
    expect(wrapper.attributes('src')).toBe('/new-brand.svg')
    expect(wrapper.classes()).not.toContain('public-brand-logo--mono')
    wrapper.unmount()
  })
  it.each([[true, false], [false, true]])('preserves colored or already transparent images', async (color, transparent) => {
    canvasMock(color, transparent)
    const wrapper = mount(PublicBrandLogo, { props: { src: source } })
    await load(wrapper)
    expect(wrapper.attributes('src')).toBe(source)
    wrapper.unmount()
  })
  it('falls back to the original image if canvas access is denied', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new DOMException('Tainted', 'SecurityError') })
    const wrapper = mount(PublicBrandLogo, { props: { src: source } })
    await load(wrapper)
    expect(wrapper.attributes('src')).toBe(source)
    wrapper.unmount()
  })
})
