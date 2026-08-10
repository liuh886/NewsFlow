(() => {
  'use strict';

  const canonicalRedirectUrl = 'https://liuh886.github.io/NewsFlow/';
  const inviteRedirectUrl = (() => {
    const current = new URL(window.location.href);
    if (!current.searchParams.has('editor-invite')) return canonicalRedirectUrl;
    current.hash = '';
    return current.toString();
  })();

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
    redirectUrl: inviteRedirectUrl,
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
        { zh: '浏览候选稿件与编辑材料，获得正式刊物之外的编辑视图', en: 'Browse candidate manuscripts and editorial material beyond the published edition' },
        { zh: '对候选稿件提交接受、小修、大修或拒稿等评议', en: 'Submit Accept, Minor Revision, Major Revision, or Reject reviews on candidate manuscripts' },
        { zh: '查看自己的评议记录与编辑决策档案', en: 'Review your editorial history and decision archive' },
      ],
      checkoutDescription: {
        zh: 'US$1/月开通 Newsflow Pro，进入编辑部浏览候选稿件、提交评议并查看自己的编辑决策档案；正式刊物阅读仍永久免费。',
        en: 'Newsflow Pro is US$1/month and unlocks candidate manuscripts, editorial reviews, and your decision archive. Published reading remains free.',
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