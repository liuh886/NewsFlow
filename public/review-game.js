(() => {
  'use strict';

  const QUERY_PARAM = 'guest-editor';
  const DEFAULT_INVITE_ID = 'frontier-systems-review';
  const ROOT_ID = 'newsflow-review-game-root';
  const FORMAL_STORAGE_KEY = 'newsflow_review_game_v4';
  const GUEST_STORAGE_PREFIX = 'newsflow_review_game_v4_guest';
  const ISSUE_CAPACITY = 5;
  const DATA_TIMEOUT_MS = 5000;
  const REACTION_HOLD_MS = 3000;

  const DECISIONS = [
    { id: 'cover_story', label: '封面文章', code: 'COVER STORY', key: '1' },
    { id: 'accept', label: '录用', code: 'ACCEPT', key: '2' },
    { id: 'minor_revision', label: '小修', code: 'MINOR REVISION', key: '3' },
    { id: 'major_revision', label: '大修', code: 'MAJOR REVISION', key: '4' },
    { id: 'reject', label: '拒稿', code: 'REJECT', key: '5' }
  ];

  const state = {
    mode: '',
    phase: 'idle',
    inviteDialogOpen: false,
    inviteId: '',
    invite: null,
    edition: null,
    storylines: [],
    candidates: [],
    packet: [],
    reactions: {},
    records: [],
    formalDecisions: {},
    issues: [],
    issueDraft: { selected_ids: [], cover_id: '' },
    index: 0,
    trainingCount: 0,
    reaction: null,
    notice: '',
    error: ''
  };

  let advanceTimer = 0;
  let countdownTimer = 0;
  let noticeTimer = 0;

  const clearReactionTimers = () => {
    window.clearTimeout(advanceTimer);
    window.clearInterval(countdownTimer);
    advanceTimer = 0;
    countdownTimer = 0;
  };

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const safeUrl = (value) => {
    try {
      const url = new URL(String(value || ''), window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
    } catch {
      return '';
    }
  };

  const ensureRoot = () => {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }
    return root;
  };

  const fetchJson = async (path) => {
    const response = await fetch(path, {
      cache: 'no-store',
      signal: AbortSignal.timeout(DATA_TIMEOUT_MS)
    });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  };

  const readJson = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch {
      return fallback;
    }
  };

  const track = (eventName, params = {}) => {
    try {
      window.gtag?.('event', eventName, { review_mode: state.mode || 'unknown', ...params });
    } catch {
      // Analytics must never interrupt review.
    }
  };

  const announce = (message) => {
    const region = document.getElementById('app-status');
    if (!region) return;
    region.textContent = '';
    window.requestAnimationFrame(() => { region.textContent = message; });
  };

  const flash = (message) => {
    window.clearTimeout(noticeTimer);
    state.notice = message;
    render();
    announce(message);
    noticeTimer = window.setTimeout(() => {
      state.notice = '';
      render();
    }, 2200);
  };

  const setOverlayOpen = (open) => {
    document.documentElement.classList.toggle('nf-review-game-open', open);
  };

  const canonicalInviteUrl = (inviteId = DEFAULT_INVITE_ID) => {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set(QUERY_PARAM, inviteId);
    return url.toString();
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    }
  };

  const activeStorylineTitle = (candidate) => {
    const ids = Array.isArray(candidate?.storyline_ids) ? candidate.storyline_ids : [];
    const names = ids
      .map((id) => state.storylines.find((storyline) => storyline.id === id)?.title)
      .filter(Boolean);
    if (names.length) return names.join(' / ');
    return candidate?.channel_id === 'ccus-energy-transition' ? 'CCUS 与能源转型' : 'AI 基建';
  };

  const normalizeLiveCandidate = (candidate) => ({
    id: String(candidate?.id || ''),
    source_id: String(candidate?.id || ''),
    title: String(candidate?.title || ''),
    summary: String(candidate?.short_summary || ''),
    source: String(candidate?.source || ''),
    url: String(candidate?.url || ''),
    channel_id: String(candidate?.channel_id || ''),
    storyline_ids: Array.isArray(candidate?.storyline_ids) ? candidate.storyline_ids : [],
    event_type: String(candidate?.event_type || ''),
    date: String(candidate?.published_at || candidate?.event_date || ''),
    exercise: false
  });

  const normalizeExerciseCandidate = (candidate) => ({
    ...normalizeLiveCandidate(candidate),
    id: `exercise:${String(candidate?.id || '')}`,
    source_id: String(candidate?.id || ''),
    exercise: true
  });

  const buildGuestPacket = (reviewCandidates, news, invite) => {
    const packetSize = Math.max(1, Number(invite?.packet_size || 8));
    const liveMinimum = Math.max(0, Number(invite?.live_minimum || 0));
    const live = (Array.isArray(reviewCandidates) ? reviewCandidates : [])
      .map(normalizeLiveCandidate)
      .filter((candidate) => candidate.id && candidate.title);
    const selected = live.slice(0, packetSize);
    const selectedIds = new Set(selected.map((candidate) => candidate.source_id));

    if (selected.length < packetSize && invite?.exercise_fallback && live.length < liveMinimum) {
      const exercises = (Array.isArray(news) ? news : [])
        .filter((candidate) => !selectedIds.has(String(candidate?.id || '')))
        .map(normalizeExerciseCandidate)
        .filter((candidate) => candidate.id && candidate.title)
        .sort((left, right) => right.date.localeCompare(left.date));
      selected.push(...exercises.slice(0, packetSize - selected.length));
    }
    return selected.slice(0, packetSize);
  };

  const readFormalState = () => {
    const payload = readJson(FORMAL_STORAGE_KEY, {});
    state.formalDecisions = payload.decisions && typeof payload.decisions === 'object' ? payload.decisions : {};
    state.issues = Array.isArray(payload.issues) ? payload.issues : [];
    const draft = payload.issue_draft || {};
    state.issueDraft = {
      selected_ids: Array.isArray(draft.selected_ids) ? draft.selected_ids.map(String).slice(0, ISSUE_CAPACITY) : [],
      cover_id: String(draft.cover_id || '')
    };
  };

  const saveFormalState = () => {
    localStorage.setItem(FORMAL_STORAGE_KEY, JSON.stringify({
      schema_version: '4.0',
      updated_at: new Date().toISOString(),
      decisions: state.formalDecisions,
      issue_draft: state.issueDraft,
      issues: state.issues.slice(-100)
    }));
  };

  const guestSessionKey = () => `${GUEST_STORAGE_PREFIX}:${state.inviteId || DEFAULT_INVITE_ID}`;

  const restoreGuestSession = () => {
    const saved = readJson(guestSessionKey(), {});
    const ids = new Set(state.packet.map((candidate) => candidate.id));
    state.records = Array.isArray(saved.records)
      ? saved.records.filter((record) => ids.has(String(record?.manuscript_id || '')))
      : [];
    state.index = Math.min(state.records.length, state.packet.length);
    return Boolean(saved.completed && state.packet.length && state.index >= state.packet.length);
  };

  const saveGuestSession = (completed = false) => {
    if (!state.inviteId) return;
    localStorage.setItem(guestSessionKey(), JSON.stringify({
      schema_version: '4.0',
      invite_id: state.inviteId,
      edition_id: state.invite?.edition_id || '',
      updated_at: new Date().toISOString(),
      completed,
      records: state.records
    }));
  };

  const saveCurrentState = (completed = false) => {
    if (state.mode === 'formal') saveFormalState();
    else saveGuestSession(completed);
  };

  const selectReaction = (decisionId, manuscriptId) => {
    const lines = Array.isArray(state.reactions?.[decisionId]) ? state.reactions[decisionId] : [];
    if (!lines.length) return '编辑决定已签发。';
    const seed = [...String(manuscriptId || decisionId)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return lines[seed % lines.length];
  };

  const resetTransientState = () => {
    clearReactionTimers();
    state.records = [];
    state.index = 0;
    state.reaction = null;
    state.notice = '';
    state.error = '';
    state.trainingCount = 0;
  };

  const loadSharedData = async () => Promise.all([
    fetchJson('./data/edition.json'),
    fetchJson('./data/storylines.json'),
    fetchJson('./data/review-candidates.json').catch(() => []),
    fetchJson('./data/news.json').catch(() => []),
    fetchJson('./data/editorial-reactions.json')
  ]);

  const openFormal = async () => {
    resetTransientState();
    state.mode = 'formal';
    state.phase = 'loading';
    state.invite = null;
    state.inviteId = '';
    setOverlayOpen(true);
    render();

    try {
      const [edition, storylines, reviewCandidates, , reactions] = await loadSharedData();
      state.edition = edition || null;
      state.storylines = Array.isArray(storylines) ? storylines : [];
      state.reactions = reactions || {};
      state.candidates = (Array.isArray(reviewCandidates) ? reviewCandidates : [])
        .map(normalizeLiveCandidate)
        .filter((candidate) => candidate.id && candidate.title);
      readFormalState();
      state.packet = state.candidates.filter((candidate) => !state.formalDecisions[candidate.source_id]);
      state.phase = state.packet.length ? 'review' : 'complete';
      track('editor_review_game_open', { pending_count: state.packet.length, total_count: state.candidates.length });
      render();
    } catch (error) {
      state.error = error?.message || '主编审稿台暂时无法加载。';
      state.phase = 'error';
      render();
    }
  };

  const openGuest = async (inviteId = DEFAULT_INVITE_ID) => {
    resetTransientState();
    state.mode = 'guest';
    state.inviteId = inviteId || DEFAULT_INVITE_ID;
    state.phase = 'loading';
    setOverlayOpen(true);
    render();

    try {
      const [inviteRegistry, shared] = await Promise.all([
        fetchJson('./data/guest-editor-invites.json'),
        loadSharedData()
      ]);
      const [edition, storylines, reviewCandidates, news, reactions] = shared;
      const invites = Array.isArray(inviteRegistry?.invites) ? inviteRegistry.invites : [];
      const invite = invites.find((item) => item.id === state.inviteId);
      if (!invite) throw new Error('邀请不存在或已失效。');
      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) throw new Error('这份客座主编邀请已结束。');

      state.invite = invite;
      state.edition = edition || null;
      state.storylines = Array.isArray(storylines) ? storylines : [];
      state.reactions = reactions || {};
      state.candidates = (Array.isArray(reviewCandidates) ? reviewCandidates : []).map(normalizeLiveCandidate);
      state.packet = buildGuestPacket(reviewCandidates, news, invite);
      state.trainingCount = state.packet.filter((candidate) => candidate.exercise).length;
      if (!state.packet.length) throw new Error('本期暂时没有可送审稿件。');

      const completed = restoreGuestSession();
      state.phase = completed ? 'complete' : 'appointment';
      track('guest_editor_invite_open', {
        invite_id: state.inviteId,
        packet_size: state.packet.length,
        live_count: state.packet.length - state.trainingCount,
        exercise_count: state.trainingCount
      });
      render();
    } catch (error) {
      state.error = error?.message || '客座主编席位暂时无法加载。';
      state.phase = 'error';
      render();
    }
  };

  const acceptAppointment = () => {
    if (state.mode !== 'guest' || !state.packet.length) return;
    state.index = Math.min(state.records.length, state.packet.length);
    state.phase = state.index >= state.packet.length ? 'complete' : 'review';
    saveGuestSession(state.phase === 'complete');
    track('guest_editor_appointment_accept', { invite_id: state.inviteId, resumed_count: state.records.length });
    render();
  };

  const currentCandidate = () => state.packet[state.index] || null;

  const recordDecision = (decisionId) => {
    if (state.phase !== 'review') return;
    const candidate = currentCandidate();
    const decision = DECISIONS.find((item) => item.id === decisionId);
    if (!candidate || !decision) return;

    const record = {
      manuscript_id: candidate.id,
      source_id: candidate.source_id || candidate.id,
      title: candidate.title,
      decision: decision.id,
      decision_label: decision.label,
      channel_id: candidate.channel_id,
      storyline_ids: candidate.storyline_ids,
      exercise: candidate.exercise,
      decided_at: new Date().toISOString()
    };

    state.records.push(record);
    if (state.mode === 'formal') state.formalDecisions[record.source_id] = record;
    state.reaction = {
      decision,
      line: selectReaction(decision.id, candidate.id),
      candidate,
      countdown: 3
    };
    state.phase = 'reaction';
    saveCurrentState(false);
    track(state.mode === 'formal' ? 'editor_review_decision' : 'guest_editor_decision', {
      invite_id: state.inviteId || undefined,
      decision: decision.id,
      manuscript_index: state.index + 1,
      manuscript_mode: candidate.exercise ? 'exercise' : 'live'
    });
    render();

    clearReactionTimers();
    countdownTimer = window.setInterval(() => {
      if (state.phase !== 'reaction' || !state.reaction) {
        clearReactionTimers();
        return;
      }
      const next = state.reaction.countdown - 1;
      if (next <= 0) {
        window.clearInterval(countdownTimer);
        countdownTimer = 0;
        return;
      }
      state.reaction.countdown = next;
      render();
    }, 1000);
    advanceTimer = window.setTimeout(advance, REACTION_HOLD_MS);
  };

  const advance = () => {
    clearReactionTimers();
    state.reaction = null;
    state.index = state.records.length;
    if (state.index >= state.packet.length) {
      state.phase = 'complete';
      saveCurrentState(true);
      track(state.mode === 'formal' ? 'editor_review_round_complete' : 'guest_editor_complete', {
        invite_id: state.inviteId || undefined,
        manuscript_count: state.records.length
      });
    } else {
      state.phase = 'review';
      saveCurrentState(false);
    }
    render();
  };

  const undoLastDecision = () => {
    if (!state.records.length) return;
    clearReactionTimers();
    const last = state.records.pop();
    if (state.mode === 'formal') delete state.formalDecisions[last.source_id];
    state.index = state.records.length;
    state.reaction = null;
    state.phase = 'review';
    saveCurrentState(false);
    track(state.mode === 'formal' ? 'editor_review_undo' : 'guest_editor_decision_undo');
    render();
    announce('上一项编辑决定已撤销。');
  };

  const decisionCounts = () => Object.fromEntries(DECISIONS.map((decision) => [
    decision.id,
    state.records.filter((record) => record.decision === decision.id).length
  ]));

  const allFormalRecords = () => Object.values(state.formalDecisions || {});
  const publishedIds = () => new Set(state.issues.flatMap((issue) => issue.article_ids || []));
  const formalAcceptedCandidates = () => {
    const published = publishedIds();
    return state.candidates.filter((candidate) => {
      const record = state.formalDecisions[candidate.source_id];
      return record && ['cover_story', 'accept'].includes(record.decision) && !published.has(candidate.source_id);
    });
  };

  const sanitizeIssueDraft = () => {
    const acceptedIds = new Set(formalAcceptedCandidates().map((candidate) => candidate.source_id));
    state.issueDraft.selected_ids = state.issueDraft.selected_ids.filter((id) => acceptedIds.has(id)).slice(0, ISSUE_CAPACITY);
    if (!state.issueDraft.selected_ids.includes(state.issueDraft.cover_id)) state.issueDraft.cover_id = '';
    if (!state.issueDraft.cover_id) {
      const coverCandidate = state.issueDraft.selected_ids.find((id) => state.formalDecisions[id]?.decision === 'cover_story');
      if (coverCandidate) state.issueDraft.cover_id = coverCandidate;
    }
    saveFormalState();
  };

  const openSettlement = () => {
    if (state.mode !== 'formal') return;
    sanitizeIssueDraft();
    state.phase = 'settlement';
    render();
    track('editor_issue_settlement_open');
  };

  const toggleIssueCandidate = (candidateId) => {
    if (state.mode !== 'formal') return;
    const id = String(candidateId || '');
    if (!formalAcceptedCandidates().some((candidate) => candidate.source_id === id)) return;
    if (state.issueDraft.selected_ids.includes(id)) {
      state.issueDraft.selected_ids = state.issueDraft.selected_ids.filter((item) => item !== id);
      if (state.issueDraft.cover_id === id) state.issueDraft.cover_id = '';
    } else if (state.issueDraft.selected_ids.length < ISSUE_CAPACITY) {
      state.issueDraft.selected_ids.push(id);
      if (!state.issueDraft.cover_id && state.formalDecisions[id]?.decision === 'cover_story') state.issueDraft.cover_id = id;
    } else {
      flash(`本期最多 ${ISSUE_CAPACITY} 篇。`);
      return;
    }
    saveFormalState();
    render();
  };

  const setIssueCover = (candidateId) => {
    const id = String(candidateId || '');
    if (!state.issueDraft.selected_ids.includes(id)) return;
    state.issueDraft.cover_id = id;
    saveFormalState();
    render();
  };

  const closeIssue = () => {
    if (state.mode !== 'formal') return;
    const selected = state.issueDraft.selected_ids;
    if (!selected.length || !state.issueDraft.cover_id) {
      flash('请先选择本期稿件并指定封面。');
      return;
    }
    const issue = {
      id: `local-issue-${Date.now()}`,
      number: state.issues.length + 1,
      published_at: new Date().toISOString(),
      cover_id: state.issueDraft.cover_id,
      article_ids: [...selected]
    };
    state.issues.push(issue);
    state.issueDraft = { selected_ids: [], cover_id: '' };
    saveFormalState();
    state.phase = 'complete';
    flash(`本期编排已完成 · ${selected.length} 篇。`);
    track('editor_issue_closed', { article_count: selected.length });
  };

  const resetGuestSession = () => {
    if (state.mode !== 'guest') return;
    clearReactionTimers();
    localStorage.removeItem(guestSessionKey());
    state.records = [];
    state.index = 0;
    state.reaction = null;
    state.phase = 'appointment';
    track('guest_editor_session_reset', { invite_id: state.inviteId });
    render();
  };

  const receiptText = () => {
    const publication = state.invite?.publication_label || state.edition?.name || 'NewsFlow';
    const lines = state.records.map((record, index) => `${String(index + 1).padStart(2, '0')}. ${record.decision_label} · ${record.title}`);
    const note = state.mode === 'guest'
      ? '注：客座主编意见为平行编辑意见，不直接改写 Edition 的正式出版判断。'
      : '注：这是本浏览器中的正式主编评审记录。';
    return [
      `${publication} · ${state.mode === 'guest' ? '客座主编' : '主编'}审稿回执`,
      `处理稿件：${state.records.length} 篇`,
      '',
      ...lines,
      '',
      note
    ].join('\n');
  };

  const closeGame = () => {
    clearReactionTimers();
    state.phase = 'idle';
    state.reaction = null;
    state.inviteDialogOpen = false;
    setOverlayOpen(false);
    if (state.mode === 'guest') {
      const url = new URL(window.location.href);
      url.searchParams.delete(QUERY_PARAM);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
    const previousMode = state.mode;
    state.mode = '';
    render();
    window.dispatchEvent(new CustomEvent('newsflow:review-game-closed', { detail: { mode: previousMode } }));
  };

  const openInviteDialog = () => {
    state.inviteDialogOpen = true;
    render();
    track('guest_editor_invite_creator_open');
  };

  const closeInviteDialog = () => {
    state.inviteDialogOpen = false;
    render();
  };

  const renderInviteDialog = () => {
    if (!state.inviteDialogOpen) return '';
    const link = canonicalInviteUrl(DEFAULT_INVITE_ID);
    return `<div class="nf-review-dialog-backdrop" data-review-action="close-invite"></div>
      <section class="nf-review-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="nf-review-invite-title">
        <button class="nf-review-close" data-review-action="close-invite" aria-label="关闭邀请">×</button>
        <span class="nf-review-label">EDITORIAL APPOINTMENT</span>
        <div class="nf-review-seal is-small">GE</div>
        <h2 id="nf-review-invite-title">邀请一位客座主编</h2>
        <p>把这一席位发给别人。对方无需注册，接受任命后直接进入同一套五档审稿游戏；其意见不会获得正式 Edition 权限。</p>
        <div class="nf-review-link-preview">${escapeHtml(link)}</div>
        <div class="nf-review-actions"><button class="is-primary" data-review-action="copy-invite">复制邀请链接</button><button data-review-action="preview-invite">预览邀请</button></div>
      </section>`;
  };

  const renderLoading = () => `<section class="nf-review-shell" role="dialog" aria-modal="true"><div class="nf-review-loading"><div class="nf-review-seal">NF</div><span>正在整理送审稿件</span></div></section>`;

  const renderError = () => `<section class="nf-review-shell" role="dialog" aria-modal="true"><div class="nf-review-paper"><span class="nf-review-label">EDITORIAL DESK</span><div class="nf-review-seal">!</div><h1>审稿台暂未就绪</h1><p>${escapeHtml(state.error)}</p><div class="nf-review-actions"><button class="is-primary" data-review-action="retry">重新加载</button><button data-review-action="close-game">返回期刊</button></div></div></section>`;

  const renderAppointment = () => {
    const publication = state.invite?.publication_label || state.edition?.name || 'NewsFlow';
    const resume = state.records.length > 0;
    return `<section class="nf-review-shell" role="dialog" aria-modal="true" aria-labelledby="nf-review-appointment-title">
      <div class="nf-review-paper">
        <button class="nf-review-close" data-review-action="close-game" aria-label="返回期刊">×</button>
        <span class="nf-review-label">EDITORIAL APPOINTMENT · GUEST EDITOR</span>
        <div class="nf-review-seal">GE</div>
        <p class="nf-review-publication">${escapeHtml(publication)}</p>
        <h1 id="nf-review-appointment-title">${escapeHtml(state.invite?.appointment_title || '客座主编任命')}</h1>
        <p class="nf-review-paper-copy">${escapeHtml(state.invite?.appointment_note || '你将处理一组送审稿件，并为每篇稿件签发一次编辑决定。')}</p>
        <div class="nf-review-term"><span>本次任期</span><strong>${state.packet.length} 篇</strong><span>五档裁决 · 一屏一稿</span></div>
        ${state.trainingCount ? `<p class="nf-review-training-note">当前真实待审队列不足，本次包含 ${state.trainingCount} 篇已公开案例的盲审训练稿。训练意见仅用于体验。</p>` : ''}
        <div class="nf-review-actions is-centered"><button class="is-primary" data-review-action="accept-appointment">${resume ? `继续任期 · ${state.records.length}/${state.packet.length}` : '接受任命'}</button>${resume ? '<button data-review-action="reset-guest">重新开始</button>' : ''}</div>
        <footer>无需注册 · 客座意见独立保存 · 不改变 Edition 正式判断</footer>
      </div>
    </section>`;
  };

  const renderDecisionBar = () => `<div class="nf-review-decision-bar" aria-label="编辑裁决">
    ${DECISIONS.map((decision) => `<button class="nf-review-decision is-${decision.id}" data-review-action="decision" data-decision="${decision.id}"><kbd>${decision.key}</kbd><span>${decision.code}</span><strong>${decision.label}</strong></button>`).join('')}
  </div>`;

  const renderReview = () => {
    const candidate = currentCandidate();
    if (!candidate) return renderComplete();
    const sourceUrl = safeUrl(candidate.url);
    const roleLabel = state.mode === 'formal' ? 'EDITOR-IN-CHIEF' : 'GUEST EDITOR';
    return `<section class="nf-review-shell is-review" role="dialog" aria-modal="true" aria-labelledby="nf-review-title">
      <header class="nf-review-header">
        <div><strong>NewsFlow</strong><span>${roleLabel}</span></div>
        <div class="nf-review-header-actions"><span>${String(state.index + 1).padStart(2, '0')} / ${String(state.packet.length).padStart(2, '0')}</span>${state.mode === 'formal' ? '<button data-review-action="open-invite">邀请主编</button>' : ''}<button data-review-action="undo" ${state.records.length ? '' : 'disabled'}>Z 撤销</button><button class="nf-review-close" data-review-action="close-game" aria-label="返回期刊">×</button></div>
      </header>
      <main class="nf-review-stage">
        <div class="nf-review-stack" aria-hidden="true"></div>
        <article class="nf-review-card" tabindex="-1">
          <div class="nf-review-card-meta"><span>MS-${escapeHtml(String(candidate.source_id || candidate.id).slice(-8).toUpperCase())}</span><span>${candidate.exercise ? 'BLIND EDITORIAL EXERCISE' : 'MANUSCRIPT UNDER REVIEW'}</span></div>
          <div class="nf-review-scope"><span>征稿范围</span><strong>${escapeHtml(activeStorylineTitle(candidate))}</strong></div>
          <h1 id="nf-review-title">${escapeHtml(candidate.title)}</h1>
          <p class="nf-review-summary">${escapeHtml(candidate.summary || '摘要待补充。')}</p>
          <dl class="nf-review-meta"><div><dt>Source</dt><dd>${escapeHtml(candidate.source || 'Editorial submission')}</dd></div><div><dt>Submitted</dt><dd>${escapeHtml(candidate.date ? candidate.date.slice(0, 10) : 'date pending')}</dd></div><div><dt>Section</dt><dd>${escapeHtml(candidate.channel_id || 'general')}</dd></div></dl>
          ${sourceUrl ? `<a class="nf-review-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">核对原始来源 ↗</a>` : ''}
        </article>
      </main>
      ${renderDecisionBar()}
      ${state.notice ? `<div class="nf-review-notice" role="status">${escapeHtml(state.notice)}</div>` : ''}
      ${renderInviteDialog()}
    </section>`;
  };

  const renderReaction = () => {
    const reaction = state.reaction;
    if (!reaction) return renderReview();
    const roleLabel = state.mode === 'formal' ? 'EDITOR-IN-CHIEF' : 'GUEST EDITOR';
    return `<section class="nf-review-shell is-review is-reacting" role="dialog" aria-modal="true">
      <header class="nf-review-header"><div><strong>NewsFlow</strong><span>${roleLabel}</span></div><div class="nf-review-header-actions"><span>${String(state.index + 1).padStart(2, '0')} / ${String(state.packet.length).padStart(2, '0')}</span><button data-review-action="undo">Z 撤销</button></div></header>
      <main class="nf-review-stage"><article class="nf-review-card is-stamped"><div class="nf-review-card-meta"><span>EDITORIAL DECISION</span><span>${state.mode === 'formal' ? 'FORMAL EDITORIAL RECORD' : 'GUEST OPINION'}</span></div><h1>${escapeHtml(reaction.candidate.title)}</h1><div class="nf-review-stamp is-${reaction.decision.id}">${escapeHtml(reaction.decision.code)}</div><p class="nf-review-reaction-line">${escapeHtml(reaction.line)}</p><div class="nf-review-countdown" role="timer" aria-live="polite" aria-label="${reaction.countdown} 秒后进入下一稿">（${reaction.countdown}）</div><button class="nf-review-next" data-review-action="advance">下一稿 →</button></article></main>
      ${renderInviteDialog()}
    </section>`;
  };

  const renderComplete = () => {
    const counts = decisionCounts();
    const formalTotal = allFormalRecords().length;
    const title = state.mode === 'formal'
      ? (state.records.length ? '本轮审稿结束' : '待审稿件已清空')
      : '本轮审稿结束';
    const body = state.mode === 'formal'
      ? `本轮处理 ${state.records.length} 篇，累计签发 ${formalTotal} 项正式编辑决定。`
      : `你已处理 ${state.records.length} 篇稿件。客座意见保存在当前浏览器，不会直接改变本刊正式判断。`;
    return `<section class="nf-review-shell" role="dialog" aria-modal="true" aria-labelledby="nf-review-complete-title">
      <div class="nf-review-paper nf-review-complete">
        <button class="nf-review-close" data-review-action="close-game" aria-label="返回期刊">×</button>
        <span class="nf-review-label">EDITORIAL DISPOSITION REPORT</span><div class="nf-review-seal">✓</div>
        <p class="nf-review-publication">${state.mode === 'formal' ? 'EDITOR-IN-CHIEF' : 'GUEST EDITOR'}</p><h1 id="nf-review-complete-title">${title}</h1><p class="nf-review-paper-copy">${body}</p>
        <div class="nf-review-results">${DECISIONS.map((decision) => `<div><span>${decision.label}</span><strong>${counts[decision.id] || 0}</strong></div>`).join('')}</div>
        <p class="nf-review-complete-joke">${counts.reject > Math.floor(Math.max(1, state.records.length) / 2) ? '编辑部备注：Reviewer #2 对本轮结果表示高度认可。' : counts.cover_story ? '编辑部备注：封面已经有人选，排版老师开始工作了。' : '编辑部备注：本轮审稿过程异常文明，建议保留记录。'}</p>
        <div class="nf-review-actions is-centered">${state.mode === 'formal' ? '<button class="is-primary" data-review-action="open-settlement">本期编排</button><button data-review-action="open-invite">邀请主编</button><button data-review-action="switch-reader">切换读者模式</button><button data-review-action="close-game">返回期刊</button>' : '<button class="is-primary" data-review-action="copy-receipt">复制审稿回执</button><button data-review-action="open-invite">邀请下一位主编</button><button data-review-action="reset-guest">再审一轮</button><button data-review-action="close-game">返回期刊</button>'}</div>
      </div>
      ${state.notice ? `<div class="nf-review-notice" role="status">${escapeHtml(state.notice)}</div>` : ''}
      ${renderInviteDialog()}
    </section>`;
  };

  const renderSettlement = () => {
    sanitizeIssueDraft();
    const accepted = formalAcceptedCandidates();
    const selected = new Set(state.issueDraft.selected_ids);
    return `<section class="nf-review-shell is-settlement" role="dialog" aria-modal="true" aria-labelledby="nf-settlement-title">
      <header class="nf-review-header"><div><strong>NewsFlow</strong><span>ISSUE SETTLEMENT</span></div><div class="nf-review-header-actions"><button data-review-action="open-invite">邀请主编</button><button class="nf-review-close" data-review-action="complete" aria-label="返回结算">×</button></div></header>
      <main class="nf-settlement">
        <div class="nf-settlement-heading"><div><span class="nf-review-label">AFTER THE GAME</span><h1 id="nf-settlement-title">本期编排</h1></div><p>审稿已经结束。这里只处理最终版位，不再重复判断稿件质量。</p></div>
        <div class="nf-settlement-status"><span>已选 ${state.issueDraft.selected_ids.length}/${ISSUE_CAPACITY}</span><span>封面 ${state.issueDraft.cover_id ? '已指定' : '待指定'}</span><button class="is-primary" data-review-action="close-issue" ${!state.issueDraft.selected_ids.length || !state.issueDraft.cover_id ? 'disabled' : ''}>CLOSE ISSUE</button></div>
        <div class="nf-settlement-list">${accepted.length ? accepted.map((candidate) => {
          const id = candidate.source_id;
          const record = state.formalDecisions[id];
          const isSelected = selected.has(id);
          const isCover = state.issueDraft.cover_id === id;
          return `<article class="nf-settlement-row ${isSelected ? 'is-selected' : ''}"><div><span>${record?.decision === 'cover_story' ? 'COVER NOMINATION' : 'ACCEPTED'}</span><h2>${escapeHtml(candidate.title)}</h2></div><div class="nf-settlement-row-actions"><button data-review-action="toggle-issue" data-candidate-id="${escapeHtml(id)}">${isSelected ? '移出本期' : '加入本期'}</button>${isSelected ? `<button data-review-action="set-cover" data-candidate-id="${escapeHtml(id)}" ${isCover ? 'disabled' : ''}>${isCover ? '本期封面' : '设为封面'}</button>` : ''}</div></article>`;
        }).join('') : '<div class="nf-settlement-empty">还没有可进入本期的“封面文章”或“录用”稿件。</div>'}</div>
      </main>
      ${state.notice ? `<div class="nf-review-notice" role="status">${escapeHtml(state.notice)}</div>` : ''}
      ${renderInviteDialog()}
    </section>`;
  };

  function render() {
    const root = ensureRoot();
    let content = '';
    if (state.phase === 'loading') content = renderLoading();
    else if (state.phase === 'error') content = renderError();
    else if (state.phase === 'appointment') content = renderAppointment();
    else if (state.phase === 'review') content = renderReview();
    else if (state.phase === 'reaction') content = renderReaction();
    else if (state.phase === 'complete') content = renderComplete();
    else if (state.phase === 'settlement') content = renderSettlement();
    else content = renderInviteDialog();
    root.innerHTML = content;
    setOverlayOpen(state.phase !== 'idle' || state.inviteDialogOpen);
    window.requestAnimationFrame(() => root.querySelector('.nf-review-card, .is-primary, .nf-review-close, button')?.focus());
  }

  const handleRootClick = async (event) => {
    const target = event.target.closest('[data-review-action]');
    if (!target) return;
    const action = target.dataset.reviewAction;

    if (action === 'decision') recordDecision(target.dataset.decision || '');
    else if (action === 'advance') advance();
    else if (action === 'undo') undoLastDecision();
    else if (action === 'close-game') closeGame();
    else if (action === 'accept-appointment') acceptAppointment();
    else if (action === 'open-invite') openInviteDialog();
    else if (action === 'close-invite') closeInviteDialog();
    else if (action === 'preview-invite') window.open(canonicalInviteUrl(DEFAULT_INVITE_ID), '_blank', 'noopener,noreferrer');
    else if (action === 'copy-invite') {
      const copied = await copyText(canonicalInviteUrl(DEFAULT_INVITE_ID));
      flash(copied ? '邀请链接已复制。' : '无法复制邀请链接。');
      track('guest_editor_invite_copy');
    } else if (action === 'copy-receipt') {
      const copied = await copyText(receiptText());
      flash(copied ? '审稿回执已复制。' : '无法复制审稿回执。');
      track('review_receipt_copy');
    } else if (action === 'reset-guest') resetGuestSession();
    else if (action === 'open-settlement') openSettlement();
    else if (action === 'toggle-issue') toggleIssueCandidate(target.dataset.candidateId || '');
    else if (action === 'set-cover') setIssueCover(target.dataset.candidateId || '');
    else if (action === 'close-issue') closeIssue();
    else if (action === 'complete') { state.phase = 'complete'; render(); }
    else if (action === 'switch-reader') {
      closeGame();
      window.dispatchEvent(new CustomEvent('newsflow:switch-role', { detail: { role: 'reader' } }));
    } else if (action === 'retry') {
      if (state.mode === 'guest') openGuest(state.inviteId || DEFAULT_INVITE_ID);
      else openFormal();
    }
  };

  ensureRoot().addEventListener('click', handleRootClick);

  window.addEventListener('keydown', (event) => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '');
    if (typing) return;
    if (event.key === 'Escape') {
      if (state.inviteDialogOpen) closeInviteDialog();
      else if (state.phase !== 'idle') closeGame();
      return;
    }
    if (state.phase === 'review') {
      const decision = DECISIONS.find((item) => item.key === event.key);
      if (decision) {
        event.preventDefault();
        recordDecision(decision.id);
        return;
      }
    }
    if (['review', 'reaction'].includes(state.phase) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undoLastDecision();
    }
  });

  const initialInviteId = new URLSearchParams(window.location.search).get(QUERY_PARAM);
  if (initialInviteId) openGuest(initialInviteId);

  window.NewsFlowReviewGame = Object.freeze({
    openFormal,
    openGuest,
    openInviteDialog,
    inviteUrl: canonicalInviteUrl,
    isOpen: () => state.phase !== 'idle'
  });
  window.dispatchEvent(new CustomEvent('newsflow:review-game-ready'));
})();
