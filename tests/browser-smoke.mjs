import { chromium } from '@playwright/test';

const chromePath = process.env.CHROME_BIN || undefined;
const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const context = await browser.newContext();
await context.route(/https:\/\/cloudflareinsights\.com\/cdn-cgi\/rum(?:\?.*)?$/, (route) => route.fulfill({
  status: 204,
  headers: { 'access-control-allow-origin': '*' },
  body: ''
}));

const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

const waitForReader = async () => {
  await page.locator('#app .app-shell[data-product-model="magazine-edition"]').waitFor({ state: 'visible', timeout: 10_000 });
};

const openLatest = async () => {
  await page.evaluate(() => {
    document.querySelector('#app [data-latest-action="open"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  const headline = page.locator('#app .article-title a').first();
  await headline.waitFor({ state: 'visible', timeout: 10_000 });
  const masthead = (await page.locator('#app .masthead-title').innerText()).trim();
  if (masthead !== '最新') throw new Error(`Latest surface did not open: ${masthead}`);
  return headline;
};

const openReadingSurface = async (headline) => {
  const href = await headline.getAttribute('href');
  if (!href?.includes('/articles/')) throw new Error(`Latest headline is not a canonical article link: ${href || ''}`);
  await headline.click();
  const readingShell = page.locator('#newsflow-reading-surface-root .nf-reading-shell');
  await readingShell.waitFor({ state: 'visible', timeout: 10_000 });
  const readingTitle = (await page.locator('#newsflow-reading-surface-root #nf-reading-title').innerText()).trim();
  if (!readingTitle) throw new Error('Reading Surface opened without a title.');
  if (await page.locator('#newsflow-reading-surface-root [data-reading-action="open-share"]').count() !== 1) {
    throw new Error('Reading Surface is missing its share action.');
  }
  return href;
};

try {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await waitForReader();

  const title = await page.title();
  if (!title.includes('Frontier Systems Review')) throw new Error(`Unexpected Reader title: ${title}`);
  if (await page.locator('#app .latest-edition-panel').count() < 1) throw new Error('Current Issue surface is missing.');
  if (await page.locator('#app .edition-archive').count() < 1) throw new Error('Issue archive is missing.');
  if (await page.locator('#app .publication-nav').count() !== 1) throw new Error('Publication navigation is missing or duplicated.');

  const publicationNav = await page.locator('#app .publication-nav').innerText();
  for (const label of ['本期', 'AI 基建', 'CCUS 与能源转型', '长期议题', '目录']) {
    if (!publicationNav.includes(label)) throw new Error(`Publication navigation is missing ${label}.`);
  }

  const readerContent = await page.locator('#app').innerText();
  if (readerContent.includes('MINOR REVISION') || readerContent.includes('MAJOR REVISION')) {
    throw new Error('Reader exposes private editorial workflow copy.');
  }

  // A live Issue is allowed to be empty before the chief adopts its first article.
  const desktopLatest = await openLatest();
  const canonicalHref = await openReadingSurface(desktopLatest);
  await page.locator('[data-reading-action="close"]').click();
  await page.locator('#newsflow-reading-surface-root').waitFor({ state: 'hidden', timeout: 10_000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await waitForReader();

  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!fitsViewport) throw new Error('Reader mobile layout overflows horizontally.');

  const mobileNav = page.locator('#app .mobile-nav[data-edition-layer="magazine"]');
  const mobileNavText = await mobileNav.innerText();
  if (await mobileNav.locator('button').count() !== 4
    || !mobileNavText.includes('本期')
    || !mobileNavText.includes('最新')
    || !mobileNavText.includes('议题')
    || !mobileNavText.includes('目录')) {
    throw new Error(`Mobile navigation is not the four-task Reader IA: ${mobileNavText}`);
  }

  const mobileLatest = await openLatest();
  await openReadingSurface(mobileLatest);
  const mobileReading = await page.locator('#newsflow-reading-surface-root .nf-reading-shell').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, width: rect.width, viewportWidth: innerWidth };
  });
  if (Math.abs(mobileReading.left) > 1 || Math.abs(mobileReading.width - mobileReading.viewportWidth) > 2) {
    throw new Error(`Mobile reading surface is not full width: ${JSON.stringify(mobileReading)}`);
  }

  const articlePage = await context.newPage();
  await articlePage.goto(new URL(canonicalHref, 'http://127.0.0.1:4173/').href, { waitUntil: 'domcontentloaded' });
  const ogImage = await articlePage.locator('meta[property="og:image"]').getAttribute('content');
  const twitterCard = await articlePage.locator('meta[name="twitter:card"]').getAttribute('content');
  if (!ogImage?.includes('/share/') || twitterCard !== 'summary_large_image') {
    throw new Error('Canonical article is missing large editorial share metadata.');
  }
  await articlePage.close();

  if (errors.length) throw new Error(`Browser console/page errors:\n${errors.join('\n')}`);
  console.log('NewsFlow browser smoke passed: Reader shell, Latest, canonical reading and mobile layout are operational.');
} finally {
  await browser.close();
}
