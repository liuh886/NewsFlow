(() => {
  'use strict';

  window.HaoAccountConfig = Object.freeze({
    enabled: true,
    billingEnabled: true,
    appName: 'NewsFlow',
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
      zh: 'NewsFlow 账户',
      en: 'NewsFlow account',
    },
    description: {
      zh: '公开期刊保持开放；NewsFlow Pro 可进入编辑部提交评议，受邀编辑同步获得 3 个月 Pro，主编仍拥有唯一最终出版权。',
      en: 'The public journal remains open. NewsFlow Pro can submit editorial reviews, invited editors receive three months of Pro, and the Editor-in-Chief retains sole publication authority.',
    },
    privacyNote: {
      zh: '公开 Edition、信号流与 GitHub 出版流程保持开放；Pro 只控制编辑工作区访问，不改变正式事实记录。',
      en: 'Public editions, signal feeds, and the GitHub publishing workflow remain open. Pro controls editorial workspace access only and never alters the factual record.',
    },
    features: [
      { zh: 'Free：阅读正式刊物与公开信号流', en: 'Free: read formal editions and public signals' },
      { zh: 'NewsFlow Pro 解锁编辑评议权限与决策档案', en: 'NewsFlow Pro unlocks editorial review and the decision archive' },
      { zh: '接受编辑邀请赠送 3 个月 NewsFlow Pro', en: 'Editor invitations include three months of NewsFlow Pro' },
    ],
    feedbackEnabled: true,
    feedbackTitle: { zh: '给主编的反馈', en: 'Feedback for the editor' },
    feedbackPrompt: {
      zh: '反馈会进入私有运营台，不会自动成为正式 Issue 内容。',
      en: 'Feedback enters the private operations console and never becomes formal Issue content automatically.',
    },
  });
})();
