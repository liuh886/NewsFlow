(() => {
  'use strict';

  const hostId = 'hao-account-newsflow';
  const upgradeIntentKey = 'newsflow:upgrade-intent';

  const copy = {
    zh: {
      plans: 'Free 与 Pro',
      free: 'FREE',
      freeTitle: '阅读始终开放',
      freeBody: '正式刊物、公开信号流和专题无需 Pro。',
      pro: 'PRO',
      proTitle: '参与编辑工作流',
      proBody: '进入编辑台评议候选稿件，并保留自己的评议与决策记录。',
      invite: '受邀编辑可通过主编邀请链接获得 3 个月 Pro；最终出版决定仍由主编完成。',
      upgradeTitle: '开通 NewsFlow Pro',
      price: 'US$1 / 月',
      upgradeBody: '登录后即可进入 Stripe Checkout。开通 Pro 不影响 Free 阅读权限。',
      step1: '登录账户',
      step2: 'Stripe 付款',
      step3: 'Pro 自动生效',
      continue: '选择登录方式继续',
      stripe: 'Stripe 安全结账 · 可随时取消',
      signedInBody: '开通后可进入编辑台提交评议并查看自己的编辑决策档案；正式刊物阅读仍永久免费。',
      signedInCta: '开通 NewsFlow Pro',
    },
    en: {
      plans: 'Free and Pro',
      free: 'FREE',
      freeTitle: 'Reading always stays open',
      freeBody: 'Published editions, public signal feeds, and special topics never require Pro.',
      pro: 'PRO',
      proTitle: 'Join the editorial workflow',
      proBody: 'Review candidate stories in the editorial desk and keep your own review and decision history.',
      invite: 'Invited editors can receive three months of Pro through an Editor-in-Chief invite; final publication decisions remain with the Editor-in-Chief.',
      upgradeTitle: 'Upgrade to NewsFlow Pro',
      price: 'US$1 / month',
      upgradeBody: 'Sign in first, then continue to Stripe Checkout. Free reading remains unchanged.',
      step1: 'Sign in',
      step2: 'Pay with Stripe',
      step3: 'Pro activates',
      continue: 'Choose a sign-in method',
      stripe: 'Secure checkout with Stripe · Cancel anytime',
      signedInBody: 'Pro unlocks the editorial desk, review submission, and your editorial decision archive. Published reading remains free.',
      signedInCta: 'Upgrade to NewsFlow Pro',
    },
  };

  function language() {
    return document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  function text() {
    return copy[language()];
  }

  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value) node.textContent = value;
    return node;
  }

  function buildPlanRow(kind, title, body, isPro = false) {
    const row = element('div', `newsflow-account-plan${isPro ? ' is-pro' : ''}`);
    const label = element('span', 'newsflow-account-plan-label', kind);
    const content = element('div', 'newsflow-account-plan-copy');
    content.append(element('strong', '', title), element('span', '', body));
    row.append(label, content);
    return row;
  }

  function enhancePlanPanel(dialog) {
    const panel = dialog.querySelector('.hao-account-feature-panel');
    if (!panel || panel.dataset.newsflowPlans === 'true') return;

    const t = text();
    panel.dataset.newsflowPlans = 'true';
    panel.classList.add('newsflow-account-plans');
    panel.replaceChildren();
    panel.append(
      element('strong', '', t.plans),
      buildPlanRow(t.free, t.freeTitle, t.freeBody),
      buildPlanRow(t.pro, t.proTitle, t.proBody, true),
      element('small', 'newsflow-account-invite-note', t.invite),
    );
  }

  function focusSignIn() {
    const firstProvider = document.querySelector('#hao-account-overlay .hao-account-provider');
    if (!firstProvider) return;
    firstProvider.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => firstProvider.focus(), 220);
  }

  function buildGuestUpgradeGuide(dialog) {
    const guest = dialog.querySelector('.hao-account-guest');
    if (!guest || dialog.querySelector('.newsflow-pro-checkout-guide')) return;

    const t = text();
    const guide = element('section', 'newsflow-pro-checkout-guide');
    const heading = element('div', 'newsflow-pro-checkout-heading');
    const headingCopy = element('div', 'newsflow-pro-checkout-copy');
    headingCopy.append(element('strong', '', t.upgradeTitle), element('p', '', t.upgradeBody));
    heading.append(headingCopy, element('span', 'newsflow-pro-checkout-price', t.price));

    const steps = element('ol', 'newsflow-pro-checkout-steps');
    [t.step1, t.step2, t.step3].forEach((label, index) => {
      const item = element('li', '');
      item.append(element('span', '', String(index + 1)), element('strong', '', label));
      steps.appendChild(item);
    });

    const button = element('button', 'hao-account-primary newsflow-pro-login-cta', t.continue);
    button.type = 'button';
    button.addEventListener('click', () => {
      sessionStorage.setItem(upgradeIntentKey, '1');
      focusSignIn();
    });

    guide.append(heading, steps, button, element('small', 'newsflow-pro-stripe-note', t.stripe));
    guest.before(guide);
  }

  function enhanceSignedInUpgrade(dialog) {
    const card = dialog.querySelector('.hao-account-pro-card:not(.is-active)');
    if (!card || card.dataset.newsflowUpgrade === 'true') return;

    const t = text();
    card.dataset.newsflowUpgrade = 'true';
    const body = card.querySelector('.hao-account-pro-copy p');
    const button = card.querySelector('.hao-account-pro-action .hao-account-primary');
    if (body) body.textContent = t.signedInBody;
    if (button) button.textContent = t.signedInCta;
  }

  function enhanceAccountPanel() {
    const dialog = document.querySelector('#hao-account-overlay .hao-account-dialog');
    if (!dialog) return;
    enhancePlanPanel(dialog);
    buildGuestUpgradeGuide(dialog);
    enhanceSignedInUpgrade(dialog);
  }

  function resumeUpgradeIntent(snapshot) {
    if (sessionStorage.getItem(upgradeIntentKey) !== '1') return;
    if (!snapshot?.user || snapshot.isPro) return;

    sessionStorage.removeItem(upgradeIntentKey);
    window.HaoAccount?.open?.();
    window.setTimeout(() => {
      enhanceAccountPanel();
      const checkout = document.querySelector('#hao-account-overlay .hao-account-pro-card:not(.is-active) .hao-account-primary');
      checkout?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => checkout?.focus(), 220);
    }, 0);
  }

  function syncAccountMount() {
    const target = document.querySelector('.top-actions');
    const host = document.getElementById(hostId);
    if (!target || !host || host.parentElement === target) return;

    const mobileMenu = target.querySelector('.mobile-menu-button');
    target.insertBefore(host, mobileMenu || null);
  }

  const observer = new MutationObserver(() => enhanceAccountPanel());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('newsflow:rendered', () => {
    syncAccountMount();
    enhanceAccountPanel();
  });
  window.addEventListener('hao:account-changed', (event) => {
    syncAccountMount();
    enhanceAccountPanel();
    resumeUpgradeIntent(event.detail);
  });

  syncAccountMount();
  enhanceAccountPanel();
})();
