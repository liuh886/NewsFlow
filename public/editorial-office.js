(() => {
  'use strict';

  const REFERRAL_PARAM = 'editor-ref';
  const REFERRAL_ROOT_ID = 'newsflow-editor-referral-root';
  const CANONICAL_ROOT = 'https://liuh886.github.io/NewsFlow/';

  const state = {
    account: null,
    editorialRole: '',
    referralCode: '',
    handlingReferral: false,
    referralStatus: '',
    referralError: '',
    referralDismissed: false
  };

  const accountUserId = () => String(state.account?.user?.id || '');
  const isChief = () => state.editorialRole === 'editor_in_chief';
  const isPro = () => state.account?.isPro === true || window.HaoAccount?.can?.('newsflow.pro') === true;
  const isOfficialEditor = () => ['editor_in_chief', 'editor'].includes(state.editorialRole);
  const isEditorialMember = () => isOfficialEditor() || isPro();
  const editorialRole = () => isChief() ? 'editor_in_chief' : isEditorialMember() ? 'editor' : '';
  const openAccount = () => window.HaoAccount?.open?.();
  const getClient = async () => window.HaoAccount?.getClient?.();
  const pendingReferralCode = () => String(new URLSearchParams(window.location.search).get(REFERRAL_PARAM) || '').trim().toUpperCase();

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const canonicalEditorReferralUrl = (code) => {
    const url = new URL(CANONICAL_ROOT);
    url.searchParams.set(REFERRAL_PARAM, String(code || '').trim().toUpperCase());
    return url.toString();
  };

  const ensureReferralRoot = () => {
    let root = document.getElementById(REFERRAL_ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = REFERRAL_ROOT_ID;
      document.body.append(root);
    }
    return root;
  };

  const renderReferralGuide = () => {
    const root = ensureReferralRoot();
    const code = pendingReferralCode();
    const hasReferral = Boolean(code);
    const shouldShow = !state.referralDismissed && (
      hasReferral
      || state.referralStatus === 'accepted'
      || state.referralStatus === 'already-editor'
      || state.referralStatus === 'failed'
    );
    if (!shouldShow) {
      root.replaceChildren();
      root.hidden = true;
      return;
    }

    const signedIn = Boolean(state.account?.user);
    const processing = state.handlingReferral || state.referralStatus === 'accepting';
    let title = '受邀成为 Newsflow 编辑';
    let body = '这是 Newsflow 编辑的专属邀请。登录并接受后，你将成为 Editor，并获得 3 个月 Newsflow Pro 赠送权益；不会创建新的付费订阅。';
    let actions = signedIn
      ? '<button class="is-primary" data-editor-referral-action="accept">接受编辑邀请</button>'
      : '<button class="is-primary" data-editor-referral-action="sign-in">登录并接受邀请</button>';

    if (processing) {
      title = '正在接受编辑邀请';
      body = '正在验证编辑识别码并配置编辑权限，请稍候。';
      actions = '<button class="is-primary" disabled aria-busy="true">处理中…</button>';
    } else if (state.referralStatus === 'accepted') {
      title = '编辑邀请已接受';
      body = '你现在是 Frontier Systems Review 的 Editor，并已获得 3 个月 Newsflow Pro。你的专属邀请链接已经生成，可在编辑部总览中复制和分享。';
      actions = '<button class="is-primary" data-editor-referral-action="enter">进入编辑部</button><button data-editor-referral-action="close">留在刊物</button>';
    } else if (state.referralStatus === 'already-editor') {
      title = '编辑身份已生效';
      body = '当前账户已经是 Newsflow 正式编辑，无需再次接受邀请。你的专属邀请链接可在编辑部总览中查看。';
      actions = '<button class="is-primary" data-editor-referral-action="enter">进入编辑部</button><button data-editor-referral-action="close">留在刊物</button>';
    } else if (state.referralStatus === 'failed') {
      title = '暂未完成编辑邀请';
      body = state.referralError || '编辑识别码可能无效、邀请人已停用，或编辑服务暂时不可用。链接会保留，你可以重试。';
      actions = signedIn
        ? '<button class="is-primary" data-editor-referral-action="accept">重新接受</button><button data-editor-referral-action="close">稍后处理</button>'
        : '<button class="is-primary" data-editor-referral-action="sign-in">登录后重试</button><button data-editor-referral-action="close">稍后处理</button>';
    }

    root.hidden = false;
    root.innerHTML = `<div class="nf-review-dialog-backdrop" data-editor-referral-action="close"></div>
      <section class="nf-review-invite-dialog nf-editor-referral-guide" role="dialog" aria-modal="true" aria-labelledby="nf-editor-referral-guide-title">
        <button class="nf-review-close" data-editor-referral-action="close" aria-label="关闭编辑邀请说明">×</button>
        <span class="nf-review-label">EDITOR REFERRAL</span>
        <div class="nf-review-seal is-small">ED</div>
        <h2 id="nf-editor-referral-guide-title">${escapeHtml(title)}</h2>
        <p>${escapeHtml(body)}</p>
        ${hasReferral && !['accepted', 'already-editor'].includes(state.referralStatus) ? `<div class="nf-editor-referral-code"><span>EDITOR CODE</span><strong>${escapeHtml(code)}</strong></div><p>流程：选择登录方式 → 完成登录 → 接受编辑邀请 → 进入编辑部 → 获得自己的专属邀请链接。</p>` : ''}
        <div class="nf-review-actions">${actions}</div>
      </section>`;
  };

  const readMembership = async () => {
    state.editorialRole = '';
    state.referralCode = '';
    if (!state.account?.user) return;
    try {
      const client = await getClient();
      if (!client) return;
      const { data, error } = await client
        .from('newsflow_editorial_members')
        .select('role,active,referral_code')
        .eq('user_id', accountUserId())
        .maybeSingle();
      if (error) throw error;
      if (data?.active && ['editor_in_chief', 'editor'].includes(data.role)) {
        state.editorialRole = data.role;
        state.referralCode = String(data.referral_code || '');
      }
    } catch (error) {
      console.warn('NewsFlow editorial membership unavailable:', error);
    }
  };

  const clearReferralParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete(REFERRAL_PARAM);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const acceptPendingReferral = async () => {
    if (state.handlingReferral || !state.account?.user) return false;
    const code = pendingReferralCode();
    if (!code) return false;
    state.handlingReferral = true;
    state.referralStatus = 'accepting';
    state.referralError = '';
    state.referralDismissed = false;
    renderReferralGuide();
    try {
      if (isOfficialEditor()) {
        state.referralStatus = 'already-editor';
        clearReferralParam();
        return true;
      }
      const client = await getClient();
      if (!client) throw new Error('编辑邀请服务暂不可用。');
      const { error } = await client.rpc('newsflow_accept_editor_referral', { referral_code: code });
      if (error) throw error;
      await readMembership();
      if (state.editorialRole !== 'editor' || !state.referralCode) throw new Error('编辑身份尚未生效，请重试。');
      state.referralStatus = 'accepted';
      clearReferralParam();
      window.setTimeout(() => void window.HaoAccount?.refresh?.(), 0);
      return true;
    } catch (error) {
      console.warn('NewsFlow editor referral failed:', error);
      state.referralStatus = 'failed';
      state.referralError = error?.message || '编辑邀请暂未完成。';
      return false;
    } finally {
      state.handlingReferral = false;
      syncEditorialEntry();
      renderReferralGuide();
    }
  };

  const getEditorReferral = async () => {
    if (!state.account?.user || !isOfficialEditor() || !state.referralCode) return null;
    const client = await getClient();
    if (!client) throw new Error('编辑邀请服务暂不可用。');
    const { count, error } = await client
      .from('newsflow_editor_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('inviter_user_id', accountUserId());
    if (error) throw error;
    return Object.freeze({
      code: state.referralCode,
      url: canonicalEditorReferralUrl(state.referralCode),
      direct_referrals: Number(count || 0)
    });
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
      state.referralCode = '';
      syncEditorialEntry();
      renderReferralGuide();
      return;
    }
    await readMembership();
    if (pendingReferralCode()) await acceptPendingReferral();
    syncEditorialEntry();
    renderReferralGuide();
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-editor-referral-action]');
    if (!trigger || !document.getElementById(REFERRAL_ROOT_ID)?.contains(trigger)) return;
    const action = trigger.dataset.editorReferralAction;
    if (action === 'sign-in') openAccount();
    else if (action === 'accept') void acceptPendingReferral();
    else if (action === 'enter') {
      state.referralDismissed = true;
      renderReferralGuide();
      openEditorialOverview();
    } else if (action === 'close') {
      state.referralDismissed = true;
      renderReferralGuide();
    }
  });

  window.addEventListener('newsflow:rendered', syncEditorialEntry);
  window.addEventListener('newsflow:edition-rendered', syncEditorialEntry);
  window.addEventListener('newsflow:open-editorial-office', openEditorialOverview);
  window.addEventListener('newsflow:open-editorial-overview', openEditorialOverview);
  window.addEventListener('newsflow:switch-role', syncEditorialEntry);

  syncEditorialEntry();
  renderReferralGuide();
  if (window.HaoAccount?.subscribe) window.HaoAccount.subscribe(hydrateAccount);
  else window.addEventListener('hao:account-changed', (event) => { void hydrateAccount(event.detail); });

  window.NewsFlowMode = Object.freeze({
    getRole: () => isEditorialMember() ? 'editor' : 'reader',
    getEditorialRole: editorialRole,
    isChief,
    enterEditor: openEditorialOverview,
    openGovernance,
    getEditorReferral
  });
})();