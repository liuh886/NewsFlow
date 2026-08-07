(() => {
  'use strict';

  const ROLE_STORAGE_KEY = 'newsflow_role_v1';
  const EDITORIAL_STORAGE_KEY = 'newsflow_editorial_game_v3';
  const ROLE_FIELD = 'newsflow_role';
  const ISSUE_CAPACITY = 5;
  const rootId = 'newsflow-editorial-office-root';
  const DATA_TIMEOUT_MS = 5000;

  const DECISIONS = [
    { id: 'accept', label: '接受', code: 'ACCEPT', key: '1', description: '达到正式出版标准，进入本期编排候选。' },
    { id: 'minor_revision', label: '小修', code: 'MINOR', key: '2', description: '核心成立，仅需补充口径、来源或表达细节。' },
    { id: 'major_revision', label: '大修', code: 'MAJOR', key: '3', description: '议题重要，但证据链、结构或结论仍需实质重做。' },
    { id: 'reject', label: '拒稿', code: 'REJECT', key: '4', description: '未达到本刊的事实、时效或产业影响门槛。' }
  ];

  const REASON_LABELS = new Map([
    ['report data cutoff is not disclosed', '报告未披露数据截止日期，时效边界仍需主编判断。'],
    ['institutional report requires verification.report_context', '机构报告缺少版本、数据截止日期或方法学核验。'],
    ['full source was not accessed', '尚未完整访问原始来源，不能仅凭摘要作出出版判断。'],
    ['summary is not supported sentence by sentence', '摘要中的部分陈述尚未逐句对应原始证据。'],
    ['unregistered source', '来源尚未进入本刊可信来源登记。'],
    ['candidate is a duplicate', '候选内容与既有 Signal 高度重复。'],
    ['score below threshold', '自动评分未达到直接进入正式审稿的门槛。']
  ]);

  const state = {
    account: null,
    role: '',
    roleDialogOpen: false,
    readerReceiptOpen: false,
    officeOpen: false,
    officeTab: 'desk',
    storylines: [],
    candidates: [],
    preflightById: new Map(),
    decisions: new Map(),
    events: [],
    issueDraft: { selected_ids: [], cover_id: '' },
    issues: [],
    openIssueId: '',
    loading: false,
    loaded: false,
    promptedForUser: '',
    toast: null,
    lastDecision: null
  };

  let toastTimer = 0;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const safeSourceUrl = (value) => {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.toString() : '';
    } catch {
      return '';
    }
  };

  const readJson = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch {
      return fallback;
    }
  };

  const fetchJson = async (path) => {
    const response = await fetch(path, {
      cache: 'no-store',
      signal: AbortSignal.timeout(DATA_TIMEOUT_MS)
    });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
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

  const loadEditorialState = () => {
    const payload = readJson(EDITORIAL_STORAGE_KEY, {});
    state.decisions = new Map(Object.entries(payload.decisions || {}));
    state.events = Array.isArray(payload.events) ? payload.events : [];
    state.issues = Array.isArray(payload.issues) ? payload.issues : [];
    const draft = payload.issue_draft || {};
    state.issueDraft = {
      selected_ids: Array.isArray(draft.selected_ids) ? draft.selected_ids.map(String).slice(0, ISSUE_CAPACITY) : [],
      cover_id: String(draft.cover_id || '')
    };
    if (!state.issueDraft.selected_ids.includes(state.issueDraft.cover_id)) state.issueDraft.cover_id = '';
  };

  const saveEditorialState = () => {
    localStorage.setItem(EDITORIAL_STORAGE_KEY, JSON.stringify({
      schema_version: '3.0',
      decisions: Object.fromEntries(state.decisions),
      events: state.events.slice(-500),
      issue_draft: state.issueDraft,
      issues: state.issues.slice(-100)
    }));
  };

  const showToast = (message, action = '') => {
    window.clearTimeout(toastTimer);
    state.toast = { message, action };
    renderOverlay();
    toastTimer = window.setTimeout(() => {
      state.toast = null;
      renderOverlay();
    }, 5000);
  };

  const roleLabel = () => state.role === 'editor' ? '主编' : state.role === 'reader' ? '读者' : '选择身份';
  const activeStorylines = () => state.storylines.filter((storyline) => storyline?.status !== 'retired');
  const ccusStorylines = () => activeStorylines().filter((storyline) => storyline.channel_id === 'ccus-energy-transition');
  const regularStorylines = () => activeStorylines().filter((storyline) => storyline.channel_id !== 'ccus-energy-transition');
  const pendingCandidates = () => state.candidates.filter((candidate) => !state.decisions.has(String(candidate.id || '')));
  const publishedCandidateIds = () => new Set(state.issues.flatMap((issue) => issue.article_ids || []));
  const acceptedCandidates = () => {
    const published = publishedCandidateIds();
    return state.candidates.filter((candidate) => {
      const id = String(candidate.id || '');
      return state.decisions.get(id) === 'accept' && !published.has(id);
    });
  };
  const selectedCandidates = () => state.issueDraft.selected_ids
    .map((id) => state.candidates.find((candidate) => String(candidate.id || '') === id))
    .filter(Boolean);

  const decisionCounts = () => {
    const counts = Object.fromEntries(DECISIONS.map((decision) => [decision.id, 0]));
    for (const decision of state.decisions.values()) counts[decision] = (counts[decision] || 0) + 1;
    return counts;
  };

  const accountName = () => state.account?.profile?.display_name
    || state.account?.user?.user_metadata?.full_name
    || state.account?.user?.email
    || 'NewsFlow Member';

  const openAccount = () => window.HaoAccount?.open?.();

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
    state.roleDialogOpen = false;
    state.officeOpen = false;
    state.readerReceiptOpen = role === 'reader';
    localStorage.setItem(roleStorageKey(), role);
    mountRoleTrigger();
    renderOverlay();
    await syncRole(role);
    if (role === 'editor') openOffice();
  };

  const hydrateAccount = (snapshot) => {
    state.account = snapshot || null;
    if (!snapshot?.user) {
      state.role = '';
      state.roleDialogOpen = false;
      state.readerReceiptOpen = false;
      state.officeOpen = false;
      mountRoleTrigger();
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
    mountRoleTrigger();
    renderOverlay();
  };

  const loadOfficeData = async () => {
    if (state.loading || state.loaded) return;
    state.loading = true;
    renderOverlay();
    try {
      const [storylines, candidates, preflight] = await Promise.all([
        fetchJson('./data/storylines.json'),
        fetchJson('./data/review-candidates.json'),
        fetchJson('./data/pipeline-reviews.json').catch(() => ({ candidates: [] }))
      ]);
      state.storylines = Array.isArray(storylines) ? storylines : [];
      state.candidates = Array.isArray(candidates) ? candidates : [];
      const preflightCandidates = Array.isArray(preflight?.candidates) ? preflight.candidates : [];
      state.preflightById = new Map(preflightCandidates.map((candidate) => [String(candidate.id || ''), candidate]));
      state.loaded = true;
    } catch (error) {
      console.warn('NewsFlow editorial office data unavailable:', error);
      state.storylines = [];
      state.candidates = [];
      state.preflightById = new Map();
    } finally {
      state.loading = false;
      sanitizeDraft();
      renderOverlay();
    }
  };

  const openOffice = async () => {
    if (!state.account?.user) {
      openAccount();
      return;
    }
    if (state.role !== 'editor') {
      state.officeOpen = false;
      state.roleDialogOpen = true;
      renderOverlay();
      return;
    }
    state.officeOpen = true;
    state.readerReceiptOpen = false;
    state.roleDialogOpen = false;
    state.officeTab = 'desk';
    renderOverlay();
    await loadOfficeData();
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

  function sanitizeDraft() {
    const acceptedIds = new Set(acceptedCandidates().map((candidate) => String(candidate.id || '')));
    state.issueDraft.selected_ids = state.issueDraft.selected_ids
      .filter((id) => acceptedIds.has(id))
      .slice(0, ISSUE_CAPACITY);
    if (!state.issueDraft.selected_ids.includes(state.issueDraft.cover_id)) state.issueDraft.cover_id = '';
    saveEditorialState();
  }

  const recordDecision = (decisionId) => {
    const candidate = currentCandidate();
    const decision = DECISIONS.find((item) => item.id === decisionId);
    if (!candidate || !decision) return;
    const candidateId = String(candidate.id || '');
    const event = {
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
    };
    state.decisions.set(candidateId, decisionId);
    state.events.push(event);
    state.lastDecision = { candidateId, event };
    saveEditorialState();
    showToast(`决定已签发：${decision.label}`, 'undo-decision');
  };

  const undoDecision = () => {
    const last = state.lastDecision;
    if (!last) return;
    state.decisions.delete(last.candidateId);
    const eventIndex = state.events.lastIndexOf(last.event);
    if (eventIndex >= 0) state.events.splice(eventIndex, 1);
    state.issueDraft.selected_ids = state.issueDraft.selected_ids.filter((id) => id !== last.candidateId);
    if (state.issueDraft.cover_id === last.candidateId) state.issueDraft.cover_id = '';
    state.lastDecision = null;
    saveEditorialState();
    showToast('上一项编辑决定已撤销。');
  };

  const addToIssue = (candidateId) => {
    const id = String(candidateId || '');
    if (!acceptedCandidates().some((candidate) => String(candidate.id || '') === id)) return;
    if (state.issueDraft.selected_ids.includes(id)) return;
    if (state.issueDraft.selected_ids.length >= ISSUE_CAPACITY) {
      showToast(`本期仅有 ${ISSUE_CAPACITY} 个正式版位。请先移出一篇稿件。`);
      return;
    }
    state.issueDraft.selected_ids.push(id);
    saveEditorialState();
    showToast('稿件已加入本期。');
  };

  const removeFromIssue = (candidateId) => {
    const id = String(candidateId || '');
    state.issueDraft.selected_ids = state.issueDraft.selected_ids.filter((item) => item !== id);
    if (state.issueDraft.cover_id === id) state.issueDraft.cover_id = '';
    saveEditorialState();
    showToast('稿件已移出本期。');
  };

  const setCover = (candidateId) => {
    const id = String(candidateId || '');
    if (!state.issueDraft.selected_ids.includes(id)) return;
    state.issueDraft.cover_id = id;
    saveEditorialState();
    showToast('封面候选已确定。');
  };

  const publishIssue = () => {
    const articles = selectedCandidates();
    if (!articles.length) {
      showToast('至少需要一篇已接受稿件才能付印。');
      return;
    }
    if (!state.issueDraft.cover_id) {
      showToast('请先从本期稿件中指定封面文章。');
      return;
    }
    const number = state.issues.length + 1;
    const issue = {
      id: `issue-${String(number).padStart(3, '0')}-${Date.now()}`,
      number,
      title: `NewsFlow Issue ${String(number).padStart(3, '0')}`,
      published_at: new Date().toISOString(),
      editor_user_id: accountUserId(),
      cover_id: state.issueDraft.cover_id,
      article_ids: articles.map((candidate) => String(candidate.id || '')),
      articles: articles.map((candidate) => ({
        id: String(candidate.id || ''),
        title: String(candidate.title || ''),
        channel_id: String(candidate.channel_id || ''),
        storyline_ids: Array.isArray(candidate.storyline_ids) ? candidate.storyline_ids : [],
        special_issue: isSpecialIssue(candidate) ? 'ccus' : null
      }))
    };
    state.issues.push(issue);
    state.issueDraft = { selected_ids: [], cover_id: '' };
    state.openIssueId = issue.id;
    state.officeTab = 'archive';
    saveEditorialState();
    showToast(`ISSUE ${String(number).padStart(3, '0')} 已付印。${articles.length} 项判断进入正式记录。`);
  };

  const exportEditorialRecord = () => {
    const payload = {
      schema_version: '3.0',
      app_id: 'newsflow-editorial-office',
      exported_at: new Date().toISOString(),
      editor_user_id: accountUserId(),
      decisions: state.events,
      issues: state.issues
    };
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `newsflow-editorial-record-${payload.exported_at.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const renderEvidence = (evidence) => {
    if (!Array.isArray(evidence) || evidence.length === 0) return '';
    return `<details class="nf-preflight-evidence">
      <summary>核对证据链 · ${evidence.length} 条</summary>
      <ol>${evidence.map((item) => {
        const sourceUrl = safeSourceUrl(item?.source_url);
        return `<li><strong>${escapeHtml(item?.claim || '未命名证据')}</strong>${item?.source_excerpt ? `<blockquote>${escapeHtml(item.source_excerpt)}</blockquote>` : ''}${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">打开原始来源</a>` : ''}</li>`;
      }).join('')}</ol>
    </details>`;
  };

  const renderPreflight = (candidate) => {
    const preflight = state.preflightById.get(String(candidate?.id || ''));
    if (!preflight) return '';
    const reasons = Array.isArray(preflight.reasons) ? preflight.reasons.filter(Boolean) : [];
    return `<aside class="nf-manuscript-preflight" aria-label="自动预审提示">
      <header><div><span>AUTOMATED PRE-REVIEW</span><strong>需要主编判断</strong></div><b>${Number(preflight.score_mean || 0).toFixed(1)} / 5</b></header>
      <p>自动流水线没有否定这篇稿件，只标记了尚未闭合的证据边界。以下内容是审稿辅助，不构成编辑决定。</p>
      ${reasons.length ? `<ol class="nf-preflight-reasons">${reasons.map((reason) => `<li>${escapeHtml(REASON_LABELS.get(String(reason).trim()) || String(reason).trim())}</li>`).join('')}</ol>` : ''}
      ${renderEvidence(preflight.evidence)}
      <footer><span>RUN ${escapeHtml(preflight.run_id || 'unknown')}</span><span>${escapeHtml(preflight.source_id || 'source pending')}</span></footer>
    </aside>`;
  };

  const roleCard = (role, label, english, description, details) => `
    <button class="nf-role-card ${state.role === role ? 'is-selected' : ''}" data-editorial-action="choose-role" data-role="${role}">
      <span class="nf-role-card-number">${role === 'reader' ? '01' : '02'}</span>
      <span class="nf-role-card-copy"><span class="nf-role-card-kicker">${escapeHtml(english)}</span><strong>${escapeHtml(label)}</strong><span>${escapeHtml(description)}</span><small>${escapeHtml(details)}</small></span>
      <span class="nf-role-card-mark">${state.role === role ? '已登记' : '进入'}</span>
    </button>`;

  const renderRoleDialog = () => state.roleDialogOpen ? `<div class="nf-editorial-backdrop" data-editorial-action="close-role-dialog"></div>
    <section class="nf-role-dialog" role="dialog" aria-modal="true" aria-labelledby="nf-role-title">
      <header class="nf-role-dialog-header"><div><span class="nf-office-eyebrow">NewsFlow Identity Registry</span><h2 id="nf-role-title">选择入刊方式</h2></div><button class="nf-office-close" data-editorial-action="close-role-dialog" aria-label="关闭身份选择">×</button></header>
      <p class="nf-role-intro">欢迎，${escapeHtml(accountName())}。以读者身份进入正式出版物，或以主编身份进入编辑部；之后可随时切换。</p>
      <div class="nf-role-grid">${roleCard('reader', '读者', 'READER', '阅读正式 Issue、收藏信号并反馈选题价值。', '进入当前期刊，不承担稿件决定。')}${roleCard('editor', '主编', 'EDITOR-IN-CHIEF', '审阅候选稿件，在有限版位中编成并签发一期。', '接受 / 小修 / 大修 / 拒稿；封面在编排阶段指定。')}</div>
      <footer class="nf-role-footer"><span>身份会保存到你的 NewsFlow 账户状态。</span><button data-editorial-action="close-role-dialog">暂不切换</button></footer>
    </section>` : '';

  const renderReaderReceipt = () => state.readerReceiptOpen ? `<div class="nf-editorial-backdrop" data-editorial-action="close-reader-receipt"></div>
    <section class="nf-reader-receipt" role="dialog" aria-modal="true" aria-labelledby="nf-reader-title">
      <span class="nf-office-eyebrow">Reader admission</span><div class="nf-reader-mark">R</div><h2 id="nf-reader-title">读者身份已登记</h2><p>你将进入正式 Issue，关注长期议题，并以读者信号影响后续征稿。</p><button class="nf-reader-enter" data-editorial-action="close-reader-receipt">阅读当前 Issue</button>
    </section>` : '';

  const renderScopeCard = (storyline, special = false) => `<article class="nf-cfp-card ${special ? 'is-special' : ''}">
    <div class="nf-cfp-card-head"><span>${special ? 'SPECIAL ISSUE' : 'CALL FOR PAPERS'}</span><span>${escapeHtml(String(storyline.evidence_count || 0).padStart(2, '0'))} records</span></div>
    <h3>${escapeHtml(storyline.title)}</h3><p>${escapeHtml(storyline.question || '')}</p>
    <div class="nf-cfp-current"><span>Current editorial view</span><strong>${escapeHtml(storyline.current_view || '')}</strong></div>
    <div class="nf-cfp-watch"><span>征稿关注</span><p>${(storyline.watch_for || []).map(escapeHtml).join(' · ') || '持续观察'}</p></div>
  </article>`;

  const renderDesk = () => {
    const candidate = currentCandidate();
    const counts = decisionCounts();
    return `<section class="nf-office-panel" aria-labelledby="nf-desk-heading">
      <div class="nf-office-summary-grid"><div><span>待审稿件</span><strong>${String(pendingCandidates().length).padStart(2, '0')}</strong></div><div><span>已接受待编排</span><strong>${String(acceptedCandidates().length).padStart(2, '0')}</strong></div><div class="is-special"><span>本期版位</span><strong>${state.issueDraft.selected_ids.length}/${ISSUE_CAPACITY}</strong></div></div>
      ${candidate ? `<article class="nf-manuscript">
        <header class="nf-manuscript-head"><div><span class="nf-office-eyebrow">Manuscript under review</span><span class="nf-manuscript-id">MS-${escapeHtml(String(candidate.id || '').slice(-8).toUpperCase())}</span></div><span class="nf-manuscript-issue ${isSpecialIssue(candidate) ? 'is-special' : ''}">${isSpecialIssue(candidate) ? 'CCUS SPECIAL ISSUE' : 'REGULAR ISSUE'}</span></header>
        <div class="nf-manuscript-scope"><span>征稿范围</span><strong>${escapeHtml(storylineTitle(candidate))}</strong></div>
        <h2 id="nf-desk-heading">${escapeHtml(candidate.title || '未命名稿件')}</h2><p class="nf-manuscript-summary">${escapeHtml(candidate.short_summary || '')}</p>
        <dl class="nf-manuscript-meta"><div><dt>Channel</dt><dd>${escapeHtml(candidate.channel_id || 'unassigned')}</dd></div><div><dt>Event type</dt><dd>${escapeHtml(candidate.event_type || 'general')}</dd></div><div><dt>Submitted</dt><dd>${escapeHtml(candidate.published_at || candidate.event_date || 'date pending')}</dd></div></dl>
        ${renderPreflight(candidate)}
        <section class="nf-decision-letter"><div class="nf-decision-letter-heading"><span>EDITORIAL DECISION</span><span>按 1–4 键快速签发</span></div><div class="nf-decision-grid">${DECISIONS.map((decision) => `<button class="nf-decision-button is-${decision.id}" data-editorial-action="decision" data-decision="${decision.id}"><span>${decision.code}</span><strong>${decision.label}</strong><small>${decision.description}</small><kbd>${decision.key}</kbd></button>`).join('')}</div></section>
      </article>` : `<div class="nf-office-empty"><div class="nf-office-seal">✓</div><h2 id="nf-desk-heading">本轮稿件已处理完毕</h2><p>前往“本期编排”，从已接受稿件中组成一期并指定封面。</p><button class="nf-office-primary" data-editorial-action="tab" data-tab="issue">进入本期编排</button></div>`}
      <div class="nf-decision-tally">${DECISIONS.map((decision) => `<span><b>${counts[decision.id] || 0}</b>${decision.label}</span>`).join('')}</div><p class="nf-office-reviewed">已签发 ${state.events.length} 项编辑决定。接受并不等于自动进入本期。</p>
    </section>`;
  };

  const issueCandidateCard = (candidate, selected) => {
    const id = String(candidate.id || '');
    const isCover = state.issueDraft.cover_id === id;
    return `<article class="nf-issue-candidate ${selected ? 'is-selected' : ''} ${isCover ? 'is-cover' : ''}"><div><span>${isSpecialIssue(candidate) ? 'CCUS SPECIAL ISSUE' : escapeHtml(candidate.channel_id || 'GENERAL')}</span>${isCover ? '<b>封面</b>' : ''}</div><h3>${escapeHtml(candidate.title || '未命名稿件')}</h3><p>${escapeHtml(candidate.short_summary || '')}</p><footer>${selected ? `<button data-editorial-action="set-cover" data-candidate-id="${escapeHtml(id)}" ${isCover ? 'disabled' : ''}>${isCover ? '已设为封面' : '设为封面'}</button><button data-editorial-action="remove-from-issue" data-candidate-id="${escapeHtml(id)}">移出本期</button>` : `<button data-editorial-action="add-to-issue" data-candidate-id="${escapeHtml(id)}">加入本期</button>`}</footer></article>`;
  };

  const renderIssueDesk = () => {
    const selected = selectedCandidates();
    const selectedIds = new Set(state.issueDraft.selected_ids);
    const available = acceptedCandidates().filter((candidate) => !selectedIds.has(String(candidate.id || '')));
    const slots = Array.from({ length: ISSUE_CAPACITY }, (_, index) => selected[index] ? issueCandidateCard(selected[index], true) : `<div class="nf-issue-slot"><span>${String(index + 1).padStart(2, '0')}</span><strong>空版位</strong><small>${index === 0 ? '封面从已加入稿件中指定' : '等待已接受稿件'}</small></div>`).join('');
    return `<section class="nf-office-panel" aria-labelledby="nf-issue-heading"><div class="nf-panel-heading"><div><span class="nf-office-eyebrow">Issue Desk</span><h2 id="nf-issue-heading">本期编排</h2></div><p>版位有限。接受是质量判断，进入本期则是编辑取舍。</p></div><div class="nf-issue-status"><div><span>正式版位</span><strong>${selected.length}/${ISSUE_CAPACITY}</strong></div><div><span>封面</span><strong>${state.issueDraft.cover_id ? '已指定' : '待指定'}</strong></div><button class="nf-close-issue" data-editorial-action="publish-issue" ${!selected.length || !state.issueDraft.cover_id ? 'disabled' : ''}>CLOSE ISSUE · 本期付印</button></div><div class="nf-issue-slots">${slots}</div><div class="nf-accepted-heading"><span>ACCEPTED MANUSCRIPTS</span><strong>${available.length} 篇等待编排</strong></div><div class="nf-accepted-grid">${available.length ? available.map((candidate) => issueCandidateCard(candidate, false)).join('') : '<div class="nf-archive-empty">没有等待编排的已接受稿件。继续审稿，或付印当前一期。</div>'}</div></section>`;
  };

  const renderCalls = () => `<section class="nf-office-panel" aria-labelledby="nf-cfp-heading"><div class="nf-panel-heading"><div><span class="nf-office-eyebrow">Calls for papers</span><h2 id="nf-cfp-heading">长期议题即征稿范围</h2></div><p>Storyline 是本刊持续征集证据、案例和反证的正式栏目范围。</p></div><section class="nf-special-issue-banner"><div><span>SPECIAL ISSUE · 01</span><h3>CCUS：从项目交付到证据与责任</h3><p>围绕项目投运、CO₂ 网络商业结构、MRV 与长期责任形成连续专题。</p></div><div class="nf-special-issue-mark">CCUS</div></section><div class="nf-cfp-grid">${ccusStorylines().map((storyline) => renderScopeCard(storyline, true)).join('')}</div><div class="nf-regular-call-heading"><span>REGULAR CALLS</span><strong>AI 基础设施五层框架</strong></div><div class="nf-cfp-grid">${regularStorylines().map((storyline) => renderScopeCard(storyline)).join('')}</div></section>`;

  const renderIssueArchive = () => {
    const recentIssues = [...state.issues].reverse();
    if (!recentIssues.length) return '<div class="nf-archive-empty">尚未付印任何一期。</div>';
    return `<div class="nf-published-issues">${recentIssues.map((issue) => {
      const cover = (issue.articles || []).find((article) => article.id === issue.cover_id);
      const open = state.openIssueId === issue.id;
      return `<article class="nf-published-issue ${open ? 'is-open' : ''}"><button data-editorial-action="view-issue" data-issue-id="${escapeHtml(issue.id)}"><span>ISSUE ${String(issue.number).padStart(3, '0')}</span><strong>${escapeHtml(cover?.title || issue.title)}</strong><small>${(issue.article_ids || []).length} 篇文章 · ${escapeHtml(String(issue.published_at || '').slice(0, 10))}</small></button>${open ? `<ol>${(issue.articles || []).map((article) => `<li class="${article.id === issue.cover_id ? 'is-cover' : ''}"><span>${article.id === issue.cover_id ? 'COVER' : 'ARTICLE'}</span><strong>${escapeHtml(article.title)}</strong></li>`).join('')}</ol>` : ''}</article>`;
    }).join('')}</div>`;
  };

  const renderArchive = () => {
    const counts = decisionCounts();
    const recent = [...state.events].reverse().slice(0, 20);
    return `<section class="nf-office-panel" aria-labelledby="nf-archive-heading"><div class="nf-panel-heading"><div><span class="nf-office-eyebrow">Editorial Record</span><h2 id="nf-archive-heading">出版与评审档案</h2></div><button class="nf-office-secondary" data-editorial-action="export">导出完整记录</button></div>${renderIssueArchive()}<div class="nf-archive-tally">${DECISIONS.map((decision) => `<div class="is-${decision.id}"><span>${decision.code}</span><strong>${counts[decision.id] || 0}</strong><small>${decision.label}</small></div>`).join('')}</div><div class="nf-archive-table" role="table" aria-label="最近评审决定">${recent.length ? recent.map((event) => `<div class="nf-archive-row" role="row"><span role="cell">${escapeHtml(event.manuscript_id)}</span><strong role="cell">${escapeHtml(event.title)}</strong><span role="cell" class="is-${escapeHtml(event.decision)}">${escapeHtml(event.decision_label)}</span><time role="cell">${escapeHtml(String(event.decided_at || '').slice(0, 10))}</time></div>`).join('') : '<div class="nf-archive-empty">尚未签发编辑决定。</div>'}</div></section>`;
  };

  const renderToast = () => state.toast ? `<div class="nf-editorial-toast" role="status"><span>${escapeHtml(state.toast.message)}</span>${state.toast.action ? `<button data-editorial-action="${escapeHtml(state.toast.action)}">撤销</button>` : ''}<button aria-label="关闭提示" data-editorial-action="dismiss-toast">×</button></div>` : '';

  const renderOffice = () => {
    if (!state.officeOpen) return '';
    const panel = state.loading
      ? '<div class="nf-office-loading"><div class="nf-office-seal">NF</div><span>正在调取稿件与征稿范围</span></div>'
      : state.officeTab === 'issue' ? renderIssueDesk()
        : state.officeTab === 'calls' ? renderCalls()
          : state.officeTab === 'archive' ? renderArchive()
            : renderDesk();
    return `<section class="nf-office-shell" role="dialog" aria-modal="true" aria-labelledby="nf-office-title"><header class="nf-office-header"><div class="nf-office-brand"><span class="nf-office-seal">NF</span><div><span class="nf-office-eyebrow">Frontier Systems Review</span><h1 id="nf-office-title">Editorial Office</h1></div></div><div class="nf-office-editor"><span>EDITOR-IN-CHIEF</span><strong>${escapeHtml(accountName())}</strong></div><button class="nf-office-close" data-editorial-action="close-office" aria-label="关闭编辑部">×</button></header><nav class="nf-office-tabs" aria-label="编辑部导航"><button class="${state.officeTab === 'desk' ? 'is-active' : ''}" data-editorial-action="tab" data-tab="desk">待审稿件</button><button class="${state.officeTab === 'issue' ? 'is-active' : ''}" data-editorial-action="tab" data-tab="issue">本期编排 <span>${state.issueDraft.selected_ids.length}/${ISSUE_CAPACITY}</span></button><button class="${state.officeTab === 'calls' ? 'is-active' : ''}" data-editorial-action="tab" data-tab="calls">征稿启事</button><button class="${state.officeTab === 'archive' ? 'is-active' : ''}" data-editorial-action="tab" data-tab="archive">出版档案</button><button data-editorial-action="open-role-dialog">切换身份</button></nav><main class="nf-office-content">${panel}</main><footer class="nf-office-footer"><span>All decisions are editorial judgments, not factual authority.</span><span>NewsFlow Editorial Office · Local-first editorial record</span></footer></section>`;
  };

  const renderOverlay = () => {
    const root = ensureRoot();
    root.innerHTML = `${renderOffice()}${renderRoleDialog()}${renderReaderReceipt()}${renderToast()}`;
    document.documentElement.classList.toggle('nf-editorial-modal-open', state.roleDialogOpen || state.readerReceiptOpen || state.officeOpen);
    window.dispatchEvent(new CustomEvent('newsflow:editorial-rendered'));
  };

  function mountRoleTrigger() {
    const target = document.querySelector('.top-actions');
    if (!target) return;
    let trigger = target.querySelector('[data-editorial-role-trigger]');
    if (!trigger) {
      trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.dataset.editorialRoleTrigger = 'true';
      target.prepend(trigger);
    }
    trigger.className = `nf-role-trigger is-${state.role || 'unset'}`;
    trigger.dataset.editorialAction = state.role === 'editor' ? 'open-office' : 'open-role-dialog';
    trigger.setAttribute('aria-label', state.role === 'editor' ? '打开主编编辑部' : '选择 NewsFlow 身份');
    trigger.innerHTML = `<span aria-hidden="true">${state.role === 'editor' ? '主' : state.role === 'reader' ? '读' : '身份'}</span><strong>${escapeHtml(roleLabel())}</strong>`;
  }

  const handleEditorialAction = (event) => {
    const target = event.target.closest?.('[data-editorial-action]');
    if (!target) return;
    const action = target.dataset.editorialAction;
    if (action === 'choose-role') setRole(target.dataset.role || '');
    else if (action === 'open-role-dialog') {
      if (!state.account?.user) openAccount();
      else {
        state.officeOpen = false;
        state.readerReceiptOpen = false;
        state.roleDialogOpen = true;
        renderOverlay();
      }
    } else if (action === 'close-role-dialog') {
      state.roleDialogOpen = false;
      renderOverlay();
    } else if (action === 'close-reader-receipt') {
      state.readerReceiptOpen = false;
      renderOverlay();
    } else if (action === 'open-office') openOffice();
    else if (action === 'close-office') closeOffice();
    else if (action === 'tab') {
      state.officeTab = target.dataset.tab || 'desk';
      renderOverlay();
    } else if (action === 'decision') recordDecision(target.dataset.decision || '');
    else if (action === 'undo-decision') undoDecision();
    else if (action === 'add-to-issue') addToIssue(target.dataset.candidateId || '');
    else if (action === 'remove-from-issue') removeFromIssue(target.dataset.candidateId || '');
    else if (action === 'set-cover') setCover(target.dataset.candidateId || '');
    else if (action === 'publish-issue') publishIssue();
    else if (action === 'view-issue') {
      const issueId = target.dataset.issueId || '';
      state.openIssueId = state.openIssueId === issueId ? '' : issueId;
      renderOverlay();
    } else if (action === 'export') exportEditorialRecord();
    else if (action === 'dismiss-toast') {
      state.toast = null;
      renderOverlay();
    }
  };

  document.addEventListener('click', handleEditorialAction);
  window.addEventListener('newsflow:rendered', mountRoleTrigger);
  window.addEventListener('newsflow:open-editorial-office', () => {
    if (!state.account?.user) openAccount();
    else if (state.role === 'editor') openOffice();
    else {
      state.officeOpen = false;
      state.roleDialogOpen = true;
      renderOverlay();
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (state.roleDialogOpen) {
        state.roleDialogOpen = false;
        renderOverlay();
      } else if (state.readerReceiptOpen) {
        state.readerReceiptOpen = false;
        renderOverlay();
      } else if (state.officeOpen) closeOffice();
      return;
    }
    if (!state.officeOpen || state.officeTab !== 'desk') return;
    const decision = DECISIONS.find((item) => item.key === event.key);
    if (decision) recordDecision(decision.id);
  });

  loadEditorialState();
  ensureRoot();
  mountRoleTrigger();
  if (window.HaoAccount?.subscribe) window.HaoAccount.subscribe(hydrateAccount);
  else window.addEventListener('hao:account-changed', (event) => hydrateAccount(event.detail));
})();
