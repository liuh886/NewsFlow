(() => {
  'use strict';

  const reviewRoot = () => document.getElementById('newsflow-review-game-root');
  const archiveRoot = () => reviewRoot()?.querySelector('.nf-review-shell.is-archive') || null;
  const archiveRows = (root) => [...root.querySelectorAll('[data-review-action="select-archive"]')];
  const accountState = () => window.HaoAccount?.getState?.();
  const getClient = async () => window.HaoAccount?.getClient?.();

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
    const isChief = window.NewsFlowMode?.getEditorialRole?.() === 'editor_in_chief';
    const hasPublicAdoption = Boolean(archive.querySelector(`[data-review-action="open-withdrawal"][data-candidate-id="${CSS.escape(candidateId)}"]`));
    const consequence = isChief && hasPublicAdoption
      ? '撤回后，稿件会重新进入待审稿；当前公开采用记录也会随主编决定同步撤下。'
      : '撤回后，这条编辑决定会被删除，稿件重新进入你的待审稿。';

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
    root.append(container);
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
      try {
        window.gtag?.('event', 'editor_review_decision_retracted', { candidate_id: candidateId });
      } catch {
        // Analytics must not interrupt editorial actions.
      }
      await window.NewsFlowReviewGame?.openOverview?.();
      showNotice('决定已撤回，稿件已重新进入待审。');
      announce('决定已撤回，稿件已重新进入待审。');
    } catch (error) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = originalLabel;
      announce(error?.message || '撤回决定失败。');
    }
  };

  document.addEventListener('click', (event) => {
    const pendingButton = event.target.closest?.('#newsflow-review-game-root [data-review-action="open-pending"]');
    if (!pendingButton || pendingCount(pendingButton) !== 0) return;

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
    }

    if (!event.target.closest?.('#newsflow-review-game-root')) return;
    const selectedArchiveRow = event.target.closest?.('[data-review-action="select-archive"]');
    scheduleArchiveActionSync();
    if (selectedArchiveRow) revealArchiveDetailOnMobile();
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

  window.addEventListener('newsflow:editorial-runtime-ready', scheduleArchiveActionSync);
  window.requestAnimationFrame(scheduleArchiveActionSync);
})();
