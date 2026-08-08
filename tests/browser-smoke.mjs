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

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('#app .app-shell[data-product-model="magazine-edition"]').waitFor({ state: 'visible' });
  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!fitsViewport) throw new Error('Reader mobile layout overflows horizontally.');

  if (runtimeErrors.length) {
    throw new Error(`Browser runtime errors: ${runtimeErrors.join(' | ')}`);
  }
} finally {
  await browser.close();
}
