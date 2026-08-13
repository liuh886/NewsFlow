import { chromium } from '@playwright/test';

const chromePath = process.env.CHROME_BIN || undefined;
const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

try {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('#app .app-shell[data-product-model="magazine-edition"]').waitFor({ state: 'visible', timeout: 10_000 });

  const title = await page.title();
  if (!title.includes('Frontier Systems Review')) throw new Error(`Unexpected Reader title: ${title}`);
  if (await page.locator('#app .latest-edition-panel').count() < 1) throw new Error('Current Issue surface is missing.');
  if (await page.locator('#app .edition-archive').count() < 1) throw new Error('Issue archive is missing.');
  if (await page.locator('#app .publication-nav').count() !== 1) throw new Error('Publication navigation is missing or duplicated.');

  const publicationNav = await page.locator('#app .publication-nav').innerText();
  for (const label of ['本期', 'AI 基建', 'CCUS 与能源转型', '长期议题', '目录']) {
    if (!publicationNav.includes(label)) throw new Error(`Desktop publication navigation is missing ${label}.`);
  }

  const readerContent = await page.locator('#app').innerText();
  if (readerContent.includes('Candidate') || readerContent.includes('MINOR REVISION') || readerContent.includes('MAJOR REVISION')) throw new Error('Reader exposes private editorial workflow copy.');

  const currentIssueArticle = page.locator('#app .latest-edition-panel [data-action="open"][data-id]').first();
  await currentIssueArticle.waitFor({ state: 'visible', timeout: 10_000 });
  const currentSignalId = await currentIssueArticle.getAttribute('data-id');
  if (!currentSignalId) throw new Error('Current Issue article has no Signal id.');
  const canonicalHref = `http://127.0.0.1:4173/articles/${encodeURIComponent(currentSignalId)}/`;
  await currentIssueArticle.click();
  await page.locator('#newsflow-reading-surface-root .nf-reading-shell').waitFor({ state: 'visible', timeout: 10_000 });
  const readingTitle = await page.locator('#newsflow-reading-surface-root #nf-reading-title').innerText();
  if (!readingTitle.trim()) throw new Error('Reading Surface opened without a title.');
  if (await page.locator('#newsflow-reading-surface-root .nf-reading-progress').count() !== 1) throw new Error('Reading progress is missing.');
  if (await page.locator('#newsflow-reading-surface-root [data-reading-action="open-share"]').count() !== 1) throw new Error('Reading share action is missing.');
  if (await page.locator('#newsflow-reading-surface-root h2', { hasText: '发生了什么' }).count() > 0) throw new Error('Reading Surface duplicates the standfirst.');

  const readingSheet = await page.locator('#newsflow-reading-surface-root .nf-reading-shell').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { left: rect.left, width: rect.width, viewportWidth: window.innerWidth, background: style.backgroundColor };
  });
  if (readingSheet.left <= 0 || readingSheet.width >= readingSheet.viewportWidth * 0.75) throw new Error(`Desktop article reading is not a side sheet: ${JSON.stringify(readingSheet)}`);
  if (!readingSheet.background || readingSheet.background === 'rgba(0, 0, 0, 0)') throw new Error('Desktop article side sheet has no paper background.');

  await page.locator('[data-reading-action="open-share"]').click();
  const shareDialog = page.locator('#newsflow-reading-surface-root .nf-share-dialog');
  await shareDialog.waitFor({ state: 'visible', timeout: 10_000 });
  await shareDialog.locator('.nf-share-preview canvas').waitFor({ state: 'visible', timeout: 10_000 });
  for (const action of ['share-image', 'copy-link', 'save-image']) {
    if (await shareDialog.locator(`[data-reading-action="${action}"]`).count() !== 1) throw new Error(`Share dialog is missing ${action}.`);
  }
  await shareDialog.locator('button[data-reading-action="close-share"]').click();
  await page.locator('[data-reading-action="close"]').click();
  await page.locator('#newsflow-reading-surface-root').waitFor({ state: 'hidden' });

  // Issue-first hides the utility feed until a real reader utility is active.
  await page.locator('#app .filter-button[data-action="filter"][data-value="primary"]').click();
  const cardActions = page.locator('#app .article-card .card-actions').first();
  await cardActions.waitFor({ state: 'visible', timeout: 10_000 });
  if (await cardActions.locator('.article-action').count() !== 2) throw new Error('Reader card actions are not reduced to bookmark + share.');
  if (await cardActions.locator('[data-action="feedback-hide"]').count() > 0) throw new Error('Reader card still exposes negative feedback.');
  if (await cardActions.locator('[data-reading-action="share-signal"]').count() !== 1) throw new Error('Reader card is missing share.');

  const latestHeadline = page.locator('#app .article-title a').first();
  await latestHeadline.waitFor({ state: 'visible', timeout: 10_000 });
  const latestHref = await latestHeadline.getAttribute('href');
  if (!latestHref?.includes('/articles/')) throw new Error(`Latest headline is not linked to a canonical article URL: ${latestHref || ''}`);

  // Reset utility state to restore the Issue-first publication surface.
  await page.locator('#app .filter-button[data-action="filter"][data-value="all"]').click();
  const currentTocRow = page.locator('#app .edition-archive [data-issue-current="true"]').first();
  await currentTocRow.waitFor({ state: 'visible', timeout: 10_000 });
  const currentIsFirst = await currentTocRow.evaluate((row) => row.parentElement?.firstElementChild === row);
  if (!currentIsFirst) throw new Error('Current Issue is not the first entry in the issue TOC.');
  if (await page.locator('#app .edition-archive [data-issue-current="false"]').count() < 1) throw new Error('Issue TOC does not retain historical issues below the Current Issue.');
  await currentTocRow.locator('[data-edition-action="open-issue"]').click();
  const issuePanel = page.locator('#app .edition-panel [data-action="open"][data-id]').first();
  await issuePanel.waitFor({ state: 'visible', timeout: 10_000 });
  const currentPanelHead = await page.locator('#app .edition-panel-head').innerText();
  if (!currentPanelHead.toLowerCase().includes('current')) throw new Error(`Current Issue TOC entry did not open the live issue panel: ${currentPanelHead}`);
  const issuePanelTitle = await page.locator('#app #issue-panel-title').innerText();
  if (!issuePanelTitle.trim()) throw new Error('Current Issue panel opened without a title.');
  await issuePanel.click();
  await page.locator('#newsflow-reading-surface-root .nf-reading-shell').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('[data-reading-action="close"]').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('#app .app-shell[data-product-model="magazine-edition"]').waitFor({ state: 'visible' });
  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!fitsViewport) throw new Error('Reader mobile layout overflows horizontally.');
  const mobileNav = page.locator('#app .mobile-nav[data-edition-layer="magazine"]');
  const mobileNavText = await mobileNav.innerText();
  const mobileNavButtons = await mobileNav.locator('button').count();
  if (mobileNavButtons !== 4 || !mobileNavText.includes('本期') || !mobileNavText.includes('最新') || !mobileNavText.includes('议题') || !mobileNavText.includes('目录') || mobileNavText.includes('AI 基建') || mobileNavText.includes('CCUS')) throw new Error(`Mobile publication nav is not aligned with four-task Reader IA: ${mobileNavText}`);

  const mobileToolsButton = page.locator('#app [data-action="mobile-menu"]');
  await mobileToolsButton.waitFor({ state: 'visible', timeout: 10_000 });
  const mobileToolsLabel = await mobileToolsButton.getAttribute('aria-label');
  if (!mobileToolsLabel?.includes('筛选')) throw new Error(`Mobile tools trigger does not clearly describe its filter function: ${mobileToolsLabel || ''}`);
  const mobileToolsVisual = await mobileToolsButton.evaluate((button) => {
    const svg = button.querySelector('svg');
    const pseudo = getComputedStyle(button, '::before');
    return { sourceSvgDisplay: svg ? getComputedStyle(svg).display : '', maskImage: pseudo.maskImage || pseudo.webkitMaskImage || '', pseudoWidth: Number.parseFloat(pseudo.width) };
  });
  if (mobileToolsVisual.sourceSvgDisplay !== 'none' || !mobileToolsVisual.maskImage || mobileToolsVisual.maskImage === 'none' || mobileToolsVisual.pseudoWidth < 18) throw new Error(`Ambiguous hamburger icon is still exposed instead of an explicit filter/tools icon: ${JSON.stringify(mobileToolsVisual)}`);

  const editorialEntry = page.locator('#app .top-actions > [data-action="open-editorial-office"]');
  await editorialEntry.waitFor({ state: 'visible', timeout: 10_000 });
  if ((await editorialEntry.getAttribute('aria-label')) !== '打开编辑部') throw new Error('Mobile Reader does not expose one neutral editorial entry before runtime load.');
  if ((await editorialEntry.locator('.nf-mode-launcher-label').innerText()).trim() !== '编辑部') throw new Error('Mobile Reader editorial entry has the wrong label.');
  const launcherBeforeRuntime = await editorialEntry.boundingBox();
  await page.evaluate(async () => { await window.NewsFlowEditorialLoader?.ensure?.(); });
  await page.waitForFunction(() => Boolean(window.NewsFlowMode), null, { timeout: 10_000 });
  const launcherAfterRuntime = await editorialEntry.boundingBox();
  if (await page.locator('#app .top-actions > [data-editorial-role-trigger]').count() !== 0) throw new Error('Editorial runtime mounted a second role-sized control into the mobile header.');
  if (!launcherBeforeRuntime || !launcherAfterRuntime || Math.abs(launcherBeforeRuntime.width - launcherAfterRuntime.width) > 2) throw new Error('Editorial entry geometry shifted after runtime load.');

  await mobileToolsButton.click();
  const sidebar = page.locator('#app .sidebar.open');
  await sidebar.waitFor({ state: 'visible', timeout: 10_000 });
  if (!(await sidebar.locator('[data-edition-layer="filter-heading"]').innerText()).includes('筛选与收藏')) throw new Error('Mobile tools drawer does not explain its filter function.');
  await sidebar.locator('[data-action="mobile-close"]').click();

  // The explicit Latest mobile action resets filters; activate a reader filter to expose the utility feed for direct card reading.
  await mobileNav.locator('[data-action="mobile-home"]').click();
  await mobileToolsButton.click();
  await page.locator('#app .sidebar.open .filter-button[data-value="primary"]').click();
  const firstMobileHeadline = page.locator('#app .article-title a').first();
  await firstMobileHeadline.waitFor({ state: 'visible', timeout: 10_000 });
  await firstMobileHeadline.scrollIntoViewIfNeeded();
  await firstMobileHeadline.click();
  await page.locator('#newsflow-reading-surface-root .nf-reading-shell').waitFor({ state: 'visible', timeout: 10_000 });
  const mobileReading = await page.locator('#newsflow-reading-surface-root .nf-reading-shell').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, width: rect.width, viewportWidth: innerWidth };
  });
  if (Math.abs(mobileReading.left) > 1 || Math.abs(mobileReading.width - mobileReading.viewportWidth) > 2) throw new Error(`Mobile reading surface is not full width: ${JSON.stringify(mobileReading)}`);

  const articlePage = await context.newPage();
  await articlePage.goto(canonicalHref, { waitUntil: 'domcontentloaded' });
  const ogImage = await articlePage.locator('meta[property="og:image"]').getAttribute('content');
  const twitterCard = await articlePage.locator('meta[name="twitter:card"]').getAttribute('content');
  if (!ogImage?.includes('/share/') || twitterCard !== 'summary_large_image') throw new Error('Static canonical article is missing large editorial share metadata.');
  if (await articlePage.locator('h2', { hasText: '发生了什么' }).count() > 0) throw new Error('Static canonical article duplicates the standfirst.');
  await articlePage.close();

  if (errors.length) throw new Error(`Browser console/page errors:\n${errors.join('\n')}`);
  console.log('NewsFlow browser smoke passed: issue-first canonical reading, two-action utility cards, editorial share card, four-task mobile navigation, issue continuity and responsive layout.');
} finally {
  await browser.close();
}
