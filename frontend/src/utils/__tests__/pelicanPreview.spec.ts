import { describe, expect, it } from 'vitest'
import { buildPelicanDocument } from '../pelicanPreview'

describe('pelican sandbox document bridge', () => {
  it('runs storage and sizing bridge before the generated scripts without rewriting artwork', () => {
    const html = '<!doctype html><html><head><title>Artwork</title><script>localStorage.setItem("x","y")</script></head><body><svg viewBox="0 0 800 600"></svg></body></html>'
    const result = buildPelicanDocument(html, 'test-channel')
    expect(result.startsWith('<!doctype html><html><head><meta http-equiv="Content-Security-Policy"')).toBe(true)
    expect(result).toContain('<svg viewBox="0 0 800 600"></svg>')
    expect(result.indexOf('function memoryStorage')).toBeLessThan(result.indexOf('localStorage.setItem'))
    expect(result).toContain('pelican:dimensions')
    expect(result).toContain('test-channel')
    expect(result).not.toContain('allow-same-origin')
  })
  it('handles fragments and headless documents', () => {
    for (const html of ['<svg></svg>', '<html><body><canvas></canvas></body></html>']) {
      const result = buildPelicanDocument(html, 'test')
      expect(result).toContain('<head><meta http-equiv="Content-Security-Policy"')
      expect(result).toContain('</head><body>')
    }
  })
  it('bounds size updates and observes load/resize without parent DOM access', () => {
    const result = buildPelicanDocument('<body>test</body>', 'channel')
    expect(result).toContain('updates<12')
    expect(result).toContain('8192')
    expect(result).toContain('ResizeObserver')
    expect(result).not.toContain('parent.document')
  })
  it('blocks network access before even malformed generated document content', () => {
    const result = buildPelicanDocument('<script>fetch("https://attacker.invalid")</script><html><head></head></html>', 'channel')
    expect(result.indexOf('Content-Security-Policy')).toBeLessThan(result.indexOf('fetch('))
    expect(result).toContain("connect-src 'none'")
    expect(result).toContain("frame-src 'none'")
    expect(result).toContain("form-action 'none'")
    expect(result).toContain("base-uri 'none'")
    expect(result.slice(0, result.indexOf('<script>'))).not.toContain('https:')
  })
})
