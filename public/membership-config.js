(() => {
  'use strict';

  window.HaoAccountConfig = Object.freeze({
    enabled: true,
    billingEnabled: true,
    appName: 'Newsflow',
    productCode: 'newsflow',
    entitlementCode: 'newsflow.pro',
    supabaseUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co',
    supabasePublishableKey: 'sb_publishable_n1Va-c_alpkQ0zNuJYUaxA_J0u68RVW',
    checkoutFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-checkout-session',
    portalFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-portal-session',
    redirectUrl: 'https://liuh886.github.io/NewsFlow/',
    mountSelectors: ['.top-actions'],
    compactTrigger: true,
    title: {
      zh: 'Newsflow 账户',
      en: 'Newsflow account',
    },
    description: {
      zh: 'Newsflow 阅读始终免费。登录用于参与编辑、保存个人评议记录，以及管理 Newsflow Pro。',
      en: 'Reading Newsflow always stays free. Sign in to participate in editorial work, keep your review history, and manage Newsflow Pro.',
    },
    privacyNote: {
      zh: '公开刊物与阅读功能始终开放；Pro 用于解锁编辑工作区与个人评议记录。',
      en: 'Published editions and reading remain open; Pro unlocks the editorial workspace and your review history.',
    },
    proUpgrade: {
      title: { zh: 'Free 与 Newsflow Pro', en: 'Free and Newsflow Pro' },
      freeTitle: { zh: '阅读始终开放', en: 'Reading always stays open' },
      freeFeatures: [
        { zh: '阅读每期正式刊物、公开信号流与专题', en: 'Read every published edition, public signal feed, and special topic' },
      ],
      proTitle: { zh: 'Newsflow Pro', en: 'Newsflow Pro' },
      proFeatures: [
        { zh: '进入编辑台，对候选稿件提交接受、小修、大修或拒稿等评议', en: 'Enter the editorial desk and submit Accept, Minor Revision, Major Revision, or Reject reviews' },
        { zh: '查看自己的评议记录与编辑决策档案', en: 'Review your editorial history and decision archive' },
      ],
      note: {
        zh: '受邀编辑可以获得限时 Newsflow Pro 免费体验；免费期同样可以管理订阅。',
        en: 'Invited editors can receive a limited Newsflow Pro free trial, with subscription management available during the trial.',
      },
      checkoutDescription: {
        zh: 'US$1/月开通 Newsflow Pro，进入编辑台提交评议并查看自己的编辑决策档案；正式刊物阅读仍永久免费。',
        en: 'Newsflow Pro is US$1/month and unlocks the editorial desk, review submission, and your editorial decision archive. Published reading remains free.',
      },
      ctaTitle: { zh: '开通 Newsflow Pro', en: 'Upgrade to Newsflow Pro' },
    },
    feedbackEnabled: true,
    feedbackTitle: { zh: '给主编的反馈', en: 'Feedback for the editor' },
    feedbackPrompt: {
      zh: '告诉我们哪些内容有帮助、哪里需要改进。',
      en: 'Tell us what helped and what should improve.',
    },
  });
})();
