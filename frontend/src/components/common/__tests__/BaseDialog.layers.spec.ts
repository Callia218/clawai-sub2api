import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import BaseDialog from '../BaseDialog.vue'
import UiModal from '@/ui/UiModal.vue'
import Select from '../Select.vue'

enableAutoUnmount(afterEach)
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

describe('dialog and popover layers', () => {
  it('puts the most recently opened dialog on top even when it mounted first', async () => {
    const first = mount(BaseDialog, { props: { show: false, title: 'First' } })
    const second = mount(BaseDialog, { props: { show: true, title: 'Second' } })
    await first.setProps({ show: true })
    const panels = [...document.querySelectorAll<HTMLElement>('.modal-overlay')]
    const byTitle = (title: string) => panels.find(panel => panel.textContent?.includes(title))!
    expect(Number(byTitle('First').style.zIndex)).toBeGreaterThan(Number(byTitle('Second').style.zIndex))
    second.unmount()
    expect(document.body.classList.contains('modal-open')).toBe(true)
  })

  it('keeps the shared scroll lock and only dismisses the top dialog across both modal components', async () => {
    const parent = mount(BaseDialog, { props: { show: true, title: 'Parent' } })
    const child = mount(UiModal, { props: { open: true, title: 'Child' } })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(child.emitted('update:open')).toEqual([[false]])
    expect(parent.emitted('close')).toBeUndefined()
    await child.setProps({ open: false })
    expect(document.body.classList.contains('modal-open')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(parent.emitted('close')).toHaveLength(1)
  })

  it('keeps a select above its own dialog but below a new child dialog', async () => {
    const parent = mount(BaseDialog, {
      props: { show: true, title: 'Parent' },
      slots: { default: () => h(Select, { modelValue: null, options: [{ value: 'one', label: 'One' }] }) },
    })
    const select = parent.findComponent(Select)
    await select.get('button').trigger('click')
    await nextTick()
    const popup = document.querySelector<HTMLElement>('.select-dropdown-portal')!
    const parentLayer = Number(document.querySelector<HTMLElement>('.modal-overlay')!.style.zIndex)
    expect(Number(popup.style.zIndex)).toBeGreaterThan(parentLayer)
    mount(BaseDialog, { props: { show: true, title: 'Child' } })
    const childLayer = Number([...document.querySelectorAll<HTMLElement>('.modal-overlay')].at(-1)!.style.zIndex)
    expect(Number(popup.style.zIndex)).toBeLessThan(childLayer)
  })
})
