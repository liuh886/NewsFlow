import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (script, args = []) => spawnSync(process.execPath, [resolve(root, 'scripts', script), ...args], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, XAI_API_KEY: '', TAVILY_API_KEY: '' }
});
const parse = (result, label) => {
  if (result.status !== 0) throw new Error(`${label} should exit cleanly without credentials:\n${result.stderr || result.stdout}`);
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label} must emit JSON:\n${result.stdout}`);
  }
};

const xai = parse(run('pull-xai-discovery.mjs'), 'xAI discovery');
if (xai.runtime !== 'not_run' || xai.request_count !== 0 || xai.cost_usd !== 0) {
  throw new Error('xAI discovery must make zero paid calls when XAI_API_KEY is absent');
}

const tavily = parse(run('pull-tavily-discovery.mjs', ['--purpose=verify', '--query=test']), 'Tavily discovery');
if (tavily.runtime !== 'not_run' || tavily.credits_used !== 0) {
  throw new Error('Tavily discovery must consume zero credits when TAVILY_API_KEY is absent');
}

const invalidPurpose = run('pull-tavily-discovery.mjs', ['--purpose=always', '--query=test']);
if (invalidPurpose.status === 0) throw new Error('Tavily discovery must reject unbounded/unknown purposes');

console.log('NewsFlow paid-search guard passed: xAI and Tavily are explicit, bounded and zero-cost without credentials.');
