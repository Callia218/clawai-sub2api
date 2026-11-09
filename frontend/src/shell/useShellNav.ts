/**
 * useShellNav —— 应用外壳的导航数据源
 *
 * 从旧的 AppSidebar.vue 中抽出的纯逻辑层（零模板、零样式），供新的 ShellRail 消费。
 * 与旧实现的差异：
 *   1. 导航项从「一条扁平列表」重组为「按语义分组的多个 section」——这是信息架构层面的重构；
 *   2. 图标改用统一的 <Icon name="..."> 组件名，不再内联 h() SVG；
 *   3. 展开/折叠、高亮、权限、feature flag、简单模式过滤等既有行为 100% 保留。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAdminSettingsStore, useAppStore, useAuthStore, useOnboardingStore } from '@/stores'
import { FeatureFlags, makeSidebarFlag } from '@/utils/featureFlags'
import { resolveSiteBillingMode } from '@/utils/siteBillingMode'
import { useBatchImageAccess } from '@/composables/useBatchImageAccess'

export interface ShellNavItem {
  path: string
  label: string
  /** Icon.vue 的图标名 */
  icon?: string | null
  /** 自定义菜单项自带的内联 SVG */
  iconSvg?: string
  /** 简单模式下隐藏 */
  hideInSimpleMode?: boolean
  children?: ShellNavItem[]
  /** 为 true 时点击父项只切换展开状态，不导航 */
  expandOnly?: boolean
  /** 功能开关；返回 false 时隐藏。undefined 视为显示（避免设置未加载时菜单闪烁） */
  featureFlag?: () => boolean | undefined
  /** 右侧徽标文案（如「新」） */
  badge?: string
}

export interface ShellNavSection {
  key: string
  title?: string
  items: ShellNavItem[]
}

function applyFeatureFlags(items: ShellNavItem[]): ShellNavItem[] {
  const out: ShellNavItem[] = []
  for (const item of items) {
    if (item.featureFlag && item.featureFlag() === false) continue
    if (item.children) {
      out.push({ ...item, children: applyFeatureFlags(item.children) })
    } else {
      out.push(item)
    }
  }
  return out
}

export function useShellNav() {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const authStore = useAuthStore()
  const onboardingStore = useOnboardingStore()
  const adminSettingsStore = useAdminSettingsStore()
  const { canUseBatchImage } = useBatchImageAccess()

  const isAdmin = computed(() => authStore.isAdmin)
  const isSimpleMode = computed(() => authStore.isSimpleMode)
  const homePath = computed(() => (isAdmin.value ? '/admin/dashboard' : '/dashboard'))

  // ---------------------------------------------------------------- flags
  const flagChannelMonitor = makeSidebarFlag(FeatureFlags.channelMonitor)
  const flagPayment = makeSidebarFlag(FeatureFlags.payment)
  const flagAvailableChannels = makeSidebarFlag(FeatureFlags.availableChannels)
  const flagSubscription = makeSidebarFlag(FeatureFlags.subscription)
  const flagAffiliate = makeSidebarFlag(FeatureFlags.affiliate)
  const flagRiskControl = makeSidebarFlag(FeatureFlags.riskControl)
  const flagPluginManagement = makeSidebarFlag(FeatureFlags.pluginManagement)
  const flagOpsMonitoring = () => adminSettingsStore.opsMonitoringEnabled
  const flagAdminPayment = () => adminSettingsStore.paymentEnabled
  const flagBatchImageAccess = () => canUseBatchImage.value

  const purchaseNavLabel = computed(() => {
    switch (resolveSiteBillingMode(appStore.cachedPublicSettings)) {
      case 'recharge_only':
        return t('nav.recharge')
      case 'subscription_only':
        return t('nav.subscribe')
      default:
        return t('nav.buySubscription')
    }
  })

  // ---------------------------------------------------------------- 自定义菜单
  const customMenuItemsForUser = computed(() => {
    const items = appStore.cachedPublicSettings?.custom_menu_items ?? []
    return items
      .filter((item) => item.visibility === 'user')
      .sort((a, b) => a.sort_order - b.sort_order)
  })

  const customMenuItemsForAdmin = computed(() => {
    return adminSettingsStore.customMenuItems
      .filter((item) => item.visibility === 'admin')
      .sort((a, b) => a.sort_order - b.sort_order)
  })

  function finalize(items: ShellNavItem[]): ShellNavItem[] {
    const visible = applyFeatureFlags(items)
    return isSimpleMode.value ? visible.filter((i) => !i.hideInSimpleMode) : visible
  }

  // ---------------------------------------------------------------- 用户端
  const userSections = computed<ShellNavSection[]>(() => {
    const custom: ShellNavItem[] = customMenuItemsForUser.value.map((item) => ({
      path: `/custom/${item.id}`,
      label: item.label,
      icon: null,
      iconSvg: item.icon_svg,
    }))

    const workspace: ShellNavItem[] = [
      { path: '/dashboard', label: t('nav.dashboard'), icon: 'grid' },
      { path: '/usage', label: t('nav.usage'), icon: 'chartBar', hideInSimpleMode: true },
    ]

    const resources: ShellNavItem[] = [
      { path: '/keys', label: t('nav.apiKeys'), icon: 'key' },
      {
        path: '/batch-image',
        label: t('nav.batchImage'),
        icon: 'grid',
        hideInSimpleMode: true,
        featureFlag: flagBatchImageAccess,
      },
      {
        path: '/available-channels',
        label: t('nav.availableChannels'),
        icon: 'globe',
        hideInSimpleMode: true,
        featureFlag: flagAvailableChannels,
      },
      {
        path: '/monitor',
        label: t('nav.channelStatus'),
        icon: 'bolt',
        featureFlag: flagChannelMonitor,
      },
      { path: '/pelican', label: t('nav.pelican'), icon: 'lightbulb' },
    ]

    const account: ShellNavItem[] = [
      {
        path: '/purchase',
        label: purchaseNavLabel.value,
        icon: 'dollar',
        hideInSimpleMode: true,
        featureFlag: flagPayment,
      },
      {
        path: '/subscriptions',
        label: t('nav.mySubscriptions'),
        icon: 'creditCard',
        hideInSimpleMode: true,
        featureFlag: flagSubscription,
      },
      {
        path: '/orders',
        label: t('nav.myOrders'),
        icon: 'document',
        hideInSimpleMode: true,
        featureFlag: flagPayment,
      },
      { path: '/redeem', label: t('nav.redeem'), icon: 'gift', hideInSimpleMode: true },
      {
        path: '/affiliate',
        label: t('nav.affiliate'),
        icon: 'users',
        hideInSimpleMode: true,
        featureFlag: flagAffiliate,
      },
      { path: '/profile', label: t('nav.profile'), icon: 'user' },
    ]

    const sections: ShellNavSection[] = [
      { key: 'workspace', title: t('nav.sectionWorkspace'), items: finalize(workspace) },
      { key: 'resources', title: t('nav.sectionResources'), items: finalize(resources) },
      { key: 'account', title: t('nav.sectionAccount'), items: finalize(account) },
    ]
    if (custom.length) {
      sections.push({ key: 'custom', title: t('nav.sectionCustom'), items: custom })
    }
    return sections.filter((s) => s.items.length > 0)
  })

  // 管理员「我的账户」区（不含仪表盘）
  const adminPersonalSection = computed<ShellNavSection | null>(() => {
    if (!isAdmin.value || isSimpleMode.value) return null
    const items = finalize([
      { path: '/keys', label: t('nav.apiKeys'), icon: 'key' },
      { path: '/usage', label: t('nav.usage'), icon: 'chartBar', hideInSimpleMode: true },
      {
        path: '/available-channels',
        label: t('nav.availableChannels'),
        icon: 'globe',
        hideInSimpleMode: true,
        featureFlag: flagAvailableChannels,
      },
      {
        path: '/monitor',
        label: t('nav.channelStatus'),
        icon: 'bolt',
        featureFlag: flagChannelMonitor,
      },
      {
        path: '/purchase',
        label: purchaseNavLabel.value,
        icon: 'dollar',
        hideInSimpleMode: true,
        featureFlag: flagPayment,
      },
      {
        path: '/orders',
        label: t('nav.myOrders'),
        icon: 'document',
        hideInSimpleMode: true,
        featureFlag: flagPayment,
      },
      { path: '/redeem', label: t('nav.redeem'), icon: 'gift', hideInSimpleMode: true },
      { path: '/profile', label: t('nav.profile'), icon: 'user' },
    ])
    return items.length ? { key: 'personal', title: t('nav.myAccount'), items } : null
  })

  // ---------------------------------------------------------------- 管理端
  const adminSections = computed<ShellNavSection[]>(() => {
    const custom: ShellNavItem[] = customMenuItemsForAdmin.value.map((item) => ({
      path: `/custom/${item.id}`,
      label: item.label,
      icon: null,
      iconSvg: item.icon_svg,
    }))

    const overview: ShellNavItem[] = [
      { path: '/admin/dashboard', label: t('nav.dashboard'), icon: 'grid' },
      {
        path: '/admin/ops',
        label: t('nav.ops'),
        icon: 'chartBar',
        featureFlag: flagOpsMonitoring,
      },
      { path: '/admin/usage', label: t('nav.usage'), icon: 'trendingUp' },
    ]

    const people: ShellNavItem[] = [
      { path: '/admin/users', label: t('nav.users'), icon: 'users', hideInSimpleMode: true },
      { path: '/admin/groups', label: t('nav.groups'), icon: 'database' },
      {
        path: '/admin/security-audit',
        label: t('nav.securityAudit'),
        icon: 'shield',
        expandOnly: true,
        featureFlag: flagRiskControl,
        children: [
          { path: '/admin/risk-control', label: t('nav.contentModeration'), icon: 'shield' },
          { path: '/admin/prompt-audit', label: t('nav.promptAudit'), icon: 'clipboard' },
        ],
      },
    ]

    const infra: ShellNavItem[] = [
      {
        path: '/admin/channels',
        label: t('nav.channelManagement'),
        icon: 'globe',
        hideInSimpleMode: true,
        expandOnly: true,
        children: [
          { path: '/admin/channels/pricing', label: t('nav.channelPricing'), icon: 'dollar' },
          {
            path: '/admin/channels/monitor',
            label: t('nav.channelMonitor'),
            icon: 'bolt',
            featureFlag: flagChannelMonitor,
          },
        ],
      },
      { path: '/admin/accounts', label: t('nav.accounts'), icon: 'server' },
      { path: '/pelican', label: t('nav.pelican'), icon: 'lightbulb' },
      { path: '/admin/proxies', label: t('nav.proxies'), icon: 'cloud' },
      {
        path: '/admin/plugins',
        label: t('nav.plugins'),
        icon: 'cube',
        featureFlag: flagPluginManagement,
      },
    ]

    const commerce: ShellNavItem[] = [
      {
        path: '/admin/orders',
        label: t('nav.orderManagement'),
        icon: 'document',
        hideInSimpleMode: true,
        expandOnly: true,
        featureFlag: flagAdminPayment,
        children: [
          { path: '/admin/orders/dashboard', label: t('nav.paymentDashboard'), icon: 'chartBar' },
          { path: '/admin/orders', label: t('nav.orderManagement'), icon: 'document' },
          { path: '/admin/orders/plans', label: t('nav.paymentPlans'), icon: 'creditCard' },
        ],
      },
      {
        path: '/admin/subscriptions',
        label: t('nav.subscriptions'),
        icon: 'creditCard',
        hideInSimpleMode: true,
        featureFlag: flagSubscription,
      },
      {
        path: '/admin/redeem',
        label: t('nav.redeemCodes'),
        icon: 'gift',
        hideInSimpleMode: true,
      },
      {
        path: '/admin/promo-codes',
        label: t('nav.promoCodes'),
        icon: 'sparkles',
        hideInSimpleMode: true,
      },
      {
        path: '/admin/affiliates',
        label: t('nav.affiliateManagement'),
        icon: 'users',
        hideInSimpleMode: true,
        expandOnly: true,
        featureFlag: flagAffiliate,
        children: [
          { path: '/admin/affiliates/invites', label: t('nav.affiliateInviteRecords'), icon: 'users' },
          { path: '/admin/affiliates/rebates', label: t('nav.affiliateRebateRecords'), icon: 'dollar' },
          {
            path: '/admin/affiliates/transfers',
            label: t('nav.affiliateTransferRecords'),
            icon: 'creditCard',
          },
        ],
      },
    ]

    const system: ShellNavItem[] = [
      { path: '/admin/announcements', label: t('nav.announcements'), icon: 'bell' },
      {
        path: '/admin/audit-logs',
        label: t('nav.auditLogs'),
        icon: 'clipboard',
        hideInSimpleMode: true,
      },
      { path: '/admin/settings', label: t('nav.settings'), icon: 'cog' },
    ]

    const sections: ShellNavSection[] = [
      { key: 'overview', title: t('nav.sectionOverview'), items: finalize(overview) },
      { key: 'people', title: t('nav.sectionPeople'), items: finalize(people) },
      { key: 'infra', title: t('nav.sectionInfra'), items: finalize(infra) },
      { key: 'commerce', title: t('nav.sectionCommerce'), items: finalize(commerce) },
      { key: 'system', title: t('nav.sectionSystem'), items: finalize(system) },
    ]
    if (custom.length) {
      sections.push({ key: 'custom', title: t('nav.sectionCustom'), items: custom })
    }
    return sections.filter((s) => s.items.length > 0)
  })

  // 简单模式下的管理员导航：保留旧行为（扁平 + 密钥 + 设置 + 自定义）
  const simpleAdminSection = computed<ShellNavSection | null>(() => {
    if (!isAdmin.value || !isSimpleMode.value) return null
    const base: ShellNavItem[] = [
      { path: '/admin/dashboard', label: t('nav.dashboard'), icon: 'grid' },
      {
        path: '/admin/ops',
        label: t('nav.ops'),
        icon: 'chartBar',
        featureFlag: flagOpsMonitoring,
      },
      { path: '/admin/groups', label: t('nav.groups'), icon: 'database' },
      { path: '/admin/accounts', label: t('nav.accounts'), icon: 'server' },
      { path: '/admin/announcements', label: t('nav.announcements'), icon: 'bell' },
      { path: '/admin/proxies', label: t('nav.proxies'), icon: 'cloud' },
      { path: '/admin/usage', label: t('nav.usage'), icon: 'trendingUp' },
      { path: '/keys', label: t('nav.apiKeys'), icon: 'key' },
      { path: '/admin/settings', label: t('nav.settings'), icon: 'cog' },
    ]
    const custom: ShellNavItem[] = customMenuItemsForAdmin.value.map((item) => ({
      path: `/custom/${item.id}`,
      label: item.label,
      icon: null,
      iconSvg: item.icon_svg,
    }))
    return { key: 'simple', items: [...finalize(base), ...custom] }
  })

  const sections = computed<ShellNavSection[]>(() => {
    if (isAdmin.value) {
      if (isSimpleMode.value) {
        const s = simpleAdminSection.value
        return s ? [s] : []
      }
      const list = [...adminSections.value]
      const personal = adminPersonalSection.value
      if (personal) list.push(personal)
      return list
    }
    return userSections.value
  })

  // ---------------------------------------------------------------- 交互
  const groupExpandOverrides = ref<Map<string, boolean>>(new Map())

  function isActive(path: string): boolean {
    return route.path === path || route.path.startsWith(`${path}/`)
  }

  function isGroupActive(item: ShellNavItem): boolean {
    if (!item.children) return false
    return item.children.some((child) => route.path === child.path)
  }

  function isGroupExpanded(item: ShellNavItem): boolean {
    const override = groupExpandOverrides.value.get(item.path)
    if (override !== undefined) return override
    return isGroupActive(item)
  }

  function toggleGroup(item: ShellNavItem) {
    groupExpandOverrides.value.set(item.path, !isGroupExpanded(item))
  }

  function handleGroupClick(item: ShellNavItem) {
    if (item.expandOnly) {
      toggleGroup(item)
      return
    }
    if (route.path !== item.path) void router.push(item.path)
    groupExpandOverrides.value.set(item.path, true)
  }

  function handleMenuItemClick(itemPath: string) {
    if (appStore.mobileOpen) {
      setTimeout(() => appStore.setMobileOpen(false), 150)
    }
    const pathToSelector: Record<string, string> = {
      '/admin/groups': '#sidebar-group-manage',
      '/admin/accounts': '#sidebar-channel-manage',
      '/keys': '[data-tour="sidebar-my-keys"]',
    }
    const selector = pathToSelector[itemPath]
    if (selector && onboardingStore.isCurrentStep(selector)) {
      onboardingStore.nextStep(500)
    }
  }

  // 管理员设置（用于 Ops / 支付等 feature gate）
  watch(
    isAdmin,
    (v) => {
      if (v) void adminSettingsStore.fetch()
    },
    { immediate: true }
  )

  return {
    sections,
    homePath,
    isAdmin,
    isSimpleMode,
    isActive,
    isGroupActive,
    isGroupExpanded,
    handleGroupClick,
    handleMenuItemClick,
  }
}
