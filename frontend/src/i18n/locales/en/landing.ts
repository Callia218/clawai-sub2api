export default {
  batchImageGuide: {
    title: 'Batch Image Generation',
    description: 'Submit multiple prompts in one job and download the generated images when complete'
  },
  // Home Page
  home: {
    showcase: {
      skip: 'Skip to content', navigation: 'Main navigation', overview: 'Overview',
      navConnection: 'Connect', navCapabilities: 'Capabilities', navStart: 'Get started', navQuestions: 'FAQ',
      ribbon: 'A familiar API. A fresh perspective.', explore: 'Explore the connection',
      hero1: 'Great ideas.', hero2: 'Connected.',
      lede: 'One place for your AI tools. Less friction between inspiration and what comes next.',
      models: 'Explore models', learnMore: 'Learn more',
      visualLabel: 'An API chip surrounded by orbital lines, representing a unified connection',
      visualCaption: 'One endpoint · Multiple protocols',
      connectionLabel: 'Easy to connect.', connection1: 'Familiar code.', connection2: 'New possibilities.',
      connectionDesc: 'Keep the SDK you know. Set your endpoint and key, choose an available model, and focus on what you want to build.',
      createKey: 'Create your API key', codeNote: 'Example only. Replace the key and model name with actual values from your console.',
      choiceLabel: 'For every kind of idea', choice1: 'More ways to think.', choice2: 'More ways to create.',
      choiceDesc: 'Chat, write, code and reason. Choose a model for the task. Availability is shown in your console.',
      think: 'Think deeper.', write: 'Write naturally.', build: 'Build better.',
      controlLabel: 'Every call, accounted for', control1: 'Explore freely.', control2: 'Stay in control.',
      controlDesc: 'Manage keys and review request history in one place. A clearer picture of how you use AI.',
      keyCaption: 'API keys · Usage history · Quotas',
      startTitle: 'A simple place to start.',
      step1Title: 'Enter your workspace', step1Desc: 'Sign in to see available models and your account balance.',
      step2Title: 'Create an API key', step2Desc: 'Make a key for your app and configure access and usage limits.',
      step3Title: 'Connect your app', step3Desc: 'Set the endpoint, key and model name. Make your first request.',
      faq1Q: 'Can I use my existing client?', faq1A: 'Clients that support custom API endpoints can usually connect. Match the protocol supported by your model and set the corresponding endpoint, key and model name.',
      faq2Q: 'Where can I see models and usage?', faq2A: 'Check the model plaza or console for available models. Sign in to review request history, token usage and costs.',
      faq3Q: 'What if a request fails or is rate limited?', faq3A: 'Upstream services may enforce concurrency limits. Retry later, reduce concurrency or choose another available model. Check the response and request history for details.',
      endTitle: 'Your next idea starts here.', endDesc: 'We make the connection. You make what comes next.',
      footerNote: 'AI, connected.', backTop: 'Back to top'
    },
    // CF_V2_I18N
    v2: {
      badge: 'Usage-based AI API gateway',
      heroAccent: 'every major model',
      lede: 'Call GPT and DeepSeek with one key, compatible with both OpenAI and Anthropic protocols. Pay per token, check your balance anytime, top up with Alipay.',
      ctaSecondary: 'Models & pricing',
      factRateLabel: 'Top-up rate',
      factBillingLabel: 'Billing',
      factBillingValue: 'Per token',
      factPaymentLabel: 'Payment',
      factPaymentValue: 'Alipay',
      codeTitle: 'Quick start',
      codeTag: 'OpenAI SDK compatible',
      codeFoot: 'Point CLAW_BASE at your site address. No client code changes needed.',
      stepsTitle: 'Three steps to start',
      stepsSub: 'From sign-up to your first successful call usually takes under two minutes.',
      step1Title: 'Sign up and top up',
      step1Desc: 'Scan with Alipay, starting from 2 CNY. Pay for what you use, no bundled plan.',
      step2Title: 'Create an API key',
      step2Desc: 'Generate one on the API Keys page. Revoke it or cap its quota at any time.',
      step3Title: 'Swap the base URL',
      step3Desc: 'Point your existing base_url here. Every other parameter stays the same.',
      modelsTitle: 'Available models',
      modelsMore: 'All models',
      modelProtocol: 'Protocol',
      modelPricing: 'Pricing',
      modelPricingValue: 'Official price × rate',
      modelTerraDesc: 'Flagship reasoning model for complex and long-horizon tasks.',
      modelLunaDesc: 'Lighter variant with faster responses for high-frequency chat and batch jobs.',
      modelDeepseekDesc: 'Very low latency with solid Chinese performance for domestic workloads.',
      modelClaudeDesc: 'Anthropic protocol bridge. Claude clients can connect directly.',
      modelsNote: 'Model list and multipliers follow upstream changes. See the model plaza for live pricing.',
      rechargeTitle: 'Top-up tiers',
      rechargeDesc: 'Top up as needed, no bundled plan, balance does not expire.',
      rechargePoint1: 'Direct Alipay payment, credited instantly',
      rechargePoint2: '1 CNY equals 1 USD of credit, no hidden FX spread',
      rechargePoint3: 'Order and balance history always available',
      capsTitle: 'Why here',
      cap1Title: 'One key',
      cap1Desc: 'No separate accounts per model. Switching models is a single parameter change.',
      cap2Title: 'Channel failover',
      cap2Desc: 'Requests reroute automatically when an upstream is rate limited or failing.',
      cap3Title: 'Visible usage',
      cap3Desc: 'Token counts and cost broken down by key, model and day.',
      cap4Title: 'Capped spend',
      cap4Desc: 'Set an individual quota per key so nothing overruns unexpectedly.',
      faqTitle: 'FAQ',
      faq1Q: 'How is this different from an official subscription?',
      faq1A: 'Official plans are a fixed monthly fee. Here you pay for actual token usage, so light usage costs less and heavy usage has no plan ceiling.',
      faq2Q: 'Does the balance expire?',
      faq2A: 'No. Credit stays on your account indefinitely until used.',
      faq3Q: 'Which clients are supported?',
      faq3A: 'Any client compatible with the OpenAI or Anthropic protocol works. Just replace the base_url and API key.',
      faq4Q: 'Where can I see what I was charged?',
      faq4A: 'The usage page filters by key, model and time range, with token counts and cost for every call.',
      endTitle: 'Ready when you are',
      endDesc: 'Top up 2 CNY after signing up and make your first call. No extra application needed.',
      endCta: 'Sign up free',
      footerNote: 'Usage-based · Alipay'
    },

    viewDocs: 'View Documentation',
    docs: 'Docs',
    switchToLight: 'Switch to Light Mode',
    switchToDark: 'Switch to Dark Mode',
    dashboard: 'Dashboard',
    login: 'Login',
    getStarted: 'Get Started',
    goToDashboard: 'Go to Dashboard',
    // User-focused value proposition
    heroSubtitle: 'One Key, All AI Models',
    heroDescription: 'No need to manage multiple subscriptions. Access Claude, GPT, Gemini and more with a single API key',
    tags: {
      subscriptionToApi: 'Subscription to API',
      stickySession: 'Session Persistence',
      realtimeBilling: 'Pay As You Go'
    },
    // Pain points section
    painPoints: {
      title: 'Sound Familiar?',
      items: {
        expensive: {
          title: 'High Subscription Costs',
          desc: 'Paying for multiple AI subscriptions that add up every month'
        },
        complex: {
          title: 'Account Chaos',
          desc: 'Managing scattered accounts and API keys across different platforms'
        },
        unstable: {
          title: 'Service Interruptions',
          desc: 'Single accounts hitting rate limits and disrupting your workflow'
        },
        noControl: {
          title: 'No Usage Control',
          desc: "Can't track where your money goes or limit team member usage"
        }
      }
    },
    // Solutions section
    solutions: {
      title: 'We Solve These Problems',
      subtitle: 'Three simple steps to stress-free AI access'
    },
    features: {
      unifiedGateway: 'One-Click Access',
      unifiedGatewayDesc: 'Get a single API key to call all connected AI models. No separate applications needed.',
      multiAccount: 'Always Reliable',
      multiAccountDesc: 'Smart routing across multiple upstream accounts with automatic failover. Say goodbye to errors.',
      balanceQuota: 'Pay What You Use',
      balanceQuotaDesc: 'Usage-based billing with quota limits. Full visibility into team consumption.'
    },
    // Comparison section
    comparison: {
      title: 'Why Choose Us?',
      headers: {
        feature: 'Comparison',
        official: 'Official Subscriptions',
        us: 'Our Platform'
      },
      items: {
        pricing: {
          feature: 'Pricing',
          official: 'Fixed monthly fee, pay even if unused',
          us: 'Pay only for what you use'
        },
        models: {
          feature: 'Model Selection',
          official: 'Single provider only',
          us: 'Switch between models freely'
        },
        management: {
          feature: 'Account Management',
          official: 'Manage each service separately',
          us: 'Unified key, one dashboard'
        },
        stability: {
          feature: 'Stability',
          official: 'Single account rate limits',
          us: 'Multi-account pool, auto-failover'
        },
        control: {
          feature: 'Usage Control',
          official: 'Not available',
          us: 'Quotas & detailed analytics'
        }
      }
    },
    providers: {
      title: 'Supported AI Models',
      description: 'One API, Multiple Choices',
      supported: 'Supported',
      soon: 'Soon',
      claude: 'Claude',
      gemini: 'Gemini',
      antigravity: 'Antigravity',
      more: 'More'
    },
    // CTA section
    cta: {
      title: 'Ready to Get Started?',
      description: 'Sign up now and get free trial credits to experience seamless AI access',
      button: 'Sign Up Free'
    },
    footer: {
      allRightsReserved: 'All rights reserved.'
    }
  },

  // Key Usage Query Page
  keyUsage: {
    title: 'API Key Usage',
    subtitle: 'Enter your API Key to view real-time spending and usage status',
    placeholder: 'sk-ant-mirror-xxxxxxxxxxxx',
    query: 'Query',
    querying: 'Querying...',
    privacyNote: 'Your Key is processed locally in the browser and will not be stored',
    dateRange: 'Date Range:',
    dateRangeToday: 'Today',
    dateRange7d: '7 Days',
    dateRange30d: '30 Days',
    dateRange90d: '90 Days',
    dateRangeCustom: 'Custom',
    apply: 'Apply',
    used: 'Used',
    detailInfo: 'Detail Information',
    tokenStats: 'Token Statistics',
    dailyDetail: 'Daily Detail',
    modelStats: 'Model Usage Statistics',
    // Table headers
    date: 'Date',
    model: 'Model',
    requests: 'Requests',
    inputTokens: 'Input Tokens',
    outputTokens: 'Output Tokens',
    cacheCreationTokens: 'Cache Creation',
    cacheReadTokens: 'Cache Read',
    cacheWriteTokens: 'Cache Write',
    totalTokens: 'Total Tokens',
    cost: 'Cost',
    // Status
    quotaMode: 'Key Quota Mode',
    walletBalance: 'Wallet Balance',
    // Ring card titles
    totalQuota: 'Total Quota',
    limit5h: '5-Hour Limit',
    limitDaily: 'Daily Limit',
    limit7d: '7-Day Limit',
    limitWeekly: 'Weekly Limit',
    limitMonthly: 'Monthly Limit',
    // Detail rows
    remainingQuota: 'Remaining Quota',
    expiresAt: 'Expires At',
    todayExpires: '(expires today)',
    daysLeft: '({days} days)',
    usedQuota: 'Used Quota',
    resetNow: 'Resetting soon',
    subscriptionType: 'Subscription Type',
    billingType: 'Billing Type',
    subscriptionExpires: 'Subscription Expires',
    // Usage stat cells
    todayRequests: 'Today Requests',
    todayInputTokens: 'Today Input',
    todayOutputTokens: 'Today Output',
    todayTokens: 'Today Tokens',
    todayCacheCreation: 'Today Cache Creation',
    todayCacheRead: 'Today Cache Read',
    todayCost: 'Today Cost',
    rpmTpm: 'RPM / TPM',
    totalRequests: 'Total Requests',
    totalInputTokens: 'Total Input',
    totalOutputTokens: 'Total Output',
    totalTokensLabel: 'Total Tokens',
    totalCacheCreation: 'Total Cache Creation',
    totalCacheRead: 'Total Cache Read',
    totalCost: 'Total Cost',
    avgDuration: 'Avg Duration',
    // Messages
    enterApiKey: 'Please enter an API Key',
    querySuccess: 'Query successful',
    queryFailed: 'Query failed',
    queryFailedRetry: 'Query failed, please try again later',
    noDailyUsage: 'No daily usage data',
  },

  // Setup Wizard
  setup: {
    title: 'Sub2API Setup',
    description: 'Configure your Sub2API instance',
    database: {
      title: 'Database Configuration',
      description: 'Connect to your PostgreSQL database',
      host: 'Host',
      port: 'Port',
      username: 'Username',
      password: 'Password',
      databaseName: 'Database Name',
      sslMode: 'SSL Mode',
      passwordPlaceholder: 'Password',
      ssl: {
        disable: 'Disable',
        require: 'Require',
        verifyCa: 'Verify CA',
        verifyFull: 'Verify Full'
      }
    },
    redis: {
      title: 'Redis Configuration',
      description: 'Connect to your Redis server',
      host: 'Host',
      port: 'Port',
      username: 'Username (optional)',
      password: 'Password (optional)',
      database: 'Database',
      usernamePlaceholder: 'Leave empty for default user',
      passwordPlaceholder: 'Password',
      enableTls: 'Enable TLS',
      enableTlsHint: 'Use TLS when connecting to Redis (public CA certs)'
    },
    admin: {
      title: 'Admin Account',
      description: 'Create your administrator account',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      passwordPlaceholder: 'Min 8 characters',
      confirmPasswordPlaceholder: 'Confirm password',
      passwordMismatch: 'Passwords do not match'
    },
    ready: {
      title: 'Ready to Install',
      description: 'Review your configuration and complete setup',
      database: 'Database',
      redis: 'Redis',
      adminEmail: 'Admin Email'
    },
    status: {
      testing: 'Testing...',
      success: 'Connection Successful',
      testConnection: 'Test Connection',
      installing: 'Installing...',
      completeInstallation: 'Complete Installation',
      completed: 'Installation completed!',
      redirecting: 'Redirecting to login page...',
      restarting: 'Service is restarting, please wait...',
      timeout: 'Service restart is taking longer than expected. Please refresh the page manually.'
    }
  },

  // Common
}
