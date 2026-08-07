(() => {
  'use strict';

  const QUERY_PARAM = 'guest-editor';
  const DEFAULT_INVITE_ID = 'frontier-systems-review';
  const ROOT_ID = 'newsflow-guest-editor-root';
  const STORAGE_PREFIX = 'newsflow_guest_editor_v1';
  const DATA_TIMEOUT_MS = 5000;

  const DECISIONS = [
    { id: 'cover_story', label: '封面文章', code: 'COVER STORY', key: '1' },
    { id: 'accept', label: '录用', code: 'ACCEPT', key: '2' },
    { id: 'minor_revision', label: '小修', code: 'MINOR REVISION', key: '3' },
    { id: 'major_revision', label: '大修', code: 'MAJOR REVISION', key: '4' },
    { id: 'reject', label: '拒稿', code: 'REJECT', key: '5' }
  ];

  const state = {
    inviteDialogOpen: false,
    inviteId: '',
    invite: null,
    edition: null,
    storylines: [],
    packet: [],
    reactions: {},
    records: [],
    index: 0,
    trainingCount: 0,
    phase: 'idle',
    error: '',
    reaction: null,
    notice: ''
  };

  let advanceTimer = 0;
  let noticeTimer = 0;

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

  const sessionKey = () => `${STORAGE_PREFIX}:${state.inviteId || DEFAULT_INVITE_ID}`;

  const writeSession = (completed = false) => {
    if (!state.inviteId) return;
    localStorage.setItem(sessionKey(), JSON.stringify({
      schema_version: '1.0',
      invite_id: state.inviteId,
      edition_id: state.invite?.edition_id || '',
      updated_at: new Date().toISOString(),
      completed,
      records: state.records
    }));
  };

  const track = (eventName, params = {}) => {
    try {
      window.gtag?.('event', eventName, {
        invite_id: state.inviteId || DEFAULT_INVITE_ID,
        ...params
      });
    } catch {
      // Analytics must never interrupt the editorial loop.
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

  const inviteUrl = (inviteId = DEFAULT_INVITE_ID) => {
    const url = new URL(window.location.href);
    url.searchParams.set(QUERY_PARAM, inviteId);
    url.hash = '';
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
    id: `exercise:${String(candidate?.id || '')}`,
    source_id: String(candidate?.id || ''),
    title: String(candidate?.title || ''),
    summary: String(candidate?.short_summary || ''),
    source: String(candidate?.source || ''),
    url: String(candidate?.url || ''),
    channel_id: String(candidate?.channel_id || ''),
    storyline_ids: Array.isArray(candidate?.storyline_ids) ? candidate.storyline_ids : [],
    event_type: String(candidate?.event_type || ''),
    date: String(candidate?.published_at || candidate?.event_date || ''),
    exercise: true
  });

  const buildPacket = (liveCandidates, news, invite) => {
    const packetSize = Math.max(1, Number(invite?.packet_size || 8));
    const liveMinimum = Math.max(0, Number(invite?.live_minimum || 0));
    const live = (Array.isArray(liveCandidates) ? liveCandidates : [])
      .map(normalizeLiveCandidate)
      .filter((candidate) => candidate.id && candidate.title);

    const selected = live.slice(0, packetSize);
    const selectedSourceIds = new Set(selected.map((candidate) => candidate.id));

    if (selected.length < packetSize && invite?.exercise_fallback && live.length < liveMinimum) {
      const exercises = (Array.isArray(news) ? news : [])
        .filter((candidate) => !selectedSourceIds.has(String(candidate?.id || '')))
        .map(normalizeExerciseCandidate)
        .filter((candidate) => candidate.id && candidate.title)
        .sort((left, right) => right.date.localeCompare(left.date));
      selected.push(...exercises.slice(0, packetSize - selected.length));
    }

    return selected.slice(0, packetSize);
  };

  const selectReaction = (decisionId, manuscriptId) => {
    const lines = Array.isArray(state.reactions?.[decisionId]) ? state.reactions[decisionId] : [];
    if (!lines.length) return '编辑决定已签发。';
    const seed = [...String(manuscriptId || decisionId)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return lines[seed % lines.length];
  };

  const restoreSession = () => {
    const saved = readJson(sessionKey(), {});
    const ids = new Set(state.packet.map((candidate) => candidate.id));
    state.records = Array.isArray(saved.records)
      ? saved.records.filter((record) => ids.has(String(record?.manuscript_id || '')))
      : [];
    state.index = Math.min(state.records.length, state.packet.length);
    return Boolean(saved.completed && state.packet.length && state.index >= state.packet.length);
  };

  const setOverlayOpen = (open) => {
    document.documentElement.classList.toggle('nf-guest-editor-open', open);
  };

  const loadGuestEditor = async (inviteId) => {
    window.clearTimeout(advanceTimer);
    state.inviteId = inviteId || DEFAULT_INVITE_ID;
    state.phase = 'loading';
    state.error = '';
    state.reaction = null;
    setOverlayOpen(true);
    render();

    try {
      const [inviteRegistry, edition, storylines, reviewCandidates, news, reactions] = await Promise.all([
        fetchJson('./data/guest-editor-invites.json'),
        fetchJson('./data/edition.json'),
        fetchJson('./data/storylines.json'),
        fetchJson('./data/review-candidates.json').catch(() => []),
        fetchJson('./data/news.json').catch(() => []),
        fetchJson('./data/editorial-reactions.json')
      ]);

      const invites = Array.isArray(inviteRegistry?.invites) ? inviteRegistry.invites : [];
      const invite = invites.find((item) => item.id === state.inviteId);
      if (!invite) throw new Error('邀请不存在或已失效。');
      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) throw new Error('这份客座主编邀请已结束。');

      state.invite = invite;
      state.edition = edition || null;
      state.storylines = Array.isArray(storylines) ? storylines : [];
      state.reactions = reactions || {};
      state.packet = buildPacket(reviewCandidates, news, invite);
      state.trainingCount = state.packet.filter((candidate) => candidate.exercise).length;
      if (!state.packet.length) throw new Error('本期暂时没有可送审稿件。');

      const completed = restoreSession();
      state.phase = completed ? 'complete' : 'appointment';
      track('guest_editor_invite_open', {
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
    if (!state.packet.length) return;
    state.index = Math.min(state.records.length, state.packet.length);
    state.phase = state.index >= state.packet.length ? 'complete' : 'review';
    writeSession(state.phase === 'complete');
    track('guest_editor_appointment_accept', { resumed_count: state.records.length });
    render();
  };

  const advance = () => {
    window.clearTimeout(advanceTimer);
    state.reaction = null;
    state.index = state.records.length;
    if (state.index >= state.packet.length) {
      state.phase = 'complete';
      writeSession(true);
      track('guest_editor_complete', { manuscript_count: state.records.length });
    } else {
      state.phase = 'review';
      writeSession(false);
    }
    render();
  };

  const recordDecision = (decisionId) => {
    if (state.phase !== 'review') return;
    const candidate = state.packet[state.index];
    const decision = DECISIONS.find((item) => item.id === decisionId);
    if (!candidate || !decision) return;

    const record = {
      manuscript_id: candidate.id,
      source_id: candidate.source_id || candidate.id,
      title: candidate.title,
      decision: decision.id,
      decision_label: decision.label,
      exercise: candidate.exercise,
      decided_at: new Date().toISOString()
    };
    state.records.push(record);
    state.reaction = {
      decision,
      line: selectReaction(decision.id, candidate.id),
      candidate
    };
    state.phase = 'reaction';
    writeSession(false);
    track('guest_editor_decision', {
      decision: decision.id,
      manuscript_index: state.index + 1,
      manuscript_mode: candidate.exercise ? 'exercise' : 'live'
    });
    render();

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    advanceTimer = window.setTimeout(advance, reducedMotion ? 450 : 1350);
  };

  const undoLastDecision = () => {
    if (!state.records.length) return;
    window.clearTimeout(advanceTimer);
    state.records.pop();
    state.index = state.records.length;
    state.reaction = null;
    state.phase = 'review';
    writeSession(false);
    track('guest_editor_decision_undo');
    render();
    announce('上一项客座主编决定已撤销。');
  };

  const resetSession = () => {
    window.clearTimeout(advanceTimer);
    state.records = [];
    state.index = 0;
    state.reaction = null;
    localStorage.removeItem(sessionKey());
    state.phase = 'appointment';
    track('guest_editor_session_reset');
    render();
  };

  const closeGuestEditor = () => {
    window.clearTimeout(advanceTimer);
    state.phase = 'idle';
    state.reaction = null;
    state.inviteDialogOpen = false;
    setOverlayOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete(QUERY_PARAM);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    render();
  };

  const decisionCounts = () => Object.fromEntries(DECISIONS.map((decision) => [
    decision.id,
    state.records.filter((record) => record.decision === decision.id).length
  ]));

  const receiptText = () => {
    const publication = state.invite?.publication_label || state.edition?.name || 'NewsFlow';
    const lines = state.records.map((record, index) => `${String(index + 1).padStart(2, '0')}. ${record.decision_label} · ${record.title}`);
    return [
      `${publication} · 客座主编审稿回执`,
      `处理稿件：${state.records.length} 篇`,
      '',
      ...lines,
      '',
      '注：客座主编意见为平行编辑意见，不直接改写 Edition 的正式出版判断。'
    ].join('\n');
  };

  const renderInviteDialog = () => {
    if (!state.inviteDialogOpen) return '';
    const link = inviteUrl(DEFAULT_INVITE_ID);
    return `<div class="nf-guest-dialog-backdrop" data-guest-action="close-invite-dialog"></div>
      <section class="nf-guest-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="nf-guest-invite-title">
        <button class="nf-guest-close" data-guest-action="close-invite-dialog" aria-label="关闭邀请">×</button>
        <span class="nf-guest-kicker">EDITORIAL APPOINTMENT</span>
        <div class="nf-guest-invite-seal">GE</div>
        <h2 id="nf-guest-invite-title">邀请一位客座主编</h2>
        <p>对方打开链接后无需注册，接受任命即可进入一屏一稿的五档裁决。客座意见不会直接改变正式 Edition。</p>
        <div class="nf-guest-link-preview">${escapeHtml(link)}</div>
        <div class="nf-guest-dialog-actions"><button class="nf-guest-primary" data-guest-action="copy-invite">复制邀请链接</button><button data-guest-action="preview-invite">预览邀请</button></div>
      </section>`;
  };

  const renderLoading = () => `<section class="nf-guest-shell" role="dialog" aria-modal="true" aria-label="客座主编席位加载中"><div class="nf-guest-loading"><div class="nf-guest-seal">GE</div><span>正在整理送审稿件</span></div></section>`;

  const renderError = () => `<section class="nf-guest-shell" role="dialog" aria-modal="true" aria-labelledby="nf-guest-error-title"><div class="nf-guest-appointment"><span class="nf-guest-kicker">EDITORIAL OFFICE</span><div class="nf-guest-seal">!</div><h1 id="nf-guest-error-title">任命暂未生效</h1><p>${escapeHtml(state.error)}</p><div class="nf-guest-appointment-actions"><button class="nf-guest-primary" data-guest-action="retry">重新加载</button><button data-guest-action="close-guest">返回期刊</button></div></div></section>`;

  const renderAppointment = () => {
    const publication = state.invite?.publication_label || state.edition?.name || 'NewsFlow';
    const resume = state.records.length > 0;
    return `<section class="nf-guest-shell" role="dialog" aria-modal="true" aria-labelledby="nf-guest-appointment-title">
      <div class="nf-guest-appointment">
        <button class="nf-guest-close" data-guest-action="close-guest" aria-label="返回期刊">×</button>
        <span class="nf-guest-kicker">EDITORIAL APPOINTMENT · GUEST EDITOR</span>
        <div class="nf-guest-seal">GE</div>
        <p class="nf-guest-publication">${escapeHtml(publication)}</p>
        <h1 id="nf-guest-appointment-title">${escapeHtml(state.invite?.appointment_title || '客座主编任命')}</h1>
        <p class="nf-guest-appointment-copy">${escapeHtml(state.invite?.appointment_note || '你将处理一组送审稿件，并为每篇稿件签发一次编辑决定。')}</p>
        <div class="nf-guest-term"><span>本次任期</span><strong>${state.packet.length} 篇</strong><span>五档裁决 · 一屏一稿</span></div>
        ${state.trainingCount ? `<p class="nf-guest-training-note">当前真实待审队列不足，本次包含 ${state.trainingCount} 篇已公开案例的盲审训练稿。训练意见仅用于体验，不进入正式出版记录。</p>` : ''}
        <div class="nf-guest-appointment-actions"><button class="nf-guest-primary" data-guest-action="accept-appointment">${resume ? `继续任期 · ${state.records.length}/${state.packet.length}` : '接受任命'}</button>${resume ? '<button data-guest-action="reset-session">重新开始</button>' : ''}</div>
        <footer>无需注册 · 客座意见独立保存 · 不改变 Edition 正式判断</footer>
      </div>
    </section>`;
  };

  const renderDecisionBar = () => `<div class="nf-guest-decision-bar" aria-label="编辑裁决">
    ${DECISIONS.map((decision) => `<button class="nf-guest-decision is-${decision.id}" data-guest-action="decision" data-decision="${decision.id}"><kbd>${decision.key}</kbd><span class="nf-guest-decision-code">${decision.code}</span><strong>${decision.label}</strong></button>`).join('')}
  </div>`;

  const renderReview = () => {
    const candidate = state.packet[state.index];
    if (!candidate) return renderComplete();
    const sourceUrl = safeUrl(candidate.url);
    return `<section class="nf-guest-shell is-review" role="dialog" aria-modal="true" aria-labelledby="nf-guest-manuscript-title">
      <header class="nf-guest-review-header"><div><span class="nf-guest-kicker">${escapeHtml(state.invite?.publication_label || 'NewsFlow')}</span><strong>GUEST EDITOR</strong></div><div class="nf-guest-progress"><span>${String(state.index + 1).padStart(2, '0')} / ${String(state.packet.length).padStart(2, '0')}</span><button data-guest-action="undo" ${state.records.length ? '' : 'disabled'}>Z 撤销</button><button class="nf-guest-close" data-guest-action="close-guest" aria-label="返回期刊">×</button></div></header>
      <main class="nf-guest-review-main">
        <article class="nf-guest-card" tabindex="-1">
          <div class="nf-guest-card-meta"><span>MS-${escapeHtml(String(candidate.id).replace(/^exercise:/, '').slice(-8).toUpperCase())}</span><span>${candidate.exercise ? 'BLIND EDITORIAL EXERCISE' : 'MANUSCRIPT UNDER REVIEW'}</span></div>
          <div class="nf-guest-scope"><span>征稿范围</span><strong>${escapeHtml(activeStorylineTitle(candidate))}</strong></div>
          <h1 id="nf-guest-manuscript-title">${escapeHtml(candidate.title)}</h1>
          <p class="nf-guest-summary">${escapeHtml(candidate.summary || '摘要待补充。')}</p>
          <dl class="nf-guest-meta-list"><div><dt>Source</dt><dd>${escapeHtml(candidate.source || 'Editorial submission')}</dd></div><div><dt>Submitted</dt><dd>${escapeHtml(candidate.date ? candidate.date.slice(0, 10) : 'date pending')}</dd></div><div><dt>Section</dt><dd>${escapeHtml(candidate.channel_id || 'general')}</dd></div></dl>
          ${sourceUrl ? `<a class="nf-guest-source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">核对原始来源 ↗</a>` : ''}
        </article>
      </main>
      ${renderDecisionBar()}
      ${state.notice ? `<div class="nf-guest-notice" role="status">${escapeHtml(state.notice)}</div>` : ''}
    </section>`;
  };

  const renderReaction = () => {
    const reaction = state.reaction;
    const candidate = reaction?.candidate;
    if (!reaction || !candidate) return renderReview();
    return `<section class="nf-guest-shell is-review is-reacting" role="dialog" aria-modal="true" aria-labelledby="nf-guest-reaction-title">
      <header class="nf-guest-review-header"><div><span class="nf-guest-kicker">${escapeHtml(state.invite?.publication_label || 'NewsFlow')}</span><strong>GUEST EDITOR</strong></div><div class="nf-guest-progress"><span>${String(state.index + 1).padStart(2, '0')} / ${String(state.packet.length).padStart(2, '0')}</span><button data-guest-action="undo">Z 撤销</button></div></header>
      <main class="nf-guest-review-main"><article class="nf-guest-card is-stamped"><div class="nf-guest-card-meta"><span>EDITORIAL DECISION</span><span>${candidate.exercise ? 'TRAINING RECORD' : 'GUEST OPINION'}</span></div><h1 id="nf-guest-reaction-title">${escapeHtml(candidate.title)}</h1><div class="nf-guest-stamp is-${reaction.decision.id}">${escapeHtml(reaction.decision.code)}</div><p class="nf-guest-reaction-line">${escapeHtml(reaction.line)}</p><button class="nf-guest-next" data-guest-action="advance">下一稿 →</button></article></main>
    </section>`;
  };

  const renderComplete = () => {
    const counts = decisionCounts();
    const publication = state.invite?.publication_label || 'NewsFlow';
    return `<section class="nf-guest-shell" role="dialog" aria-modal="true" aria-labelledby="nf-guest-complete-title">
      <div class="nf-guest-complete">
        <button class="nf-guest-close" data-guest-action="close-guest" aria-label="返回期刊">×</button>
        <span class="nf-guest-kicker">EDITORIAL DISPOSITION REPORT</span><div class="nf-guest-seal">✓</div>
        <p class="nf-guest-publication">${escapeHtml(publication)}</p><h1 id="nf-guest-complete-title">本轮审稿结束</h1><p>你已处理 ${state.records.length} 篇稿件。客座意见已封存在当前浏览器，不会直接改变本刊正式判断。</p>
        <div class="nf-guest-results">${DECISIONS.map((decision) => `<div><span>${decision.label}</span><strong>${counts[decision.id] || 0}</strong></div>`).join('')}</div>
        <p class="nf-guest-complete-joke">${counts.reject > Math.floor(state.records.length / 2) ? '编辑部备注：Reviewer #2 对本轮结果表示高度认可。' : counts.cover_story ? '编辑部备注：封面已经有人选，排版老师开始工作了。' : '编辑部备注：本轮审稿过程异常文明，建议保留记录。'}</p>
        <div class="nf-guest-complete-actions"><button class="nf-guest-primary" data-guest-action="copy-receipt">复制审稿回执</button><button data-guest-action="copy-invite">邀请下一位主编</button><button data-guest-action="reset-session">再审一轮</button><button data-guest-action="close-guest">返回期刊</button></div>
      </div>
      ${state.notice ? `<div class="nf-guest-notice" role="status">${escapeHtml(state.notice)}</div>` : ''}
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
    else content = renderInviteDialog();
    root.innerHTML = content;

    if (['appointment', 'review', 'reaction', 'complete', 'error', 'loading'].includes(state.phase)) setOverlayOpen(true);
    else setOverlayOpen(state.inviteDialogOpen);

    window.requestAnimationFrame(() => {
      if (state.phase === 'review') root.querySelector('.nf-guest-card')?.focus();
      else root.querySelector('.nf-guest-primary, .nf-guest-close, button')?.focus();
    });
  }

  const openInviteDialog = () => {
    state.phase = 'idle';
    state.inviteDialogOpen = true;
    render();
    track('guest_editor_invite_creator_open');
  };

  const closeInviteDialog = () => {
    state.inviteDialogOpen = false;
    setOverlayOpen(false);
    render();
  };

  const mountInviteTrigger = () => {
    const topActions = document.querySelector('.top-actions');
    const editorRole = document.querySelector('.nf-role-trigger.is-editor');
    let button = document.getElementById('newsflow-guest-editor-invite-trigger');
    if (!topActions || !editorRole) {
      button?.remove();
      return;
    }
    if (button) return;
    button = document.createElement('button');
    button.id = 'newsflow-guest-editor-invite-trigger';
    button.className = 'nf-guest-invite-trigger';
    button.type = 'button';
    button.textContent = '邀请主编';
    button.setAttribute('aria-label', '邀请一位客座主编');
    button.addEventListener('click', openInviteDialog);
    const mobileMenu = topActions.querySelector('.mobile-menu-button');
    topActions.insertBefore(button, mobileMenu || null);
  };

  const handleRootClick = async (event) => {
    const target = event.target.closest('[data-guest-action]');
    if (!target) return;
    const action = target.dataset.guestAction;

    if (action === 'close-invite-dialog') closeInviteDialog();
    else if (action === 'copy-invite') {
      const copied = await copyText(inviteUrl(state.inviteId || DEFAULT_INVITE_ID));
      flash(copied ? '邀请链接已复制。' : '无法复制邀请链接。');
      track('guest_editor_invite_copy');
    } else if (action === 'preview-invite') {
      window.open(inviteUrl(DEFAULT_INVITE_ID), '_blank', 'noopener,noreferrer');
    } else if (action === 'accept-appointment') acceptAppointment();
    else if (action === 'decision') recordDecision(target.dataset.decision || '');
    else if (action === 'advance') advance();
    else if (action === 'undo') undoLastDecision();
    else if (action === 'reset-session') resetSession();
    else if (action === 'close-guest') closeGuestEditor();
    else if (action === 'retry') loadGuestEditor(state.inviteId || DEFAULT_INVITE_ID);
    else if (action === 'copy-receipt') {
      const copied = await copyText(receiptText());
      flash(copied ? '审稿回执已复制。' : '无法复制审稿回执。');
      track('guest_editor_receipt_copy');
    }
  };

  const root = ensureRoot();
  root.addEventListener('click', handleRootClick);

  window.addEventListener('keydown', (event) => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '');
    if (typing) return;
    if (event.key === 'Escape') {
      if (state.inviteDialogOpen) closeInviteDialog();
      else if (state.phase !== 'idle') closeGuestEditor();
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
    if (['review', 'reaction', 'complete'].includes(state.phase) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undoLastDecision();
    }
  });

  window.addEventListener('newsflow:rendered', mountInviteTrigger);
  window.addEventListener('newsflow:editorial-rendered', mountInviteTrigger);
  window.addEventListener('hao:account-changed', () => window.requestAnimationFrame(mountInviteTrigger));
  mountInviteTrigger();

  const initialInviteId = new URLSearchParams(window.location.search).get(QUERY_PARAM);
  if (initialInviteId) loadGuestEditor(initialInviteId);

  window.NewsFlowGuestEditor = Object.freeze({
    openInviteDialog,
    openInvitation: (inviteId = DEFAULT_INVITE_ID) => loadGuestEditor(inviteId),
    inviteUrl: (inviteId = DEFAULT_INVITE_ID) => inviteUrl(inviteId)
  });
})();
