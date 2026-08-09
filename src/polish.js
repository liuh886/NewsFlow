const polishIcon = (name) => {
  const icons = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };
  return icons[name] || '';
};

const appRoot = document.querySelector('#app');
const statusRegion = document.querySelector('#app-status');
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const isMagazineMode = () => appRoot?.querySelector('.app-shell')?.dataset.productModel === 'magazine-edition';
const EDITION_ROUTES = {
  archive: /^#archive$/,
  storylines: /^#storylines$/,
  storyline: /^#storyline\/(.+)$/,
  issue: /^#issue\/(.+)$/
};

const announce = (message) => {
  if (!statusRegion) return;
  statusRegion.textContent = '';
  window.requestAnimationFrame(() => {
    statusRegion.textContent = message;
  });
};

const captureFocusReference = (element) => {
  if (!(element instanceof HTMLElement)) return null;
  return {
    action: element.dataset.action || '',
    editionAction: element.dataset.editionAction || '',
    id: element.dataset.id || '',
    issueId: element.dataset.issueId || '',
    storylineId: element.dataset.storylineId || '',
    value: element.dataset.value || '',
    ariaLabel: element.getAttribute('aria-label') || ''
  };
};

const restoreFocus = (reference) => {
  if (!reference) return;
  let candidates = [];
  if (reference.action) candidates = [...document.querySelectorAll(`[data-action="${reference.action}"]`)];
  else if (reference.editionAction) candidates = [...document.querySelectorAll(`[data-edition-action="${reference.editionAction}"]`)];
  else candidates = [...document.querySelectorAll(focusableSelector)];
  const target = candidates.find((element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (reference.id && element.dataset.id !== reference.id) return false;
    if (reference.issueId && element.dataset.issueId !== reference.issueId) return false;
    if (reference.storylineId && element.dataset.storylineId !== reference.storylineId) return false;
    if (reference.value && element.dataset.value !== reference.value) return false;
    if (reference.ariaLabel && element.getAttribute('aria-label') !== reference.ariaLabel) return false;
    return true;
  });
  target?.focus();
};

const applyScrollState = () => {
  document.body.classList.toggle('is-scrolled', window.scrollY > 18);
};

let scrollFrame = 0;
window.addEventListener('scroll', () => {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    applyScrollState();
    scrollFrame = 0;
  });
}, { passive: true });
applyScrollState();

const setText = (element, value) => {
  if (element && element.textContent !== value) element.textContent = value;
};

const simplifyMasthead = () => {
  if (isMagazineMode()) return;
  setText(document.querySelector('.masthead-deck'), '筛出值得判断的变化，并保留来源与证据。');

  const meta = document.querySelector('.masthead-meta');
  if (!meta || meta.dataset.simplified === 'true') return;

  const lines = meta.innerText.split('\n').map((line) => line.trim()).filter(Boolean);
  const date = lines.find((line) => /\d{4}年/.test(line)) || '';
  const countLine = lines.find((line) => /signals?/i.test(line)) || '';
  const count = countLine.match(/\d+/)?.[0] || '';
  const topic = lines.find((line) => line !== date && line !== countLine && !/data through/i.test(line)) || '全部信号';

  meta.innerHTML = `<span>${date ? `截至 ${date}` : '数据快照'}</span><span>${topic}${count ? ` · ${count} 条` : ''}</span>`;
  meta.dataset.simplified = 'true';
};

const simplifySidebar = () => {
  document.querySelector('.sidebar .edition-card')?.closest('.sidebar-section')?.remove();

  document.querySelectorAll('.sidebar .section-label').forEach((label) => {
    if (label.textContent?.trim() === '阅读队列') label.textContent = '阅读';
  });

  if (isMagazineMode()) {
    document.querySelector('.sidebar')?.style.setProperty('z-index', '230');
  }
};

const simplifyFeed = () => {
  document.querySelectorAll('.signal-score').forEach((element) => element.remove());

  if (!isMagazineMode()) {
    const feedCount = document.querySelector('.feed-heading span');
    const count = feedCount?.textContent?.match(/\d+/)?.[0];
    if (feedCount && count) feedCount.textContent = `${count} 条`;
  }
};

const simplifyRail = () => {
  if (isMagazineMode()) return;
  document.querySelector('.brief-rail .source-bars')?.closest('.rail-card')?.remove();

  document.querySelectorAll('.brief-rail .rail-card').forEach((card) => {
    const label = card.querySelector('.section-label');
    if (!label) return;
    if (label.textContent?.trim() === '编辑摘要') label.textContent = '导读';
    if (label.textContent?.trim() === '高频主题') label.textContent = '主题';
  });

  document.querySelectorAll('.brief-item[data-action="open"]').forEach((item) => {
    item.setAttribute('role', 'button');
    if (!item.getAttribute('aria-label')) item.setAttribute('aria-label', `深读：${item.textContent?.trim() || '信号'}`);
  });
};

const simplifyDrawer = () => {
  setText(document.querySelector('.drawer-brand'), 'Newsflow · 深读');

  document.querySelectorAll('.drawer-section h3').forEach((heading) => {
    const text = heading.textContent?.trim();
    if (text === '发生了什么 / 为什么重要') heading.textContent = '要点';
    if (text === '支持证据') heading.textContent = '证据';
    if (text === '信号元数据') heading.textContent = '来源';
  });
};

const ensureMobileReaderSearch = () => {
  const topActions = document.querySelector('.top-actions');
  if (!topActions || !isMagazineMode()) return;
  let button = topActions.querySelector('[data-action="focus-search"].mobile-reader-search');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button mobile-reader-search';
    button.dataset.action = 'focus-search';
    button.setAttribute('aria-label', '搜索刊物');
    button.innerHTML = polishIcon('search');
    topActions.prepend(button);
  }
  button.hidden = !window.matchMedia('(max-width: 720px)').matches;
};

let previousAppOverlayOpen = false;
let lastAppOverlayTrigger = null;
let editionPanelOpen = false;
let editionPanelReturnFocus = null;
let syncingEditionRoute = false;
let initialEditionRouteSynced = false;

const setEditionBackgroundInert = (inert) => {
  const shell = appRoot?.querySelector('.app-shell');
  const panelLayer = shell?.querySelector('[data-edition-layer="panel"]');
  if (!shell) return;
  [...shell.children].forEach((child) => {
    if (child === panelLayer) return;
    child.inert = inert;
    if (inert) child.setAttribute('aria-hidden', 'true');
    else child.removeAttribute('aria-hidden');
  });
};

const syncEditionDialogAccessibility = () => {
  const panel = appRoot?.querySelector('[data-edition-layer="panel"] .edition-panel');
  if (panel && !editionPanelOpen) {
    if (!editionPanelReturnFocus) editionPanelReturnFocus = captureFocusReference(document.activeElement);
    editionPanelOpen = true;
    setEditionBackgroundInert(true);
    requestAnimationFrame(() => panel.querySelector(focusableSelector)?.focus());
    return;
  }
  if (!panel && editionPanelOpen) {
    editionPanelOpen = false;
    setEditionBackgroundInert(false);
    const returnFocus = editionPanelReturnFocus;
    editionPanelReturnFocus = null;
    requestAnimationFrame(() => restoreFocus(returnFocus));
  }
};

const editionRouteForAction = (target) => {
  const action = target?.dataset.editionAction || '';
  if (action === 'open-archive') return '#archive';
  if (action === 'open-storylines') return '#storylines';
  if (action === 'open-storyline' && target.dataset.storylineId) return `#storyline/${encodeURIComponent(target.dataset.storylineId)}`;
  if (action === 'open-issue' && target.dataset.issueId) return `#issue/${encodeURIComponent(target.dataset.issueId)}`;
  return '';
};

const pushEditionRoute = (hash) => {
  if (!hash || syncingEditionRoute || window.location.hash === hash) return;
  window.history.pushState({ newsflowEdition: true, hash }, '', `${window.location.pathname}${window.location.search}${hash}`);
};

const syncEditionRouteFromLocation = () => {
  if (!isMagazineMode()) return;
  const hash = window.location.hash;
  let target = null;
  const issueMatch = hash.match(EDITION_ROUTES.issue);
  const storylineMatch = hash.match(EDITION_ROUTES.storyline);
  if (issueMatch) {
    let id = issueMatch[1];
    try { id = decodeURIComponent(id); } catch {}
    target = document.querySelector(`[data-edition-action="open-issue"][data-issue-id="${CSS.escape(id)}"]`);
  } else if (storylineMatch) {
    let id = storylineMatch[1];
    try { id = decodeURIComponent(id); } catch {}
    target = document.querySelector(`[data-edition-action="open-storyline"][data-storyline-id="${CSS.escape(id)}"]`);
  } else if (EDITION_ROUTES.archive.test(hash)) {
    target = document.querySelector('[data-edition-action="open-archive"]');
  } else if (EDITION_ROUTES.storylines.test(hash)) {
    target = document.querySelector('[data-edition-action="open-storylines"]');
  }

  syncingEditionRoute = true;
  try {
    if (target) target.click();
    else if (appRoot?.querySelector('[data-edition-layer="panel"]')) {
      appRoot.querySelector('[data-edition-action="close-panel"]')?.click();
    }
  } finally {
    syncingEditionRoute = false;
  }
};

const trapEditionFocus = (event) => {
  const panel = appRoot?.querySelector('[data-edition-layer="panel"] .edition-panel');
  if (!panel || event.key !== 'Tab') return;
  const focusable = [...panel.querySelectorAll(focusableSelector)].filter((element) => !element.hidden && element.getClientRects().length);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const decorateControls = () => {
  document.querySelector('.global-search')?.setAttribute('role', 'search');

  document.querySelectorAll('button:not([type])').forEach((button) => button.setAttribute('type', 'button'));

  document.querySelectorAll('.nav-button, .filter-button, .date-button').forEach((element) => {
    if (element.classList.contains('active')) element.setAttribute('aria-current', 'page');
    else element.removeAttribute('aria-current');
  });

  document.querySelectorAll('.segment-button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.classList.contains('active')));
  });

  document.querySelectorAll('.article-action, .text-button').forEach((button) => {
    if (button.matches('[data-action="bookmark"]')) {
      button.setAttribute('aria-pressed', String(button.classList.contains('saved')));
    }
  });

  const mobileMenu = document.querySelector('[data-action="mobile-menu"]');
  if (mobileMenu) mobileMenu.setAttribute('aria-expanded', String(Boolean(document.querySelector('.sidebar.open'))));

  const mobileSearch = document.querySelector('[data-action="focus-search"]');
  if (mobileSearch) mobileSearch.setAttribute('aria-controls', 'mobile-search-sheet');

  ensureMobileReaderSearch();
};

const updateAppOverlayState = () => {
  const appOverlayOpen = Boolean(document.querySelector('.article-drawer, .help-dialog, .feedback-dialog, .sidebar.open'));
  document.body.classList.toggle('overlay-active', appOverlayOpen || Boolean(document.querySelector('.edition-panel')));

  if (previousAppOverlayOpen && !appOverlayOpen) {
    window.requestAnimationFrame(() => restoreFocus(lastAppOverlayTrigger));
  }

  previousAppOverlayOpen = appOverlayOpen;
};

const decorateInterface = () => {
  simplifyMasthead();
  simplifySidebar();
  simplifyFeed();
  simplifyRail();
  simplifyDrawer();
  decorateControls();
  updateAppOverlayState();
  syncEditionDialogAccessibility();
  applyScrollState();
};

let decorateFrame = 0;
const scheduleDecoration = () => {
  if (decorateFrame) return;
  decorateFrame = window.requestAnimationFrame(() => {
    decorateInterface();
    decorateFrame = 0;
  });
};

window.addEventListener('newsflow:rendered', scheduleDecoration);
window.addEventListener('newsflow:edition-rendered', () => {
  scheduleDecoration();
  if (!initialEditionRouteSynced) {
    initialEditionRouteSynced = true;
    requestAnimationFrame(syncEditionRouteFromLocation);
  }
});
window.addEventListener('resize', scheduleDecoration, { passive: true });
scheduleDecoration();

const searchSheet = document.createElement('div');
searchSheet.className = 'mobile-search-backdrop';
searchSheet.id = 'mobile-search-sheet';
searchSheet.setAttribute('aria-hidden', 'true');
searchSheet.innerHTML = `<section class="mobile-search-panel" role="dialog" aria-modal="true" aria-labelledby="mobile-search-title">
  <h2 id="mobile-search-title" hidden>搜索 Newsflow</h2>
  <div class="mobile-search-row">
    <label class="mobile-search-field">${polishIcon('search')}<input type="search" autocomplete="off" placeholder="搜索标题、摘要或主题…" aria-label="搜索 Newsflow"></label>
    <button class="mobile-search-close" type="button" aria-label="关闭搜索">${polishIcon('close')}</button>
  </div>
</section>`;
document.body.append(searchSheet);

const mobileSearchInput = searchSheet.querySelector('input');
const mobileSearchClose = searchSheet.querySelector('.mobile-search-close');
let searchWasOpen = false;
let mobileSearchTrigger = null;

const setAppInert = (inert) => {
  appRoot.inert = inert;
  if (inert) appRoot.setAttribute('aria-hidden', 'true');
  else appRoot.removeAttribute('aria-hidden');
};

const openMobileSearch = (trigger) => {
  const source = document.querySelector('#global-search');
  mobileSearchTrigger = captureFocusReference(trigger || document.activeElement);
  mobileSearchInput.value = source?.value || '';
  searchSheet.classList.add('open');
  searchSheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('mobile-search-active');
  setAppInert(true);
  searchWasOpen = true;
  window.requestAnimationFrame(() => mobileSearchInput.focus());
};

const closeMobileSearch = () => {
  if (!searchWasOpen) return;
  searchSheet.classList.remove('open');
  searchSheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('mobile-search-active');
  setAppInert(false);
  searchWasOpen = false;
  window.requestAnimationFrame(() => restoreFocus(mobileSearchTrigger));
};

const trapSearchFocus = (event) => {
  if (!searchWasOpen || event.key !== 'Tab') return;
  const focusable = [...searchSheet.querySelectorAll(focusableSelector)].filter((element) => !element.hidden);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

mobileSearchInput.addEventListener('input', () => {
  const source = document.querySelector('#global-search');
  if (!source) return;
  source.value = mobileSearchInput.value;
  source.dispatchEvent(new Event('input', { bubbles: true }));
});

mobileSearchClose.addEventListener('click', closeMobileSearch);
searchSheet.addEventListener('click', (event) => {
  if (event.target === searchSheet) closeMobileSearch();
});

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest('[data-action], [data-edition-action]') : null;
  const action = target?.dataset.action;
  const editionAction = target?.dataset.editionAction;

  if (['open', 'help', 'feedback-center', 'mobile-menu', 'mobile-filter'].includes(action)) {
    lastAppOverlayTrigger = captureFocusReference(target);
  }

  if (editionAction && ['open-archive', 'open-storylines', 'open-storyline', 'open-issue'].includes(editionAction)) {
    if (!editionPanelOpen) editionPanelReturnFocus = captureFocusReference(target);
    pushEditionRoute(editionRouteForAction(target));
  } else if (editionAction === 'close-panel' && !syncingEditionRoute) {
    if (window.history.state?.newsflowEdition) window.history.back();
    else if (EDITION_ROUTES.archive.test(window.location.hash)
      || EDITION_ROUTES.storylines.test(window.location.hash)
      || EDITION_ROUTES.storyline.test(window.location.hash)
      || EDITION_ROUTES.issue.test(window.location.hash)) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    }
  }

  if (action === 'focus-search') {
    event.preventDefault();
    event.stopPropagation();
    openMobileSearch(target);
    return;
  }

  if (action === 'reset') {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}, true);

document.addEventListener('keydown', (event) => {
  trapSearchFocus(event);
  trapEditionFocus(event);
  if (event.key === 'Escape' && searchWasOpen) {
    event.preventDefault();
    event.stopPropagation();
    closeMobileSearch();
  }
}, true);

window.addEventListener('popstate', () => requestAnimationFrame(syncEditionRouteFromLocation));
window.addEventListener('hashchange', () => requestAnimationFrame(syncEditionRouteFromLocation));
window.addEventListener('offline', () => announce('网络连接已中断，Newsflow 将继续使用已缓存内容。'));
window.addEventListener('online', () => announce('网络连接已恢复。'));
