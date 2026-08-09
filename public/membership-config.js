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
      zh: '读者可持续阅读公开刊物；编辑席位由主编任命并要求 NewsFlow Pro。接受编辑邀请时会同步获得 3 个月 NewsFlow Pro。',
      en: 'Readers keep access to the public journal. Editorial seats are appointed by the Editor-in-Chief and require NewsFlow Pro; accepting an editor invitation includes three months of NewsFlow Pro.',
    },
    privacyNote: {
      zh: '公开 Edition、信号流与 GitHub 出版流程保持开放；Pro 只控制编辑工作区访问，不改变正式事实记录。',
      en: 'Public editions, signal feeds, and the GitHub publishing workflow remain open. Pro controls editorial workspace access only and never alters the factual record.',
    },
    features: [
      { zh: 'Free：阅读正式刊物与公开信号流', en: 'Free: read formal editions and public signals' },
      { zh: 'Pro + 任命：进入编辑部、审稿与决策档案', en: 'Pro + appointment: access the editorial office, reviews, and decision archive' },
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
