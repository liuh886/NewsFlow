(() => {
  const appRoot = document.querySelector('#app');
  let latestOpen = false;

  const setHidden = (node, hidden) => {
    if (!node) return;
    node.hidden = hidden;
    // Inline display toggling is enough: a non-important inline style already
    // outranks every non-important stylesheet rule, and keeps the cascade
    // overridable by the canonical visual owner.
    node.style.display = hidden ? 'none' : '';
  };

  const apply = () => {
    const shell = appRoot?.querySelector('.app-shell[data-product-model="magazine-edition"]');
    if (!shell) return;
    const main = shell.querySelector('.main-column');
    if (!main) return;

    const mobileLatest = shell.querySelector('.mobile-nav[data-edition-layer="magazine"] [data-action="mobile-home"]');
    if (mobileLatest) {
      mobileLatest.dataset.action = '';
      mobileLatest.dataset.latestAction = 'open';
      mobileLatest.setAttribute('aria-current', latestOpen ? 'page' : 'false');
    }
    const mobileIssue = shell.querySelector('.mobile-nav[data-edition-layer="magazine"] [data-edition-action="go-home"]');
    if (mobileIssue) mobileIssue.setAttribute('aria-current', latestOpen ? 'false' : 'page');

    if (!latestOpen) return;
    main.querySelectorAll('[data-edition-layer="latest"], [data-edition-layer="archive"], [data-edition-layer="section-view"]').forEach((node) => setHidden(node, true));
    [main.querySelector('.lead-story'), main.querySelector('.feed-toolbar'), main.querySelector('.feed-list'), main.querySelector('.empty-state')]
      .filter(Boolean)
      .forEach((node) => setHidden(node, false));

    const masthead = main.querySelector('.masthead');
    if (masthead) {
      const kicker = masthead.querySelector('.masthead-kicker');
      const title = masthead.querySelector('.masthead-title');
      const deck = masthead.querySelector('.masthead-deck');
      const meta = masthead.querySelector('.masthead-meta');
      const sections = masthead.querySelector('[data-edition-layer="masthead-sections"]');
      if (kicker) kicker.textContent = 'Frontier Systems Review · 最新';
      if (title) title.textContent = '最新';
      if (deck) deck.textContent = '主编已经采用、但不必等待下一正式刊期的最新公开信号。';
      if (meta) meta.innerHTML = 'Latest adopted signals<br>Published with Newsflow';
      if (sections) sections.hidden = true;
    }
    const feedHeading = main.querySelector('.feed-heading h2');
    if (feedHeading) feedHeading.textContent = '最新';
  };

  const openLatest = () => {
    latestOpen = true;
    document.querySelector('#app [data-edition-layer="panel"] [data-edition-action="close-panel"]')?.click();
    apply();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeLatest = () => {
    if (!latestOpen) return;
    latestOpen = false;
    window.dispatchEvent(new CustomEvent('newsflow:rendered'));
  };

  // Bubble-phase delegation keeps the Runtime coordination contract: the Latest
  // surface reacts to explicit clicks without capturing or swallowing events
  // that other owners (analytics, reading surface) may still need to observe.
  document.addEventListener('click', (event) => {
    const latest = event.target.closest?.('[data-latest-action="open"]');
    if (latest) {
      event.preventDefault();
      openLatest();
      return;
    }
    const publicationAction = event.target.closest?.('[data-edition-action]');
    if (publicationAction && publicationAction.dataset.editionAction !== 'close-panel') closeLatest();
  });

  window.addEventListener('newsflow:rendered', () => requestAnimationFrame(apply));
  window.addEventListener('newsflow:edition-rendered', () => requestAnimationFrame(apply));
})();
