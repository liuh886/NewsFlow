(() => {
  'use strict';

  const MODE_STORAGE_KEY = 'newsflow_mode_v3';
  const MODE_FIELD = 'newsflow_mode';
  const INVITE_PARAM = 'editor-invite';
  const ROOT_ID = 'newsflow-editorial-mode-root';

  const state = {
    account: null,
    mode: 'reader',
    editorialRole: '',
    dialogOpen: false,
    loadingRole: false,
    handlingInvite: false,
    promptedForUser: '',
    notice: ''
  };

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const accountUserId = () => String(state.account?.user?.id || '');
  const modeStorageKey = () => accountUserId() ? `${MODE_STORAGE_KEY}:${accountUserId()}` : MODE_STORAGE_KEY;
  const accountName = () => state.account?.profile?.display_name
    || state.account?.user?.user_metadata?.full_name
    || state.account?.user?.email
    || 'NewsFlow Member';
  const isEditorialMember = () => ['editor_in_chief', 'editor'].includes(state.editorialRole);
  const isChief = () => state.editorialRole === 'editor_in_chief';

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
  const getClient = async () => window.HaoAccount?.getClient?.();

  const hashToken = async (token) => {
    const bytes = new TextEncoder().encode(String(token || ''));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const randomToken = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  };

  const canonicalEditorInviteUrl = (token) => {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set(INVITE_PARAM, token);
    return url.toString();
  };

  const syncModePreference = async (mode) => {
    const account = window.HaoAccount?.getState?.();
    if (!account?.user || !window.HaoAccount?.saveProductData) return;
    const preferences = account.productAccount?.preferences && typeof account.productAccount.preferences === 'object'
      ? account.productAccount.preferences
      : {};
    if (preferences[MODE_FIELD] === mode) return;
    try {
      await window.HaoAccount.saveProductData({ preferences: { ...preferences, [MODE_FIELD]: mode } });
    } catch (error) {
      console.warn('NewsFlow mode preference sync failed:', error);
    }
  };

  const readMembership = async () => {
    state.editorialRole = '';
    if (!state.account?.user) return;
    state.loadingRole = true;
    try {
      const client = await getClient();
      if (!client) return;
      const { data, error } = await client
        .from('newsflow_editorial_members')
        .select('role,active')
        .eq('user_id', accountUserId())
        .maybeSingle();
      if (error) throw error;
      if (data?.active && ['editor_in_chief', 'editor'].includes(data.role)) state.editorialRole = data.role;
    } catch (error) {
      console.warn('NewsFlow editorial membership unavailable:', error);
    } finally {
      state.loadingRole = false;
    }
  };

  const clearInviteParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete(INVITE_PARAM);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const acceptPendingInvitation = async () => {
    if (state.handlingInvite || !state.account?.user) return false;
    const rawToken = new URLSearchParams(window.location.search).get(INVITE_PARAM);
    if (!rawToken) return false;
    state.handlingInvite = true;
    try {
      if (isEditorialMember()) {
        clearInviteParam();
        return true;
      }
      const client = await getClient();
      if (!client) throw new Error('编辑任命服务暂不可用。');
      const tokenHash = await hashToken(rawToken);
      const { error } = await client.from('newsflow_editorial_members').insert({
        user_id: accountUserId(),
        role: 'editor',
        active: true,
        invitation_hash: tokenHash
      });
      if (error) throw error;
      await readMembership();
      clearInviteParam();
      state.notice = '编辑任命已生效，并已同步获得 3 个月 NewsFlow Pro。你的审稿意见会被主编看到，但不会自动改变正式刊物。';
      state.mode = 'editor';
      localStorage.setItem(modeStorageKey(), 'editor');
      await syncModePreference('editor');
      window.setTimeout(() => void window.HaoAccount?.refresh?.(), 0);
      return true;
    } catch (error) {
      state.notice = '这份编辑任命无效、已过期或已被使用。';
      console.warn('NewsFlow editor appointment failed:', error);
      return false;
    } finally {
      state.handlingInvite = false;
      syncModeLauncher();
      renderDialog();
    }
  };

  const createEditorInvite = async () => {
    if (!state.account?.user || !isChief()) throw new Error('只有主编可以任命编辑。');
    const client = await getClient();
    if (!client) throw new Error('编辑任命服务暂不可用。');
    const rawToken = randomToken();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await client.from('newsflow_editorial_invitations').insert({
      token_hash: tokenHash,
      created_by: accountUserId(),
      expires_at: expiresAt
    });
    if (error) throw error;
    return { url: canonicalEditorInviteUrl(rawToken), expires_at: expiresAt };
  };

  const openEditorGame = () => {
    if (!state.account?.user) {
      openAccount();
      return;
    }
    if (!isEditorialMember()) {
      state.notice = '编辑模式需要主编任命。读者不能自行取得审稿权限。';
      state.dialogOpen = true;
      renderDialog();
      return;
    }
    state.mode = 'editor';
    localStorage.setItem(modeStorageKey(), 'editor');
    syncModeLauncher();
    if (window.NewsFlowReviewGame?.isOpen?.()) return;
    window.NewsFlowReviewGame?.openFormal?.();
  };

  const openGovernance = () => {
    if (!state.account?.user || !isChief()) {
      state.notice = '只有主编可以修改 Edition、长期议题和信源。';
      state.dialogOpen = true;
      renderDialog();
      return;
    }
    window.NewsFlowGovernance?.open?.();
  };

  const setMode = async (mode) => {
    if (!['reader', 'editor'].includes(mode)) return;
    if (mode === 'editor' && !isEditorialMember()) {
      state.notice = '编辑模式需要主编任命。';
      renderDialog();
      return;
    }
    state.mode = mode;
    state.dialogOpen = false;
    localStorage.setItem(modeStorageKey(), mode);
    await syncModePreference(mode);
    syncModeLauncher();
    renderDialog();
    if (mode === 'editor') openEditorGame();
  };

  const roleCard = (mode) => {
    if (mode === 'reader') return `
      <button class="nf-mode-card ${state.mode === 'reader' ? 'is-selected' : ''}" data-mode-action="choose" data-role="reader">
        <span class="nf-mode-number">01</span>
        <span class="nf-mode-copy"><span>READER MODE</span><strong>读者</strong><em>只阅读主编已经采用的 Signal、正式 Issue、长期议题与证据。</em><small>不显示候选稿、编辑意见、修订稿或拒稿记录。</small></span>
        <b>${state.mode === 'reader' ? '当前模式' : '进入'}</b>
      </button>`;

    const title = isChief() ? '主编' : '编辑';
    const english = isChief() ? 'EDITOR-IN-CHIEF' : 'EDITOR';
    const description = isChief()
      ? '对每篇稿件签发最终裁决；封面与录用直接决定 NewsFlow 的公开内容。'
      : '对每篇稿件给出独立编辑意见，供主编最终裁决参考。';
    const footnote = isChief()
      ? '最终出版权 · 可维护 Edition、长期议题、信源与编辑席位。'
      : '评审权 · 没有正式出版权。';
    return `
      <button class="nf-mode-card ${state.mode === 'editor' ? 'is-selected' : ''} ${isEditorialMember() ? '' : 'is-locked'}" ${isEditorialMember() ? 'data-mode-action="choose" data-role="editor"' : 'disabled'}>
        <span class="nf-mode-number">02</span>
        <span class="nf-mode-copy"><span>${english}</span><strong>${title}</strong><em>${description}</em><small>${footnote}</small></span>
        <b>${state.loadingRole ? '核验中' : isEditorialMember() ? (state.mode === 'editor' ? '当前模式' : '进入') : '需要任命'}</b>
      </button>`;
  };

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
        <header><div><span>FRONTIER SYSTEMS REVIEW</span><h2 id="nf-mode-title">你以什么身份进入编辑部？</h2></div><button class="nf-mode-close" data-mode-action="close" aria-label="关闭">×</button></header>
        <p>欢迎，${escapeHtml(accountName())}。机器负责收集，编辑负责评议，主编负责出版；读者只看到主编已经采用的内容。</p>
        ${state.notice ? `<div class="nf-mode-notice" role="status">${escapeHtml(state.notice)}</div>` : ''}
        <div class="nf-mode-grid">${roleCard('reader')}${roleCard('editor')}</div>
        ${isChief() ? '<div class="nf-mode-chief-actions"><button data-mode-action="open-governance">刊物设置</button><button data-mode-action="create-invite">任命编辑</button></div>' : ''}
        <footer>${isChief() ? '主编拥有最终出版与刊物治理权限。' : isEditorialMember() ? '编辑意见会进入主编评审视图，但不会自动公开。' : '编辑席位只能通过主编签发的任命链接获得。'}</footer>
      </section>`;
    document.documentElement.classList.add('nf-mode-dialog-open');
    window.dispatchEvent(new CustomEvent('newsflow:editorial-rendered'));
    window.requestAnimationFrame(() => root.querySelector('.nf-mode-card:not(:disabled), .nf-mode-close')?.focus());
  };

  function syncModeLauncher() {
    const launcher = document.querySelector('.top-actions > [data-action="open-editorial-office"]');
    if (!launcher) return;
    const role = state.mode === 'editor' && isChief() ? 'chief'
      : state.mode === 'editor' && state.editorialRole === 'editor' ? 'editor'
        : 'reader';
    launcher.dataset.newsflowRole = role;
    launcher.setAttribute('aria-label', role === 'chief'
      ? '进入主编审稿模式'
      : role === 'editor' ? '进入编辑审稿模式' : '选择 NewsFlow 身份');
    launcher.title = role === 'chief' ? '主编审稿模式' : role === 'editor' ? '编辑审稿模式' : '选择身份';
  }

  const hydrateAccount = async (snapshot) => {
    state.account = snapshot || null;
    if (!snapshot?.user) {
      state.editorialRole = '';
      state.mode = 'reader';
      state.dialogOpen = false;
      syncModeLauncher();
      renderDialog();
      if (new URLSearchParams(window.location.search).has(INVITE_PARAM)) openAccount();
      return;
    }

    await readMembership();
    await acceptPendingInvitation();
    const cloudMode = snapshot.productAccount?.preferences?.[MODE_FIELD] || '';
    const localMode = localStorage.getItem(modeStorageKey()) || '';
    const requestedMode = ['reader', 'editor'].includes(localMode) ? localMode
      : ['reader', 'editor'].includes(cloudMode) ? cloudMode
        : 'reader';
    state.mode = requestedMode === 'editor' && !isEditorialMember() ? 'reader' : requestedMode;

    const userId = accountUserId();
    if (userId && state.promptedForUser !== userId && isEditorialMember() && state.mode !== 'editor') {
      state.promptedForUser = userId;
      window.setTimeout(() => {
        state.dialogOpen = true;
        renderDialog();
      }, 180);
    }
    syncModeLauncher();
    renderDialog();
  };

  const handleAction = async (event) => {
    const target = event.target.closest?.('[data-mode-action]');
    if (!target) return;
    const action = target.dataset.modeAction;
    if (action === 'choose') await setMode(target.dataset.role || '');
    else if (action === 'open-dialog') {
      if (!state.account?.user) openAccount();
      else { state.dialogOpen = true; renderDialog(); }
    } else if (action === 'open-editor') openEditorGame();
    else if (action === 'open-governance') { state.dialogOpen = false; renderDialog(); openGovernance(); }
    else if (action === 'create-invite') {
      try {
        const invite = await createEditorInvite();
        await navigator.clipboard?.writeText?.(invite.url);
        state.notice = '编辑任命链接已生成并复制。链接 14 天内仅可接受一次。';
      } catch (error) {
        state.notice = error?.message || '编辑任命链接生成失败。';
      }
      renderDialog();
    } else if (action === 'close') { state.dialogOpen = false; renderDialog(); }
  };

  document.addEventListener('click', handleAction);
  window.addEventListener('newsflow:rendered', syncModeLauncher);
  window.addEventListener('newsflow:open-editorial-office', () => {
    if (!state.account?.user) openAccount();
    else if (state.mode === 'editor' && isEditorialMember()) openEditorGame();
    else { state.dialogOpen = true; renderDialog(); }
  });
  window.addEventListener('newsflow:switch-role', (event) => {
    const mode = event.detail?.role === 'editor' ? 'editor' : 'reader';
    void setMode(mode);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.dialogOpen) {
      state.dialogOpen = false;
      renderDialog();
    }
  });

  ensureRoot();
  syncModeLauncher();
  if (window.HaoAccount?.subscribe) window.HaoAccount.subscribe(hydrateAccount);
  else window.addEventListener('hao:account-changed', (event) => { void hydrateAccount(event.detail); });

  window.NewsFlowMode = Object.freeze({
    getRole: () => state.mode,
    getEditorialRole: () => state.editorialRole,
    isChief,
    choose: () => { state.dialogOpen = true; renderDialog(); },
    enterEditor: openEditorGame,
    openGovernance,
    createEditorInvite
  });
})();
