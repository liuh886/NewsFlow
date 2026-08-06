(() => {
  'use strict';

  window.HaoAccountConfig = Object.freeze({
    enabled: true,
    billingEnabled: false,
    appName: 'NewsFlow',
    productCode: 'newsflow',
    entitlementCode: 'newsflow.pro',
    supabaseUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co',
    supabasePublishableKey: 'sb_publishable_n1Va-c_alpkQ0zNuJYUaxA_J0u68RVW',
    checkoutFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-checkout-session',
    portalFunctionUrl: 'https://blgwlycfcwvsupmqyqwn.supabase.co/functions/v1/create-portal-session',
    redirectUrl: 'https://liuh886.github.io/NewsFlow/',
    mountSelectors: ['.top-actions', '.topbar-actions', '.masthead-actions', 'header nav', 'header'],
    compactTrigger: true,
    title: {
      zh: 'NewsFlow 账户',
      en: 'NewsFlow account',
    },
    description: {
      zh: '登录用于收集你的反馈、保存轻量偏好，并为未来的个性化 Edition 与高级阅读能力建立统一身份。',
      en: 'Sign in to send feedback, keep lightweight preferences, and establish one identity for future personalized editions and advanced reading tools.',
    },
    privacyNote: {
      zh: '公开 Edition、信号流与 GitHub 出版流程保持开放；账户不会改变主编制和现有阅读权限。',
      en: 'Public editions, signal feeds, and the GitHub publishing workflow remain open. An account does not change editorial control or current reading access.',
    },
    features: [
      { zh: '提交内容反馈、问题与选题建议', en: 'Send content feedback, bug reports, and topic ideas' },
      { zh: '未来保存主题、阅读与 Edition 偏好', en: 'Prepare for future topic, reading, and edition preferences' },
      { zh: '与其他 Hao Apps 共用同一登录身份', en: 'Use the same identity across Hao Apps' },
    ],
    feedbackEnabled: true,
    feedbackTitle: { zh: '给主编的反馈', en: 'Feedback for the editor' },
    feedbackPrompt: {
      zh: '反馈会进入私有运营台，不会公开显示在 Edition 中。',
      en: 'Feedback enters the private operations console and is not published in an edition.',
    },
  });
})();
