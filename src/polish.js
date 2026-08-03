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
    id: element.dataset.id || '',
    value: element.dataset.value || '',
    ariaLabel: element.getAttribute('aria-label') || ''
  };
};

const restoreFocus = (reference) => {
  if (!reference) return;
  const candidates = reference.action
    ? [...document.querySelectorAll(`[data-action="${reference.action}"]`)]
    : [...document.querySelectorAll(focusableSelector)];
  const target = candidates.find((element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (reference.id && element.dataset.id !== reference.id) return false;
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
};

const simplifyFeed = () => {
  document.querySelectorAll('.article-meta span').forEach((span) => {
    if (/^score\s/i.test(span.textContent?.trim() || '')) span.remove();
  });

  document.querySelectorAll('.signal-score').forEach((element) => element.remove());

  const feedCount = document.querySelector('.feed-heading span');
  const count = feedCount?.textContent?.match(/\d+/)?.[0];
  if (feedCount && count) feedCount.textContent = `${count} 条`;

  document.querySelectorAll('.segment-button').forEach((button) => {
    if (button.dataset.value === 'list') button.textContent = '列表';
    if (button.dataset.value === 'grid') button.textContent = '网格';
  });
};

const simplifyRail = () => {
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
  setText(document.querySelector('.drawer-brand'), 'NewsFlow · 深读');

  const eyebrow = document.querySelector('.drawer-eyebrow');
  if (eyebrow) eyebrow.textContent = eyebrow.textContent.replace(/\s*·\s*Score\s*[\d.]+/i, '');

  document.querySelectorAll('.drawer-section h3').forEach((heading) => {
    const text = heading.textContent?.trim();
    if (text === '发生了什么 / 为什么重要') heading.textContent = '要点';
    if (text === '支持证据') heading.textContent = '证据';
    if (text === '信号元数据') heading.textContent = '来源';
  });
};

let previousAppOverlayOpen = false;
let lastAppOverlayTrigger = null;

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
};

const updateAppOverlayState = () => {
  const appOverlayOpen = Boolean(document.querySelector('.article-drawer, .help-dialog, .sidebar.open'));
  document.body.classList.toggle('overlay-active', appOverlayOpen);

  if (previousAppOverlayOpen && !appOverlayOpen) {
    window.requestAnimationFrame(() => restoreFocus(lastAppOverlayTrigger));
  }

  previousAppOverlayOpen = appOverlayOpen;
};

const decorateInterface = () => {
  document.querySelectorAll('.article-meta .source-verification').forEach((badge) => {
    if (badge.textContent?.trim().toLowerCase() === 'primary') badge.textContent = '机构 / 一手源';
  });

  simplifyMasthead();
  simplifySidebar();
  simplifyFeed();
  simplifyRail();
  simplifyDrawer();
  decorateControls();
  updateAppOverlayState();
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

const observer = new MutationObserver(scheduleDecoration);
observer.observe(appRoot, { childList: true });
decorateInterface();

const searchSheet = document.createElement('div');
searchSheet.className = 'mobile-search-backdrop';
searchSheet.id = 'mobile-search-sheet';
searchSheet.setAttribute('aria-hidden', 'true');
searchSheet.innerHTML = `<section class="mobile-search-panel" role="dialog" aria-modal="true" aria-labelledby="mobile-search-title">
  <h2 id="mobile-search-title" hidden>搜索 NewsFlow</h2>
  <div class="mobile-search-row">
    <label class="mobile-search-field">${polishIcon('search')}<input type="search" autocomplete="off" placeholder="搜索标题、摘要或主题…" aria-label="搜索 NewsFlow"></label>
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
  const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
  const action = target?.dataset.action;

  if (['open', 'help', 'mobile-menu', 'mobile-filter'].includes(action)) {
    lastAppOverlayTrigger = captureFocusReference(target);
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
  if (event.key === 'Escape' && searchWasOpen) {
    event.preventDefault();
    event.stopPropagation();
    closeMobileSearch();
  }
}, true);

window.addEventListener('offline', () => announce('网络连接已中断，NewsFlow 将继续使用已缓存内容。'));
window.addEventListener('online', () => announce('网络连接已恢复。'));
