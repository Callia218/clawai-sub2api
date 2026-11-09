export default {
  batchImageGuide: {
    title: '图片批量生成',
    description: '一次提交多条提示词，任务完成后可统一下载图片结果'
  },
  // Home Page
  home: {
    showcase: {
      skip: '跳到主要内容', navigation: '主导航', overview: '概览',
      navConnection: '接入方式', navCapabilities: '能力', navStart: '快速开始', navQuestions: '常见问题',
      ribbon: '熟悉的 API，全新的使用体验。', explore: '探索接入方式',
      hero1: '好想法，', hero2: '即刻连接。',
      lede: '一个入口，连接多种 AI 能力。让灵感少些等待，让创造自然发生。',
      models: '探索模型', learnMore: '进一步了解',
      visualLabel: '以 API 芯片与环形轨道表现统一接入的品牌概念图',
      visualCaption: '统一入口 · 多种协议',
      connectionLabel: '接入，轻而易举。', connection1: '熟悉的代码。', connection2: '更多的可能。',
      connectionDesc: '继续使用熟悉的 SDK。设置接口地址和密钥，选择可用模型，把注意力留给真正想做的事。',
      createKey: '创建你的 API 密钥', codeNote: '接入示例。请将密钥和模型名称替换为控制台中的实际值。',
      choiceLabel: '为每一种想法', choice1: '不止一种模型。', choice2: '不止一种可能。',
      choiceDesc: '对话、写作、代码与推理。按任务选择模型，可用范围以控制台为准。',
      think: '想得深入。', write: '写得自然。', build: '做得出色。',
      controlLabel: '每一次调用，都心中有数', control1: '尽情探索。', control2: '掌握用量。',
      controlDesc: '从密钥管理到调用明细，在同一个地方查看与管理。清晰，才更从容。',
      keyCaption: '密钥管理 · 用量明细 · 额度设置',
      startTitle: '开始，比想象中简单。',
      step1Title: '进入你的空间', step1Desc: '登录账户，在控制台查看可用模型与账户额度。',
      step2Title: '创建专属密钥', step2Desc: '为应用创建 API 密钥，按需设置访问范围与用量限制。',
      step3Title: '连接你的应用', step3Desc: '填写接口地址、密钥与模型名称，开始第一次调用。',
      faq1Q: '可以使用现有的客户端吗？', faq1A: '支持配置自定义 API 地址的客户端通常可以接入。请匹配模型所支持的协议，并填写对应的接口地址、密钥和模型名称。',
      faq2Q: '在哪里查看模型与用量？', faq2A: '可用模型以模型广场或控制台显示为准。登录后可查看调用记录、token 用量与费用明细。',
      faq3Q: '遇到限流或调用失败怎么办？', faq3A: '上游服务可能存在并发限制。可稍后重试、降低并发，或在可用范围内更换模型；具体原因请查看返回信息与调用记录。',
      endTitle: '下一个好想法，从这里开始。', endDesc: '把连接交给 API，把创造留给你。',
      footerNote: 'AI 能力，统一连接。', backTop: '回到顶部'
    },
    // CF_V2_I18N
    v2: {
      badge: '按量计费的 AI API 网关',
      heroAccent: '接上所有主流模型',
      lede: '一个密钥调用 GPT 与 DeepSeek，兼容 OpenAI 与 Anthropic 协议。按 token 计费，余额随时可查，支付宝直接充值。',
      ctaSecondary: '查看模型与价格',
      factRateLabel: '充值比例',
      factBillingLabel: '结算方式',
      factBillingValue: '按 token',
      factPaymentLabel: '支付方式',
      factPaymentValue: '支付宝',
      codeTitle: '接入示例',
      codeTag: 'OpenAI SDK 兼容',
      codeFoot: '把 CLAW_BASE 指向你的站点地址即可，客户端代码无需改动。',
      stepsTitle: '三步开始用',
      stepsSub: '从注册到第一次成功调用，通常不超过两分钟。',
      step1Title: '注册并充值',
      step1Desc: '支持支付宝扫码，2 元起充。充多少用多少，不绑定套餐。',
      step2Title: '创建 API 密钥',
      step2Desc: '在控制台「API 密钥」页生成，可随时吊销或设置额度上限。',
      step3Title: '替换 Base URL',
      step3Desc: '把现有客户端里的 base_url 指向本站，其余参数保持不变。',
      modelsTitle: '在架模型',
      modelsMore: '查看全部模型',
      modelProtocol: '协议',
      modelPricing: '计费',
      modelPricingValue: '官方价 × 倍率',
      modelTerraDesc: '旗舰推理模型，适合复杂任务与长链路思考。',
      modelLunaDesc: '轻量版本，响应更快，适合高频对话与批处理。',
      modelDeepseekDesc: '超低延迟，中文表现稳定，适合国内业务场景。',
      modelClaudeDesc: 'Anthropic 协议桥接，Claude 客户端可直接接入。',
      modelsNote: '模型清单与倍率会随上游调整，实时价格以模型广场为准。',
      rechargeTitle: '充值档位',
      rechargeDesc: '按需充值，不绑定套餐，余额长期有效。',
      rechargePoint1: '支付宝直付，到账即时',
      rechargePoint2: '¥1 对应 $1 额度，无隐藏汇率',
      rechargePoint3: '订单与余额明细随时可查',
      capsTitle: '为什么选这里',
      cap1Title: '一个密钥',
      cap1Desc: '不用为每个模型单独申请账号，换模型只改一个参数。',
      cap2Title: '通道容灾',
      cap2Desc: '上游限流或异常时自动切换，请求不会直接失败。',
      cap3Title: '用量可查',
      cap3Desc: '按密钥、按模型、按天统计 token 与费用。',
      cap4Title: '额度可控',
      cap4Desc: '给每个密钥单独设上限，避免意外超支。',
      faqTitle: '常见问题',
      faq1Q: '和官方订阅有什么区别？',
      faq1A: '官方是固定月费，这里是按实际 token 用量结算。用得少就更省，用得多也没有套餐天花板。',
      faq2Q: '余额会过期吗？',
      faq2A: '不会。充值后的额度长期有效，未用完的部分一直保留在账户里。',
      faq3Q: '支持哪些客户端？',
      faq3A: '任何兼容 OpenAI 或 Anthropic 协议的客户端都能直接接入，只需替换 base_url 与 API Key。',
      faq4Q: '如何查看实际扣费？',
      faq4A: '控制台用量页可按密钥、模型、时间范围筛选，每一笔调用都有 token 数与费用明细。',
      endTitle: '现在就可以开始',
      endDesc: '注册后充值 2 元即可完成第一次调用，无需额外申请。',
      endCta: '免费注册',
      footerNote: '按量计费 · 支付宝直付'
    },

    viewDocs: '查看文档',
    docs: '文档',
    switchToLight: '切换到浅色模式',
    switchToDark: '切换到深色模式',
    dashboard: '控制台',
    login: '登录',
    getStarted: '立即开始',
    goToDashboard: '进入控制台',
    // 新增：面向用户的价值主张
    heroSubtitle: '一个密钥，畅用多个 AI 模型',
    heroDescription: '无需管理多个订阅账号，一站式接入 Claude、GPT、Gemini 等主流 AI 服务',
    tags: {
      subscriptionToApi: '订阅转 API',
      stickySession: '会话保持',
      realtimeBilling: '按量计费'
    },
    // 用户痛点区块
    painPoints: {
      title: '你是否也遇到这些问题？',
      items: {
        expensive: {
          title: '订阅费用高',
          desc: '每个 AI 服务都要单独订阅，每月支出越来越多'
        },
        complex: {
          title: '多账号难管理',
          desc: '不同平台的账号、密钥分散各处，管理起来很麻烦'
        },
        unstable: {
          title: '服务不稳定',
          desc: '单一账号容易触发限制，影响正常使用'
        },
        noControl: {
          title: '用量无法控制',
          desc: '不知道钱花在哪了，也无法限制团队成员的使用'
        }
      }
    },
    // 解决方案区块
    solutions: {
      title: '我们帮你解决',
      subtitle: '简单三步，开始省心使用 AI'
    },
    features: {
      unifiedGateway: '一键接入',
      unifiedGatewayDesc: '获取一个 API 密钥，即可调用所有已接入的 AI 模型，无需分别申请。',
      multiAccount: '稳定可靠',
      multiAccountDesc: '智能调度多个上游账号，自动切换和负载均衡，告别频繁报错。',
      balanceQuota: '用多少付多少',
      balanceQuotaDesc: '按实际使用量计费，支持设置配额上限，团队用量一目了然。'
    },
    // 优势对比
    comparison: {
      title: '为什么选择我们？',
      headers: {
        feature: '对比项',
        official: '官方订阅',
        us: '本平台'
      },
      items: {
        pricing: {
          feature: '付费方式',
          official: '固定月费，用不完也付',
          us: '按量付费，用多少付多少'
        },
        models: {
          feature: '模型选择',
          official: '单一服务商',
          us: '多模型随意切换'
        },
        management: {
          feature: '账号管理',
          official: '每个服务单独管理',
          us: '统一密钥，一站管理'
        },
        stability: {
          feature: '服务稳定性',
          official: '单账号易触发限制',
          us: '多账号池，自动切换'
        },
        control: {
          feature: '用量控制',
          official: '无法限制',
          us: '可设配额、查明细'
        }
      }
    },
    providers: {
      title: '已支持的 AI 模型',
      description: '一个 API，多种选择',
      supported: '已支持',
      soon: '即将推出',
      claude: 'Claude',
      gemini: 'Gemini',
      antigravity: 'Antigravity',
      more: '更多'
    },
    // CTA 区块
    cta: {
      title: '准备好开始了吗？',
      description: '注册即可获得免费试用额度，体验一站式 AI 服务',
      button: '免费注册'
    },
    footer: {
      allRightsReserved: '保留所有权利。'
    }
  },

  // Key Usage Query Page
  keyUsage: {
    title: 'API Key 用量查询',
    subtitle: '输入您的 API Key 以查看实时消费金额与使用状态',
    placeholder: 'sk-ant-mirror-xxxxxxxxxxxx',
    query: '查询',
    querying: '查询中...',
    privacyNote: '您的 Key 仅在浏览器本地处理，不会被存储',
    dateRange: '统计范围:',
    dateRangeToday: '今日',
    dateRange7d: '7 天',
    dateRange30d: '30 天',
    dateRange90d: '90 天',
    dateRangeCustom: '自定义',
    apply: '应用',
    used: '已使用',
    detailInfo: '详细信息',
    tokenStats: 'Token 统计',
    dailyDetail: '按日明细',
    modelStats: '模型用量统计',
    // Table headers
    date: '日期',
    model: '模型',
    requests: '请求数',
    inputTokens: '输入 Tokens',
    outputTokens: '输出 Tokens',
    cacheCreationTokens: '缓存创建',
    cacheReadTokens: '缓存读取',
    cacheWriteTokens: '缓存写入',
    totalTokens: '总 Tokens',
    cost: '费用',
    // Status
    quotaMode: 'Key 限额模式',
    walletBalance: '钱包余额',
    // Ring card titles
    totalQuota: '总额度',
    limit5h: '5 小时限额',
    limitDaily: '日限额',
    limit7d: '7 天限额',
    limitWeekly: '周限额',
    limitMonthly: '月限额',
    // Detail rows
    remainingQuota: '剩余额度',
    expiresAt: '过期时间',
    todayExpires: '(今日到期)',
    daysLeft: '({days} 天)',
    usedQuota: '已用额度',
    resetNow: '即将重置',
    subscriptionType: '订阅类型',
    billingType: '计费方式',
    subscriptionExpires: '订阅到期',
    // Usage stat cells
    todayRequests: '今日请求',
    todayInputTokens: '今日输入',
    todayOutputTokens: '今日输出',
    todayTokens: '今日 Tokens',
    todayCacheCreation: '今日缓存创建',
    todayCacheRead: '今日缓存读取',
    todayCost: '今日费用',
    rpmTpm: 'RPM / TPM',
    totalRequests: '累计请求',
    totalInputTokens: '累计输入',
    totalOutputTokens: '累计输出',
    totalTokensLabel: '累计 Tokens',
    totalCacheCreation: '累计缓存创建',
    totalCacheRead: '累计缓存读取',
    totalCost: '累计费用',
    avgDuration: '平均耗时',
    // Messages
    enterApiKey: '请输入 API Key',
    querySuccess: '查询成功',
    queryFailed: '查询失败',
    queryFailedRetry: '查询失败，请稍后重试',
    noDailyUsage: '暂无按日用量数据',
  },

  // Setup Wizard
  setup: {
    title: 'Sub2API 安装向导',
    description: '配置您的 Sub2API 实例',
    database: {
      title: '数据库配置',
      description: '连接到您的 PostgreSQL 数据库',
      host: '主机',
      port: '端口',
      username: '用户名',
      password: '密码',
      databaseName: '数据库名称',
      sslMode: 'SSL 模式',
      passwordPlaceholder: '密码',
      ssl: {
        disable: '禁用',
        require: '要求',
        verifyCa: '验证 CA',
        verifyFull: '完全验证'
      }
    },
    redis: {
      title: 'Redis 配置',
      description: '连接到您的 Redis 服务器',
      host: '主机',
      port: '端口',
      username: '用户名（可选）',
      password: '密码（可选）',
      database: '数据库',
      usernamePlaceholder: '默认用户留空',
      passwordPlaceholder: '密码',
      enableTls: '启用 TLS',
      enableTlsHint: '连接 Redis 时使用 TLS（公共 CA 证书）'
    },
    admin: {
      title: '管理员账户',
      description: '创建您的管理员账户',
      email: '邮箱',
      password: '密码',
      confirmPassword: '确认密码',
      passwordPlaceholder: '至少 8 个字符',
      confirmPasswordPlaceholder: '确认密码',
      passwordMismatch: '密码不匹配'
    },
    ready: {
      title: '准备安装',
      description: '检查您的配置并完成安装',
      database: '数据库',
      redis: 'Redis',
      adminEmail: '管理员邮箱'
    },
    status: {
      testing: '测试中...',
      success: '连接成功',
      testConnection: '测试连接',
      installing: '安装中...',
      completeInstallation: '完成安装',
      completed: '安装完成！',
      redirecting: '正在跳转到登录页面...',
      restarting: '服务正在重启，请稍候...',
      timeout: '服务重启时间超出预期，请手动刷新页面。'
    }
  },

  // Common
}
