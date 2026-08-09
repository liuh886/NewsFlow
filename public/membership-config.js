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
      zh: 'NewsFlow 阅读始终免费。Pro 面向希望参与编辑的人：进入编辑台评议候选文章、保存评议与决策记录。受邀编辑可通过主编邀请链接获得 3 个月 Pro；最终出版决定仍由主编完成。',
      en: 'Reading NewsFlow always stays free. Pro is for people who want to participate in editorial work: review candidate stories and keep review and decision records. Invited editors can receive three months of Pro through an Editor-in-Chief invitation; final publication decisions remain with the Editor-in-Chief.',
    },
    privacyNote: {
      zh: '公开 Edition、信号流与 GitHub 出版流程保持开放；Pro 只控制编辑工作区访问，不改变正式事实记录。',
      en: 'Public editions, signal feeds, and the GitHub publishing workflow remain open. Pro controls editorial workspace access only and never alters the factual record.',
    },
    features: [
      { zh: 'Free · 阅读每期正式刊物、公开信号流与专题', en: 'Free · Read every published edition, public signal feed, and special topic' },
      { zh: 'Pro · 进入编辑台，对候选稿件提交接受、小修、大修或拒稿等评议', en: 'Pro · Enter the editorial desk and submit Accept, Minor Revision, Major Revision, or Reject reviews' },
      { zh: 'Pro · 查看自己的评议记录与编辑决策档案', en: 'Pro · Review your editorial history and decision archive' },
      { zh: '编辑邀请 · 通过主编邀请链接可获得 3 个月 NewsFlow Pro', en: 'Editor invitation · Receive three months of NewsFlow Pro through an Editor-in-Chief invite' },
    ],
    feedbackEnabled: true,
    feedbackTitle: { zh: '给主编的反馈', en: 'Feedback for the editor' },
    feedbackPrompt: {
      zh: '反馈会进入私有运营台，不会自动成为正式 Issue 内容。',
      en: 'Feedback enters the private operations console and never becomes formal Issue content automatically.',
    },
  });
})();
