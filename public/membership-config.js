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
      zh: '登录后选择读者或主编身份：读者进入正式期刊，主编进入编辑部、征稿启事与评审档案。',
      en: 'Sign in as a Reader or Editor-in-Chief: readers enter the journal, while editors enter the editorial office, calls for papers, and decision archive.',
    },
    privacyNote: {
      zh: '公开 Edition、信号流与 GitHub 出版流程保持开放；身份仅决定产品工作区，不改变事实记录。',
      en: 'Public editions, signal feeds, and the GitHub publishing workflow remain open. Roles only select a workspace and never alter the factual record.',
    },
    features: [
      { zh: '选择读者或主编身份', en: 'Choose Reader or Editor-in-Chief' },
      { zh: '保存阅读偏好与编辑部身份', en: 'Save reading preferences and editorial identity' },
      { zh: '与其他 Hao Apps 共用同一登录身份', en: 'Use the same identity across Hao Apps' },
    ],
    feedbackEnabled: true,
    feedbackTitle: { zh: '给主编的反馈', en: 'Feedback for the editor' },
    feedbackPrompt: {
      zh: '反馈会进入私有运营台，不会自动成为正式 Issue 内容。',
      en: 'Feedback enters the private operations console and never becomes formal Issue content automatically.',
    },
  });
})();
