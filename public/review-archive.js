(() => {
  'use strict';

  const archiveRoot = () => document.querySelector('#newsflow-review-game-root .nf-review-shell.is-archive');
  const archiveRows = (root) => [...root.querySelectorAll('[data-review-action="select-archive"]')];

  const announce = (message) => {
    const region = document.getElementById('app-status');
    if (!region) return;
    region.textContent = '';
    window.requestAnimationFrame(() => { region.textContent = message; });
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

  document.addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const root = archiveRoot();
    if (!root) return;
    if (root.querySelector('.nf-review-withdrawal-dialog, .nf-review-invite-dialog')) return;
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
    announce(`决定档案第 ${nextIndex + 1} 条，共 ${rows.length} 条。`);
  });
})();
