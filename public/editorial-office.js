(() => {
  'use strict';

  const ROLE_STORAGE_KEY = 'newsflow_role_v2';
  const ROLE_FIELD = 'newsflow_role';
  const FORMAL_STORAGE_KEY = 'newsflow_review_game_v4';
  const EDITORIAL_STATE_FIELD = 'newsflow_editorial';
  const ROOT_ID = 'newsflow-editorial-mode-root';

  const state = {
    account: null,
    role: '',
    dialogOpen: false,
    promptedForUser: '',
    autoOpenedForUser: ''
  };

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const accountUserId = () => String(state.account?.user?.id || '');
  const roleStorageKey = () => accountUserId() ? `${ROLE_STORAGE_KEY}:${accountUserId()}` : ROLE_STORAGE_KEY;
  const accountName = () => state.account?.profile?.display_name
    || state.account?.user?.user_metadata?.full_name
    || state.account?.user?.email
    || 'NewsFlow Member';

  const ensureRoot = () => {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }
    return root;
  };

  const openAccount = () => window.HaoAccount?.open?.();

  const readFormalEditorialState = () => {
    try {
      const payload = JSON.parse(localStorage.getItem(FORMAL_STORAGE_KEY) || 'null');
      if (!payload || typeof payload !== 'object') return null;
      return {
        schema_version: '1.0',
        updated_at: String(payload.updated_at || new Date().toISOString()),
        decisions: payload.decisions && typeof payload.decisions === 'object' ? payload.decisions : {}
      };
    } catch {
      return null;
    }
  };

  const syncFormalEditorialState = async () => {
    const account = window.HaoAccount?.getState?.();
    const editorial = readFormalEditorialState();
    if (!account?.user || !editorial || !window.HaoAccount?.saveProductData) return;
    const productState = account.productAccount?.state && typeof account.productAccount.state === 'object'
      ? account.productAccount.state
      : {};
    try {
      await window.HaoAccount.saveProductData({
        productState: { ...productState, [EDITORIAL_STATE_FIELD]: editorial }
      });
    } catch (error) {
      console.warn('NewsFlow editorial state sync deferred:', error);
    }
  };

  const syncRole = async (role) => {
    const account = window.HaoAccount?.getState?.();
    if (!account?.user || !window.HaoAccount?.saveProductData) return;
    const preferences = account.productAccount?.preferences && typeof account.productAccount.preferences === 'object'
      ? account.productAccount.preferences
      : {};
    const productState = account.productAccount?.state && typeof account.productAccount.state === 'object'
      ? account.productAccount.state
      : {};
    try {
      await window.HaoAccount.saveProductData({
        preferences: { ...preferences, [ROLE_FIELD]: role },
        productState: { ...productState, [ROLE_FIELD]: role }
      });
    } catch (error) {
      console.warn('NewsFlow mode sync failed:', error);
    }
  };

  const openEditorGame = () => {
    if (!state.account?.user) {
      openAccount();
      return;
    }
    if (state.role !== 'editor') {
      state.dialogOpen = true;
      renderDialog();
      return;
    }
    void syncFormalEditorialState();
    window.NewsFlowReviewGame?.openFormal?.();
  };

  const setRole = async (role) => {
    if (!state.account?.user) {
      openAccount();
      return;
    }
    if (!['reader', 'editor'].includes(role)) return;
    state.role = role;
    state.dialogOpen = false;
    localStorage.setItem(roleStorageKey(), role);
    mountModeTrigger();
    renderDialog();
    if (role === 'reader') await syncFormalEditorialState();
    await syncRole(role);
    if (role === 'editor') openEditorGame();
  };

  const roleCard = (role, title, english, description, footnote) => `
    <button class="nf-mode-card ${state.role === role ? 'is-selected' : ''}" data-mode-action="choose" data-role="${role}">
      <span class="nf-mode-number">${role === 'reader' ? '01' : '02'}</span>
      <span class="nf-mode-copy">
        <span>${escapeHtml(english)}</span>
        <strong>${escapeHtml(title)}</strong>
        <em>${escapeHtml(description)}</em>
        <small>${escapeHtml(footnote)}</small>
      </span>
      <b>${state.role === role ? '当前模式' : '进入'}</b>
    </button>`;

  const renderDialog = () => {
    const root = ensureRoot();
    if (!state.dialogOpen) {
      root.innerHTML = '';
      document.documentElement.classList.remove('nf-mode-dialog-open');
      window.dispatchEvent(new CustomEvent('newsflow:editorial-rendered'));
      return;
    }
    root.innerHTML = `<button class="nf-mode-backdrop" type="button" data-mode-action="close" aria-label="关闭模式选择"></button>
      <section class="nf-mode-dialog" role="dialog" aria-modal="true" aria-labelledby="nf-mode-title">
        <header><div><span>NEWSFLOW MODES</span><h2 id="nf-mode-title">你想怎么进入本刊？</h2></div><button class="nf-mode-close" data-mode-action="close" aria-label="关闭">×</button></header>
        <p>欢迎，${escapeHtml(accountName())}。NewsFlow 只有两种模式：读者像浏览传统期刊，编辑则直接进入一屏一稿的审稿游戏。</p>
        <div class="nf-mode-grid">
          ${roleCard('reader', '读者', 'READER MODE', '阅读正式 Issue、长期议题与证据。', '传统网页浏览，不出现游戏 HUD。')}
          ${roleCard('editor', '编辑', 'EDITOR MODE', '像玩卡片游戏一样连续审稿。', '一屏一稿 · 五档裁决 · 立即反馈。')}
        </div>
        <footer>身份只决定体验；正式出版权限由刊物 owner 独立授权。</footer>
      </section>`;
    document.documentElement.classList.add('nf-mode-dialog-open');
    window.dispatchEvent(new CustomEvent('newsflow:editorial-rendered'));
    window.requestAnimationFrame(() => root.querySelector('.nf-mode-card, .nf-mode-close')?.focus());
  };

  function mountModeTrigger() {
    const target = document.querySelector('.top-actions');
    if (!target) return;
    let trigger = target.querySelector('[data-editorial-role-trigger]');
    if (!trigger) {
      trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.dataset.editorialRoleTrigger = 'true';
      target.prepend(trigger);
    }
    trigger.className = `nf-mode-trigger is-${state.role || 'unset'}`;
    trigger.dataset.modeAction = state.role === 'editor' ? 'open-editor' : 'open-dialog';
    trigger.setAttribute('aria-label', state.role === 'editor' ? '进入编辑审稿模式' : '选择 NewsFlow 模式');
    trigger.innerHTML = `<span aria-hidden="true">${state.role === 'editor' ? '编' : state.role === 'reader' ? '读' : '模式'}</span><strong>${state.role === 'editor' ? '编辑' : state.role === 'reader' ? '读者' : '选择模式'}</strong>`;
  }

  const hydrateAccount = (snapshot) => {
    state.account = snapshot || null;
    if (!snapshot?.user) {
      state.role = '';
      state.dialogOpen = false;
      state.autoOpenedForUser = '';
      mountModeTrigger();
      renderDialog();
      return;
    }

    const cloudRole = snapshot.productAccount?.state?.[ROLE_FIELD]
      || snapshot.productAccount?.preferences?.[ROLE_FIELD]
      || '';
    const localRole = localStorage.getItem(roleStorageKey()) || '';
    state.role = ['reader', 'editor'].includes(localRole) ? localRole
      : ['reader', 'editor'].includes(cloudRole) ? cloudRole
        : '';
    if (state.role && !localRole) localStorage.setItem(roleStorageKey(), state.role);

    const userId = accountUserId();
    const guestInviteOpen = new URLSearchParams(window.location.search).has('guest-editor');
    if (state.role === 'editor') void syncFormalEditorialState();
    if (!state.role && userId && state.promptedForUser !== userId && !guestInviteOpen) {
      state.promptedForUser = userId;
      window.setTimeout(() => {
        state.dialogOpen = true;
        renderDialog();
      }, 180);
    } else if (state.role === 'editor' && userId && state.autoOpenedForUser !== userId && !guestInviteOpen) {
      state.autoOpenedForUser = userId;
      window.setTimeout(openEditorGame, 120);
    }
    mountModeTrigger();
    renderDialog();
  };

  const handleAction = (event) => {
    const target = event.target.closest?.('[data-mode-action]');
    if (!target) return;
    const action = target.dataset.modeAction;
    if (action === 'choose') setRole(target.dataset.role || '');
    else if (action === 'open-dialog') {
      if (!state.account?.user) openAccount();
      else { state.dialogOpen = true; renderDialog(); }
    } else if (action === 'open-editor') openEditorGame();
    else if (action === 'close') { state.dialogOpen = false; renderDialog(); }
  };

  document.addEventListener('click', handleAction);
  window.addEventListener('newsflow:rendered', mountModeTrigger);
  window.addEventListener('newsflow:open-editorial-office', () => {
    if (!state.account?.user) openAccount();
    else if (state.role === 'editor') openEditorGame();
    else { state.dialogOpen = true; renderDialog(); }
  });
  window.addEventListener('newsflow:switch-role', (event) => {
    const role = event.detail?.role;
    if (['reader', 'editor'].includes(role)) setRole(role);
  });
  window.addEventListener('newsflow:review-game-closed', () => {
    if (state.account?.user) void syncFormalEditorialState();
  });
  window.addEventListener('newsflow:review-game-ready', () => {
    if (state.role === 'editor' && state.account?.user && !window.NewsFlowReviewGame?.isOpen?.()) openEditorGame();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.dialogOpen) {
      state.dialogOpen = false;
      renderDialog();
    }
  });

  ensureRoot();
  mountModeTrigger();
  if (window.HaoAccount?.subscribe) window.HaoAccount.subscribe(hydrateAccount);
  else window.addEventListener('hao:account-changed', (event) => hydrateAccount(event.detail));

  window.NewsFlowMode = Object.freeze({
    getRole: () => state.role,
    choose: () => { state.dialogOpen = true; renderDialog(); },
    enterEditor: openEditorGame
  });
})();
