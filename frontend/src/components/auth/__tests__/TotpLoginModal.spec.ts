import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TotpLoginModal from '@/components/auth/TotpLoginModal.vue'

enableAutoUnmount(afterEach)

const { showErrorMock } = vi.hoisted(() => ({
  showErrorMock: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/stores', () => ({
  useAppStore: () => ({
    showError: (...args: any[]) => showErrorMock(...args),
  }),
}))

describe('TotpLoginModal', () => {
  beforeEach(() => {
    showErrorMock.mockReset()
  })

  it('sends verification errors to toast and does not render inline red text', async () => {
    const wrapper = mount(TotpLoginModal, {
      props: {
        tempToken: 'temp-token',
        userEmailMasked: 'u***@example.com',
      },
    })

    ;(wrapper.vm as unknown as { setError: (message: string) => void }).setError('Invalid code')
    await wrapper.vm.$nextTick()

    expect(showErrorMock).toHaveBeenCalledWith('Invalid code')
    expect(wrapper.text()).not.toContain('Invalid code')
    expect(wrapper.find('.bg-red-50').exists()).toBe(false)
  })

  it('contains keyboard focus and returns it to the trigger when dismissed', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const wrapper = mount(TotpLoginModal, {
      attachTo: document.body,
      props: { tempToken: 'temp-token' },
    })
    await wrapper.vm.$nextTick()
    const firstDigit = wrapper.get('.totp-digit').element
    const cancel = wrapper.get('button')
    expect(document.activeElement).toBe(firstDigit)
    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
    cancel.element.focus()
    await cancel.trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(firstDigit)
    await wrapper.get('.totp-digit').trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(cancel.element)
    await cancel.trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    wrapper.unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('retains the pending verification contract and does not dismiss while verifying', async () => {
    const wrapper = mount(TotpLoginModal, {
      attachTo: document.body,
      props: { tempToken: 'temp-token' },
    })
    const digits = wrapper.findAll('.totp-digit')
    for (let index = 0; index < 6; index++) await digits[index].setValue(String(index + 1))
    expect(wrapper.emitted('verify')).toEqual([['123456']])
    ;(wrapper.vm as unknown as { setVerifying: (value: boolean) => void }).setVerifying(true)
    await wrapper.vm.$nextTick()
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('cancel')).toBeUndefined()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
