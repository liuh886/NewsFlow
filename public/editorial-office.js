(() => {
  'use strict';

  const INVITE_PARAM = 'editor-invite';

  const state = {
    account: null,
    editorialRole: '',
    handlingInvite: false
  };

  const accountUserId = () => String(state.account?.user?.id || '');
  const isChief = () => state.editorialRole === 'editor_in_chief';
  const isPro = () => state.account?.isPro === true || window.HaoAccount?.can?.('newsflow.pro') === true;
  const isEditorialMember = () => isChief() || state.editorialRole === 'editor' || isPro();
  const editorialRole = () => isChief() ? 'editor_in_chief' : isEditorialMember() ? 'editor' : '';
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
    const rawToken = new URLSearchParams(window.location.search).get(INVITE_PARAM);
    if (!rawToken) return false;
    state.handlingInvite = true;
    try {
      if (['editor_in_chief', 'editor'].includes(state.editorialRole)) {
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
      window.setTimeout(() => void window.HaoAccount?.refresh?.(), 0);
      return true;
    } catch (error) {
      console.warn('NewsFlow editor appointment failed:', error);
      return false;
    } finally {
      state.handlingInvite = false;
      syncEditorialEntry();
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
      if (new URLSearchParams(window.location.search).has(INVITE_PARAM)) openAccount();
      return;
    }
    await readMembership();
    await acceptPendingInvitation();
    syncEditorialEntry();
  };

  window.addEventListener('newsflow:rendered', syncEditorialEntry);
  window.addEventListener('newsflow:edition-rendered', syncEditorialEntry);
  window.addEventListener('newsflow:open-editorial-office', openEditorialOverview);
  window.addEventListener('newsflow:open-editorial-overview', openEditorialOverview);
  window.addEventListener('newsflow:switch-role', syncEditorialEntry);

  syncEditorialEntry();
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