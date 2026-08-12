import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evaluatorPath = resolve(root, 'scripts/update-content.mjs');
const rawArgs = process.argv.slice(2);
const apply = rawArgs.includes('--apply');
const stdinMode = rawArgs.includes('--stdin');

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const runEvaluator = (args, input = undefined) => spawnSync(process.execPath, [evaluatorPath, ...args], {
  cwd: root,
  encoding: 'utf8',
  input,
  maxBuffer: 16 * 1024 * 1024
});

const printResult = (result) => {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
};

const sourceText = stdinMode
  ? await readStdin()
  : await (async () => {
      const inputArgument = rawArgs.find((entry) => entry.startsWith('--input='));
      if (!inputArgument) return '';
      return readFile(resolve(root, inputArgument.slice('--input='.length)), 'utf8');
    })();

const dryArgs = rawArgs.filter((entry) => entry !== '--apply');
const dryRun = runEvaluator(dryArgs, stdinMode ? sourceText : undefined);
if (dryRun.status !== 0) {
  printResult(dryRun);
  process.exit(dryRun.status ?? 1);
}
if (!apply) {
  printResult(dryRun);
  process.exit(0);
}

let report;
try {
  report = JSON.parse(dryRun.stdout);
} catch {
  printResult(dryRun);
  throw new Error('Content evaluator did not return a valid JSON report.');
}

const parseCandidates = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed?.candidates)) return parsed.candidates;
    if (parsed && typeof parsed.id === 'string') return [parsed];
  } catch {
    const candidates = text.split('\n')
      .filter((line) => line.trim())
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          throw new Error(`NDJSON line ${index + 1} is not valid JSON: ${error.message}`);
        }
      });
    if (candidates.length && candidates.every((candidate) => typeof candidate?.id === 'string')) return candidates;
  }
  throw new Error('Apply requires a candidate pack, a single JSON candidate or NDJSON candidates.');
};

const candidates = parseCandidates(sourceText);
const candidateById = new Map(candidates.map((candidate) => [String(candidate.id || ''), candidate]));
const sourceConfig = JSON.parse(await readFile(resolve(root, 'config/content-sources.json'), 'utf8'));
const sourceForUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = url.pathname.toLowerCase();
    return (sourceConfig.sources || []).find((source) => {
      const domain = String(source.domain || '').toLowerCase().replace(/^www\./, '');
      const domainMatches = hostname === domain || hostname.endsWith(`.${domain}`);
      const pathMatches = !source.path_prefixes?.length
        || source.path_prefixes.some((prefix) => pathname.startsWith(String(prefix).toLowerCase()));
      return domainMatches && pathMatches;
    }) || null;
  } catch {
    return null;
  }
};

const reviewableDecisions = (report.decisions || []).filter((decision) => decision.status !== 'rejected');
const syncedAt = new Date().toISOString();
const rows = reviewableDecisions.map((decision) => {
  const id = String(decision.id || '');
  const candidate = candidateById.get(id);
  if (!candidate) throw new Error(`Missing candidate snapshot for reviewable item ${id}.`);
  const registeredSource = sourceForUrl(candidate.url);
  if (!registeredSource) throw new Error(`Candidate ${id} uses an unregistered source: ${candidate.url}`);
  const rawDate = candidate.published_at || candidate.event_date || null;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const payload = {
    ...candidate,
    source: String(candidate.source || registeredSource.name || ''),
    source_tier: String(candidate.source_tier || registeredSource.tier || ''),
    source_id: String(registeredSource.id || '')
  };
  return {
    candidate_id: id,
    edition_id: report.edition_id,
    title: String(candidate.title || ''),
    short_summary: String(candidate.short_summary || ''),
    source: payload.source,
    url: String(candidate.url || ''),
    channel_id: String(candidate.channel_id || ''),
    storyline_ids: Array.isArray(candidate.storyline_ids) ? candidate.storyline_ids.map(String) : [],
    event_type: String(candidate.event_type || ''),
    published_at: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
    payload,
    synced_at: syncedAt
  };
});

const requestActionsOidcToken = async () => {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL?.trim();
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN?.trim();
  const audience = process.env.NEWSFLOW_CANDIDATE_WRITER_AUDIENCE?.trim() || 'newsflow-supabase-candidate-writer';
  if (!requestUrl || !requestToken) throw new Error('GitHub Actions OIDC runtime is unavailable.');
  const url = new URL(requestUrl);
  url.searchParams.set('audience', audience);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${requestToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`GitHub Actions OIDC token request failed with ${response.status}.`);
  const body = await response.json();
  if (typeof body?.value !== 'string' || !body.value) throw new Error('GitHub Actions OIDC token response is invalid.');
  return body.value;
};

const persistRows = async (candidateRows) => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (supabaseUrl && serviceRoleKey) {
    if (candidateRows.length) {
      const client = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { error } = await client.from('newsflow_candidates').upsert(candidateRows, {
        onConflict: 'candidate_id',
        ignoreDuplicates: false
      });
      if (error) throw error;
    }
    return;
  }

  const writerUrl = process.env.NEWSFLOW_CANDIDATE_WRITER_URL?.trim();
  if (writerUrl && process.env.ACTIONS_ID_TOKEN_REQUEST_URL && process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    const oidcToken = await requestActionsOidcToken();
    const response = await fetch(writerUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${oidcToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ rows: candidateRows }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`OIDC Candidate writer failed with ${response.status}.`);
    const result = await response.json();
    if (result?.ok !== true || Number(result?.row_count) !== candidateRows.length) {
      throw new Error('OIDC Candidate writer returned an invalid acknowledgement.');
    }
    return;
  }

  if (!candidateRows.length) return;
  throw new Error('Applying reviewable Candidates requires either a trusted Supabase service-role runtime or the GitHub OIDC Candidate writer.');
};

await persistRows(rows);

const acceptedCount = (report.decisions || []).filter((decision) => decision.status === 'accepted').length;
const needsReviewCount = (report.decisions || []).filter((decision) => decision.status === 'needs_review').length;
const rejectedCount = (report.decisions || []).filter((decision) => decision.status === 'rejected').length;
const appliedReport = {
  schema_version: '1.0',
  edition_id: report.edition_id,
  workflow: {
    id: 'newsflow-content-update',
    version: report.run?.actor?.workflow_version || '1.0.0',
    actor: report.run?.actor || null
  },
  run: report.run,
  applied: true,
  summary: {
    candidate_count: report.decisions?.length || 0,
    reviewable_count: reviewableDecisions.length,
    accepted_by_machine_gate_count: acceptedCount,
    needs_review_count: needsReviewCount,
    rejected_count: rejectedCount
  },
  publication_effect: 'none',
  editorial_effect: 'supabase_private_candidates_only'
};
const inputHash = createHash('sha256').update(JSON.stringify(appliedReport)).digest('hex').slice(0, 10);
const asOf = new Date(report.run.as_of);
if (Number.isNaN(asOf.getTime())) throw new Error('Content report has invalid run.as_of.');
const compactTime = asOf.toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z');
const reportPath = resolve(root, 'content', 'runs', `${compactTime}-${inputHash}.json`);
await mkdir(dirname(reportPath), { recursive: true });
try {
  await access(reportPath);
  throw new Error(`This scan audit was already applied: ${reportPath}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await writeFile(reportPath, `${JSON.stringify(appliedReport, null, 2)}\n`, 'utf8');

console.log(`Content scan applied: ${reviewableDecisions.length}/${report.decisions?.length || 0} item(s) submitted to the private Supabase editorial queue; no Reader publication changed. Public audit: ${reportPath}`);
