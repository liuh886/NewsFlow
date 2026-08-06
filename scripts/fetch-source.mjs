import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));

const LADDER_URL = process.env.NEWSFLOW_LADDER_URL || 'http://localhost:8083';
const LADDER_AUTH = process.env.NEWSFLOW_LADDER_AUTH || 'newsflow:newsflow';
const FALLBACK_MIRRORS = [
  (url) => `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`,
  (url) => `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
];

const authHeader = `Basic ${Buffer.from(LADDER_AUTH).toString('base64')}`;

async function fetchViaLadder(url) {
  const proxyUrl = `${LADDER_URL}/${url}`;
  const response = await fetch(proxyUrl, { headers: { Authorization: authHeader } });
  if (!response.ok) throw new Error(`Ladder returned ${response.status}`);
  return response.text();
}

async function fetchViaWebCache(url) {
  const cacheUrl = FALLBACK_MIRRORS[0](url);
  const response = await fetch(cacheUrl);
  if (!response.ok) throw new Error(`Web cache returned ${response.status}`);
  return response.text();
}

async function fetchSource(url, { useLadder = true } = {}) {
  // Direct fetch first — some sources don't paywall
  try {
    const direct = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
    });
    if (direct.ok) {
      const text = await direct.text();
      // Heuristic: if the response is substantial (>2000 chars of text), it's likely full content
      const stripped = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (stripped.length > 2000) return { method: 'direct', text };
    }
  } catch {}

  // Ladder proxy
  if (useLadder) {
    try {
      const text = await fetchViaLadder(url);
      return { method: 'ladder', text };
    } catch (err) {
      console.error(`Ladder fetch failed: ${err.message}`);
    }
  }

  // Fallback: web cache
  try {
    const text = await fetchViaWebCache(url);
    return { method: 'web_cache', text };
  } catch (err) {
    console.error(`Web cache fetch failed: ${err.message}`);
  }

  throw new Error(`All fetch methods failed for ${url}`);
}

const inputUrl = args.get('url');
if (!inputUrl) {
  console.log('Usage: node scripts/fetch-source.mjs --url=<https://...>');
  console.log('Environment: NEWSFLOW_LADDER_URL (default http://localhost:8083)');
  console.log('             NEWSFLOW_LADDER_AUTH (default newsflow:newsflow)');
  process.exit(1);
}

try {
  const result = await fetchSource(inputUrl);
  console.log(JSON.stringify({
    url: inputUrl,
    method: result.method,
    text: result.text
  }, null, 2));
} catch (err) {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
}
