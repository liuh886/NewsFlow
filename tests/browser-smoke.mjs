import { chromium } from '@playwright/test';

const executablePath = process.env.CHROME_BIN;
if (!executablePath) throw new Error('CHROME_BIN is required for browser smoke.');

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('#app .app-shell[data-product-model="magazine-edition"]').waitFor({
    state: 'visible',
    timeout: 15_000,
  });

  await page.evaluate(() => {
    localStorage.setItem('newsflow_feedback_v1', JSON.stringify([
      {
        event_id: 'smoke-useful-1',
        occurred_at: '2026-08-09T02:00:00.000Z',
        edition_id: 'frontier-systems-review',
        signal_id: 'nvidia-lancium-stargate-power-investment-2026',
        action: 'useful',
        channel_id: 'ai-infrastructure',
        storyline_ids: ['ai-energy-foundation'],
        tags: ['Data Center'],
        source: 'Reuters',
      },
      {
        event_id: 'smoke-bookmark-2',
        occurred_at: '2026-08-09T02:01:00.000Z',
        edition_id: 'frontier-systems-review',
        signal_id: 'texas-data-center-grid-deposit-risk-2026',
        action: 'bookmark',
        channel_id: 'ai-infrastructure',
        storyline_ids: ['ai-energy-foundation'],
        tags: ['Data Center'],
        source: 'Reuters',
      },
      {
        event_id: 'smoke-negative-3',
        occurred_at: '2026-08-09T02:02:00.000Z',
        edition_id: 'frontier-systems-review',
        signal_id: 'openai-astra-critical-cyber-deployment-controls-2026',
        action: 'not_interested',
        channel_id: 'ai-infrastructure',
        storyline_ids: ['ai-model-layer'],
        tags: ['Cybersecurity'],
        source: 'Reuters',
      },
    ]));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#app .app-shell[data-product-model="magazine-edition"]').waitFor({ state: 'visible' });
  await page.locator('#app [data-action="feedback-center"]').evaluate((button) => button.click());
  const preferenceCount = await page.locator('#app .feedback-stats strong').first().innerText();
  await page.locator('#app button[data-action="close-feedback"]').evaluate((button) => button.click());
  const adaptiveSort = await page.locator('#app .feed-heading span').innerText();
  if (!adaptiveSort.includes('按你的反馈排序')) {
    const storageSnapshot = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage)
      .filter((key) => key.includes('feedback') || key.includes('bookmark'))
      .map((key) => [key, localStorage.getItem(key)])));
    throw new Error(`Reader did not activate preference ranking after three explicit actions: ${adaptiveSort}; count=${preferenceCount}; stored=${JSON.stringify(storageSnapshot)}`);
  }

  const bodyText = await page.locator('body').innerText();
  for (const operatorCopy of ['冻结后不再改写', '已经冻结的刊期', '自动流程不会自行改写']) {
    if (bodyText.includes(operatorCopy)) throw new Error(`Reader exposes operator-facing copy: ${operatorCopy}`);
  }

  const publicationNavText = await page.locator('#app .publication-nav').innerText();
  if (publicationNavText.includes('最新')) throw new Error(`Publication nav still exposes a parallel latest section: ${publicationNavText}`);
  if (!publicationNavText.includes('本期') || !publicationNavText.includes('目录')) {
    throw new Error(`Publication nav is missing issue-first anchors: ${publicationNavText}`);
  }
  if (await page.locator('#app [data-edition-layer="post-issue"], #app #latest-change').count()) {
    throw new Error('Homepage still renders the retired parallel latest-update surface.');
  }
  if (!(await page.locator('#app #current-issue').isVisible())) throw new Error('Current Issue is not the homepage editorial surface.');
  if (!(await page.locator('#app .lead-story').isHidden()) || !(await page.locator('#app .feed-toolbar').isHidden())) {
    throw new Error('Default homepage still exposes the underlying rolling stream beside the Current Issue.');
  }

  const freshnessBadge = page.locator('#app .nf-data-date');
  await freshnessBadge.waitFor({ state: 'visible', timeout: 10_000 });
  const badgeContract = await freshnessBadge.evaluate((badge) => {
    const style = getComputedStyle(badge);
    const row = badge.parentElement;
    return {
      sameRowAsBrand: Boolean(row?.querySelector('.brand-name')),
      borderStyle: style.borderTopStyle,
      borderWidth: Number.parseFloat(style.borderTopWidth),
      borderRadius: Number.parseFloat(style.borderTopLeftRadius),
    };
  });
  if (!badgeContract.sameRowAsBrand || badgeContract.borderStyle === 'none' || badgeContract.borderWidth < 1 || badgeContract.borderRadius < 8) {
    throw new Error('Reader freshness date is not rendered as a compact badge beside the publication name.');
  }

  const desktopSearchContract = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('#app .global-search, #app .mobile-reader-search')];
    const visible = candidates.filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return !element.hidden && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    return {
      globalCount: document.querySelectorAll('#app .global-search').length,
      visibleCount: visible.length,
      visibleClasses: visible.map((element) => element.className),
    };
  });
  if (desktopSearchContract.globalCount !== 1 || desktopSearchContract.visibleCount !== 1 || !desktopSearchContract.visibleClasses[0]?.includes('global-search')) {
    throw new Error(`Desktop Reader exposes duplicate search controls: ${JSON.stringify(desktopSearchContract)}`);
  }

  const searchInput = page.locator('#global-search');
  const collapsedPlaceholderOpacity = await searchInput.evaluate((input) => getComputedStyle(input, '::placeholder').opacity);
  if (Number.parseFloat(collapsedPlaceholderOpacity) !== 0) {
    throw new Error('Collapsed Reader search exposes placeholder text instead of remaining icon-only.');
  }
  await searchInput.focus();
  const expandedPlaceholderOpacity = await searchInput.evaluate((input) => getComputedStyle(input, '::placeholder').opacity);
  if (Number.parseFloat(expandedPlaceholderOpacity) < 0.9) {
    throw new Error('Expanded Reader search does not restore its search hint.');
  }

  await page.locator('#global-search').fill('Texas');
  await page.locator('#app .feed-toolbar').waitFor({ state: 'visible', timeout: 5_000 });
  if (!(await page.locator('#app #current-issue').isHidden())) throw new Error('Search did not switch the publication surface into Reader results mode.');
  const resultHeading = await page.locator('#app .feed-heading h2').innerText();
  if (!resultHeading.startsWith('搜索：')) throw new Error(`Search results surface has the wrong heading: ${resultHeading}`);
  await page.locator('#global-search').fill('');
  await page.locator('#app #current-issue').waitFor({ state: 'visible', timeout: 5_000 });

  const firstArticle = page.locator('#app #current-issue [data-action="open"][data-id]').first();
  await firstArticle.waitFor({ state: 'visible', timeout: 10_000 });
  await firstArticle.click();
  await page.locator('#newsflow-reading-surface-root .nf-reading-shell').waitFor({ state: 'visible' });
  await page.locator('[data-reading-action="close"]').click();
  await page.locator('#newsflow-reading-surface-root').waitFor({ state: 'hidden' });

  const currentTocRow = page.locator('#app .edition-archive [data-issue-current="true"]').first();
  await currentTocRow.waitFor({ state: 'visible', timeout: 10_000 });
  const currentIsFirst = await currentTocRow.evaluate((row) => row.parentElement?.firstElementChild === row);
  if (!currentIsFirst) throw new Error('Current Issue is not the first entry in the issue TOC.');
  if (await page.locator('#app .edition-archive [data-issue-current="false"]').count() < 1) {
    throw new Error('Issue TOC does not retain historical issues below the Current Issue.');
  }
  await currentTocRow.locator('[data-edition-action="open-issue"]').click();
  const issuePanel = page.locator('#app .edition-panel [data-action="open"][data-id]').first();
  await issuePanel.waitFor({ state: 'visible', timeout: 10_000 });
  const currentPanelHead = await page.locator('#app .edition-panel-head').innerText();
  if (!currentPanelHead.toLowerCase().includes('current')) throw new Error(`Current Issue TOC entry did not open the live issue panel: ${currentPanelHead}`);
  const issuePanelTitle = await page.locator('#app #issue-panel-title').innerText();
  if (!issuePanelTitle.trim()) throw new Error('Current Issue panel opened without a title.');
  await issuePanel.click();
  await page.locator('#newsflow-reading-surface-root .nf-reading-shell').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('#newsflow-reading-surface-root #nf-reading-title').waitFor({ state: 'visible' });
  await page.locator('[data-reading-action="close"]').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('#app .app-shell[data-product-model="magazine-edition"]').waitFor({ state: 'visible' });
  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!fitsViewport) throw new Error('Reader mobile layout overflows horizontally.');
  const mobileNavText = await page.locator('#app .mobile-nav[data-edition-layer="magazine"]').innerText();
  if (mobileNavText.includes('最新') || !mobileNavText.includes('目录') || !mobileNavText.includes('议题')) {
    throw new Error(`Mobile publication nav is not aligned with issue-first IA: ${mobileNavText}`);
  }

  const editorialEntry = page.locator('#app .top-actions > [data-action="open-editorial-office"]');
  await editorialEntry.waitFor({ state: 'visible', timeout: 10_000 });
  if ((await editorialEntry.getAttribute('aria-label')) !== '进入审稿模式') {
    throw new Error('Mobile Reader does not expose the editorial mode switch with the expected label.');
  }
  const launcherBeforeRuntime = await editorialEntry.boundingBox();
  await page.evaluate(async () => {
    await window.NewsFlowEditorialLoader?.ensure?.();
  });
  await page.waitForFunction(() => Boolean(window.NewsFlowMode), null, { timeout: 10_000 });
  const launcherAfterRuntime = await editorialEntry.boundingBox();
  const roleTriggerCount = await page.locator('#app .top-actions > [data-editorial-role-trigger]').count();
  if (roleTriggerCount !== 0) {
    throw new Error('Editorial runtime mounted a second role-sized control into the mobile header.');
  }
  if (!launcherBeforeRuntime || !launcherAfterRuntime
    || Math.abs(launcherBeforeRuntime.x - launcherAfterRuntime.x) > 1
    || Math.abs(launcherBeforeRuntime.width - launcherAfterRuntime.width) > 1
    || Math.abs(launcherBeforeRuntime.height - launcherAfterRuntime.height) > 1) {
    throw new Error(`Editorial runtime changed the canonical mobile header geometry: ${JSON.stringify({ launcherBeforeRuntime, launcherAfterRuntime })}`);
  }

  await page.locator('[data-action="mobile-menu"]').click();
  const installSection = page.locator('[data-newsflow-install-section]');
  await installSection.waitFor({ state: 'visible', timeout: 5_000 });
  if ((await installSection.getAttribute('data-install-entry-mode')) !== 'persistent') {
    throw new Error('PWA install entry is not persistent before beforeinstallprompt fires.');
  }
  const installAction = page.locator('[data-newsflow-install-action]');
  if ((await installAction.innerText()).trim() !== '安装应用') {
    throw new Error('Mobile menu install action does not expose the expected copy.');
  }
  const installPlacement = await installAction.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewportHeight: window.innerHeight };
  });
  if (installPlacement.top < 0 || installPlacement.bottom > installPlacement.viewportHeight) {
    throw new Error('Mobile menu install action is not visible in the initial viewport without scrolling.');
  }

  await installAction.click();
  await page.locator('[data-newsflow-install-help] .edition-panel').waitFor({ state: 'visible', timeout: 5_000 });
  await page.locator('[data-newsflow-install-close]').last().click();
  await page.locator('[data-newsflow-install-help]').waitFor({ state: 'detached', timeout: 5_000 });

  await page.evaluate(() => {
    window.__newsflowInstallPromptCalled = false;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperty(event, 'prompt', {
      value: () => {
        window.__newsflowInstallPromptCalled = true;
        return Promise.resolve();
      }
    });
    Object.defineProperty(event, 'userChoice', { value: Promise.resolve({ outcome: 'dismissed' }) });
    window.dispatchEvent(event);
  });
  await page.locator('[data-action="mobile-menu"]').click();
  await installAction.click();
  const promptCalled = await page.evaluate(() => window.__newsflowInstallPromptCalled === true);
  if (!promptCalled) throw new Error('PWA install entry does not invoke the native install prompt when available.');

  if (runtimeErrors.length) {
    throw new Error(`Browser runtime errors: ${runtimeErrors.join(' | ')}`);
  }
} finally {
  await browser.close();
}
