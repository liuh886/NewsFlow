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

  const bodyText = await page.locator('body').innerText();
  for (const operatorCopy of ['冻结后不再改写', '已经冻结的刊期', '自动流程不会自行改写']) {
    if (bodyText.includes(operatorCopy)) throw new Error(`Reader exposes operator-facing copy: ${operatorCopy}`);
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

  const firstArticle = page.locator('#app [data-reading-link="true"]').first();
  await firstArticle.waitFor({ state: 'visible', timeout: 10_000 });
  await firstArticle.click();
  await page.locator('#newsflow-reading-surface-root .nf-reading-shell').waitFor({ state: 'visible' });
  await page.locator('[data-reading-action="close"]').click();
  await page.locator('#newsflow-reading-surface-root').waitFor({ state: 'hidden' });

  const archivedIssueButton = page.locator('#app .edition-archive [data-edition-action="open-issue"]').first();
  await archivedIssueButton.waitFor({ state: 'visible', timeout: 10_000 });
  await archivedIssueButton.click();
  const historicalIssuePanel = page.locator('#app .edition-panel [data-action="open"][data-id]').first();
  await historicalIssuePanel.waitFor({ state: 'visible', timeout: 10_000 });
  const historicalIssueTitle = await page.locator('#app #issue-panel-title').innerText();
  if (!historicalIssueTitle.trim()) throw new Error('Historical Issue panel opened without a title.');
  await historicalIssuePanel.click();
  await page.locator('#newsflow-reading-surface-root .nf-reading-shell').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('#newsflow-reading-surface-root #nf-reading-title').waitFor({ state: 'visible' });
  await page.locator('[data-reading-action="close"]').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('#app .app-shell[data-product-model="magazine-edition"]').waitFor({ state: 'visible' });
  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!fitsViewport) throw new Error('Reader mobile layout overflows horizontally.');

  const editorialEntry = page.locator('#app .top-actions > [data-action="open-editorial-office"]');
  await editorialEntry.waitFor({ state: 'visible', timeout: 10_000 });
  if ((await editorialEntry.getAttribute('aria-label')) !== '进入审稿模式') {
    throw new Error('Mobile Reader does not expose the editorial mode switch with the expected label.');
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
