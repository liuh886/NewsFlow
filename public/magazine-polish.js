const appRoot = document.querySelector('#app');
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let triggerReference = null;
let observedShell = null;
let shellObserver = null;
let panelWasOpen = false;
let decorateTimer = 0;

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

const activeMagazineWrapper = () => appRoot?.querySelector(
  '[data-magazine-panel], [data-edition-layer="panel"]'
) || null;

const activeMagazinePanel = () => activeMagazineWrapper()?.querySelector('.edition-panel') || null;

const syncMagazinePanelState = () => {
  const wrapper = activeMagazineWrapper();
  if (wrapper) {
    panelWasOpen = true;
    setMagazineBackgroundInert(true);
    document.body.classList.add('overlay-active');
    const panel = wrapper.querySelector('.edition-panel');
    if (panel && !panel.contains(document.activeElement)) {
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
  appRoot?.querySelectorAll('[data-edition-action="open-storylines"]').forEach((button) => {
    button.setAttribute('aria-controls', 'storyline-index-panel');
  });
  appRoot?.querySelectorAll('[data-edition-action="open-archive"]').forEach((button) => {
    button.setAttribute('aria-controls', 'archive-panel-title');
  });
};

const storylineIndexItems = () => [...(appRoot?.querySelectorAll('.storyline-item[data-storyline-id]') || [])]
  .map((item) => ({
    id: item.dataset.storylineId || '',
    title: item.querySelector('h3')?.textContent?.trim() || '未命名议题',
    view: item.querySelector('p')?.textContent?.trim() || '',
    movement: item.querySelector('.movement')?.textContent?.trim() || '观察中',
    evidence: item.querySelector('.storyline-meta span:last-child')?.textContent?.trim() || '0 条证据'
  }))
  .filter((item) => item.id);

const renderStorylineIndexPanel = () => {
  const items = storylineIndexItems();
  return `<div data-magazine-panel="storyline-index">
    <div class="edition-overlay" data-magazine-action="close-index"></div>
    <aside class="edition-panel storyline-index-panel" id="storyline-index-panel" role="dialog" aria-modal="true" aria-labelledby="storyline-index-title">
      <div class="edition-panel-head"><span>NewsFlow · 长期议题</span><button type="button" data-magazine-action="close-index" aria-label="关闭长期议题总览">×</button></div>
      <div class="edition-panel-body">
        <span class="section-label">议题总览</span>
        <h2 id="storyline-index-title">持续追踪，而不是追逐热点</h2>
        <p class="panel-question">每条长期议题都保留当前判断、证据变化、下一步观察与可推翻条件。</p>
        <div class="storyline-index-list">
          ${items.map((item, index) => `<button type="button" class="storyline-index-item" data-magazine-action="open-storyline" data-storyline-id="${escapeMagazineHtml(item.id)}">
            <span class="storyline-index-number">${String(index + 1).padStart(2, '0')}</span>
            <span class="storyline-index-copy"><span class="storyline-index-meta">${escapeMagazineHtml(item.movement)} · ${escapeMagazineHtml(item.evidence)}</span><strong>${escapeMagazineHtml(item.title)}</strong><span>${escapeMagazineHtml(item.view)}</span></span>
            <span class="storyline-index-arrow" aria-hidden="true">→</span>
          </button>`).join('') || '<p class="storyline-index-empty">长期议题数据暂不可用。</p>'}
        </div>
      </div>
    </aside>
  </div>`;
};

const openStorylineIndex = (trigger) => {
  const shell = appRoot?.querySelector('.app-shell');
  if (!shell) return;
  triggerReference = captureMagazineTrigger(trigger);
  shell.querySelector('[data-magazine-panel]')?.remove();
  shell.insertAdjacentHTML('beforeend', renderStorylineIndexPanel());
  syncMagazinePanelState();
};

const closeStorylineIndex = ({ restore = true } = {}) => {
  appRoot?.querySelector('[data-magazine-panel]')?.remove();
  if (!restore) {
    panelWasOpen = false;
    setMagazineBackgroundInert(false);
    return;
  }
  syncMagazinePanelState();
};

const openStorylineFromIndex = (storylineId) => {
  const target = [...(appRoot?.querySelectorAll('.storyline-item[data-storyline-id]') || [])]
    .find((item) => item.dataset.storylineId === storylineId);
  closeStorylineIndex({ restore: false });
  target?.click();
};

const trapMagazinePanelFocus = (event) => {
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
};

const decorateMagazine = () => {
  const shell = appRoot?.querySelector('.app-shell[data-product-model="magazine-edition"]');
  if (!shell) return false;
  normalizeMastheadMeta();
  updateLatestChangeState();
  enhanceMagazineTriggers();
  syncMagazinePanelState();
  return true;
};

const scheduleMagazineDecoration = (attempt = 0) => {
  window.clearTimeout(decorateTimer);
  decorateTimer = window.setTimeout(() => {
    if (!decorateMagazine() && attempt < 20) scheduleMagazineDecoration(attempt + 1);
  }, attempt ? 80 : 0);
};

const bindShellObserver = () => {
  const shell = appRoot?.querySelector('.app-shell');
  if (shell === observedShell) return;
  shellObserver?.disconnect();
  observedShell = shell;
  if (!shell) return;
  shellObserver = new MutationObserver(() => {
    scheduleMagazineDecoration();
    syncMagazinePanelState();
  });
  shellObserver.observe(shell, { childList: true });
};

appRoot?.addEventListener('click', (event) => {
  const customAction = event.target.closest('[data-magazine-action]');
  if (customAction) {
    const action = customAction.dataset.magazineAction;
    if (action === 'close-index') {
      closeStorylineIndex();
    } else if (action === 'open-storyline') {
      openStorylineFromIndex(customAction.dataset.storylineId || '');
    }
    return;
  }

  const editionAction = event.target.closest('[data-edition-action]');
  if (!editionAction) return;
  const action = editionAction.dataset.editionAction;
  if (action === 'open-storylines') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openStorylineIndex(editionAction);
    return;
  }
  if (action === 'open-storyline' || action === 'open-archive') {
    triggerReference = captureMagazineTrigger(editionAction);
  }
}, true);

document.addEventListener('keydown', (event) => {
  trapMagazinePanelFocus(event);
  if (event.key !== 'Escape' || !activeMagazineWrapper()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const customPanel = appRoot?.querySelector('[data-magazine-panel]');
  if (customPanel) closeStorylineIndex();
  else activeMagazinePanel()?.querySelector('[data-edition-action="close-panel"]')?.click();
}, true);

const rootObserver = new MutationObserver(() => {
  bindShellObserver();
  scheduleMagazineDecoration();
});
if (appRoot) rootObserver.observe(appRoot, { childList: true });

bindShellObserver();
scheduleMagazineDecoration();
