(() => {
  'use strict';

  const INVITE_PARAM = 'editor-invite';
  const INVITE_ROOT_ID = 'newsflow-editor-invite-root';

  const state = {
    account: null,
    editorialRole: '',
    handlingInvite: false,
    inviteStatus: '',
    inviteError: '',
    inviteDismissed: false
  };

  const accountUserId = () => String(state.account?.user?.id || '');
  const isChief = () => state.editorialRole === 'editor_in_chief';
  const isPro = () => state.account?.isPro === true || window.HaoAccount?.can?.('newsflow.pro') === true;
  const isEditorialMember = () => isChief() || state.editorialRole === 'editor' || isPro();
  const editorialRole = () => isChief() ? 'editor_in_chief' : isEditorialMember() ? 'editor' : '';
  const openAccount = () => window.HaoAccount?.open?.();
  const getClient = async () => window.HaoAccount?.getClient?.();
  const pendingInviteToken = () => new URLSearchParams(window.location.search).get(INVITE_PARAM) || '';

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

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

  const ensureInviteRoot = () => {
    let root = document.getElementById(INVITE_ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = INVITE_ROOT_ID;
      document.body.append(root);
    }
    return root;
  };

  const renderInviteGuide = () => {
    const root = ensureInviteRoot();
    const hasInvite = Boolean(pendingInviteToken());
    const shouldShow = !state.inviteDismissed && (hasInvite || state.inviteStatus === 'accepted' || state.inviteStatus === 'already-editor' || state.inviteStatus === 'failed');
    if (!shouldShow) {
      root.replaceChildren();
      root.hidden = true;
      return;
    }

    const signedIn = Boolean(state.account?.user);
    const processing = state.handlingInvite || state.inviteStatus === 'accepting';
    let title = '受邀成为 Newsflow 编辑';
    let body = '这是一次性编辑任命。登录后系统会自动接受邀请，授予 Editor 身份，并赠送 3 个月 Newsflow Pro；不会创建付费订阅。';
    let actions = signedIn
      ? '<button class="is-primary" data-editor-invite-action="retry">接受任命</button>'
      : '<button class="is-primary" data-editor-invite-action="sign-in">登录并接受任命</button>';

    if (processing) {
      title = '正在接受编辑任命';
      body = '正在验证一次性邀请并配置编辑权限，请稍候。';
      actions = '<button class="is-primary" disabled aria-busy="true">处理中…</button>';
    } else if (state.inviteStatus === 'accepted') {
      title = '任命已接受';
      body = '你现在是 Frontier Systems Review 的 Editor，并已获得 3 个月 Newsflow Pro。可以进入编辑部查看候选稿件并提交五档评议。';
      actions = '<button class="is-primary" data-editor-invite-action="enter">进入编辑部</button><button data-editor-invite-action="close">留在刊物</button>';
    } else if (state.inviteStatus === 'already-editor') {
      title = '编辑身份已生效';
      body = '当前账户已经拥有 Newsflow 编辑权限，不需要再次接受任命。';
      actions = '<button class="is-primary" data-editor-invite-action="enter">进入编辑部</button><button data-editor-invite-action="close">留在刊物</button>';
    } else if (state.inviteStatus === 'failed') {
      title = '暂未完成任命';
      body = state.inviteError || '邀请可能已过期、已被使用，或编辑服务暂时不可用。邀请链接仍保留，你可以重试。';
      actions = signedIn
        ? '<button class="is-primary" data-editor-invite-action="retry">重新接受</button><button data-editor-invite-action="close">稍后处理</button>'
        : '<button class="is-primary" data-editor-invite-action="sign-in">登录后重试</button><button data-editor-invite-action="close">稍后处理</button>';
    }

    root.hidden = false;
    root.innerHTML = `<div class="nf-review-dialog-backdrop" data-editor-invite-action="close"></div>
      <section class="nf-review-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="nf-editor-invite-guide-title">
        <button class="nf-review-close" data-editor-invite-action="close" aria-label="关闭编辑邀请说明">×</button>
        <span class="nf-review-label">EDITORIAL APPOINTMENT</span>
        <div class="nf-review-seal is-small">ED</div>
        <h2 id="nf-editor-invite-guide-title">${escapeHtml(title)}</h2>
        <p>${escapeHtml(body)}</p>
        ${hasInvite && !['accepted', 'already-editor'].includes(state.inviteStatus) ? '<p>操作流程：选择登录方式 → 完成登录 → 自动接受一次性邀请 → 进入编辑部。</p>' : ''}
        <div class="nf-review-actions">${actions}</div>
      </section>`;
  };

  const readMembership = async () => {
    state.editorialRole = '';
    if (!state.account?.user) return;
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
    }
  };

  const clearInviteParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete(INVITE_PARAM);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const acceptPendingInvitation = async () => {
    if (state.handlingInvite || !state.account?.user) return false;
    const rawToken = pendingInviteToken();
    if (!rawToken) return false;
    state.handlingInvite = true;
    state.inviteStatus = 'accepting';
    state.inviteError = '';
    state.inviteDismissed = false;
    renderInviteGuide();
    try {
      if (['editor_in_chief', 'editor'].includes(state.editorialRole)) {
        state.inviteStatus = 'already-editor';
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
      if (state.editorialRole !== 'editor') throw new Error('编辑身份尚未生效，请重试。');
      state.inviteStatus = 'accepted';
      clearInviteParam();
      window.setTimeout(() => void window.HaoAccount?.refresh?.(), 0);
      return true;
    } catch (error) {
      console.warn('NewsFlow editor appointment failed:', error);
      state.inviteStatus = 'failed';
      state.inviteError = error?.message || '编辑任命暂未完成。';
      return false;
    } finally {
      state.handlingInvite = false;
      syncEditorialEntry();
      renderInviteGuide();
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

  const syncEditorialEntry = () => {
    const role = isChief() ? 'chief' : isEditorialMember() ? 'editor' : 'reader';
    document.querySelectorAll('[data-action="open-editorial-office"]').forEach((trigger) => {
      trigger.removeAttribute('data-newsflow-role');
      const topbarLabel = trigger.querySelector('.nf-mode-launcher-label');
      if (topbarLabel) topbarLabel.textContent = role === 'chief' ? '主编' : role === 'editor' ? '编辑' : '编辑部';
      const navLabel = trigger.querySelector('.nav-name span:last-child, :scope > span:last-child');
      if (navLabel && !navLabel.classList.contains('nf-mode-launcher-label')) navLabel.textContent = '编辑部';
      trigger.setAttribute('aria-label', role === 'reader'
        ? '开通 Newsflow Pro，进入编辑部'
        : role === 'chief' ? '打开主编编辑部总览' : '打开编辑部总览');
      trigger.title = role === 'reader' ? 'Newsflow Pro · 编辑部' : role === 'chief' ? '主编 · 编辑部总览' : '编辑 · 编辑部总览';
    });
  };

  const openEditorialOverview = () => {
    if (!state.account?.user || !isEditorialMember()) {
      openAccount();
      return;
    }
    window.NewsFlowReviewGame?.openOverview?.();
  };

  const openGovernance = () => {
    if (!state.account?.user || !isChief()) return;
    window.NewsFlowGovernance?.open?.();
  };

  const hydrateAccount = async (snapshot) => {
    state.account = snapshot || null;
    if (!snapshot?.user) {
      state.editorialRole = '';
      syncEditorialEntry();
      renderInviteGuide();
      return;
    }
    await readMembership();
    if (pendingInviteToken()) await acceptPendingInvitation();
    syncEditorialEntry();
    renderInviteGuide();
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-editor-invite-action]');
    if (!trigger || !document.getElementById(INVITE_ROOT_ID)?.contains(trigger)) return;
    const action = trigger.dataset.editorInviteAction;
    if (action === 'sign-in') openAccount();
    else if (action === 'retry') void acceptPendingInvitation();
    else if (action === 'enter') {
      state.inviteDismissed = true;
      renderInviteGuide();
      openEditorialOverview();
    } else if (action === 'close') {
      state.inviteDismissed = true;
      renderInviteGuide();
    }
  });

  window.addEventListener('newsflow:rendered', syncEditorialEntry);
  window.addEventListener('newsflow:edition-rendered', syncEditorialEntry);
  window.addEventListener('newsflow:open-editorial-office', openEditorialOverview);
  window.addEventListener('newsflow:open-editorial-overview', openEditorialOverview);
  window.addEventListener('newsflow:switch-role', syncEditorialEntry);

  syncEditorialEntry();
  renderInviteGuide();
  if (window.HaoAccount?.subscribe) window.HaoAccount.subscribe(hydrateAccount);
  else window.addEventListener('hao:account-changed', (event) => { void hydrateAccount(event.detail); });

  window.NewsFlowMode = Object.freeze({
    getRole: () => isEditorialMember() ? 'editor' : 'reader',
    getEditorialRole: editorialRole,
    isChief,
    enterEditor: openEditorialOverview,
    openGovernance,
    createEditorInvite
  });
})();