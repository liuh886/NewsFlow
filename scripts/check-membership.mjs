import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(root, 'public/membership-config.js');
await access(configPath);

const syntax = spawnSync(process.execPath, ['--check', configPath], { encoding: 'utf8' });
if (syntax.status !== 0) throw new Error(`${configPath} syntax check failed:\n${syntax.stderr}`);

const [index, config] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(configPath, 'utf8'),
]);

for (const reference of [
  'https://liuh886.github.io/admin/shared/account-shell.css?v=1',
  './membership-config.js',
  'https://liuh886.github.io/admin/shared/account-shell.js?v=1',
  'class="header-account-mount"',
]) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
}
for (const contract of [
  'window.HaoAccountConfig',
  "productCode: 'newsflow'",
  "entitlementCode: 'newsflow.pro'",
  'billingEnabled: false',
  'feedbackEnabled: true',
  "mountSelectors: ['.header-account-mount'",
  'compactTrigger: true',
  'sb_publishable_',
  '/functions/v1/create-checkout-session',
  '/functions/v1/create-portal-session',
]) {
  if (!config.includes(contract)) throw new Error(`NewsFlow account config is missing ${contract}`);
}

const combined = `${index}\n${config}`;
for (const forbidden of [/sk_(live|test)_/, /whsec_/, /sb_secret_/, /service_role/]) {
  if (forbidden.test(combined)) throw new Error(`NewsFlow browser assets contain forbidden secret material: ${forbidden}`);
}
if (combined.includes('membership-widget.js') || combined.includes('membership-widget.css')) {
  throw new Error('NewsFlow must not load the retired local membership widget');
}

console.log('NewsFlow shared account contract passed: dedicated header mount, compact trigger and no retired widget assets.');
