const appRoot = document.querySelector('#app');
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const STATUS_PATH = './data/data-status.json';

let triggerReference = null;
let panelWasOpen = false;
let freshnessStatus = null;

const escapeMagazineHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const captureMagazineTrigger = (element) => {
  if (!(element instanceof HTMLElement)) return null;
  return {
    action: element.dataset.editionAction || '',
    storylineId: element.dataset.storylineId || '',
    text: element.textContent?.trim() || ''
  };
};

const restoreMagazineTrigger = () => {
  if (!triggerReference) return;
  const candidates = [...document.querySelectorAll('[data-edition-action]')];
  const target = candidates.find((element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (triggerReference.action && element.dataset.editionAction !== triggerReference.action) return false;
    if (triggerReference.storylineId && element.dataset.storylineId !== triggerReference.storylineId) return false;
    if (!triggerReference.storylineId && triggerReference.text && element.textContent?.trim() !== triggerReference.text) return false;
    return true;
  });
  triggerReference = null;
  target?.focus();
};

const magazineBackgroundTargets = (shell) => [
  shell?.querySelector(':scope > .topbar'),
  shell?.querySelector(':scope > .workspace'),
  shell?.querySelector(':scope > .mobile-nav')
].filter(Boolean);

const setMagazineBackgroundInert = (inert) => {
  const shell = appRoot?.querySelector('.app-shell');
  magazineBackgroundTargets(shell).forEach((element) => {
    element.inert = inert;
  });
};

const otherOverlayIsOpen = () => Boolean(document.querySelector(
  '.article-drawer, .help-dialog, .feedback-dialog, .sidebar.open, .mobile-search-backdrop.open'
));

const activeMagazinePanel = () => appRoot?.querySelector('[data-edition-layer="panel"] .edition-panel') || null;

const syncMagazinePanelState = () => {
  const panel = activeMagazinePanel();
  if (panel) {
    panelWasOpen = true;
    setMagazineBackgroundInert(true);
    document.body.classList.add('overlay-active');
    if (!panel.contains(document.activeElement)) {
      requestAnimationFrame(() => panel.querySelector(focusableSelector)?.focus());
    }
    return;
  }

  if (!panelWasOpen) return;
  panelWasOpen = false;
  setMagazineBackgroundInert(false);
  if (!otherOverlayIsOpen()) document.body.classList.remove('overlay-active');
  requestAnimationFrame(restoreMagazineTrigger);
};

const normalizeMastheadMeta = () => {
  const meta = appRoot?.querySelector('.masthead-meta');
  if (!meta || meta.dataset.magazinePolished === 'true') return;
  const lines = meta.innerText.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return;
  meta.innerHTML = lines.map((line) => `<span>${escapeMagazineHtml(line)}</span>`).join('');
  meta.dataset.magazinePolished = 'true';
};

const updateLatestChangeState = () => {
  const intro = appRoot?.querySelector('.post-issue-intro');
  if (!intro) return;
  const label = intro.querySelector('.section-label');
  const description = intro.querySelector('p');
  const movement = intro.querySelector('.movement');
  const lead = appRoot.querySelector('.lead-story');

  if (label && !label.dataset.originalText) label.dataset.originalText = label.textContent || '';
  if (description && !description.dataset.originalText) description.dataset.originalText = description.textContent || '';
  if (movement && !movement.dataset.originalText) movement.dataset.originalText = movement.textContent || '';

  if (lead) {
    intro.dataset.empty = 'false';
    if (label?.dataset.originalText) label.textContent = label.dataset.originalText;
    if (description?.dataset.originalText) description.textContent = description.dataset.originalText;
    if (movement?.dataset.originalText) movement.textContent = movement.dataset.originalText;
    return;
  }

  intro.dataset.empty = 'true';
  if (label) label.textContent = '当前筛选暂无新变化';
  if (description) description.textContent = '当前频道、时间或阅读条件下没有达到展示门槛的重大信号；调整筛选即可返回完整编辑台。';
  if (movement) movement.textContent = '等待信号';
};

const enhanceMagazineTriggers = () => {
  appRoot?.querySelectorAll('[data-edition-action^="open-"]').forEach((button) => {
    button.setAttribute('aria-haspopup', 'dialog');
  });
  appRoot?.querySelectorAll('[data-edition-action="open-archive"]').forEach((button) => {
    button.setAttribute('aria-controls', 'archive-panel-title');
  });
};

const formatFreshnessBadge = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: freshnessStatus?.timezone || 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit'
  }).format(date).replace('-', '.');
};

const formatFreshnessLong = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: freshnessStatus?.timezone || 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

const decorateDataFreshness = () => {
  const brandName = appRoot?.querySelector('.brand-name');
  const brandCopy = brandName?.closest('.brand-copy');
  if (!brandName || !brandCopy || !freshnessStatus?.updated_at) return;

  brandCopy.classList.add('nf-brand-copy');

  const existingRows = [...brandCopy.querySelectorAll('.nf-brand-row')];
  let row = existingRows.find((candidate) => candidate.parentElement === brandCopy) || null;
  if (!row) {
    row = document.createElement('span');
    row.className = 'nf-brand-row';
    brandCopy.prepend(row);
  }

  if (brandName.parentElement !== row) row.prepend(brandName);

  for (const duplicateRow of existingRows) {
    if (duplicateRow === row) continue;
    duplicateRow.querySelectorAll('.nf-data-date').forEach((badge) => badge.remove());
    while (duplicateRow.firstChild) row.appendChild(duplicateRow.firstChild);
    duplicateRow.remove();
  }

  const badges = [...brandCopy.querySelectorAll('.nf-data-date')];
  let badge = badges.find((candidate) => candidate.parentElement === row) || null;
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'nf-data-date';
    row.appendChild(badge);
  }
  badges.forEach((candidate) => {
    if (candidate !== badge) candidate.remove();
  });

  badge.textContent = formatFreshnessBadge(freshnessStatus.updated_at);
  badge.title = `数据更新至 ${formatFreshnessLong(freshnessStatus.updated_at)}`;
  badge.setAttribute('aria-label', badge.title);
};

const loadDataFreshness = async () => {
  try {
    const response = await fetch(STATUS_PATH, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return;
    const payload = await response.json();
    if (payload && typeof payload.updated_at === 'string') freshnessStatus = payload;
  } catch {
    freshnessStatus = null;
  }
  decorateDataFreshness();
};

const decorateMagazine = () => {
  const shell = appRoot?.querySelector('.app-shell[data-product-model="magazine-edition"]');
  if (!shell) return;
  normalizeMastheadMeta();
  updateLatestChangeState();
  enhanceMagazineTriggers();
  syncMagazinePanelState();
  decorateDataFreshness();
};

appRoot?.addEventListener('click', (event) => {
  const editionAction = event.target.closest('[data-edition-action]');
  if (!editionAction) return;
  const action = editionAction.dataset.editionAction;
  if (['open-storyline', 'open-storylines', 'open-archive'].includes(action)) {
    triggerReference = captureMagazineTrigger(editionAction);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const panel = activeMagazinePanel();
  if (!panel) return;
  const focusable = [...panel.querySelectorAll(focusableSelector)]
    .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);

  if (!panel.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

window.addEventListener('newsflow:rendered', decorateMagazine);
window.addEventListener('newsflow:edition-rendered', decorateMagazine);
loadDataFreshness();
decorateMagazine();
