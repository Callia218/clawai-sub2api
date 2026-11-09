import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginCustomerGuide from '@/components/auth/LoginCustomerGuide.vue'

const { appStore } = vi.hoisted(() => ({
  appStore: {
    siteName: 'ChatGPT',
    publicSettingsLoaded: true,
    cachedPublicSettings: {
      site_name: 'ChatGPT',
      registration_enabled: true,
      invitation_code_enabled: true,
      backend_mode_enabled: false,
      payment_enabled: true,
      payment_balance_disabled: false
    }
  }
}))

vi.mock('@/stores', () => ({ useAppStore: () => appStore }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

function mountGuide() {
  return mount(LoginCustomerGuide, {
    global: {
      stubs: {
        Icon: true,
        RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }
      }
    }
  })
}

describe('LoginCustomerGuide access information', () => {
  beforeEach(() => {
    appStore.publicSettingsLoaded = true
    appStore.cachedPublicSettings = {
      site_name: 'ChatGPT',
      registration_enabled: true,
      invitation_code_enabled: true,
      backend_mode_enabled: false,
      payment_enabled: true,
      payment_balance_disabled: false
    }
  })

  it('explains invitations only when registration requires one', () => {
    expect(mountGuide().text()).toContain('accessGuide.invitationStart')

    appStore.cachedPublicSettings.invitation_code_enabled = false
    const wrapper = mountGuide()
    expect(wrapper.text()).toContain('accessGuide.startDescription')
    expect(wrapper.text()).not.toContain('accessGuide.invitationStart')
  })

  it('does not offer invitation-based registration when registration is closed', () => {
    appStore.cachedPublicSettings.registration_enabled = false
    const wrapper = mountGuide()

    expect(wrapper.text()).toContain('accessGuide.registrationClosed')
    expect(wrapper.text()).not.toContain('accessGuide.invitationStart')
  })

  it('does not advertise payments in administrator-only mode or when payments are disabled', () => {
    appStore.cachedPublicSettings.backend_mode_enabled = true
    const administratorView = mountGuide()
    expect(administratorView.text()).toContain('accessGuide.backendModeNote')
    expect(administratorView.text()).not.toContain('accessGuide.paymentNote')

    appStore.cachedPublicSettings.backend_mode_enabled = false
    appStore.cachedPublicSettings.payment_enabled = false
    expect(mountGuide().text()).not.toContain('accessGuide.paymentNote')
  })

  it('provides the support email and setup guides without a QQ contact action', () => {
    const wrapper = mountGuide()
    expect(wrapper.find('a[href="mailto:9768379@gmail.com"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/home#quick-start"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/home#connection"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/home#questions"]').exists()).toBe(true)

    expect(wrapper.text()).not.toContain('3234780')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('does not advertise balance top-ups when only other payments are available', () => {
    expect(mountGuide().text()).toContain('accessGuide.paymentNote')
    appStore.cachedPublicSettings.payment_balance_disabled = true

    expect(mountGuide().text()).not.toContain('accessGuide.paymentNote')
  })

  it('waits for public settings before describing registration as closed', () => {
    appStore.publicSettingsLoaded = false
    appStore.cachedPublicSettings.registration_enabled = false
    const wrapper = mountGuide()
    expect(wrapper.text()).toContain('accessGuide.startDescription')
    expect(wrapper.text()).not.toContain('accessGuide.registrationClosed')
    expect(wrapper.text()).not.toContain('accessGuide.invitationStart')
  })
})
