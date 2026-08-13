(() => {
  'use strict';

  const PARAM = 'editor-ref';
  const PENDING_KEY = 'newsflow_editor_referral_pending';
  const CONSENTED_KEY = 'newsflow_editor_referral_consented';
  const ROOT_ID = 'newsflow-editor-referral-consent';
  const rawCode = String(new URLSearchParams(window.location.search).get(PARAM) || '').trim().toUpperCase();
  if (!/^NF-[A-Z0-9]{8}$/.test(rawCode)) return;

  try {
    if (sessionStorage.getItem(CONSENTED_KEY) === rawCode) {
      sessionStorage.removeItem(CONSENTED_KEY);
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }
    sessionStorage.setItem(PENDING_KEY, rawCode);
  } catch { /* session storage is optional */ }

  const clean = new URL(window.location.href);
  clean.searchParams.delete(PARAM);
  window.history.replaceState({}, '', `${clean.pathname}${clean.search}${clean.hash}`);

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = './editor-referral.css';
  document.head.appendChild(stylesheet);

  let account = null;
  let unsubscribe = null;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const root = () => {
    let node = document.getElementById(ROOT_ID);
    if (!node) {
      node = document.createElement('div');
      node.id = ROOT_ID;
      document.body.appendChild(node);
    }
    return node;
  };

  const close = () => {
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* optional storage */ }
    root().remove();
  };

  const accept = () => {
    if (!account?.user) return;
    try { sessionStorage.setItem(CONSENTED_KEY, rawCode); } catch { /* optional storage */ }
    const target = new URL(window.location.href);
    target.searchParams.set(PARAM, rawCode);
    window.location.replace(target.toString());
  };

  const render = () => {
    const signedIn = Boolean(account?.user);
    const node = root();
    node.innerHTML = `<div class="nf-review-dialog-backdrop" data-editor-referral-consent-action="close"></div>
      <section class="nf-review-invite-dialog nf-editor-referral-guide" role="dialog" aria-modal="true" aria-labelledby="nf-editor-referral-consent-title">
        <button class="nf-review-close" data-editor-referral-consent-action="close" aria-label="关闭编辑邀请说明">×</button>
        <span class="nf-review-label">EDITOR REFERRAL</span>
        <div class="nf-review-seal is-small">ED</div>
        <h2 id="nf-editor-referral-consent-title">受邀成为 Newsflow 编辑</h2>
        <p>这是 Newsflow 编辑的专属邀请。登录不会自动加入编辑部；只有你明确确认后，才会创建 Editor 身份并领取随邀请附带的 Newsflow Pro 权益。</p>
        <div class="nf-editor-referral-code"><span>EDITOR CODE</span><strong>${escapeHtml(rawCode)}</strong></div>
        <p>流程：${signedIn ? '确认当前账号 → 接受编辑邀请' : '登录当前账号 → 返回本页确认 → 接受编辑邀请'} → 进入编辑部。</p>
        <div class="nf-review-actions">
          ${signedIn
            ? '<button class="is-primary" data-editor-referral-consent-action="accept">接受编辑邀请</button>'
            : '<button class="is-primary" data-editor-referral-consent-action="sign-in">登录后确认邀请</button>'}
          <button data-editor-referral-consent-action="close">暂不接受</button>
        </div>
      </section>`;
  };

  const hydrate = (snapshot) => {
    account = snapshot || null;
    render();
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-editor-referral-consent-action]');
    if (!trigger || !root().contains(trigger)) return;
    const action = trigger.dataset.editorReferralConsentAction;
    if (action === 'sign-in') window.HaoAccount?.open?.();
    else if (action === 'accept') accept();
    else if (action === 'close') close();
  });

  window.addEventListener('hao:account-changed', (event) => hydrate(event.detail));

  const start = () => {
    if (!window.HaoAccount?.subscribe) return false;
    unsubscribe?.();
    unsubscribe = window.HaoAccount.subscribe(hydrate);
    return true;
  };

  render();
  if (!start()) {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (start() || attempts > 100) window.clearInterval(timer);
    }, 50);
  }
})();