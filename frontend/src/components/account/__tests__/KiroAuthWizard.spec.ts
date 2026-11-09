import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KiroAuthWizard from '../KiroAuthWizard.vue'

const api = vi.hoisted(() => ({
  authorizeUrl: vi.fn(), completeIdC: vi.fn(), deviceStart: vi.fn(), devicePoll: vi.fn()
}))

vi.mock('@/api/admin', () => ({ adminAPI: { kiro: api } }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const deviceSession = {
  session_id: 'device-session',
  user_code: 'ABCD-EFGH',
  verification_uri_complete: 'https://view.awsapps.com/start/#/device?user_code=ABCD-EFGH',
  expires_in: 600,
  interval: 2
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

describe('KiroAuthWizard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    vi.spyOn(window, 'open').mockReturnValue(null)
    api.deviceStart.mockResolvedValue(deviceSession)
    api.authorizeUrl.mockResolvedValue({
      session_id: 'idc-session', authorize_url: 'https://oidc.us-east-1.amazonaws.com/authorize', expires_in: 600
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('honors the server polling interval and slowdown before filling successful credentials', async () => {
    api.devicePoll.mockResolvedValueOnce({ status: 'pending', interval: 10 })
      .mockResolvedValueOnce({ status: 'ok', credentials: { refresh_token: 'new-token', region: 'us-east-1' } })
    const wrapper = mount(KiroAuthWizard, { props: { mode: 'builder_id' } })
    await wrapper.get('[data-test="kiro-wizard-start"]').trigger('click')
    await flushPromises()

    await vi.advanceTimersByTimeAsync(1999)
    expect(api.devicePoll).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(api.devicePoll).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(9999)
    expect(api.devicePoll).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(api.devicePoll).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('filled')?.[0]?.[0]).toMatchObject({ refreshToken: 'new-token', region: 'us-east-1' })
    expect(wrapper.find('[data-test="kiro-wizard-success"]').exists()).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    wrapper.unmount()
  })

  it.each(['switch', 'unmount'] as const)('discards a device-start response after %s', async action => {
    const pending = deferred<typeof deviceSession>()
    api.deviceStart.mockReturnValue(pending.promise)
    const wrapper = mount(KiroAuthWizard, { props: { mode: 'builder_id' } })
    await wrapper.get('[data-test="kiro-wizard-start"]').trigger('click')
    if (action === 'switch') {
      await wrapper.setProps({ mode: 'idc', issuerUrl: 'https://example.awsapps.com/start' })
    } else {
      wrapper.unmount()
    }
    pending.resolve(deviceSession)
    await flushPromises()

    expect(window.open).not.toHaveBeenCalled()
    expect(wrapper.emitted('filled')).toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)
    if (action === 'switch') {
      expect(wrapper.get('[data-test="kiro-wizard-start"]').attributes('disabled')).toBeUndefined()
      wrapper.unmount()
    }
  })

  it('discards successful polling credentials after the authorization context changes', async () => {
    const pending = deferred<{ status: string; credentials: { refresh_token: string } }>()
    api.devicePoll.mockReturnValue(pending.promise)
    const wrapper = mount(KiroAuthWizard, { props: { mode: 'builder_id', region: 'us-east-1' } })
    await wrapper.get('[data-test="kiro-wizard-start"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2000)
    expect(api.devicePoll).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ region: 'eu-west-1' })
    pending.resolve({ status: 'ok', credentials: { refresh_token: 'stale-token' } })
    await flushPromises()

    expect(wrapper.emitted('filled')).toBeUndefined()
    expect(wrapper.find('[data-test="kiro-wizard-start"]').exists()).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    wrapper.unmount()
  })

  it('stops polling when the device session expires', async () => {
    api.deviceStart.mockResolvedValue({ ...deviceSession, expires_in: 1 })
    const wrapper = mount(KiroAuthWizard, { props: { mode: 'builder_id' } })
    await wrapper.get('[data-test="kiro-wizard-start"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2000)

    expect(api.devicePoll).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="kiro-wizard-error"]').text()).toContain('deviceCodeExpired')
    expect(vi.getTimerCount()).toBe(0)
    wrapper.unmount()
  })

  it('exchanges the pasted IdC callback with the active session and preserves success after filling fields', async () => {
    api.completeIdC.mockResolvedValue({ status: 'ok', credentials: {
      refresh_token: 'idc-token', access_token: 'idc-access', expires_at: '2026-10-26T10:00:00Z', region: 'us-east-1'
    } })
    const wrapper = mount(KiroAuthWizard, {
      props: { mode: 'idc', issuerUrl: 'https://example.awsapps.com/start', proxyId: 7 }
    })
    await wrapper.get('[data-test="kiro-wizard-start"]').trigger('click')
    await flushPromises()
    const callback = 'http://127.0.0.1/oauth/callback?code=code&state=state'
    await wrapper.get('[data-test="kiro-wizard-callback-url"]').setValue(callback)
    await wrapper.get('[data-test="kiro-wizard-confirm"]').trigger('click')
    await flushPromises()

    expect(api.completeIdC).toHaveBeenCalledWith({ session_id: 'idc-session', callback_url: callback, proxy_id: 7 })
    expect(wrapper.emitted('filled')?.[0]?.[0]).toMatchObject({
      refreshToken: 'idc-token', accessToken: 'idc-access', expiresAt: '2026-10-26T10:00:00Z'
    })
    await wrapper.setProps({ region: 'us-east-1' })
    expect(wrapper.find('[data-test="kiro-wizard-success"]').exists()).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    wrapper.unmount()
  })
})
