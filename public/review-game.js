(() => {
  'use strict';

  const ROOT_ID = 'newsflow-review-game-root';
  const DATA_TIMEOUT_MS = 5000;
  const REACTION_HOLD_MS = 3000;

  const DECISIONS = [
    { id: 'cover_story', label: '封面文章', code: 'COVER STORY', key: '1' },
    { id: 'accept', label: '录用', code: 'ACCEPT', key: '2' },
    { id: 'minor_revision', label: '小修', code: 'MINOR REVISION', key: '3' },
    { id: 'major_revision', label: '大修', code: 'MAJOR REVISION', key: '4' },
    { id: 'reject', label: '拒稿', code: 'REJECT', key: '5' }
  ];

  const WITHDRAWAL_REASONS = [
    { id: 'evidence_update', label: '证据更新' },
    { id: 'factual_error', label: '事实错误' },
    { id: 'stale', label: '已失去时效' },
    { id: 'editorial_judgment', label: '编辑判断调整' }
  ];

  const state = {
    phase: 'idle',
    edition: null,
    storylines: [],
    reactions: {},
    candidates: [],
    consensus: new Map(),
    adoptions: new Map(),
    withdrawals: new Map(),
    events: [],
    packet: [],
    reviews: [],
    ownReviews: new Map(),
    records: [],
    editorialRole: '',
    userId: '',
    index: 0,
    decisionCursor: 1,
    shortcutsOpen: false,
    reaction: null,
    archiveFilter: 'archive',
    archiveSelectionId: '',
    withdrawalDialog: null,
    notice: '',
    error: '',
    accessDenied: false,
    busy: false,
    inviteDialogOpen: false,
    invite: null
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
    const response = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(DATA_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  };

  const getClient = async () => window.HaoAccount?.getClient?.();
  const accountState = () => window.HaoAccount?.getState?.();
  const isChief = () => state.editorialRole === 'editor_in_chief';
  const roleLabel = () => isChief() ? 'EDITOR-IN-CHIEF' : 'EDITOR';

  const track = (eventName, params = {}) => {
    try {
      window.gtag?.('event', eventName, { editorial_role: state.editorialRole || 'unknown', ...params });
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
    }, 2400);
  };

  const setOverlayOpen = (open) => {
    document.documentElement.classList.toggle('nf-review-game-open', open);
  };

  const activeStorylineTitle = (candidate) => {
    const ids = Array.isArray(candidate?.storyline_ids) ? candidate.storyline_ids : [];
    const names = ids
      .map((id) => state.storylines.find((storyline) => storyline.id === id)?.title)
      .filter(Boolean);
    if (names.length) return names.join(' / ');
    return candidate?.channel_id === 'ccus-energy-transition' ? 'CCUS 与能源转型' : 'AI 基建';
  };

  const normalizeCandidate = (row) => {
    const payload = row?.payload && typeof row.payload === 'object' && !Array.isArray(row.payload) ? row.payload : {};
    const directQuality = Number(payload.quality_index || 0);
    const scoreValues = Object.values(payload.scores || {}).map(Number).filter(Number.isFinite);
    const scoreQuality = scoreValues.length ? (scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length) * 2 : 0;
    return {
      id: String(row?.candidate_id || payload.id || ''),
      title: String(payload.title || row?.title || ''),
      summary: String(payload.short_summary || row?.short_summary || ''),
      source: String(payload.source || row?.source || ''),
      url: String(payload.url || row?.url || ''),
      channel_id: String(payload.channel_id || row?.channel_id || ''),
      storyline_ids: Array.isArray(payload.storyline_ids) ? payload.storyline_ids.map(String) : (row?.storyline_ids || []).map(String),
      event_type: String(payload.event_type || row?.event_type || ''),
      date: String(payload.published_at || row?.published_at || payload.event_date || ''),
      quality: directQuality || scoreQuality || 8,
      scores: payload.scores && typeof payload.scores === 'object' ? payload.scores : {},
      source_tier: String(payload.source_tier || ''),
      active: row?.active === true
    };
  };

  const decisionById = (id) => DECISIONS.find((item) => item.id === id) || null;
  const chiefReviewFor = (candidateId) => {
    const reviews = state.reviews.filter((review) => String(review.candidate_id) === String(candidateId));
    if (isChief()) return reviews.find((review) => String(review.reviewer_user_id) === state.userId) || null;
    return reviews.find((review) => String(review.reviewer_user_id) !== state.userId) || null;
  };
  const ownReviewFor = (candidateId) => state.ownReviews.get(String(candidateId)) || null;
  const consensusFor = (candidateId) => state.consensus.get(String(candidateId)) || {
    cover_story_count: 0,
    accept_count: 0,
    minor_revision_count: 0,
    major_revision_count: 0,
    reject_count: 0,
    editor_review_count: 0,
    editorial_boost: 0
  };
  const rankingFor = (candidateId) => state.adoptions.get(String(candidateId))?.publication?.ranking || {};
  const withdrawalFor = (candidateId) => state.withdrawals.get(String(candidateId)) || null;
  const finalDecisionFor = (candidateId) => chiefReviewFor(candidateId)?.decision || '';
  const closedCandidates = () => state.candidates.filter((candidate) => finalDecisionFor(candidate.id) || ownReviewFor(candidate.id));
  const isRejectedCandidate = (candidate) => {
    if (withdrawalFor(candidate.id)) return true;
    const finalDecision = finalDecisionFor(candidate.id);
    return Boolean(finalDecision) && !['cover_story', 'accept'].includes(finalDecision);
  };
  const rejectedCandidates = () => state.candidates.filter(isRejectedCandidate);

  const selectReaction = (decisionId, manuscriptId) => {
    const lines = Array.isArray(state.reactions?.[decisionId]) ? state.reactions[decisionId] : [];
    if (!lines.length) return isChief() ? '主编决定已签发。' : '编辑意见已记录。';
    const seed = [...String(manuscriptId || decisionId)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return lines[seed % lines.length];
  };

  const opinionCounts = (candidateId) => {
    const consensus = consensusFor(candidateId);
    return {
      cover_story: Number(consensus.cover_story_count || 0),
      accept: Number(consensus.accept_count || 0),
      minor_revision: Number(consensus.minor_revision_count || 0),
      major_revision: Number(consensus.major_revision_count || 0),
      reject: Number(consensus.reject_count || 0)
    };
  };

  const opinionTotal = (candidateId) => Object.values(opinionCounts(candidateId)).reduce((sum, count) => sum + count, 0);

  const isAccessDeniedError = (error) => ['42501', 'NEWSFLOW_EDITOR_ACCESS_REQUIRED'].includes(String(error?.code || ''))
    || /permission denied|row-level security|没有 Newsflow 编辑权限|not authorized|forbidden/i.test(String(error?.message || ''));

  const accessDeniedMessage = () => isChief()
    ? '主编权限正在同步，请重新加载；若仍失败，请返回账户检查登录状态。'
    : '开通 Newsflow Pro 即可进入编辑部、参与审稿并查看决定档案。受邀编辑会自动获得 3 个月 Pro。';

  const loadReviewData = async () => {
    const account = accountState();
    state.userId = String(account?.user?.id || '');
    state.editorialRole = String(window.NewsFlowMode?.getEditorialRole?.() || '');
    if (!state.userId || !['editor_in_chief', 'editor'].includes(state.editorialRole)) {
      const error = new Error('当前账户没有 Newsflow 编辑权限。');
      error.code = 'NEWSFLOW_EDITOR_ACCESS_REQUIRED';
      throw error;
    }
    const client = await getClient();
    if (!client) throw new Error('编辑数据库暂不可用。');

    const [edition, storylines, reactions, candidatesResult, reviewsResult, consensusResult, withdrawalsResult, adoptionsResult, eventsResult] = await Promise.all([
      fetchJson('./data/edition.json'),
      fetchJson('./data/storylines.json'),
      fetchJson('./data/editorial-reactions.json'),
      client
        .from('newsflow_candidates')
        .select('candidate_id,title,short_summary,source,url,channel_id,storyline_ids,event_type,published_at,payload,active')
        .order('published_at', { ascending: false, nullsFirst: false }),
      client
        .from('newsflow_editorial_reviews')
        .select('candidate_id,reviewer_user_id,decision,decided_at,updated_at'),
      client
        .from('newsflow_editorial_consensus')
        .select('candidate_id,cover_story_count,accept_count,minor_revision_count,major_revision_count,reject_count,editor_review_count,editorial_boost'),
      client
        .from('newsflow_editorial_withdrawals')
        .select('candidate_id,reason_code,note,withdrawn_at,updated_at'),
      client
        .from('newsflow_editorial_adoptions')
        .select('candidate_id,decision,decided_at,publication'),
      client
        .from('newsflow_editorial_events')
        .select('candidate_id,actor_role,event_type,decision,previous_decision,reason_code,note,occurred_at')
        .order('occurred_at', { ascending: false })
        .limit(240)
    ]);
    if (candidatesResult.error) throw candidatesResult.error;
    if (reviewsResult.error) throw reviewsResult.error;
    if (consensusResult.error) throw consensusResult.error;
    if (withdrawalsResult.error) throw withdrawalsResult.error;
    if (adoptionsResult.error) throw adoptionsResult.error;
    if (eventsResult.error) throw eventsResult.error;

    state.edition = edition || null;
    state.storylines = Array.isArray(storylines) ? storylines : [];
    state.reactions = reactions || {};
    state.candidates = (Array.isArray(candidatesResult.data) ? candidatesResult.data : [])
      .map(normalizeCandidate)
      .filter((candidate) => candidate.id && candidate.title)
      .sort((left, right) => right.date.localeCompare(left.date));
    state.reviews = Array.isArray(reviewsResult.data) ? reviewsResult.data : [];
    state.consensus = new Map((consensusResult.data || []).map((row) => [String(row.candidate_id), row]));
    state.withdrawals = new Map((withdrawalsResult.data || []).map((row) => [String(row.candidate_id), row]));
    state.adoptions = new Map((adoptionsResult.data || []).map((row) => [String(row.candidate_id), row]));
    state.events = Array.isArray(eventsResult.data) ? eventsResult.data : [];
    state.ownReviews = new Map(
      state.reviews
        .filter((review) => String(review.reviewer_user_id) === state.userId)
        .map((review) => [String(review.candidate_id), review])
    );
  };

  const resetTransientState = () => {
    clearReactionTimers();
    state.packet = [];
    state.records = [];
    state.index = 0;
    state.decisionCursor = 1;
    state.shortcutsOpen = false;
    state.reaction = null;
    state.archiveFilter = 'archive';
    state.archiveSelectionId = '';
    state.withdrawalDialog = null;
    state.notice = '';
    state.error = '';
    state.accessDenied = false;
    state.busy = false;
    state.inviteDialogOpen = false;
    state.invite = null;
  };

  const openFormal = async (options = {}) => {
    resetTransientState();
    state.phase = 'loading';
    setOverlayOpen(true);
    render();
    try {
      await loadReviewData();
      const includeReviewed = options.includeReviewed === true;
      state.packet = includeReviewed
        ? state.candidates.filter((candidate) => candidate.active || state.ownReviews.has(candidate.id))
        : state.candidates.filter((candidate) => candidate.active && !state.ownReviews.has(candidate.id));
      syncDecisionCursor();
      state.phase = state.packet.length ? 'review' : 'complete';
      track('editor_review_game_open', {
        pending_count: state.packet.length,
        total_count: state.candidates.length,
        include_reviewed: includeReviewed
      });
      render();
    } catch (error) {
      state.accessDenied = isAccessDeniedError(error);
      state.error = state.accessDenied ? accessDeniedMessage() : error?.message || '编辑审稿台暂时无法加载。';
      state.phase = 'error';
      if (state.accessDenied && !isChief()) track('newsflow_pro_upgrade_prompt', { source: 'review_access_denied' });
      render();
    }
  };

  const currentCandidate = () => state.packet[state.index] || null;

  const syncDecisionCursor = () => {
    const existingDecision = state.ownReviews.get(currentCandidate()?.id)?.decision || '';
    const existingIndex = DECISIONS.findIndex((decision) => decision.id === existingDecision);
    state.decisionCursor = existingIndex >= 0 ? existingIndex : 1;
  };

  const openOverview = async () => {
    resetTransientState();
    state.phase = 'loading';
    setOverlayOpen(true);
    render();
    try {
      await loadReviewData();
      state.phase = 'overview';
      track('editorial_overview_open', {
        pending_count: pendingCandidates().length,
        total_count: state.candidates.length
      });
      render();
    } catch (error) {
      state.accessDenied = isAccessDeniedError(error);
      state.error = state.accessDenied ? accessDeniedMessage() : error?.message || '编辑部总览暂时无法加载。';
      state.phase = 'error';
      if (state.accessDenied && !isChief()) track('newsflow_pro_upgrade_prompt', { source: 'overview_access_denied' });
      render();
    }
  };

  const selectedDecision = () => DECISIONS[state.decisionCursor] || DECISIONS[1];

  const focusSelectedDecision = () => {
    window.requestAnimationFrame(() => {
      ensureRoot().querySelector('.nf-review-decision.is-keyboard-selected')?.focus();
    });
  };

  const moveDecisionCursor = (direction) => {
    if (state.phase !== 'review' || state.busy) return;
    state.decisionCursor = (state.decisionCursor + direction + DECISIONS.length) % DECISIONS.length;
    render();
    focusSelectedDecision();
    announce(`已选择${selectedDecision().label}，按 Enter 确认。`);
  };

  const moveManuscript = (direction) => {
    if (state.phase !== 'review' || state.busy || state.packet.length < 2) return;
    const nextIndex = Math.max(0, Math.min(state.packet.length - 1, state.index + direction));
    if (nextIndex === state.index) {
      announce(direction < 0 ? '已经是第一篇稿件。' : '已经是最后一篇稿件。');
      return;
    }
    state.index = nextIndex;
    syncDecisionCursor();
    render();
    announce(`第 ${state.index + 1} 篇，共 ${state.packet.length} 篇。`);
  };

  const persistDecision = async (candidate, decisionId) => {
    const client = await getClient();
    if (!client) throw new Error('编辑数据库暂不可用。');
    const now = new Date().toISOString();
    const { error } = await client.from('newsflow_editorial_reviews').upsert({
      candidate_id: candidate.id,
      reviewer_user_id: state.userId,
      decision: decisionId,
      decided_at: now,
      updated_at: now
    }, { onConflict: 'candidate_id,reviewer_user_id' });
    if (error) throw error;
    return now;
  };

  const recordDecision = async (decisionId) => {
    if (state.phase !== 'review' || state.busy) return;
    const candidate = currentCandidate();
    const decision = DECISIONS.find((item) => item.id === decisionId);
    if (!candidate || !decision) return;
    state.busy = true;
    render();
    try {
      const previous = state.ownReviews.get(candidate.id) || null;
      const decidedAt = await persistDecision(candidate, decision.id);
      const nextReview = {
        candidate_id: candidate.id,
        reviewer_user_id: state.userId,
        decision: decision.id,
        decided_at: decidedAt,
        updated_at: decidedAt
      };
      state.ownReviews.set(candidate.id, nextReview);
      state.reviews = state.reviews.filter((review) => !(
        String(review.candidate_id) === candidate.id && String(review.reviewer_user_id) === state.userId
      ));
      state.reviews.push(nextReview);
      state.records.push({ candidate, decision, previous, decided_at: decidedAt });
      state.reaction = {
        decision,
        line: selectReaction(decision.id, candidate.id),
        candidate,
        countdown: 3
      };
      state.phase = 'reaction';
      track('editor_review_decision', { decision: decision.id, manuscript_index: state.index + 1 });
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
    } catch (error) {
      state.phase = 'review';
      flash(error?.message || '编辑意见保存失败。');
    } finally {
      state.busy = false;
    }
  };

  const advance = () => {
    clearReactionTimers();
    state.reaction = null;
    state.index = state.records.length;
    if (state.index >= state.packet.length) {
      state.phase = 'complete';
      track('editor_review_round_complete', { manuscript_count: state.records.length });
    } else {
      state.phase = 'review';
    }
    render();
  };

  const undoLastDecision = async () => {
    if (!state.records.length || state.busy) return;
    clearReactionTimers();
    state.busy = true;
    const last = state.records[state.records.length - 1];
    try {
      const client = await getClient();
      if (!client) throw new Error('编辑数据库暂不可用。');
      if (last.previous) {
        const { error } = await client.from('newsflow_editorial_reviews').upsert({
          candidate_id: last.previous.candidate_id,
          reviewer_user_id: state.userId,
          decision: last.previous.decision,
          decided_at: last.previous.decided_at,
          updated_at: new Date().toISOString()
        }, { onConflict: 'candidate_id,reviewer_user_id' });
        if (error) throw error;
        state.ownReviews.set(last.candidate.id, last.previous);
        state.reviews = state.reviews.filter((review) => !(
          String(review.candidate_id) === last.candidate.id && String(review.reviewer_user_id) === state.userId
        ));
        state.reviews.push(last.previous);
      } else {
        const { error } = await client
          .from('newsflow_editorial_reviews')
          .delete()
          .eq('candidate_id', last.candidate.id)
          .eq('reviewer_user_id', state.userId);
        if (error) throw error;
        state.ownReviews.delete(last.candidate.id);
        state.reviews = state.reviews.filter((review) => !(
          String(review.candidate_id) === last.candidate.id && String(review.reviewer_user_id) === state.userId
        ));
      }
      state.records.pop();
      state.index = state.records.length;
      state.reaction = null;
      state.phase = 'review';
      render();
      announce('上一项编辑决定已撤销。');
    } catch (error) {
      flash(error?.message || '撤销失败。');
    } finally {
      state.busy = false;
    }
  };

  const pendingCandidates = () => state.candidates.filter((candidate) => candidate.active && !state.ownReviews.has(candidate.id));

  const openReviewSection = () => {
    state.withdrawalDialog = null;
    state.packet = pendingCandidates();
    state.index = 0;
    state.records = [];
    state.phase = state.packet.length ? 'review' : 'complete';
    render();
  };

  const openArchiveSection = (filter = 'archive') => {
    clearReactionTimers();
    state.shortcutsOpen = false;
    state.archiveFilter = filter === 'rejects' ? 'rejects' : 'archive';
    const items = state.archiveFilter === 'rejects' ? rejectedCandidates() : closedCandidates();
    if (!items.some((candidate) => candidate.id === state.archiveSelectionId)) {
      state.archiveSelectionId = items[0]?.id || '';
    }
    state.withdrawalDialog = null;
    state.phase = 'archive';
    track('editor_review_archive_open', { archive_filter: state.archiveFilter, item_count: items.length });
    render();
  };

  const openWithdrawalDialog = (candidateId) => {
    if (!isChief() || !state.adoptions.has(candidateId)) return;
    state.withdrawalDialog = { candidateId, reason: 'evidence_update', note: '' };
    render();
  };

  const submitWithdrawal = async () => {
    const dialog = state.withdrawalDialog;
    if (!isChief() || !dialog || state.busy) return;
    state.busy = true;
    render();
    try {
      const client = await getClient();
      if (!client) throw new Error('编辑数据库暂不可用。');
      const { error } = await client.rpc('newsflow_withdraw_candidate', {
        target_candidate_id: dialog.candidateId,
        withdrawal_reason: dialog.reason,
        withdrawal_note: dialog.note.trim()
      });
      if (error) throw error;
      await loadReviewData();
      state.archiveFilter = 'rejects';
      state.archiveSelectionId = dialog.candidateId;
      state.withdrawalDialog = null;
      state.phase = 'archive';
      track('editor_review_withdrawal', { reason: dialog.reason });
      flash('撤稿完成。文章已离开当前采用队列，历史决定仍在。');
    } catch (error) {
      flash(error?.message || '撤稿失败。');
    } finally {
      state.busy = false;
      render();
    }
  };

  const restoreWithdrawal = async (candidateId) => {
    if (!isChief() || !candidateId || state.busy) return;
    state.busy = true;
    render();
    try {
      const client = await getClient();
      if (!client) throw new Error('编辑数据库暂不可用。');
      const { error } = await client.rpc('newsflow_restore_withdrawn_candidate', { target_candidate_id: candidateId });
      if (error) throw error;
      await loadReviewData();
      state.archiveSelectionId = candidateId;
      state.phase = 'archive';
      track('editor_review_withdrawal_reversed');
      flash('已恢复采用。编辑部地下室少了一份文件。');
    } catch (error) {
      flash(error?.message || '恢复采用失败。');
    } finally {
      state.busy = false;
      render();
    }
  };

  const decisionCounts = () => Object.fromEntries(DECISIONS.map((decision) => [
    decision.id,
    state.records.filter((record) => record.decision.id === decision.id).length
  ]));

  const closeGame = () => {
    clearReactionTimers();
    state.phase = 'idle';
    state.reaction = null;
    state.inviteDialogOpen = false;
    setOverlayOpen(false);
    render();
    window.dispatchEvent(new CustomEvent('newsflow:review-game-closed'));
  };

  const openInviteDialog = async () => {
    if (!isChief()) return;
    state.inviteDialogOpen = true;
    state.invite = { loading: true };
    render();
    try {
      state.invite = await window.NewsFlowMode?.createEditorInvite?.();
    } catch (error) {
      state.invite = { error: error?.message || '任命链接生成失败。' };
    }
    render();
  };

  const copyInvite = async () => {
    if (!state.invite?.url) return;
    try {
      await navigator.clipboard.writeText(state.invite.url);
      flash('编辑任命链接已复制。');
    } catch {
      flash('复制失败，请手动复制链接。');
    }
  };

  const renderInviteDialog = () => {
    if (!state.inviteDialogOpen || !isChief()) return '';
    const body = state.invite?.loading
      ? '<p>正在签发一次性编辑任命…</p>'
      : state.invite?.error
        ? `<p>${escapeHtml(state.invite.error)}</p>`
        : `<p>受邀者登录后接受任命，即成为本刊 Editor。其五档裁决只形成编辑意见，不获得正式出版权。</p><div class="nf-review-link-preview">${escapeHtml(state.invite?.url || '')}</div><p>有效期至 ${escapeHtml(String(state.invite?.expires_at || '').slice(0, 10))}，仅可接受一次。</p>`;
    return `<div class="nf-review-dialog-backdrop" data-review-action="close-invite"></div>
      <section class="nf-review-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="nf-review-invite-title">
        <button class="nf-review-close" data-review-action="close-invite" aria-label="关闭任命">×</button>
        <span class="nf-review-label">EDITORIAL APPOINTMENT</span>
        <div class="nf-review-seal is-small">ED</div>
        <h2 id="nf-review-invite-title">任命一位编辑</h2>
        ${body}
        ${state.invite?.url ? '<div class="nf-review-actions"><button class="is-primary" data-review-action="copy-invite">复制任命链接</button></div>' : ''}
      </section>`;
  };

  const renderLoading = () => `<section class="nf-review-shell" role="dialog" aria-modal="true"><div class="nf-review-loading"><div class="nf-review-seal">NF</div><span>正在整理私有送审稿件</span></div></section>`;

  const renderError = () => {
    const showUpgrade = state.accessDenied && !isChief();
    const title = showUpgrade ? '解锁编辑权限' : state.accessDenied ? '主编权限同步中' : '审稿台暂未就绪';
    return `<section class="nf-review-shell" role="dialog" aria-modal="true"><div class="nf-review-paper"><span class="nf-review-label">EDITORIAL DESK</span><div class="nf-review-seal">!</div><h1>${title}</h1><p>${escapeHtml(state.error)}</p><div class="nf-review-actions is-centered">${showUpgrade ? '<button class="is-primary" data-review-action="upgrade-pro">开通 Newsflow Pro</button>' : '<button class="is-primary" data-review-action="retry">重新加载</button>'}<button data-review-action="close-game">返回期刊</button></div></div></section>`;
  };

  const renderDeskTabs = (active = 'pending') => `<nav class="nf-review-tabs" aria-label="编辑部稿件状态">
    <button class="${active === 'overview' ? 'is-active' : ''}" data-review-action="open-overview">总览</button>
    <button class="${active === 'pending' ? 'is-active' : ''}" data-review-action="open-pending">待审稿 <b>${pendingCandidates().length}</b></button>
    <button class="${active === 'archive' ? 'is-active' : ''}" data-review-action="open-archive">决定档案 <b>${closedCandidates().length}</b></button>
    <button class="${active === 'rejects' ? 'is-active' : ''}" data-review-action="open-rejects">退稿库 <b>${rejectedCandidates().length}</b></button>
  </nav>`;

  const overviewStatus = (candidate) => {
    if (candidate.active && !state.ownReviews.has(candidate.id)) return { id: 'pending', label: '待处理' };
    if (candidate.active && state.ownReviews.has(candidate.id)) return { id: 'reviewed', label: isChief() ? '已裁决' : '已评议' };
    const disposition = archiveDisposition(candidate);
    return { id: disposition.id, label: disposition.label };
  };

  const renderOverview = () => {
    const pending = pendingCandidates();
    const active = state.candidates.filter((candidate) => candidate.active);
    const adopted = state.adoptions.size;
    const rejected = rejectedCandidates();
    const aiPending = pending.filter((candidate) => candidate.channel_id === 'ai-infrastructure').length;
    const ccusPending = pending.filter((candidate) => candidate.channel_id === 'ccus-energy-transition').length;
    const signals = [...state.candidates]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 16);
    return `<section class="nf-review-shell is-review is-overview" role="dialog" aria-modal="true" aria-labelledby="nf-overview-title">
      <header class="nf-review-header"><div><strong>Frontier Systems Review</strong><span>${roleLabel()}</span></div><div class="nf-review-header-actions"><button class="nf-review-mode-button" data-review-action="switch-reader">当前：${isChief() ? '主编' : '编辑'} · 切换读者</button>${isChief() ? '<button data-review-action="open-governance">刊物设置</button><button data-review-action="open-invite">任命编辑</button>' : ''}<button class="nf-review-close" data-review-action="close-game" aria-label="返回期刊">×</button></div></header>
      ${renderDeskTabs('overview')}
      <main class="nf-review-overview-stage"><article class="nf-review-overview-card">
        <div class="nf-review-overview-heading"><div><span>EDITORIAL DESK · SIGNAL BOARD</span><h1 id="nf-overview-title">编辑部总览</h1><p>先看全局，再决定下一稿。数字负责提醒，不负责替主编做决定。</p></div><button class="is-primary" data-review-action="open-pending" ${pending.length ? '' : 'disabled'}>${pending.length ? '继续审稿 →' : '本轮已清空'}</button></div>
        <section class="nf-review-overview-stats" aria-label="编辑部状态"><div><span>待处理</span><strong>${String(pending.length).padStart(2, '0')}</strong><small>AI ${aiPending} · CCUS ${ccusPending}</small></div><div><span>活跃稿件</span><strong>${String(active.length).padStart(2, '0')}</strong><small>仍在编辑流程中</small></div><div><span>已采用</span><strong>${String(adopted).padStart(2, '0')}</strong><small>主编公开采用记录</small></div><div><span>退稿</span><strong>${String(rejected.length).padStart(2, '0')}</strong><small>未录用稿件，保留复查</small></div></section>
        <section class="nf-review-overview-queue"><header><div><span>MANUSCRIPT INDEX</span><h2>信号与处理状态</h2></div><span>最近 ${signals.length} / 共 ${state.candidates.length}</span></header>${signals.length ? `<div class="nf-review-overview-list">${signals.map((candidate, index) => {
          const status = overviewStatus(candidate);
          return `<button data-review-action="overview-select" data-candidate-id="${escapeHtml(candidate.id)}"><span>${String(index + 1).padStart(2, '0')}</span><span><strong>${escapeHtml(candidate.title)}</strong><small>${escapeHtml(activeStorylineTitle(candidate))} · ${escapeHtml(candidate.source || 'Editorial submission')}</small></span><em class="is-${status.id}">${escapeHtml(status.label)}</em></button>`;
        }).join('')}</div>` : '<div class="nf-review-archive-empty"><h2>编辑台暂时没有稿件</h2><p>这不是故障，只是新闻机器难得安静了一会儿。</p></div>'}</section>
      </article></main>
      ${state.notice ? `<div class="nf-review-notice" role="status">${escapeHtml(state.notice)}</div>` : ''}
      ${renderInviteDialog()}
    </section>`;
  };

  const renderDecisionBar = (disabled = false) => `<div class="nf-review-decision-bar" aria-label="编辑裁决">
    ${DECISIONS.map((decision, index) => `<button class="nf-review-decision is-${decision.id} ${!disabled && index === state.decisionCursor ? 'is-keyboard-selected' : ''}" data-review-action="decision" data-decision="${decision.id}" aria-pressed="${String(!disabled && index === state.decisionCursor)}" ${disabled || state.busy ? 'disabled' : ''}><kbd>${decision.key}</kbd><span>${decision.code}</span><strong>${decision.label}</strong></button>`).join('')}
  </div>`;

  const renderShortcutGuide = () => state.shortcutsOpen ? `<aside class="nf-review-shortcut-guide" aria-labelledby="nf-review-shortcut-title">
    <div><span>KEYBOARD DESK</span><h2 id="nf-review-shortcut-title">快捷审稿</h2><button data-review-action="toggle-shortcuts" aria-label="关闭快捷键说明">×</button></div>
    <dl><div><dt><kbd>←</kbd><kbd>→</kbd></dt><dd>切换稿件</dd></div><div><dt><kbd>↑</kbd><kbd>↓</kbd></dt><dd>选择裁决</dd></div><div><dt><kbd>Enter</kbd></dt><dd>确认当前裁决</dd></div><div><dt><kbd>1–5</kbd></dt><dd>直接裁决</dd></div><div><dt><kbd>Z</kbd></dt><dd>撤销上次裁决</dd></div></dl>
  </aside>` : '';

  const formatArchiveTime = (value) => {
    const date = new Date(value || 0);
    return Number.isNaN(date.getTime()) ? '时间待确认' : new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const archiveDisposition = (candidate) => {
    if (withdrawalFor(candidate.id)) return { id: 'withdrawn', label: '已撤稿', code: 'WITHDRAWN' };
    const final = decisionById(finalDecisionFor(candidate.id));
    if (final) return final;
    const own = decisionById(ownReviewFor(candidate.id)?.decision);
    return own ? { ...own, label: `我的意见：${own.label}` } : { id: 'pending', label: '待定', code: 'PENDING' };
  };

  const renderImportance = (candidate) => {
    const consensus = consensusFor(candidate.id);
    const ranking = rankingFor(candidate.id);
    const editorialBoost = Number(consensus.editorial_boost || ranking.editorial_boost || 0);
    const editorCount = Number(consensus.editor_review_count || ranking.editor_review_count || 0);
    const readerBoost = Number(ranking.reader_boost || 0);
    const readerCount = Number(ranking.reader_feedback_count || 0);
    const signed = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
    return `<dl class="nf-review-importance" aria-label="重要性构成">
      <div><dt>基础质量</dt><dd>${candidate.quality.toFixed(1)}</dd></div>
      <div><dt>编辑共识</dt><dd>${signed(editorialBoost)} <small>（${editorCount} 位）</small></dd></div>
      <div><dt>读者信号</dt><dd>${signed(readerBoost)} <small>（${readerCount || '样本不足'}）</small></dd></div>
    </dl>`;
  };

  const renderArchiveEvents = (candidateId) => {
    const entries = state.events.filter((entry) => String(entry.candidate_id) === String(candidateId)).slice(0, 5);
    if (!entries.length) return '<p class="nf-review-history-empty">早期决定尚未进入审计账簿。</p>';
    const labels = {
      decision_created: '作出决定', decision_changed: '调整决定', decision_reaffirmed: '重申决定',
      decision_removed: '撤销决定', withdrawn: '撤稿', withdrawal_reversed: '恢复采用'
    };
    return `<ol class="nf-review-history">${entries.map((entry) => `<li><span>${escapeHtml(labels[entry.event_type] || entry.event_type)}</span><strong>${escapeHtml(decisionById(entry.decision)?.label || WITHDRAWAL_REASONS.find((reason) => reason.id === entry.reason_code)?.label || '')}</strong><time>${escapeHtml(formatArchiveTime(entry.occurred_at))}</time></li>`).join('')}</ol>`;
  };

  const renderWithdrawalDialog = () => {
    const dialog = state.withdrawalDialog;
    if (!dialog) return '';
    const candidate = state.candidates.find((item) => item.id === dialog.candidateId);
    return `<div class="nf-review-dialog-backdrop" data-review-action="close-withdrawal"></div>
      <section class="nf-review-withdrawal-dialog" role="dialog" aria-modal="true" aria-labelledby="nf-withdrawal-title">
        <button class="nf-review-close" data-review-action="close-withdrawal" aria-label="关闭撤稿确认">×</button>
        <span class="nf-review-label">WITHDRAWAL NOTICE</span>
        <h2 id="nf-withdrawal-title">撤稿确认</h2>
        <p>${escapeHtml(candidate?.title || '')}</p>
        <label>撤稿原因<select data-review-field="withdrawal-reason">${WITHDRAWAL_REASONS.map((reason) => `<option value="${reason.id}" ${reason.id === dialog.reason ? 'selected' : ''}>${reason.label}</option>`).join('')}</select></label>
        <label>补充说明（可选）<textarea data-review-field="withdrawal-note" maxlength="500" placeholder="说明证据变化或编辑判断…">${escapeHtml(dialog.note)}</textarea></label>
        <p class="nf-review-withdrawal-warning">撤稿会移出当前刊期，历史决定仍留档。</p>
        <div class="nf-review-actions"><button class="is-danger" data-review-action="confirm-withdrawal" ${state.busy ? 'disabled' : ''}>确认撤稿</button><button data-review-action="close-withdrawal">再想三秒</button></div>
      </section>`;
  };

  const renderArchive = () => {
    const items = state.archiveFilter === 'rejects' ? rejectedCandidates() : closedCandidates();
    const selected = items.find((candidate) => candidate.id === state.archiveSelectionId) || items[0] || null;
    const selectedDisposition = selected ? archiveDisposition(selected) : null;
    const selectedWithdrawal = selected ? withdrawalFor(selected.id) : null;
    return `<section class="nf-review-shell is-review is-archive" role="dialog" aria-modal="true" aria-labelledby="nf-archive-title">
      <header class="nf-review-header"><div><strong>Frontier Systems Review</strong><span>${roleLabel()}</span></div><div class="nf-review-header-actions"><button class="nf-review-mode-button" data-review-action="switch-reader">当前：${isChief() ? '主编' : '编辑'} · 切换读者</button>${isChief() ? '<button data-review-action="open-governance">刊物设置</button><button data-review-action="open-invite">任命编辑</button>' : ''}<button class="nf-review-close" data-review-action="close-game" aria-label="返回期刊">×</button></div></header>
      ${renderDeskTabs(state.archiveFilter)}
      <main class="nf-review-stage"><div class="nf-review-stack" aria-hidden="true"></div><article class="nf-review-card nf-review-archive-card">
        <div class="nf-review-card-meta"><span id="nf-archive-title">EDITORIAL ARCHIVE</span><span>${items.length} RECORDS</span></div>
        <div class="nf-review-archive-workspace">
        ${items.length ? `<nav class="nf-review-archive-list" aria-label="决定档案目录">${items.map((candidate, index) => {
          const disposition = archiveDisposition(candidate);
          const consensus = consensusFor(candidate.id);
          return `<button class="nf-review-archive-row ${selected?.id === candidate.id ? 'is-selected' : ''}" data-review-action="select-archive" data-candidate-id="${escapeHtml(candidate.id)}"><span class="nf-review-archive-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${escapeHtml(candidate.title)}</strong><small>${escapeHtml(candidate.source || 'Editorial submission')} · ${escapeHtml(candidate.date.slice(0, 10) || 'date pending')}</small></span><em class="is-${disposition.id}">${escapeHtml(disposition.label)}</em><small>编辑共识 ${Number(consensus.editorial_boost || 0) >= 0 ? '+' : ''}${Number(consensus.editorial_boost || 0).toFixed(2)}</small></button>`;
        }).join('')}</nav>` : '<div class="nf-review-archive-empty"><h2>这里还很安静</h2><p>退稿不会消失，它只是被编辑部礼貌地放进了地下室。</p></div>'}
        ${selected ? `<section class="nf-review-archive-detail"><div><span class="nf-review-label">SELECTED RECORD</span><h2>${escapeHtml(selected.title)}</h2><p>${escapeHtml(selected.summary || '摘要待补充。')}</p><p class="nf-review-archive-source">${escapeHtml(selected.source)} · ${escapeHtml(activeStorylineTitle(selected))}</p>${renderImportance(selected)}</div><aside><div class="nf-review-stamp is-${selectedDisposition.id}">${escapeHtml(selectedDisposition.code)}</div>${selectedWithdrawal ? `<p>撤稿原因：<strong>${escapeHtml(WITHDRAWAL_REASONS.find((reason) => reason.id === selectedWithdrawal.reason_code)?.label || selectedWithdrawal.reason_code)}</strong></p><p>${escapeHtml(selectedWithdrawal.note || '未附补充说明。')}</p><time>${escapeHtml(formatArchiveTime(selectedWithdrawal.withdrawn_at))}</time>` : `<p>主编决定：<strong>${escapeHtml(decisionById(finalDecisionFor(selected.id))?.label || '尚未裁决')}</strong></p>`}<div class="nf-review-archive-actions">${isChief() && state.adoptions.has(selected.id) && !selectedWithdrawal ? `<button class="is-danger" data-review-action="open-withdrawal" data-candidate-id="${escapeHtml(selected.id)}">撤稿</button>` : ''}${isChief() && selectedWithdrawal ? `<button class="is-primary" data-review-action="restore-withdrawal" data-candidate-id="${escapeHtml(selected.id)}">恢复采用</button>` : ''}<button data-review-action="review-selected" data-candidate-id="${escapeHtml(selected.id)}">重新审阅</button></div></aside><section class="nf-review-history-block"><h3>决定记录</h3>${renderArchiveEvents(selected.id)}</section></section>` : ''}
        </div>
        ${state.archiveFilter === 'rejects' ? '<p class="nf-review-basement">退稿库收录所有未获录用的主编终局稿件，包括小修、大修与拒稿；撤稿记录也保留在此。</p>' : ''}
      </article></main>
      ${renderDecisionBar(true)}
      ${state.notice ? `<div class="nf-review-notice" role="status">${escapeHtml(state.notice)}</div>` : ''}
      ${renderWithdrawalDialog()}${renderInviteDialog()}
    </section>`;
  };

  const renderOpinions = (candidate) => {
    const counts = opinionCounts(candidate.id);
    const total = opinionTotal(candidate.id);
    if (!total) return '<div class="nf-review-opinions is-empty"><span>编辑意见</span><em>尚无其他编辑完成本稿评议</em></div>';
    return `<div class="nf-review-opinions"><span>编辑意见 · ${total}</span><div>${DECISIONS.map((decision) => counts[decision.id] ? `<b class="is-${decision.id}">${escapeHtml(decision.label)} ${counts[decision.id]}</b>` : '').join('')}</div></div>`;
  };

  const renderReview = () => {
    const candidate = currentCandidate();
    if (!candidate) return renderComplete();
    const sourceUrl = safeUrl(candidate.url);
    const existingReview = ownReviewFor(candidate.id);
    const existingDecision = decisionById(existingReview?.decision);
    const persistentDecisionLabel = isChief() ? '主编已裁决' : '我的编辑意见';
    const persistentDecision = existingDecision
      ? `<div class="nf-review-persistent-decision" aria-label="${escapeHtml(persistentDecisionLabel)}：${escapeHtml(existingDecision.label)}"><div class="nf-review-stamp is-${existingDecision.id} is-persistent">${escapeHtml(existingDecision.code)}</div><small>${escapeHtml(persistentDecisionLabel)} · ${escapeHtml(formatArchiveTime(existingReview?.decided_at))}</small></div>`
      : '';
    return `<section class="nf-review-shell is-review" role="dialog" aria-modal="true" aria-labelledby="nf-review-title">
      <header class="nf-review-header">
        <div><strong>Frontier Systems Review</strong><span>${roleLabel()}</span></div>
        <div class="nf-review-header-actions"><span>${String(state.index + 1).padStart(2, '0')} / ${String(state.packet.length).padStart(2, '0')}</span><button data-review-action="toggle-shortcuts" aria-expanded="${String(state.shortcutsOpen)}">快捷键</button><button class="nf-review-mode-button" data-review-action="switch-reader">当前：${isChief() ? '主编' : '编辑'} · 切换读者</button>${isChief() ? '<button data-review-action="open-governance">刊物设置</button><button data-review-action="open-invite">任命编辑</button>' : ''}<button data-review-action="undo" ${state.records.length && !state.busy ? '' : 'disabled'}>Z 撤销</button><button class="nf-review-close" data-review-action="close-game" aria-label="返回期刊">×</button></div>
      </header>
      ${renderDeskTabs('pending')}
      <main class="nf-review-stage">
        <div class="nf-review-stack" aria-hidden="true"></div>
        <article class="nf-review-card ${existingDecision ? 'has-persistent-decision' : ''}" tabindex="-1">
          <div class="nf-review-card-meta"><span>MS-${escapeHtml(candidate.id.slice(-8).toUpperCase())}</span><span>${existingDecision ? 'EDITORIAL DECISION RECORDED' : 'MANUSCRIPT UNDER REVIEW'}</span></div>
          ${persistentDecision}
          <div class="nf-review-scope"><span>征稿范围</span><strong>${escapeHtml(activeStorylineTitle(candidate))}</strong></div>
          <h1 id="nf-review-title">${escapeHtml(candidate.title)}</h1>
          <p class="nf-review-summary">${escapeHtml(candidate.summary || '摘要待补充。')}</p>
          ${renderOpinions(candidate)}
          <dl class="nf-review-meta"><div><dt>Source</dt><dd>${escapeHtml(candidate.source || 'Editorial submission')}</dd></div><div><dt>Submitted</dt><dd>${escapeHtml(candidate.date ? candidate.date.slice(0, 10) : 'date pending')}</dd></div><div><dt>Section</dt><dd>${escapeHtml(candidate.channel_id || 'general')}</dd></div></dl>
          ${sourceUrl ? `<a class="nf-review-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">核对原始来源 ↗</a>` : ''}
        </article>
      </main>
      ${renderDecisionBar()}
      ${state.notice ? `<div class="nf-review-notice" role="status">${escapeHtml(state.notice)}</div>` : ''}
      ${renderShortcutGuide()}${renderInviteDialog()}
    </section>`;
  };

  const renderReaction = () => {
    const reaction = state.reaction;
    if (!reaction) return renderReview();
    return `<section class="nf-review-shell is-review is-reacting" role="dialog" aria-modal="true">
      <header class="nf-review-header"><div><strong>Frontier Systems Review</strong><span>${roleLabel()}</span></div><div class="nf-review-header-actions"><span>${String(state.index + 1).padStart(2, '0')} / ${String(state.packet.length).padStart(2, '0')}</span><button class="nf-review-mode-button" data-review-action="switch-reader">当前：${isChief() ? '主编' : '编辑'} · 切换读者</button><button data-review-action="undo" ${state.busy ? 'disabled' : ''}>Z 撤销</button></div></header>
      ${renderDeskTabs('pending')}
      <main class="nf-review-stage"><article class="nf-review-card is-stamped"><div class="nf-review-card-meta"><span>EDITORIAL DECISION</span><span>${isChief() ? 'FINAL EDITORIAL RECORD' : 'EDITORIAL OPINION'}</span></div><h1>${escapeHtml(reaction.candidate.title)}</h1><div class="nf-review-stamp is-${reaction.decision.id}">${escapeHtml(reaction.decision.code)}</div><p class="nf-review-reaction-line">${escapeHtml(reaction.line)}</p><div class="nf-review-countdown" role="timer" aria-live="polite" aria-label="${reaction.countdown} 秒后进入下一稿">（${reaction.countdown}）</div><button class="nf-review-next" data-review-action="advance">下一稿 →</button></article></main>
      ${renderInviteDialog()}
    </section>`;
  };

  const renderComplete = () => {
    const counts = decisionCounts();
    const hasRound = state.records.length > 0;
    const title = hasRound ? '本轮审稿结束' : '你的待审稿件已清空';
    const body = isChief()
      ? hasRound
        ? `本轮处理 ${state.records.length} 篇。你的封面与录用决定会进入公开采用队列；其他编辑意见只供参考。`
        : '当前私有候选都已有你的主编裁决。可以重审已处理稿件，或维护刊物长期判断与信源。'
      : hasRound
        ? `本轮处理 ${state.records.length} 篇。意见已经进入编辑记录，等待主编最终裁决。`
        : '当前私有候选都已有你的编辑意见。正式刊物仍由主编决定。';
    return `<section class="nf-review-shell" role="dialog" aria-modal="true" aria-labelledby="nf-review-complete-title">
      <div class="nf-review-paper nf-review-complete">
        <button class="nf-review-close" data-review-action="close-game" aria-label="返回期刊">×</button>
        <span class="nf-review-label">EDITORIAL DISPOSITION REPORT</span><div class="nf-review-seal">✓</div>
        <p class="nf-review-publication">${roleLabel()}</p><h1 id="nf-review-complete-title">${title}</h1><p class="nf-review-paper-copy">${body}</p>
        ${hasRound ? `<div class="nf-review-results">${DECISIONS.map((decision) => `<div><span>${decision.label}</span><strong>${counts[decision.id] || 0}</strong></div>`).join('')}</div>` : ''}
        <div class="nf-review-actions is-centered"><button class="is-primary" data-review-action="close-game">完成并返回期刊</button><button data-review-action="open-archive">查看决定档案</button><button data-review-action="open-rejects">打开退稿库</button><button data-review-action="review-all">重审已处理</button>${isChief() ? '<button data-review-action="open-governance">刊物设置</button><button data-review-action="open-invite">任命编辑</button>' : ''}<button data-review-action="switch-reader">切换读者模式</button></div>
      </div>
      ${state.notice ? `<div class="nf-review-notice" role="status">${escapeHtml(state.notice)}</div>` : ''}
      ${renderInviteDialog()}
    </section>`;
  };

  function render() {
    const root = ensureRoot();
    let content = '';
    if (state.phase === 'loading') content = renderLoading();
    else if (state.phase === 'error') content = renderError();
    else if (state.phase === 'overview') content = renderOverview();
    else if (state.phase === 'review') content = renderReview();
    else if (state.phase === 'reaction') content = renderReaction();
    else if (state.phase === 'archive') content = renderArchive();
    else if (state.phase === 'complete') content = renderComplete();
    else content = renderInviteDialog();
    root.innerHTML = content;
    setOverlayOpen(state.phase !== 'idle' || state.inviteDialogOpen);
    window.requestAnimationFrame(() => root.querySelector('.nf-review-card, .is-primary, .nf-review-close, button')?.focus());
  }

  const handleRootClick = async (event) => {
    const target = event.target.closest('[data-review-action]');
    if (!target) return;
    const action = target.dataset.reviewAction;
    if (action === 'decision') await recordDecision(target.dataset.decision || '');
    else if (action === 'toggle-shortcuts') { state.shortcutsOpen = !state.shortcutsOpen; render(); }
    else if (action === 'advance') advance();
    else if (action === 'undo') await undoLastDecision();
    else if (action === 'close-game') closeGame();
    else if (action === 'retry') await openFormal();
    else if (action === 'upgrade-pro') {
      track('newsflow_pro_upgrade_click', { source: 'review_access_denied' });
      closeGame();
      window.HaoAccount?.open?.();
    }
    else if (action === 'review-all') await openFormal({ includeReviewed: true });
    else if (action === 'open-overview') {
      clearReactionTimers();
      state.withdrawalDialog = null;
      state.shortcutsOpen = false;
      state.phase = 'overview';
      render();
    }
    else if (action === 'open-pending') openReviewSection();
    else if (action === 'open-archive') openArchiveSection('archive');
    else if (action === 'open-rejects') openArchiveSection('rejects');
    else if (action === 'select-archive') { state.archiveSelectionId = target.dataset.candidateId || ''; state.withdrawalDialog = null; render(); }
    else if (action === 'overview-select') {
      const candidate = state.candidates.find((item) => item.id === target.dataset.candidateId);
      if (candidate) {
        if (candidate.active) { state.packet = [candidate]; state.index = 0; state.records = []; state.phase = 'review'; syncDecisionCursor(); render(); }
        else { state.archiveSelectionId = candidate.id; openArchiveSection(isRejectedCandidate(candidate) ? 'rejects' : 'archive'); }
      }
    }
    else if (action === 'review-selected') {
      const candidate = state.candidates.find((item) => item.id === target.dataset.candidateId);
      if (candidate) { state.packet = [candidate]; state.index = 0; state.records = []; state.phase = 'review'; syncDecisionCursor(); render(); }
    }
    else if (action === 'open-withdrawal') openWithdrawalDialog(target.dataset.candidateId || '');
    else if (action === 'close-withdrawal') { state.withdrawalDialog = null; render(); }
    else if (action === 'confirm-withdrawal') await submitWithdrawal();
    else if (action === 'restore-withdrawal') await restoreWithdrawal(target.dataset.candidateId || '');
    else if (action === 'open-invite') await openInviteDialog();
    else if (action === 'close-invite') { state.inviteDialogOpen = false; state.invite = null; render(); }
    else if (action === 'copy-invite') await copyInvite();
    else if (action === 'open-governance') window.NewsFlowMode?.openGovernance?.();
    else if (action === 'switch-reader') {
      closeGame();
      window.dispatchEvent(new CustomEvent('newsflow:switch-role', { detail: { role: 'reader' } }));
    }
  };

  const handleKeydown = (event) => {
    if (state.shortcutsOpen && event.key === 'Escape') {
      event.preventDefault();
      state.shortcutsOpen = false;
      render();
      return;
    }
    if (state.phase === 'archive' && event.key === 'Escape') {
      if (state.withdrawalDialog) { state.withdrawalDialog = null; render(); }
      else closeGame();
      return;
    }
    if (!['review', 'reaction'].includes(state.phase)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return;
    if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      void undoLastDecision();
      return;
    }
    if (state.phase !== 'review') return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveManuscript(event.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (state.phase === 'overview' && event.key === 'Escape') {
      event.preventDefault();
      closeGame();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveDecisionCursor(event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (event.key === 'Enter') {
      const interactive = document.activeElement?.closest?.('button, a');
      if (interactive && !interactive.matches('.nf-review-decision')) return;
      event.preventDefault();
      void recordDecision(selectedDecision().id);
      return;
    }
    const decision = DECISIONS.find((item) => item.key === event.key);
    if (decision) {
      event.preventDefault();
      state.decisionCursor = DECISIONS.indexOf(decision);
      void recordDecision(decision.id);
      return;
    }
    if (event.key === 'Escape') closeGame();
  };

  const root = ensureRoot();
  root.addEventListener('click', (event) => { void handleRootClick(event); });
  root.addEventListener('input', (event) => {
    if (!state.withdrawalDialog) return;
    if (event.target.matches('[data-review-field="withdrawal-reason"]')) state.withdrawalDialog.reason = event.target.value;
    if (event.target.matches('[data-review-field="withdrawal-note"]')) state.withdrawalDialog.note = event.target.value;
  });
  document.addEventListener('keydown', handleKeydown);

  window.NewsFlowReviewGame = Object.freeze({
    openFormal,
    openOverview,
    close: closeGame,
    isOpen: () => state.phase !== 'idle'
  });
  window.dispatchEvent(new CustomEvent('newsflow:review-game-ready'));
})();