import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));
const apply = args.has('apply');
const inputArg = args.get('input');
const supabase = args.has('supabase');

if (!inputArg && !supabase) {
  console.error('Usage: node scripts/process-reviews.mjs --input=<review-export.json> [--apply]');
  console.error('       node scripts/process-reviews.mjs --supabase [--apply]');
  process.exit(1);
}

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));

const reviews = supabase
  ? await fetchFromSupabase()
  : await loadFromFile(inputArg);

const decisions = computeAgreement(reviews);
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const accepted = decisions.filter((d) => d.status === 'accepted');
const disputed = decisions.filter((d) => d.status === 'disputed');
const rejected = decisions.filter((d) => d.status === 'rejected');

console.log(JSON.stringify({
  summary: {
    total_candidates: decisions.length,
    accepted: accepted.length,
    rejected: rejected.length,
    disputed: disputed.length,
    pending: decisions.filter((d) => d.status === 'pending').length
  },
  accepted_ids: accepted.map((d) => d.candidate_id),
  rejected_ids: rejected.map((d) => d.candidate_id),
  disputed_ids: disputed.map((d) => d.candidate_id)
}, null, 2));

if (!apply) {
  console.log('\nDry-run complete. Use --apply to write candidate packs and update state files.');
  process.exit(0);
}

if (accepted.length || disputed.length) {
  const candidatePack = buildCandidatePack([...accepted, ...disputed]);
  const packPath = resolve(root, 'content', 'inbox', `review-processed-${timestamp}.json`);
  await mkdir(dirname(packPath), { recursive: true });
  await writeFile(packPath, `${JSON.stringify(candidatePack, null, 2)}\n`, 'utf8');
  console.log(`Wrote auto-accepted pack to ${packPath}`);
}

const reviewHistory = buildReviewHistory(decisions);
await mkdir(resolve(root, 'content', 'state'), { recursive: true });
await writeFile(
  resolve(root, 'content', 'state', 'review-history.json'),
  `${JSON.stringify(reviewHistory, null, 2)}\n`,
  'utf8'
);

await updateReaderProfile(decisions);
console.log('Review state files updated.');

async function loadFromFile(filePath) {
  const payload = JSON.parse(await readFile(resolve(root, filePath), 'utf8'));
  if (payload.schema_version !== '1.0') throw new Error('Unsupported review export schema_version');
  if (!Array.isArray(payload.events)) throw new Error('Review export must contain an events array');
  return payload.events;
}

async function fetchFromSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --supabase mode');
  const client = createClient(url, key);
  const { data, error } = await client.from('candidate_reviews').select('*');
  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data.map((row) => ({
    candidate_id: row.candidate_id,
    verdict: row.verdict,
    reviewed_at: row.reviewed_at,
    user_id: row.user_id,
    edition_id: row.edition_id
  }));
}

function computeAgreement(events) {
  const byCandidate = new Map();
  for (const event of events) {
    if (!event.candidate_id || !event.verdict) continue;
    if (!byCandidate.has(event.candidate_id)) byCandidate.set(event.candidate_id, []);
    byCandidate.get(event.candidate_id).push(event);
  }
  return [...byCandidate.entries()].map(([candidateId, candidateEvents]) => {
    const counts = { accept: 0, reject: 0, skip: 0 };
    for (const e of candidateEvents) counts[e.verdict] = (counts[e.verdict] || 0) + 1;
    const total = counts.accept + counts.reject;
    let status;
    if (total >= 2) {
      if (counts.accept >= 2) status = 'accepted';
      else if (counts.reject >= 2) status = 'rejected';
      else status = 'disputed';
    } else if (total === 1) {
      status = 'pending';
    } else {
      status = 'unreviewed';
    }
    return {
      candidate_id: candidateId,
      status,
      counts,
      reviewer_count: candidateEvents.length,
      events: candidateEvents
    };
  });
}

function buildCandidatePack(decisionsList) {
  return {
    schema_version: '1.0',
    edition_id: decisionsList[0]?.events?.[0]?.edition_id || 'frontier-systems-review',
    run: {
      as_of: new Date().toISOString(),
      coverage_start: new Date(Date.now() - 14 * 86400000).toISOString(),
      coverage_end: new Date().toISOString(),
      timezone: 'Asia/Shanghai',
      actor: {
        agent_id: 'review-processor',
        runtime: 'NewsFlow review aggregation script',
        workflow_id: 'newsflow-content-update',
        workflow_version: '1.0.0'
      }
    },
    candidates: []
  };
}

function buildReviewHistory(decisionsList) {
  const acceptedList = decisionsList.filter((d) => d.status === 'accepted');
  const rejectedList = decisionsList.filter((d) => d.status === 'rejected');
  const tagCounts = {};
  for (const d of decisionsList) {
    for (const e of d.events) {
      const tag = e.tag || 'unknown';
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  return {
    schema_version: '1.0',
    generated_at: new Date().toISOString(),
    review_runs: [{
      run_id: `review-${timestamp}`,
      candidate_count: decisionsList.length,
      reviewer_count: new Set(decisionsList.flatMap((d) => d.events.map((e) => e.user_id || ''))).size,
      accepted_count: acceptedList.length,
      rejected_count: rejectedList.length,
      disputed_count: decisionsList.filter((d) => d.status === 'disputed').length,
      accepted_ids: acceptedList.map((d) => d.candidate_id),
      rejected_ids: rejectedList.map((d) => d.candidate_id),
      tag_distribution: tagCounts
    }],
    aggregate_preferences: {
      review_count: decisionsList.length,
      acceptance_rate: decisionsList.length ? acceptedList.length / decisionsList.length : 0
    }
  };
}

async function updateReaderProfile(decisionsList) {
  let profile;
  try {
    profile = await readJson('content/state/reader-profile.json');
  } catch {
    profile = {
      schema_version: '1.0',
      policy_version: '1.0.0',
      generated_as_of: null,
      event_count: 0,
      signal_count: 0,
      personalization_ready: false,
      action_counts: {},
      affinities: { channels: [], storylines: [], tags: [], sources: [] },
      quality_flags: []
    };
  }
  profile.generated_as_of = new Date().toISOString();
  profile.event_count = (profile.event_count || 0) + decisionsList.length;
  profile.personalization_ready = profile.event_count >= 3;
  await writeFile(
    resolve(root, 'content', 'state', 'reader-profile.json'),
    `${JSON.stringify(profile, null, 2)}\n`,
    'utf8'
  );
}
