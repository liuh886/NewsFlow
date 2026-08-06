(() => {
  'use strict';

  const ROLE_STORAGE_KEY = 'newsflow_role_v1';
  const DECISION_STORAGE_KEY = 'newsflow_editorial_decisions_v2';
  const ROLE_FIELD = 'newsflow_role';
  const rootId = 'newsflow-editorial-office-root';

  const DECISIONS = [
    {
      id: 'cover_story',
      label: '封面文章',
      code: 'COVER',
      key: '1',
      description: '进入本期最高优先级，作为正式 Issue 的封面候选。'
    },
    {
      id: 'accept',
      label: '接受',
      code: 'ACCEPT',
      key: '2',
      description: '证据、判断与表达达到正式出版标准。'
    },
    {
      id: 'minor_revision',
      label: '小修',
      code: 'MINOR',
      key: '3',
      description: '核心成立，仅需补充口径、来源或表达细节。'
    },
    {
      id: 'major_revision',
      label: '大修',
      code: 'MAJOR',
      key: '4',
      description: '议题重要，但证据链、结构或结论仍需实质重做。'
    },
    {
      id: 'reject',
      label: '拒稿',
      code: 'REJECT',
      key: '5',
      description: '未达到本刊的事实、时效或产业影响门槛。'
    }
  ];

  const state = {
    account: null,
    role: '',
    roleDialogOpen: false,
    officeOpen: false,
    officeTab: 'desk',
    storylines: [],
    candidates: [],
    decisions: new Map(),
    events: [],
    loading: false,
    promptedForUser: '',
    notice: ''
  };

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const readJson = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch {
      return fallback;
    }
  };

  const accountUserId = () => String(state.account?.user?.id || '');
  const roleStorageKey = () => accountUserId() ? `${ROLE_STORAGE_KEY}:${accountUserId()}` : ROLE_STORAGE_KEY;

  const ensureRoot = () => {
    let root = document.getElementById(rootId);
    if (!root) {
      root = document.createElement('div');
      root.id = rootId;
      document.body.appendChild(root);
    }
    return root;
  };

  const loadDecisions = () => {
    const payload = readJson(DECISION_STORAGE_KEY, {});
    state.decisions = new Map(Object.entries(payload.decisions || {}));
    state.events = Array.isArray(payload.events) ? payload.events : [];
  };

  const saveDecisions = () => {
    localStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify({
      schema_version: '2.0',
      decisions: Object.fromEntries(state.decisions),
      events: state.events.slice(-500)
    }));
  };

  const roleLabel = () => state.role === 'editor' ? '主编' : state.role === 'reader' ? '读者' : '选择身份';

  const activeStorylines = () => state.storylines.filter((storyline) => storyline?.status !== 'retired');
  const ccusStorylines = () => activeStorylines().filter((storyline) => storyline.channel_id === 'ccus-energy-transition');
  const regularStorylines = () => activeStorylines().filter((storyline) => storyline.channel_id !== 'ccus-energy-transition');
  const pendingCandidates = () => state.candidates.filter((candidate) => !state.decisions.has(String(candidate.id || '')));

  const decisionCounts = () => {
    const counts = Object.fromEntries(DECISIONS.map((decision) => [decision.id, 0]));
    for (const decision of state.decisions.values()) counts[decision] = (counts[decision] || 0) + 1;
    return counts;
  };

  const accountName = () => state.account?.profile?.display_name
    || state.account?.user?.user_metadata?.full_name
    || state.account?.user?.email
    || 'NewsFlow Member';

  const openAccount = () => {
    if (window.HaoAccount?.open) window.HaoAccount.open();
  };

  const syncRole = async (role) => {
    const account = window.HaoAccount?.getState?.();
    if (!account?.user || !window.HaoAccount?.saveProductData) return;
    const existingPreferences = account.productAccount?.preferences && typeof account.productAccount.preferences === 'object'
      ? account.productAccount.preferences
      : {};
    const existingState = account.productAccount?.state && typeof account.productAccount.state === 'object'
      ? account.productAccount.state
      : {};
    try {
      await window.HaoAccount.saveProductData({
        preferences: { ...existingPreferences, [ROLE_FIELD]: role },
        productState: { ...existingState, [ROLE_FIELD]: role }
      });
    } catch (error) {
      console.warn('NewsFlow role sync failed:', error);
    }
  };

  const setRole = async (role) => {
    if (!state.account?.user) {
      openAccount();
      return;
    }
    if (!['reader', 'editor'].includes(role)) return;
    state.role = role;
    localStorage.setItem(roleStorageKey(), role);
    state.roleDialogOpen = false;
    state.notice = role === 'editor' ? '已进入主编身份。' : '已进入读者身份。';
    await syncRole(role);
    decorateApp();
    renderOverlay();
    if (role === 'editor') openOffice();
  };

  const hydrateAccount = (snapshot) => {
    state.account = snapshot || null;
    if (!snapshot?.user) {
      state.role = '';
      state.roleDialogOpen = false;
      state.officeOpen = false;
      decorateApp();
      renderOverlay();
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
    if (!state.role && userId && state.promptedForUser !== userId) {
      state.promptedForUser = userId;
      window.setTimeout(() => {
        state.roleDialogOpen = true;
        renderOverlay();
      }, 250);
    }
    decorateApp();
    renderOverlay();
  };

  const loadOfficeData = async () => {
    state.loading = true;
    renderOverlay();
    try {
      const [storylineResponse, candidateResponse] = await Promise.all([
        fetch('./data/storylines.json', { cache: 'no-store' }),
        fetch('./data/review-candidates.json', { cache: 'no-store' })
      ]);
      state.storylines = storylineResponse.ok ? await storylineResponse.json() : [];
      state.candidates = candidateResponse.ok ? await candidateResponse.json() : [];
      if (!Array.isArray(state.storylines)) state.storylines = [];
      if (!Array.isArray(state.candidates)) state.candidates = [];
    } catch (error) {
      console.warn('NewsFlow editorial office data unavailable:', error);
      state.storylines = [];
      state.candidates = [];
    } finally {
      state.loading = false;
      renderOverlay();
    }
  };

  const openOffice = async () => {
    if (!state.account?.user) {
      openAccount();
      return;
    }
    if (state.role !== 'editor') {
      state.roleDialogOpen = true;
      renderOverlay();
      return;
    }
    state.officeOpen = true;
    state.roleDialogOpen = false;
    state.officeTab = 'desk';
    renderOverlay();
    if (!state.storylines.length && !state.candidates.length) await loadOfficeData();
  };

  const closeOffice = () => {
    state.officeOpen = false;
    renderOverlay();
  };

  const storylineTitle = (candidate) => {
    const ids = Array.isArray(candidate.storyline_ids) ? candidate.storyline_ids : [];
    const matches = ids
      .map((id) => state.storylines.find((storyline) => storyline.id === id)?.title)
      .filter(Boolean);
    if (matches.length) return matches.join(' / ');
    return candidate.channel_id === 'ccus-energy-transition' ? 'CCUS Special Issue' : 'General Submission';
  };

  const isSpecialIssue = (candidate) => candidate?.channel_id === 'ccus-energy-transition'
    || (candidate?.tags || []).some((tag) => /ccus|ccs|carbon/i.test(String(tag)));

  const currentCandidate = () => pendingCandidates()[0] || null;

  const recordDecision = (decisionId) => {
    const candidate = currentCandidate();
    const decision = DECISIONS.find((item) => item.id === decisionId);
    if (!candidate || !decision) return;
    const candidateId = String(candidate.id || '');
    state.decisions.set(candidateId, decisionId);
    state.events.push({
      manuscript_id: candidateId,
      decision: decisionId,
      decision_label: decision.label,
      title: String(candidate.title || ''),
      source_url: String(candidate.url || ''),
      channel_id: String(candidate.channel_id || ''),
      storyline_ids: Array.isArray(candidate.storyline_ids) ? candidate.storyline_ids : [],
      special_issue: isSpecialIssue(candidate) ? 'ccus' : null,
      editor_user_id: accountUserId(),
      decided_at: new Date().toISOString()
    });
    saveDecisions();
    state.notice = `决定已签发：${decision.label}`;
    renderOverlay();
  };

  const exportDecisions = () => {
    const payload = {
      schema_version: '2.0',
      app_id: 'newsflow-editorial-office',
      edition_id: 'frontier-systems-review',
      exported_at: new Date().toISOString(),
      editor_user_id: accountUserId(),
      decisions: state.events
    };
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `newsflow-editorial-decisions-${payload.exported_at.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const roleCard = (role, label, english, description, details) => `
    <button class="nf-role-card ${state.role === role ? 'is-selected' : ''}" data-editorial-action="choose-role" data-role="${role}">
      <span class="nf-role-card-number">${role === 'reader' ? '01' : '02'}</span>
      <span class="nf-role-card-copy">
        <span class="nf-role-card-kicker">${escapeHtml(english)}</span>
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(description)}</span>
        <small>${escapeHtml(details)}</small>
      </span>
      <span class="nf-role-card-mark">${state.role === role ? '已登记' : '选择'}</span>
    </button>`;

  const renderRoleDialog = () => {
    if (!state.roleDialogOpen) return '';
    return `<div class="nf-editorial-backdrop" data-editorial-action="close-role-dialog"></div>
      <section class="nf-role-dialog" role="dialog" aria-modal="true" aria-labelledby="nf-role-title">
        <header class="nf-role-dialog-header">
          <div><span class="nf-office-eyebrow">NewsFlow Identity Registry</span><h2 id="nf-role-title">入刊身份登记</h2></div>
          <button class="nf-office-close" data-editorial-action="close-role-dialog" aria-label="关闭身份选择">×</button>
        </header>
        <p class="nf-role-intro">欢迎，${escapeHtml(accountName())}。请选择进入本刊时的身份。身份决定你看到的是出版物，还是编辑部工作台；之后可随时切换。</p>
        <div class="nf-role-grid">
          ${roleCard('reader', '读者', 'READER', '阅读正式 Issue、收藏信号并反馈选题价值。', '保持沉浸式期刊阅读，不承担稿件决定。')}
          ${roleCard('editor', '主编', 'EDITOR-IN-CHIEF', '管理征稿范围，并对候选稿件签发正式决定。', '封面文章 / 接受 / 小修 / 大修 / 拒稿。')}
        </div>
        <footer class="nf-role-footer"><span>身份会保存到你的 NewsFlow 账户状态。</span><button data-editorial-action="close-role-dialog">暂不切换</button></footer>
      </section>`;
  };

  const renderScopeCard = (storyline, special = false) => `
    <article class="nf-cfp-card ${special ? 'is-special' : ''}">
      <div class="nf-cfp-card-head"><span>${special ? 'SPECIAL ISSUE' : 'CALL FOR PAPERS'}</span><span>${escapeHtml(String(storyline.evidence_count || 0).padStart(2, '0'))} records</span></div>
      <h3>${escapeHtml(storyline.title)}</h3>
      <p>${escapeHtml(storyline.question || '')}</p>
      <div class="nf-cfp-current"><span>Current editorial view</span><strong>${escapeHtml(storyline.current_view || '')}</strong></div>
      <div class="nf-cfp-watch"><span>征稿关注</span><p>${(storyline.watch_for || []).map(escapeHtml).join(' · ') || '持续观察'}</p></div>
    </article>`;

  const renderDesk = () => {
    const candidate = currentCandidate();
    const counts = decisionCounts();
    const reviewed = state.events.length;
    const pending = pendingCandidates().length;
    return `<section class="nf-office-panel" aria-labelledby="nf-desk-heading">
      <div class="nf-office-summary-grid">
        <div><span>待审稿件</span><strong>${String(pending).padStart(2, '0')}</strong></div>
        <div><span>已签发决定</span><strong>${String(reviewed).padStart(2, '0')}</strong></div>
        <div class="is-special"><span>当前专刊</span><strong>CCUS</strong></div>
      </div>
      ${candidate ? `<article class="nf-manuscript">
        <header class="nf-manuscript-head">
          <div><span class="nf-office-eyebrow">Manuscript under review</span><span class="nf-manuscript-id">MS-${escapeHtml(String(candidate.id || '').slice(-8).toUpperCase())}</span></div>
          <span class="nf-manuscript-issue ${isSpecialIssue(candidate) ? 'is-special' : ''}">${isSpecialIssue(candidate) ? 'CCUS SPECIAL ISSUE' : 'REGULAR ISSUE'}</span>
        </header>
        <div class="nf-manuscript-scope"><span>征稿范围</span><strong>${escapeHtml(storylineTitle(candidate))}</strong></div>
        <h2 id="nf-desk-heading">${escapeHtml(candidate.title || '未命名稿件')}</h2>
        <p class="nf-manuscript-summary">${escapeHtml(candidate.short_summary || '')}</p>
        <dl class="nf-manuscript-meta">
          <div><dt>Channel</dt><dd>${escapeHtml(candidate.channel_id || 'unassigned')}</dd></div>
          <div><dt>Event type</dt><dd>${escapeHtml(candidate.event_type || 'general')}</dd></div>
          <div><dt>Submitted</dt><dd>${escapeHtml(candidate.published_at || candidate.event_date || 'date pending')}</dd></div>
        </dl>
        <section class="nf-decision-letter">
          <div class="nf-decision-letter-heading"><span>EDITORIAL DECISION</span><span>按 1–5 键快速签发</span></div>
          <div class="nf-decision-grid">${DECISIONS.map((decision) => `
            <button class="nf-decision-button is-${decision.id}" data-editorial-action="decision" data-decision="${decision.id}">
              <span>${decision.code}</span><strong>${decision.label}</strong><small>${decision.description}</small><kbd>${decision.key}</kbd>
            </button>`).join('')}</div>
        </section>
      </article>` : `<div class="nf-office-empty"><div class="nf-office-seal">✓</div><h2 id="nf-desk-heading">本轮稿件已处理完毕</h2><p>编辑决定已保存在本机档案。新的 Agent 候选稿件进入 inbox 后会自动出现在这里。</p></div>`}
      <div class="nf-decision-tally">${DECISIONS.map((decision) => `<span><b>${counts[decision.id] || 0}</b>${decision.label}</span>`).join('')}</div>
    </section>`;
  };

  const renderCalls = () => `<section class="nf-office-panel" aria-labelledby="nf-cfp-heading">
    <div class="nf-panel-heading"><div><span class="nf-office-eyebrow">Calls for papers</span><h2 id="nf-cfp-heading">长期议题即征稿范围</h2></div><p>Storyline 不是后台标签，而是本刊持续征集证据、案例和反证的正式栏目范围。</p></div>
    <section class="nf-special-issue-banner"><div><span>SPECIAL ISSUE · 01</span><h3>CCUS：从项目交付到证据与责任</h3><p>围绕项目投运、CO₂ 网络商业结构、MRV 与长期责任形成连续专题。</p></div><div class="nf-special-issue-mark">CCUS</div></section>
    <div class="nf-cfp-grid">${ccusStorylines().map((storyline) => renderScopeCard(storyline, true)).join('')}</div>
    <div class="nf-regular-call-heading"><span>REGULAR CALLS</span><strong>AI 基础设施五层框架</strong></div>
    <div class="nf-cfp-grid">${regularStorylines().map((storyline) => renderScopeCard(storyline, false)).join('')}</div>
  </section>`;

  const renderArchive = () => {
    const counts = decisionCounts();
    const recent = [...state.events].reverse().slice(0, 20);
    return `<section class="nf-office-panel" aria-labelledby="nf-archive-heading">
      <div class="nf-panel-heading"><div><span class="nf-office-eyebrow">Decision archive</span><h2 id="nf-archive-heading">评审档案</h2></div><button class="nf-office-secondary" data-editorial-action="export">导出决定记录</button></div>
      <div class="nf-archive-tally">${DECISIONS.map((decision) => `<div class="is-${decision.id}"><span>${decision.code}</span><strong>${counts[decision.id] || 0}</strong><small>${decision.label}</small></div>`).join('')}</div>
      <div class="nf-archive-table" role="table" aria-label="最近评审决定">
        ${recent.length ? recent.map((event) => `<div class="nf-archive-row" role="row"><span role="cell">${escapeHtml(event.manuscript_id)}</span><strong role="cell">${escapeHtml(event.title)}</strong><span role="cell" class="is-${escapeHtml(event.decision)}">${escapeHtml(event.decision_label)}</span><time role="cell">${escapeHtml(String(event.decided_at || '').slice(0, 10))}</time></div>`).join('') : '<div class="nf-archive-empty">尚未签发编辑决定。</div>'}
      </div>
    </section>`;
  };

  const renderOffice = () => {
    if (!state.officeOpen) return '';
    const panel = state.loading
      ? '<div class="nf-office-loading"><div class="nf-office-seal">NF</div><span>正在调取稿件与征稿范围</span></div>'
      : state.officeTab === 'calls' ? renderCalls()
        : state.officeTab === 'archive' ? renderArchive()
          : renderDesk();
    return `<section class="nf-office-shell" role="dialog" aria-modal="true" aria-labelledby="nf-office-title">
      <header class="nf-office-header">
        <div class="nf-office-brand"><span class="nf-office-seal">NF</span><div><span class="nf-office-eyebrow">Frontier Systems Review</span><h1 id="nf-office-title">Editorial Office</h1></div></div>
        <div class="nf-office-editor"><span>EDITOR-IN-CHIEF</span><strong>${escapeHtml(accountName())}</strong></div>
        <button class="nf-office-close" data-editorial-action="close-office" aria-label="关闭编辑部">×</button>
      </header>
      <nav class="nf-office-tabs" aria-label="编辑部导航">
        <button class="${state.officeTab === 'desk' ? 'is-active' : ''}" data-editorial-action="tab" data-tab="desk">编辑部</button>
        <button class="${state.officeTab === 'calls' ? 'is-active' : ''}" data-editorial-action="tab" data-tab="calls">征稿启事</button>
        <button class="${state.officeTab === 'archive' ? 'is-active' : ''}" data-editorial-action="tab" data-tab="archive">评审档案</button>
        <button data-editorial-action="open-role-dialog">切换身份</button>
      </nav>
      <main class="nf-office-content">${panel}</main>
      <footer class="nf-office-footer"><span>All decisions are editorial judgments, not factual authority.</span><span>${escapeHtml(state.notice || 'NewsFlow Editorial Office · Local-first decision record')}</span></footer>
    </section>`;
  };

  const renderOverlay = () => {
    const root = ensureRoot();
    root.innerHTML = `${renderRoleDialog()}${renderOffice()}`;
    document.documentElement.classList.toggle('nf-editorial-modal-open', state.roleDialogOpen || state.officeOpen);
  };

  const mountRoleTrigger = () => {
    const target = document.querySelector('.top-actions');
    if (!target || target.querySelector('[data-editorial-role-trigger]')) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = `nf-role-trigger is-${state.role || 'unset'}`;
    trigger.dataset.editorialRoleTrigger = 'true';
    trigger.dataset.editorialAction = state.role === 'editor' ? 'open-office' : 'open-role-dialog';
    trigger.setAttribute('aria-label', state.role === 'editor' ? '打开主编编辑部' : '选择 NewsFlow 身份');
    trigger.innerHTML = `<span>${state.role === 'editor' ? 'EIC' : state.role === 'reader' ? 'R' : 'ID'}</span><strong>${escapeHtml(roleLabel())}</strong>`;
    target.prepend(trigger);
  };

  const decorateReviewEntrances = () => {
    document.querySelectorAll('[data-action="open-review"]').forEach((button) => {
      button.setAttribute('title', state.role === 'editor' ? '打开主编编辑部' : '主编身份入口');
      button.setAttribute('aria-label', state.role === 'editor' ? '打开主编编辑部' : '选择主编身份');
      const label = button.querySelector('.nav-name span:last-child') || button.querySelector('span:last-child');
      if (label && label.textContent?.trim() === '审核') label.textContent = '主编室';
      if (label && label.textContent?.trim() === '开始审核') label.textContent = '进入编辑部';
    });
  };

  function decorateApp() {
    mountRoleTrigger();
    decorateReviewEntrances();
  }

  const handleReviewCapture = (event) => {
    const target = event.target.closest?.('[data-action="open-review"]');
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (!state.account?.user) openAccount();
    else if (state.role === 'editor') openOffice();
    else {
      state.roleDialogOpen = true;
      renderOverlay();
    }
  };

  const handleEditorialAction = (event) => {
    const target = event.target.closest?.('[data-editorial-action]');
    if (!target) return;
    const action = target.dataset.editorialAction;
    if (action === 'choose-role') setRole(target.dataset.role || '');
    else if (action === 'open-role-dialog') {
      if (!state.account?.user) openAccount();
      else {
        state.roleDialogOpen = true;
        renderOverlay();
      }
    } else if (action === 'close-role-dialog') {
      state.roleDialogOpen = false;
      renderOverlay();
    } else if (action === 'open-office') openOffice();
    else if (action === 'close-office') closeOffice();
    else if (action === 'tab') {
      state.officeTab = target.dataset.tab || 'desk';
      renderOverlay();
    } else if (action === 'decision') recordDecision(target.dataset.decision || '');
    else if (action === 'export') exportDecisions();
  };

  document.addEventListener('click', handleReviewCapture, true);
  document.addEventListener('click', handleEditorialAction);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (state.roleDialogOpen) {
        state.roleDialogOpen = false;
        renderOverlay();
      } else if (state.officeOpen) closeOffice();
      return;
    }
    if (!state.officeOpen || state.officeTab !== 'desk') return;
    const decision = DECISIONS.find((item) => item.key === event.key);
    if (decision) recordDecision(decision.id);
  });

  const appRoot = document.querySelector('#app');
  if (appRoot) new MutationObserver(decorateApp).observe(appRoot, { childList: true });

  loadDecisions();
  ensureRoot();
  decorateApp();
  if (window.HaoAccount?.subscribe) window.HaoAccount.subscribe(hydrateAccount);
  else window.addEventListener('hao:account-changed', (event) => hydrateAccount(event.detail));
})();
