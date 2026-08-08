import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(root, 'public/membership-config.js');
const integrationPath = resolve(root, 'public/account-integration.js');
const integrationStylePath = resolve(root, 'public/account-integration.css');
await Promise.all([access(configPath), access(integrationPath), access(integrationStylePath)]);

for (const path of [configPath, integrationPath]) {
  const syntax = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${path} syntax check failed:\n${syntax.stderr}`);
}

const [index, config, integration, styles] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(configPath, 'utf8'),
  readFile(integrationPath, 'utf8'),
  readFile(integrationStylePath, 'utf8'),
]);

for (const reference of [
  'https://liuh886.github.io/admin/shared/account-shell.css?v=4',
  './account-integration.css',
  './membership-config.js',
  'https://liuh886.github.io/admin/shared/account-shell.js?v=4',
  './account-integration.js',
]) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
}
if (index.includes('<div class="header-account-mount"')) {
  throw new Error('NewsFlow must not own a fixed account mount outside the rendered topbar.');
}
for (const contract of [
  'window.HaoAccountConfig',
  "productCode: 'newsflow'",
  "entitlementCode: 'newsflow.pro'",
  'billingEnabled: false',
  'feedbackEnabled: true',
  "mountSelectors: ['.top-actions']",
  'compactTrigger: true',
  'sb_publishable_',
]) {
  if (!config.includes(contract)) throw new Error(`NewsFlow account config is missing ${contract}`);
}
for (const contract of [
  'hao-account-newsflow',
  "document.querySelector('.top-actions')",
  "window.addEventListener('newsflow:rendered', syncAccountMount)",
  "window.addEventListener('hao:account-changed', syncAccountMount)"
]) {
  if (!integration.includes(contract)) throw new Error(`NewsFlow account integration is missing ${contract}`);
}
if (integration.includes('MutationObserver')) {
  throw new Error('NewsFlow account mount must follow the explicit app lifecycle, not observe the DOM.');
}
for (const contract of ['.top-actions .hao-account-trigger', 'box-shadow: none', 'backdrop-filter: none']) {
  if (!styles.includes(contract)) throw new Error(`NewsFlow account styles are missing ${contract}`);
}
if (integration.includes('is-floating') || styles.includes('is-floating')) {
  throw new Error('NewsFlow must not retain compatibility with the retired floating account state.');
}

const combined = `${index}\n${config}\n${integration}\n${styles}`;
for (const forbidden of [/sk_(live|test)_/, /whsec_/, /sb_secret_/, /service_role/]) {
  if (forbidden.test(combined)) throw new Error(`NewsFlow browser assets contain forbidden secret material: ${forbidden}`);
}
if (combined.includes('membership-widget.js') || combined.includes('membership-widget.css')) {
  throw new Error('NewsFlow must not load the retired local membership widget');
}

console.log('NewsFlow account uses the native topbar mount and shared Google/GitHub/X account shell v4.');