import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(root, 'public/membership-config.js');
const clientPath = resolve(root, 'public/membership-widget.js');
const cssPath = resolve(root, 'public/membership-widget.css');

for (const path of [configPath, clientPath, cssPath]) await access(path);
for (const path of [configPath, clientPath]) {
  const syntax = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${path} syntax check failed:\n${syntax.stderr}`);
}

const [index, config, client] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(configPath, 'utf8'),
  readFile(clientPath, 'utf8'),
]);

for (const reference of ['./membership-widget.css', './membership-config.js', './membership-widget.js']) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
}
for (const contract of [
  "productCode: 'newsflow'",
  "entitlementCode: 'newsflow.pro'",
  'billingEnabled: false',
  'sb_publishable_',
  '/functions/v1/create-checkout-session',
  '/functions/v1/create-portal-session',
]) {
  if (!config.includes(contract)) throw new Error(`membership config is missing ${contract}`);
}
for (const contract of [
  "from('entitlements')",
  "Authorization: `Bearer ${token}`",
  'apikey: config.supabasePublishableKey',
  "window.dispatchEvent(new CustomEvent('hao:membership-changed'",
]) {
  if (!client.includes(contract)) throw new Error(`membership client is missing ${contract}`);
}

const combined = `${config}\n${client}`;
for (const forbidden of [/sk_(live|test)_/, /whsec_/, /sb_secret_/, /service_role/]) {
  if (forbidden.test(combined)) throw new Error(`membership browser assets contain forbidden secret material: ${forbidden}`);
}

console.log('NewsFlow shared membership contract passed.');
