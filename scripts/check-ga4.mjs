import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const measurementId = 'G-HL1RH61WBH';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.ok(
  html.includes(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`),
  'NewsFlow must load the configured GA4 Google tag.',
);
assert.ok(
  html.includes(`gtag('config', '${measurementId}')`),
  'NewsFlow must configure the expected GA4 measurement ID.',
);

const configuredIds = [...new Set(html.match(/G-[A-Z0-9]+/g) ?? [])];
assert.deepEqual(
  configuredIds,
  [measurementId],
  `NewsFlow must contain only the expected GA4 measurement ID; found ${configuredIds.join(', ') || 'none'}.`,
);

console.log(`GA4 contract validated for ${measurementId}.`);
