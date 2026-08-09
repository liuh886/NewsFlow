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
      zh: '公开 Edition、信号流与 GitHub 出版流程保持开放；Pro 只控制编辑工作区访问，不改变正式事实记录。',
      en: 'Public editions, signal feeds, and the GitHub publishing workflow remain open. Pro controls editorial workspace access only and never alters the factual record.',
    },
    proUpgrade: {
      title: { zh: 'Free 与 Newsflow Pro', en: 'Free and Newsflow Pro' },
      freeTitle: { zh: '阅读始终开放', en: 'Reading always stays open' },
      freeFeatures: [
        { zh: '阅读每期正式刊物、公开信号流与专题', en: 'Read every published edition, public signal feed, and special topic' },
      ],
      proTitle: { zh: '参与编辑工作流', en: 'Join the editorial workflow' },
      proFeatures: [
        { zh: '进入编辑台，对候选稿件提交接受、小修、大修或拒稿等评议', en: 'Enter the editorial desk and submit Accept, Minor Revision, Major Revision, or Reject reviews' },
        { zh: '查看自己的评议记录与编辑决策档案', en: 'Review your editorial history and decision archive' },
      ],
      note: {
        zh: '受邀编辑可通过主编邀请链接获得 3 个月 Newsflow Pro 免费体验。免费期也是可管理的 Stripe 订阅；最终出版决定仍由主编完成。',
        en: 'Invited editors can receive a three-month Newsflow Pro free trial. The free period is still a manageable Stripe subscription; final publication decisions remain with the Editor-in-Chief.',
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
      zh: '反馈会进入私有运营台，不会自动成为正式 Issue 内容。',
      en: 'Feedback enters the private operations console and never becomes formal Issue content automatically.',
    },
  });
})();
