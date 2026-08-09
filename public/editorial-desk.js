(() => {
  'use strict';

  const REVIEW_DECISIONS = [
    { id: 'cover_story', label: '封面推荐' },
    { id: 'accept', label: '推荐' },
    { id: 'minor_revision', label: '小修后推荐' },
    { id: 'major_revision', label: '大修后再评' },
    { id: 'reject', label: '不推荐' }
  ];

  const reviewRoot = () => document.getElementById('newsflow-review-game-root');
  const archiveRoot = () => reviewRoot()?.querySelector('.nf-review-shell.is-archive') || null;
  const overviewRoot = () => reviewRoot()?.querySelector('.nf-review-shell.is-overview') || null;
  const archiveRows = (root) => [...root.querySelectorAll('[data-review-action="select-archive"]')];
  const accountState = () => window.HaoAccount?.getState?.();
  const getClient = async () => window.HaoAccount?.getClient?.();
  const editorialRole = () => String(window.NewsFlowMode?.getEditorialRole?.() || '');
  const isChief = () => editorialRole() === 'editor_in_chief';
  const isEditor = () => editorialRole() === 'editor';

  let overviewSyncToken = 0;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const announce = (message) => {
    const region = document.getElementById('app-status');
    if (!region) return;
    region.textContent = '';
    window.requestAnimationFrame(() => { region.textContent = message; });
  };

  const showNotice = (message) => {
    const root = reviewRoot();
    if (!root) return;
    root.querySelector('[data-newsflow-desk-notice]')?.remove();
    const notice = document.createElement('div');
    notice.className = 'nf-review-notice';
    notice.dataset.newsflowDeskNotice = 'true';
    notice.setAttribute('role', 'status');
    notice.textContent = message;
    root.append(notice);
    window.setTimeout(() => notice.remove(), 2600);
  };

  const track = (eventName, params = {}) => {
    try {
      window.gtag?.('event', eventName, { editorial_role: editorialRole() || 'unknown', ...params });
    } catch {
      // Analytics must never interrupt editorial actions.
    }
  };

  const shanghaiDate = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  const currentIssueRange = () => {
    const today = shanghaiDate();
    const [yearText, monthText, dayText] = today.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const startDay = day < 15 ? 1 : 15;
    const endDay = day < 15 ? 14 : new Date(Date.UTC(year, month, 0)).getUTCDate();
    const pad = (value) => String(value).padStart(2, '0');
    return {
      start: `${year}-${pad(month)}-${pad(startDay)}`,
      end: `${year}-${pad(month)}-${pad(endDay)}`
    };
  };

  const normalizeReferralUrl = (value) => {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:') return '';
      url.hash = '';
      url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      for (const key of [...url.searchParams.keys()]) {
        if (/^(utm_|ref$|source$|campaign$)/i.test(key)) url.searchParams.delete(key);
      }
      return url.toString();
    } catch {
      return '';
    }
  };

  const focusSelectedRow = (candidateId) => {
    window.requestAnimationFrame(() => {
      const root = archiveRoot();
      if (!root) return;
      const row = archiveRows(root).find((item) => item.dataset.candidateId === candidateId);
      row?.scrollIntoView({ block: 'nearest' });
      row?.focus({ preventScroll: true });
    });
  };

  const revealArchiveDetailOnMobile = () => {
    if (!window.matchMedia('(max-width: 760px)').matches) return;
    window.requestAnimationFrame(() => {
      archiveRoot()?.querySelector('.nf-review-archive-detail')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  };

  const pendingCount = (button) => {
    const value = Number.parseInt(button.querySelector('b')?.textContent || '', 10);
    return Number.isFinite(value) ? value : null;
  };

  const selectedCandidateId = (root = archiveRoot()) => root
    ?.querySelector('[data-review-action="review-selected"][data-candidate-id]')
    ?.dataset.candidateId || '';

  const syncRetractionAction = async () => {
    const root = archiveRoot();
    const actionBar = root?.querySelector('.nf-review-archive-actions');
    if (!root || !actionBar) return;

    const candidateId = selectedCandidateId(root);
    const userId = String(accountState()?.user?.id || '');
    const existing = actionBar.querySelector('[data-newsflow-desk-action="retract-decision"]');
    if (!candidateId || !userId) {
      existing?.remove();
      return;
    }

    const client = await getClient();
    if (!client) {
      existing?.remove();
      return;
    }

    const { data, error } = await client
      .from('newsflow_editorial_reviews')
      .select('candidate_id')
      .eq('candidate_id', candidateId)
      .eq('reviewer_user_id', userId)
      .maybeSingle();

    const currentRoot = archiveRoot();
    const currentBar = currentRoot?.querySelector('.nf-review-archive-actions');
    if (!currentRoot || !currentBar || selectedCandidateId(currentRoot) !== candidateId) return;
    if (error || !data) {
      currentBar.querySelector('[data-newsflow-desk-action="retract-decision"]')?.remove();
      if (error) console.warn('NewsFlow own editorial decision lookup failed:', error);
      return;
    }

    if (currentBar.querySelector('[data-newsflow-desk-action="retract-decision"]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nf-review-retract-decision';
    button.dataset.newsflowDeskAction = 'retract-decision';
    button.dataset.candidateId = candidateId;
    button.textContent = '撤回决定';
    currentBar.append(button);
  };

  const scheduleArchiveActionSync = () => {
    window.requestAnimationFrame(() => { void syncRetractionAction(); });
  };

  const closeRetractionDialog = () => {
    reviewRoot()?.querySelector('[data-newsflow-retraction-dialog]')?.remove();
  };

  const openRetractionDialog = (candidateId) => {
    const root = reviewRoot();
    const archive = archiveRoot();
    if (!root || !archive || !candidateId) return;
    closeRetractionDialog();

    const title = archive.querySelector('.nf-review-archive-detail h2')?.textContent?.trim() || '这条稿件';
    const hasPublicAdoption = [...archive.querySelectorAll('[data-review-action="open-withdrawal"][data-candidate-id]')]
      .some((button) => button.dataset.candidateId === candidateId);
    const consequence = isChief() && hasPublicAdoption
      ? '撤回后，稿件会重新进入待审稿；当前公开采用记录也会随主编决定同步撤下。'
      : '撤回后，这条编辑决定会被删除；编辑评分可以之后重新提交。';

    const container = document.createElement('div');
    container.dataset.newsflowRetractionDialog = 'true';
    container.innerHTML = `<div class="nf-review-dialog-backdrop" data-newsflow-desk-action="close-retraction"></div>
      <section class="nf-review-withdrawal-dialog nf-review-retraction-dialog" role="dialog" aria-modal="true" aria-labelledby="nf-review-retraction-title">
        <button class="nf-review-close" data-newsflow-desk-action="close-retraction" aria-label="关闭撤回确认">×</button>
        <span class="nf-review-label">RETRACT DECISION</span>
        <h2 id="nf-review-retraction-title">撤回决定？</h2>
        <p>${escapeHtml(title)}</p>
        <p>${escapeHtml(consequence)}</p>
        <div class="nf-review-actions"><button class="is-danger" data-newsflow-desk-action="confirm-retraction" data-candidate-id="${escapeHtml(candidateId)}">确认撤回</button><button data-newsflow-desk-action="close-retraction">保留决定</button></div>
      </section>`;
    reviewRoot().append(container);
    window.requestAnimationFrame(() => container.querySelector('[data-newsflow-desk-action="confirm-retraction"]')?.focus());
  };

  const retractDecision = async (candidateId, button) => {
    const userId = String(accountState()?.user?.id || '');
    if (!candidateId || !userId) return;
    const client = await getClient();
    if (!client) {
      announce('编辑数据库暂不可用。');
      return;
    }

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    const originalLabel = button.textContent;
    button.textContent = '正在撤回…';
    try {
      const { data, error } = await client
        .from('newsflow_editorial_reviews')
        .delete()
        .eq('candidate_id', candidateId)
        .eq('reviewer_user_id', userId)
        .select('candidate_id');
      if (error) throw error;
      if (!Array.isArray(data) || data.length === 0) throw new Error('这条档案没有可撤回的个人决定。');

      closeRetractionDialog();
      track('editor_review_decision_retracted', { candidate_id: candidateId });
      await window.NewsFlowReviewGame?.openOverview?.();
      showNotice(isChief() ? '决定已撤回，稿件已重新进入待审。' : '编辑评分已撤回，可随时重新评议。');
      announce(isChief() ? '决定已撤回，稿件已重新进入待审。' : '编辑评分已撤回，可随时重新评议。');
    } catch (error) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = originalLabel;
      announce(error?.message || '撤回决定失败。');
    }
  };

  const loadEditorReviewPool = async () => {
    const client = await getClient();
    const userId = String(accountState()?.user?.id || '');
    if (!client || !userId) return [];
    const range = currentIssueRange();
    const { data: adoptions, error: adoptionError } = await client
      .from('newsflow_editorial_adoptions')
      .select('candidate_id,decision,decided_at,publication')
      .order('decided_at', { ascending: false });
    if (adoptionError) throw adoptionError;

    const current = (adoptions || []).filter((row) => {
      const decidedDate = shanghaiDate(row.decided_at);
      return decidedDate >= range.start && decidedDate <= range.end;
    });
    const candidateIds = current.map((row) => String(row.candidate_id || '')).filter(Boolean);
    if (!candidateIds.length) return [];

    const { data: reviews, error: reviewError } = await client
      .from('newsflow_editorial_reviews')
      .select('candidate_id,decision,decided_at,updated_at')
      .eq('reviewer_user_id', userId)
      .in('candidate_id', candidateIds);
    if (reviewError) throw reviewError;
    const ownReviews = new Map((reviews || []).map((row) => [String(row.candidate_id), row]));

    return current.map((row) => ({
      ...row,
      publication: row.publication && typeof row.publication === 'object' ? row.publication : {},
      ownReview: ownReviews.get(String(row.candidate_id)) || null
    }));
  };

  const renderEditorScoreboard = (items) => {
    const range = currentIssueRange();
    const rows = items.length ? items.map((item, index) => {
      const publication = item.publication || {};
      const ownDecision = String(item.ownReview?.decision || '');
      const chiefLabel = item.decision === 'cover_story' ? '封面文章' : '录用';
      return `<article class="nf-editor-score-row" data-editor-score-candidate="${escapeHtml(String(item.candidate_id || ''))}">
        <div class="nf-editor-score-copy"><span>${String(index + 1).padStart(2, '0')} · 主编${chiefLabel}</span><h3>${escapeHtml(publication.title || String(item.candidate_id || ''))}</h3><p>${escapeHtml(publication.short_summary || publication.source || '')}</p></div>
        <div class="nf-editor-score-actions" aria-label="编辑评分：${escapeHtml(publication.title || String(item.candidate_id || ''))}">
          ${REVIEW_DECISIONS.map((decision) => `<button type="button" class="${ownDecision === decision.id ? 'is-selected' : ''}" data-newsflow-desk-action="score-current-issue" data-candidate-id="${escapeHtml(String(item.candidate_id || ''))}" data-decision="${decision.id}" aria-pressed="${String(ownDecision === decision.id)}">${decision.label}</button>`).join('')}
        </div>
        <small>${ownDecision ? `我的当前评分：${escapeHtml(REVIEW_DECISIONS.find((decision) => decision.id === ownDecision)?.label || ownDecision)} · 可随时改评` : '尚未评分 · 主编裁决不影响你参与评议'}</small>
      </article>`;
    }).join('') : '<div class="nf-editor-score-empty">本期暂时还没有主编收录稿件。主编一旦录用，稿件会自动出现在这里。</div>';

    return `<section class="nf-editor-scoreboard" data-newsflow-editor-scoreboard>
      <header><div><span>EDITOR SCORECARD</span><h2>本期评议</h2><p>主编负责出版决定；编辑负责持续评分。你可以反复处理本期主编收录的全部稿件，评分只进入编辑共识，不会批准或撤下稿件。</p></div><strong>${range.start} — ${range.end} · ${items.length} 篇</strong></header>
      <div class="nf-editor-score-list">${rows}</div>
    </section>`;
  };

  const submitEditorScore = async (button) => {
    const client = await getClient();
    const userId = String(accountState()?.user?.id || '');
    const candidateId = String(button.dataset.candidateId || '');
    const decision = String(button.dataset.decision || '');
    if (!client || !userId || !candidateId || !REVIEW_DECISIONS.some((item) => item.id === decision)) return;

    const row = button.closest('[data-editor-score-candidate]');
    row?.querySelectorAll('button').forEach((item) => { item.disabled = true; });
    try {
      const now = new Date().toISOString();
      const { error } = await client.from('newsflow_editorial_reviews').upsert({
        candidate_id: candidateId,
        reviewer_user_id: userId,
        decision,
        decided_at: now,
        updated_at: now
      }, { onConflict: 'candidate_id,reviewer_user_id' });
      if (error) throw error;
      track('editor_current_issue_score', { candidate_id: candidateId, decision });
      showNotice('编辑评分已更新；主编出版决定不受影响。');
      announce('编辑评分已更新；主编出版决定不受影响。');
      await syncDeskOverview();
    } catch (error) {
      row?.querySelectorAll('button').forEach((item) => { item.disabled = false; });
      announce(error?.message || '编辑评分保存失败。');
    }
  };

  const loadOwnReferrals = async () => {
    const client = await getClient();
    const userId = String(accountState()?.user?.id || '');
    if (!client || !userId) return [];
    const { data, error } = await client
      .from('newsflow_editorial_referrals')
      .select('id,url,status,candidate_id,created_at')
      .eq('submitted_by', userId)
      .order('created_at', { ascending: false })
      .limit(4);
    if (error) throw error;
    return data || [];
  };

  const referralStamp = (status) => {
    if (status === 'ingested') return '已采集，等待编辑处理';
    if (status === 'dismissed') return '未进入候选';
    return '拟录用，请等待系统更新';
  };

  const renderGreenLane = (referrals) => `<section class="nf-editorial-green-lane" data-newsflow-green-lane>
    <header><div><span>EDITORIAL GREEN LANE</span><h2>绿色通道</h2><p>欢迎编辑推荐优秀稿件，请在下方粘贴链接。</p></div><small>推荐只提高采集优先级；主编仍是唯一出版决定人。</small></header>
    <form data-newsflow-referral-form><input type="url" inputmode="url" autocomplete="url" placeholder="https://…" aria-label="推荐稿件链接" required><button type="submit">提交推荐</button></form>
    <div class="nf-editorial-green-lane-list">${referrals.length ? referrals.map((referral) => {
      let host = referral.url;
      try { host = new URL(referral.url).hostname.replace(/^www\./, ''); } catch { /* keep URL */ }
      return `<div class="nf-editorial-green-lane-row"><span><strong>${escapeHtml(host)}</strong><small>${escapeHtml(referral.url)}</small></span><em class="is-${escapeHtml(referral.status)}">${escapeHtml(referralStamp(referral.status))}</em></div>`;
    }).join('') : '<p class="nf-editorial-green-lane-empty">还没有推荐记录。提交后会立即盖上“拟录用，请等待系统更新”。</p>'}</div>
  </section>`;

  const submitReferral = async (form) => {
    const input = form.querySelector('input[type="url"]');
    const submit = form.querySelector('button[type="submit"]');
    const client = await getClient();
    const userId = String(accountState()?.user?.id || '');
    const url = normalizeReferralUrl(input?.value || '');
    if (!client || !userId) return;
    if (!url) {
      announce('请粘贴一个有效的 HTTPS 新闻链接。');
      input?.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = '正在提交…';
    try {
      const { error } = await client.from('newsflow_editorial_referrals').insert({ submitted_by: userId, url });
      if (error && String(error.code) !== '23505') throw error;
      track('editorial_green_lane_referral', { duplicate: String(error?.code || '') === '23505' });
      showNotice(error ? '这条链接已经在绿色通道中。' : '拟录用，请等待系统更新。');
      announce(error ? '这条链接已经在绿色通道中。' : '绿色通道已收件：拟录用，请等待系统更新。');
      form.reset();
      await syncDeskOverview();
    } catch (error) {
      submit.disabled = false;
      submit.textContent = '提交推荐';
      announce(error?.message || '绿色通道提交失败。');
    }
  };

  const decorateEditorEntry = (items) => {
    const root = overviewRoot();
    if (!root || !isEditor()) return;
    const tab = root.querySelector('[data-review-action="open-pending"]');
    if (tab) {
      tab.innerHTML = `本期评议 <b>${items.length}</b>`;
      tab.removeAttribute('disabled');
    }
    const headingButton = root.querySelector('.nf-review-overview-heading [data-review-action="open-pending"]');
    if (headingButton) {
      headingButton.disabled = false;
      headingButton.textContent = items.length ? '进入本期评议 →' : '查看本期评议';
    }
  };

  const syncDeskOverview = async () => {
    const token = ++overviewSyncToken;
    const root = overviewRoot();
    if (!root) return;
    const card = root.querySelector('.nf-review-overview-card');
    const stats = card?.querySelector('.nf-review-overview-stats');
    if (!card || !stats) return;

    try {
      const [items, referrals] = await Promise.all([
        isEditor() ? loadEditorReviewPool() : Promise.resolve([]),
        loadOwnReferrals()
      ]);
      if (token !== overviewSyncToken || overviewRoot() !== root) return;

      card.querySelector('[data-newsflow-editor-scoreboard]')?.remove();
      card.querySelector('[data-newsflow-green-lane]')?.remove();

      let anchor = stats;
      if (isEditor()) {
        anchor.insertAdjacentHTML('afterend', renderEditorScoreboard(items));
        anchor = card.querySelector('[data-newsflow-editor-scoreboard]') || anchor;
        decorateEditorEntry(items);
      }
      anchor.insertAdjacentHTML('afterend', renderGreenLane(referrals));
    } catch (error) {
      console.warn('NewsFlow editorial desk enhancement unavailable:', error);
    }
  };

  const focusEditorScoreboard = async () => {
    await syncDeskOverview();
    const panel = overviewRoot()?.querySelector('[data-newsflow-editor-scoreboard]');
    panel?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    panel?.querySelector('button')?.focus({ preventScroll: true });
    if (!panel) announce('本期评议暂时无法加载。');
  };

  const wrapReviewGame = () => {
    const game = window.NewsFlowReviewGame;
    if (!game || game.__deskWrapped) return;
    const wrapped = Object.freeze({
      ...game,
      __deskWrapped: true,
      openOverview: async (...args) => {
        const result = await game.openOverview(...args);
        await syncDeskOverview();
        return result;
      }
    });
    window.NewsFlowReviewGame = wrapped;
  };

  document.addEventListener('click', (event) => {
    const pendingButton = event.target.closest?.('#newsflow-review-game-root [data-review-action="open-pending"]');
    if (!pendingButton) return;

    if (isEditor()) {
      event.preventDefault();
      event.stopPropagation();
      void focusEditorScoreboard();
      return;
    }
    if (pendingCount(pendingButton) !== 0) return;

    const root = reviewRoot();
    const overviewButton = root?.querySelector('[data-review-action="open-overview"]');
    if (!overviewButton) return;
    event.preventDefault();
    event.stopPropagation();
    overviewButton.click();
    window.requestAnimationFrame(() => {
      reviewRoot()?.querySelector('[data-review-action="open-overview"].is-active')?.focus();
    });
    announce('待审稿件已清空，仍停留在编辑部总览。');
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target.closest?.('[data-newsflow-referral-form]');
    if (!form) return;
    event.preventDefault();
    void submitReferral(form);
  });

  document.addEventListener('click', (event) => {
    const deskAction = event.target.closest?.('[data-newsflow-desk-action]');
    if (deskAction) {
      const action = deskAction.dataset.newsflowDeskAction;
      if (action === 'retract-decision') {
        event.preventDefault();
        openRetractionDialog(deskAction.dataset.candidateId || '');
        return;
      }
      if (action === 'close-retraction') {
        event.preventDefault();
        closeRetractionDialog();
        return;
      }
      if (action === 'confirm-retraction') {
        event.preventDefault();
        void retractDecision(deskAction.dataset.candidateId || '', deskAction);
        return;
      }
      if (action === 'score-current-issue') {
        event.preventDefault();
        void submitEditorScore(deskAction);
        return;
      }
    }

    if (!event.target.closest?.('#newsflow-review-game-root')) return;
    const selectedArchiveRow = event.target.closest?.('[data-review-action="select-archive"]');
    scheduleArchiveActionSync();
    if (selectedArchiveRow) revealArchiveDetailOnMobile();
    window.requestAnimationFrame(() => { void syncDeskOverview(); });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !reviewRoot()?.querySelector('[data-newsflow-retraction-dialog]')) return;
    event.preventDefault();
    event.stopPropagation();
    closeRetractionDialog();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const root = archiveRoot();
    if (!root) return;
    if (root.querySelector('.nf-review-withdrawal-dialog, .nf-review-invite-dialog, .nf-review-retraction-dialog')) return;
    if (event.target.closest?.('input, textarea, select')) return;

    const rows = archiveRows(root);
    if (rows.length < 2) return;

    event.preventDefault();
    const currentIndex = Math.max(0, rows.findIndex((row) => row.classList.contains('is-selected')));
    const direction = event.key === 'ArrowUp' ? -1 : 1;
    const nextIndex = Math.max(0, Math.min(rows.length - 1, currentIndex + direction));

    if (nextIndex === currentIndex) {
      announce(direction < 0 ? '已经是决定档案第一条。' : '已经是决定档案最后一条。');
      return;
    }

    const candidateId = rows[nextIndex].dataset.candidateId || '';
    rows[nextIndex].click();
    focusSelectedRow(candidateId);
    scheduleArchiveActionSync();
    announce(`决定档案第 ${nextIndex + 1} 条，共 ${rows.length} 条。`);
  });

  wrapReviewGame();
  window.addEventListener('newsflow:editorial-runtime-ready', () => {
    wrapReviewGame();
    scheduleArchiveActionSync();
    window.requestAnimationFrame(() => { void syncDeskOverview(); });
  });
  window.requestAnimationFrame(() => {
    scheduleArchiveActionSync();
    void syncDeskOverview();
  });
})();
