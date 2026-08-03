const polishIcon = (name) => {
  const icons = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };
  return icons[name] || '';
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

const decorateInterface = () => {
  document.querySelectorAll('.nav-button, .filter-button, .date-button, .segment-button').forEach((element) => {
    if (element.classList.contains('active')) element.setAttribute('aria-current', 'true');
    else element.removeAttribute('aria-current');
  });

  document.querySelectorAll('.article-meta .source-verification').forEach((badge) => {
    if (badge.textContent?.trim().toLowerCase() === 'primary') badge.textContent = '机构 / 一手源';
  });

  document.querySelectorAll('.brief-item[data-action="open"]').forEach((item) => {
    item.setAttribute('role', 'button');
    if (!item.getAttribute('aria-label')) item.setAttribute('aria-label', `深读：${item.textContent?.trim() || '信号'}`);
  });
};

const observer = new MutationObserver(() => {
  decorateInterface();
  applyScrollState();
});
observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
decorateInterface();

const searchSheet = document.createElement('div');
searchSheet.className = 'mobile-search-backdrop';
searchSheet.id = 'mobile-search-sheet';
searchSheet.setAttribute('aria-hidden', 'true');
searchSheet.innerHTML = `<section class="mobile-search-panel" role="dialog" aria-modal="true" aria-labelledby="mobile-search-title">
  <h2 id="mobile-search-title" hidden>搜索 NewsFlow</h2>
  <div class="mobile-search-row">
    <label class="mobile-search-field">${polishIcon('search')}<input type="search" autocomplete="off" placeholder="搜索标题、摘要、证据或主题…" aria-label="搜索 NewsFlow"></label>
    <button class="mobile-search-close" type="button" aria-label="关闭搜索">${polishIcon('close')}</button>
  </div>
  <p class="mobile-search-hint">搜索会立即作用于当前频道与筛选条件。</p>
</section>`;
document.body.append(searchSheet);

const mobileSearchInput = searchSheet.querySelector('input');
const mobileSearchClose = searchSheet.querySelector('.mobile-search-close');
let searchWasOpen = false;

const openMobileSearch = () => {
  const source = document.querySelector('#global-search');
  mobileSearchInput.value = source?.value || '';
  searchSheet.classList.add('open');
  searchSheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('mobile-search-active');
  searchWasOpen = true;
  window.requestAnimationFrame(() => mobileSearchInput.focus());
};

const closeMobileSearch = () => {
  if (!searchWasOpen) return;
  searchSheet.classList.remove('open');
  searchSheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('mobile-search-active');
  searchWasOpen = false;
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
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'focus-search') {
    event.preventDefault();
    event.stopPropagation();
    openMobileSearch();
    return;
  }

  if (action === 'reset') {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}, true);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && searchWasOpen) {
    event.preventDefault();
    event.stopPropagation();
    closeMobileSearch();
  }
}, true);
