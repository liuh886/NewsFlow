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

  const state = {
    phase: 'idle',
    edition: null,
    storylines: [],
    reactions: {},
    candidates: [],
    packet: [],
    reviews: [],
    ownReviews: new Map(),
    records: [],
    editorialRole: '',
    userId: '',
    index: 0,
    reaction: null,
    notice: '',
    error: '',
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
      scores: payload.scores && typeof payload.scores === 'object' ? payload.scores : {},
      source_tier: String(payload.source_tier || '')
    };
  };

  const selectReaction = (decisionId, manuscriptId) => {
    const lines = Array.isArray(state.reactions?.[decisionId]) ? state.reactions[decisionId] : [];
    if (!lines.length) return isChief() ? '主编决定已签发。' : '编辑意见已记录。';
    const seed = [...String(manuscriptId || decisionId)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return lines[seed % lines.length];
  };

  const opinionCounts = (candidateId) => {
    const counts = Object.fromEntries(DECISIONS.map((decision) => [decision.id, 0]));
    if (!isChief()) return counts;
    for (const review of state.reviews) {
      if (String(review.candidate_id) !== String(candidateId)) continue;
      if (String(review.reviewer_user_id) === state.userId) continue;
      if (review.decision in counts) counts[review.decision] += 1;
    }
    return counts;
  };

  const opinionTotal = (candidateId) => Object.values(opinionCounts(candidateId)).reduce((sum, count) => sum + count, 0);

  const loadReviewData = async () => {
    const account = accountState();
    state.userId = String(account?.user?.id || '');
    state.editorialRole = String(window.NewsFlowMode?.getEditorialRole?.() || '');
    if (!state.userId || !['editor_in_chief', 'editor'].includes(state.editorialRole)) {
      throw new Error('你没有 NewsFlow 编辑席位。');
    }
    const client = await getClient();
    if (!client) throw new Error('编辑数据库暂不可用。');

    const [edition, storylines, reactions, candidatesResult, reviewsResult] = await Promise.all([
      fetchJson('./data/edition.json'),
      fetchJson('./data/storylines.json'),
      fetchJson('./data/editorial-reactions.json'),
      client
        .from('newsflow_candidates')
        .select('candidate_id,title,short_summary,source,url,channel_id,storyline_ids,event_type,published_at,payload')
        .eq('active', true)
        .order('published_at', { ascending: false, nullsFirst: false }),
      client
        .from('newsflow_editorial_reviews')
        .select('candidate_id,reviewer_user_id,decision,decided_at,updated_at')
    ]);
    if (candidatesResult.error) throw candidatesResult.error;
    if (reviewsResult.error) throw reviewsResult.error;

    state.edition = edition || null;
    state.storylines = Array.isArray(storylines) ? storylines : [];
    state.reactions = reactions || {};
    state.candidates = (Array.isArray(candidatesResult.data) ? candidatesResult.data : [])
      .map(normalizeCandidate)
      .filter((candidate) => candidate.id && candidate.title)
      .sort((left, right) => right.date.localeCompare(left.date));
    state.reviews = Array.isArray(reviewsResult.data) ? reviewsResult.data : [];
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
    state.reaction = null;
    state.notice = '';
    state.error = '';
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
        ? [...state.candidates]
        : state.candidates.filter((candidate) => !state.ownReviews.has(candidate.id));
      state.phase = state.packet.length ? 'review' : 'complete';
      track('editor_review_game_open', {
        pending_count: state.packet.length,
        total_count: state.candidates.length,
        include_reviewed: includeReviewed
      });
      render();
    } catch (error) {
      state.error = error?.message || '编辑审稿台暂时无法加载。';
      state.phase = 'error';
      render();
    }
  };

  const currentCandidate = () => state.packet[state.index] || null;

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

  const renderError = () => `<section class="nf-review-shell" role="dialog" aria-modal="true"><div class="nf-review-paper"><span class="nf-review-label">EDITORIAL DESK</span><div class="nf-review-seal">!</div><h1>审稿台暂未就绪</h1><p>${escapeHtml(state.error)}</p><div class="nf-review-actions is-centered"><button class="is-primary" data-review-action="retry">重新加载</button><button data-review-action="close-game">返回期刊</button></div></div></section>`;

  const renderDecisionBar = () => `<div class="nf-review-decision-bar" aria-label="编辑裁决">
    ${DECISIONS.map((decision) => `<button class="nf-review-decision is-${decision.id}" data-review-action="decision" data-decision="${decision.id}" ${state.busy ? 'disabled' : ''}><kbd>${decision.key}</kbd><span>${decision.code}</span><strong>${decision.label}</strong></button>`).join('')}
  </div>`;

  const renderOpinions = (candidate) => {
    if (!isChief()) return '';
    const counts = opinionCounts(candidate.id);
    const total = opinionTotal(candidate.id);
    if (!total) return '<div class="nf-review-opinions is-empty"><span>编辑意见</span><em>尚无其他编辑完成本稿评议</em></div>';
    return `<div class="nf-review-opinions"><span>编辑意见 · ${total}</span><div>${DECISIONS.map((decision) => counts[decision.id] ? `<b class="is-${decision.id}">${escapeHtml(decision.label)} ${counts[decision.id]}</b>` : '').join('')}</div></div>`;
  };

  const renderReview = () => {
    const candidate = currentCandidate();
    if (!candidate) return renderComplete();
    const sourceUrl = safeUrl(candidate.url);
    return `<section class="nf-review-shell is-review" role="dialog" aria-modal="true" aria-labelledby="nf-review-title">
      <header class="nf-review-header">
        <div><strong>Frontier Systems Review</strong><span>${roleLabel()}</span></div>
        <div class="nf-review-header-actions"><span>${String(state.index + 1).padStart(2, '0')} / ${String(state.packet.length).padStart(2, '0')}</span>${isChief() ? '<button data-review-action="open-governance">刊物设置</button><button data-review-action="open-invite">任命编辑</button>' : ''}<button data-review-action="undo" ${state.records.length && !state.busy ? '' : 'disabled'}>Z 撤销</button><button class="nf-review-close" data-review-action="close-game" aria-label="返回期刊">×</button></div>
      </header>
      <main class="nf-review-stage">
        <div class="nf-review-stack" aria-hidden="true"></div>
        <article class="nf-review-card" tabindex="-1">
          <div class="nf-review-card-meta"><span>MS-${escapeHtml(candidate.id.slice(-8).toUpperCase())}</span><span>MANUSCRIPT UNDER REVIEW</span></div>
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
      ${renderInviteDialog()}
    </section>`;
  };

  const renderReaction = () => {
    const reaction = state.reaction;
    if (!reaction) return renderReview();
    return `<section class="nf-review-shell is-review is-reacting" role="dialog" aria-modal="true">
      <header class="nf-review-header"><div><strong>Frontier Systems Review</strong><span>${roleLabel()}</span></div><div class="nf-review-header-actions"><span>${String(state.index + 1).padStart(2, '0')} / ${String(state.packet.length).padStart(2, '0')}</span><button data-review-action="undo" ${state.busy ? 'disabled' : ''}>Z 撤销</button></div></header>
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
        <div class="nf-review-actions is-centered"><button class="is-primary" data-review-action="close-game">完成并返回期刊</button><button data-review-action="review-all">重审已处理</button>${isChief() ? '<button data-review-action="open-governance">刊物设置</button><button data-review-action="open-invite">任命编辑</button>' : ''}<button data-review-action="switch-reader">切换读者模式</button></div>
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
    else if (state.phase === 'review') content = renderReview();
    else if (state.phase === 'reaction') content = renderReaction();
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
    else if (action === 'advance') advance();
    else if (action === 'undo') await undoLastDecision();
    else if (action === 'close-game') closeGame();
    else if (action === 'retry') await openFormal();
    else if (action === 'review-all') await openFormal({ includeReviewed: true });
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
    const decision = DECISIONS.find((item) => item.key === event.key);
    if (decision) {
      event.preventDefault();
      void recordDecision(decision.id);
    }
    if (event.key === 'Escape') closeGame();
  };

  const root = ensureRoot();
  root.addEventListener('click', (event) => { void handleRootClick(event); });
  document.addEventListener('keydown', handleKeydown);

  window.NewsFlowReviewGame = Object.freeze({
    openFormal,
    close: closeGame,
    isOpen: () => state.phase !== 'idle'
  });
  window.dispatchEvent(new CustomEvent('newsflow:review-game-ready'));
})();
