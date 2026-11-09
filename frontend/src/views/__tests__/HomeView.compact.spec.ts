import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, RouterLinkStub } from '@vue/test-utils'

import HomeView from '../HomeView.vue'
import referenceMessages from '@/i18n/locales/zh/referenceLanding'

const { appStore, authStore, copyToClipboard, translate } = vi.hoisted(() => ({
  copyToClipboard: vi.fn(),
  translate: vi.fn((key: string) => key),
  appStore: {
    cachedPublicSettings: {} as Record<string, unknown>,
    siteName: 'Fallback site',
    siteLogo: '',
    docUrl: '',
    publicSettingsLoaded: true,
    fetchPublicSettings: vi.fn(),
  },
  authStore: {
    isAuthenticated: false,
    isAdmin: false,
    user: null as { email?: string } | null,
    checkAuth: vi.fn(),
  },
}))

vi.mock('@/stores', () => ({
  useAppStore: () => appStore,
  useAuthStore: () => authStore,
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => appStore,
}))

vi.mock('@/composables/useClipboard', () => ({
  useClipboard: () => ({ copyToClipboard }),
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({ t: translate }),
  }
})

enableAutoUnmount(afterEach)

function useReferenceCopy() {
  translate.mockImplementation((key: string) => {
    const value = key.split('.').reduce<unknown>((node, segment) => {
      if (!node || typeof node !== 'object') return undefined
      return (node as Record<string, unknown>)[segment]
    }, referenceMessages)
    return typeof value === 'string' ? value : key
  })
}

function mountHome(settings: Record<string, unknown> = {}) {
  appStore.cachedPublicSettings = {
    site_name: 'Test site',
    site_subtitle: 'Test subtitle',
    ...settings,
  }

  return mount(HomeView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        LocaleSwitcher: { template: '<div data-testid="locale-switcher" />' },
        PublicLocaleSwitcher: { template: '<div data-testid="public-locale-switcher" />' },
        PublicBackdrop: { template: '<div />' },
        AiWorkflowDemo: { template: '<div data-testid="workflow-demo" />' },
        Icon: { template: '<span data-testid="icon" />' },
      },
    },
  })
}

function compactDestination(wrapper: ReturnType<typeof mountHome>) {
  return wrapper.get('[data-testid="compact-home"]').findComponent(RouterLinkStub).props('to')
}

function modelPlazaDestination(wrapper: ReturnType<typeof mountHome>) {
  return wrapper
    .findAllComponents(RouterLinkStub)
    .find((link) => link.props('to') === '/model-plaza')
    ?.props('to')
}

describe('HomeView compact mode', () => {
  beforeEach(() => {
    authStore.isAuthenticated = false
    authStore.isAdmin = false
    authStore.user = null
    authStore.checkAuth.mockClear()
    appStore.fetchPublicSettings.mockClear()
    appStore.publicSettingsLoaded = true
    translate.mockReset().mockImplementation((key: string) => key)
    copyToClipboard.mockReset().mockResolvedValue(true)
    localStorage.clear()
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
  })

  it('renders custom HTML ahead of compact mode', () => {
    const wrapper = mountHome({
      compact_home_enabled: true,
      home_content: '<section id="custom-home">Custom home</section>',
    })

    expect(wrapper.get('#custom-home').text()).toBe('Custom home')
    expect(wrapper.find('[data-testid="compact-home"]').exists()).toBe(false)
  })

  it('renders custom URL content ahead of compact mode', () => {
    const wrapper = mountHome({
      compact_home_enabled: true,
      home_content: ' https://example.com/home ',
    })

    expect(wrapper.get('iframe').attributes('src')).toBe('https://example.com/home')
    expect(wrapper.find('[data-testid="compact-home"]').exists()).toBe(false)
  })

  it('treats whitespace-only custom content as empty and selects compact mode', () => {
    const wrapper = mountHome({ compact_home_enabled: true, home_content: ' \n\t ' })

    expect(wrapper.get('[data-testid="compact-home"]').text()).toContain('Test site')
  })

  it.each([undefined, false])('selects the default home when compact mode is %s', (enabled) => {
    const settings = enabled === undefined ? {} : { compact_home_enabled: enabled }
    const wrapper = mountHome(settings)

    expect(wrapper.find('[data-testid="compact-home"]').exists()).toBe(false)
    expect(wrapper.find('main#home-main').exists()).toBe(true)
  })

  it('links unauthenticated visitors to login', () => {
    expect(compactDestination(mountHome({ compact_home_enabled: true }))).toBe('/login')
  })

  it('links authenticated users to their dashboard', () => {
    authStore.isAuthenticated = true

    expect(compactDestination(mountHome({ compact_home_enabled: true }))).toBe('/dashboard')
  })

  it('links administrators to the admin dashboard', () => {
    authStore.isAuthenticated = true
    authStore.isAdmin = true

    const wrapper = mountHome({ compact_home_enabled: true })
    expect(compactDestination(wrapper)).toBe('/admin/dashboard')
    expect(authStore.checkAuth).toHaveBeenCalledOnce()
    expect(appStore.fetchPublicSettings).not.toHaveBeenCalled()
  })

  it('shows the model plaza link to anonymous visitors when public access is enabled', () => {
    const wrapper = mountHome({
      compact_home_enabled: true,
      model_plaza_enabled: true,
      model_plaza_require_auth: false,
    })

    expect(modelPlazaDestination(wrapper)).toBe('/model-plaza')
  })

  it('hides the model plaza link from anonymous visitors when sign-in is required', () => {
    const wrapper = mountHome({
      compact_home_enabled: true,
      model_plaza_enabled: true,
      model_plaza_require_auth: true,
    })

    expect(modelPlazaDestination(wrapper)).toBeUndefined()
  })

  it('shows the model plaza link to authenticated visitors when sign-in is required', () => {
    authStore.isAuthenticated = true

    const wrapper = mountHome({
      compact_home_enabled: true,
      model_plaza_enabled: true,
      model_plaza_require_auth: true,
    })

    expect(modelPlazaDestination(wrapper)).toBe('/model-plaza')
  })

  it('shows the model plaza link in the default home guide', () => {
    const wrapper = mountHome({
      model_plaza_enabled: true,
      model_plaza_require_auth: false,
    })

    expect(modelPlazaDestination(wrapper)).toBe('/model-plaza')
  })

  it.each([
    [false, false, '/login'],
    [true, false, '/dashboard'],
    [true, true, '/admin/dashboard'],
  ])('routes the public introduction to the correct console for authenticated=%s admin=%s', (authenticated, admin, destination) => {
    authStore.isAuthenticated = authenticated
    authStore.isAdmin = admin
    const wrapper = mountHome()
    const hero = wrapper.get('section[aria-labelledby="home-title"]')

    expect(hero.findComponent(RouterLinkStub).props('to')).toBe(destination)
    expect(hero.get('a[href="#connection"]').text()).toContain('referenceLanding.hero.secondary')
    expect(wrapper.find('#connection').exists()).toBe(true)
    wrapper.unmount()
  })

  it('hides the model plaza link when the feature is disabled', () => {
    const wrapper = mountHome({
      compact_home_enabled: true,
      model_plaza_enabled: false,
      model_plaza_require_auth: false,
    })

    expect(modelPlazaDestination(wrapper)).toBeUndefined()
  })

  it('retains the protected model destination for visitors to the full welcome page', () => {
    const wrapper = mountHome({ model_plaza_enabled: true, model_plaza_require_auth: true })
    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links.some(link => link.props('to') === '/login?redirect=%2Fmodel-plaza')).toBe(true)
    expect(wrapper.text()).toContain('glass.home.modelLoginAction')
  })

  it('does not describe unrequested public settings as disabled while they load', () => {
    appStore.publicSettingsLoaded = false
    const wrapper = mountHome()
    expect(appStore.fetchPublicSettings).toHaveBeenCalledOnce()
    expect(wrapper.get('#quick-start').text()).toContain('glass.home.steps.accountLoading')
    expect(wrapper.get('#questions').text()).toContain('glass.home.faq.registrationLoading')
    expect(wrapper.get('#connection').text()).toContain('glass.home.modelLoading')
    expect(wrapper.text()).not.toContain('glass.home.steps.accountClosed')
    expect(wrapper.text()).not.toContain('glass.home.faq.registrationClosed')
    expect(wrapper.text()).not.toContain('glass.home.modelUnavailable')
    wrapper.unmount()
  })

  it.each([
    [{ registration_enabled: false }, 'glass.home.steps.accountClosed', false],
    [{ registration_enabled: true, invitation_code_enabled: true }, 'glass.home.steps.accountInvite', true],
    [{ registration_enabled: true, backend_mode_enabled: true }, 'glass.home.steps.accountClosed', false],
  ])('describes registration from public settings %o', (settings, message, canRegister) => {
    const wrapper = mountHome(settings)
    expect(wrapper.get('#quick-start').text()).toContain(message)
    expect(wrapper.findAllComponents(RouterLinkStub).some(link => link.props('to') === '/register')).toBe(canRegister)
  })

  it.each([
    [{ payment_enabled: true }, true],
    [{ payment_enabled: false }, false],
    [{ payment_enabled: true, payment_balance_disabled: true }, false],
    [{ payment_enabled: true, backend_mode_enabled: true }, false],
  ])('only offers available balance top-ups for settings %o', (settings, available) => {
    const wrapper = mountHome(settings)
    expect(wrapper.findAllComponents(RouterLinkStub).some(link => link.props('to') === '/login?redirect=%2Fpurchase')).toBe(available)
  })

  it.each([
    ['https://api.example.com', 'https://api.example.com'],
    ['https://api.example.com/v1/', 'https://api.example.com/v1'],
    ['', window.location.origin],
  ])('normalizes the configured API root %s', (configured, expected) => {
    const wrapper = mountHome({ api_base_url: configured })
    expect(wrapper.get('#connection-panel-client code').text()).toBe(expected)
    expect(wrapper.get('#code-panel-python').text()).toContain(`base_url="${expected}"`)
  })

  it('copies the root service address from the connection guide', async () => {
    const wrapper = mountHome({ api_base_url: 'https://openai.cmlia.cn/' })
    await wrapper.get('#connection-panel-client button[aria-label="glass.home.copyAddress"]').trigger('click')
    await flushPromises()
    expect(copyToClipboard).toHaveBeenCalledWith('https://openai.cmlia.cn', 'glass.home.addressCopied')
    wrapper.unmount()
  })

  it('closes the mobile navigation with Escape and restores its trigger focus', async () => {
    const wrapper = mountHome()
    document.body.appendChild(wrapper.element)
    const trigger = wrapper.get<HTMLButtonElement>('[aria-controls="home-mobile-menu"]')
    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('#home-mobile-menu').findAll('a')).toHaveLength(4)
    await wrapper.get('header').trigger('keydown', { key: 'Escape' })
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('supports arrow and Home navigation between connection tabs and their panels', async () => {
    const wrapper = mountHome()
    document.body.appendChild(wrapper.element)
    const clientTab = wrapper.get<HTMLButtonElement>('#connection-tab-client')
    clientTab.element.focus()
    await clientTab.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('#connection-tab-developer').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('#connection-tab-developer').element).toBe(document.activeElement)
    expect(wrapper.get('#connection-panel-client').isVisible()).toBe(false)
    expect(wrapper.get('#connection-panel-developer').isVisible()).toBe(true)
    await wrapper.get('#connection-tab-developer').trigger('keydown', { key: 'Home', ctrlKey: true })
    expect(wrapper.get('#connection-tab-developer').attributes('aria-selected')).toBe('true')
    await wrapper.get('#connection-tab-developer').trigger('keydown', { key: 'Home' })
    expect(clientTab.attributes('aria-selected')).toBe('true')
    wrapper.unmount()
  })

  it('copies a root-path code example and announces its result', async () => {
    const wrapper = mountHome({ api_base_url: 'https://api.example.com' })
    await wrapper.get('#connection-tab-developer').trigger('click')
    await wrapper.get('#code-tab-curl').trigger('click')
    await wrapper.get('#connection-panel-developer button:not([role="tab"])').trigger('click')
    await flushPromises()
    expect(copyToClipboard).toHaveBeenCalledWith(expect.stringContaining("curl 'https://api.example.com/chat/completions'"), 'glass.home.codeCopied')
    expect(copyToClipboard.mock.calls[0][0]).toContain('$OPENAI_API_KEY')
    expect(wrapper.get('[role="status"]').text()).toBe('glass.home.codeCopied')
    wrapper.unmount()
  })

  it('announces a clipboard failure without claiming a successful copy', async () => {
    copyToClipboard.mockResolvedValue(false)
    const wrapper = mountHome()
    await wrapper.get('#connection-panel-client button[aria-label="glass.home.copyAddress"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('glass.home.copyFailed')
    expect(wrapper.get('#connection-panel-client button').attributes('aria-label')).toBe('glass.home.copyAddress')
    wrapper.unmount()
  })

  it('keeps key and usage features available when the model feature is disabled', () => {
    const wrapper = mountHome({ model_plaza_enabled: false })
    expect(wrapper.find('[data-testid="model-feature"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="keys-feature"]').findComponent(RouterLinkStub).props('to')).toBe('/login?redirect=%2Fkeys')
    expect(wrapper.get('[data-testid="usage-feature"]').findComponent(RouterLinkStub).props('to')).toBe('/login?redirect=%2Fusage')
    wrapper.unmount()
  })

  it.each([false, true])('routes quota and project entries to existing user pages, authenticated=%s', (authenticated) => {
    authStore.isAuthenticated = authenticated
    const wrapper = mountHome()
    const destination = authenticated ? '/dashboard' : '/login?redirect=%2Fdashboard'

    expect(wrapper.get('#quota').findComponent(RouterLinkStub).props('to')).toBe(destination)
    expect(wrapper.get('[data-testid="keys-feature"]').findComponent(RouterLinkStub).props('to'))
      .toBe(authenticated ? '/keys' : '/login?redirect=%2Fkeys')
    expect(wrapper.get('[data-testid="usage-feature"]').findComponent(RouterLinkStub).props('to'))
      .toBe(authenticated ? '/usage' : '/login?redirect=%2Fusage')
  })

  it('explains the actual quota scopes without advertising invented allocations or native accounts', () => {
    useReferenceCopy()
    const wrapper = mountHome()
    const quota = wrapper.get('#quota').text()

    expect(quota).toContain('由管理员分配')
    expect(quota).toContain('每日、每周与 30 天额度')
    expect(quota).toContain('订阅账户遵循订阅分组的额度与周期')
    expect(quota).toContain('由密钥拥有者管理')
    expect(quota).toContain('5 小时、1 天、7 天窗口限额')
    expect(quota).toContain('调整密钥限额不会提高平台为账户分配的额度')
    expect(quota).not.toMatch(/[$￥¥]\s*\d|\d+(?:\.\d+)?\s*(?:美元|元|%)/)
    expect(wrapper.get('#questions').text()).toContain('不能等同于 ChatGPT Plus 或 Pro 的官方额度份额')
    expect(wrapper.text()).not.toMatch(/上传.*(?:账户|账号|凭据)|原生账号下发|免费.*额度/)
    expect(wrapper.find('input, textarea').exists()).toBe(false)
  })

  it('copies the hero address and returns focus to the invoking control', async () => {
    const wrapper = mountHome({ api_base_url: 'https://openai.cmlia.cn/' })
    document.body.appendChild(wrapper.element)
    const button = wrapper.get<HTMLButtonElement>('button[aria-label="referenceLanding.hero.copy"]')
    button.element.focus()
    await button.trigger('click')
    await flushPromises()

    expect(copyToClipboard).toHaveBeenCalledWith('https://openai.cmlia.cn', 'glass.home.addressCopied')
    expect(wrapper.get('[role="status"]').text()).toBe('glass.home.addressCopied')
    expect(button.attributes('aria-label')).toBe('glass.home.copied')
    expect(document.activeElement).toBe(button.element)
  })

  it('keeps the hero copy action available after clipboard failure', async () => {
    copyToClipboard.mockResolvedValue(false)
    const wrapper = mountHome()
    const button = wrapper.get('button[aria-label="referenceLanding.hero.copy"]')
    await button.trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toBe('glass.home.copyFailed')
    expect(button.attributes('aria-label')).toBe('referenceLanding.hero.copy')
    expect(wrapper.find('button[aria-label="glass.home.copied"]').exists()).toBe(false)
  })

  it('supports keyboard wrapping and End navigation in the developer code examples', async () => {
    const wrapper = mountHome()
    document.body.appendChild(wrapper.element)
    await wrapper.get('#connection-tab-developer').trigger('click')
    const pythonTab = wrapper.get<HTMLButtonElement>('#code-tab-python')
    const curlTab = wrapper.get<HTMLButtonElement>('#code-tab-curl')
    pythonTab.element.focus()

    await pythonTab.trigger('keydown', { key: 'ArrowLeft' })
    expect(curlTab.attributes('aria-selected')).toBe('true')
    expect(curlTab.attributes('tabindex')).toBe('0')
    expect(pythonTab.attributes('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(curlTab.element)
    expect(wrapper.get('#code-panel-curl').isVisible()).toBe(true)
    expect(wrapper.get('#code-panel-python').isVisible()).toBe(false)

    await curlTab.trigger('keydown', { key: 'Home' })
    expect(pythonTab.attributes('aria-selected')).toBe('true')
    await pythonTab.trigger('keydown', { key: 'End' })
    expect(curlTab.attributes('aria-selected')).toBe('true')
  })

  it('closes mobile navigation after choosing a real section and retains a return-to-top target', async () => {
    const wrapper = mountHome()
    const trigger = wrapper.get('[aria-controls="home-mobile-menu"]')
    await trigger.trigger('click')
    const quotaLink = wrapper.get('#home-mobile-menu a[href="#quota"]')
    expect(wrapper.get(quotaLink.attributes('href')).attributes('id')).toBe('quota')
    await quotaLink.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('#home-mobile-menu').exists()).toBe(false)

    const backTop = wrapper.get('footer a[href="#home-main"]')
    expect(wrapper.get(backTop.attributes('href')).element.tagName).toBe('MAIN')
  })

  it('keeps contact links concise and limited to the supplied support email', () => {
    const wrapper = mountHome()
    const contacts = wrapper.findAll('a[href^="mailto:"]')
    expect(contacts.length).toBeGreaterThan(0)
    expect(contacts.every(link => link.attributes('href') === 'mailto:9768379@gmail.com')).toBe(true)
    expect(wrapper.find('a[href*="qq.com"], a[href^="tencent:"]').exists()).toBe(false)
  })
})
