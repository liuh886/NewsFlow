import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCandidateIngressReference, validateCandidateIngressPayload } from './candidate-ingress-transport.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const ingressScript = 'scripts/candidate-ingress.mjs';
const transportScript = 'scripts/candidate-ingress-transport.mjs';
const applyScript = 'scripts/apply-content.mjs';
const writerScript = 'supabase/functions/newsflow-candidate-writer/index.ts';
const readerScript = 'supabase/functions/newsflow-candidate-ingress-reader/index.ts';
const migrationScript = 'supabase/migrations/20261003045252_newsflow_candidate_ingress_transport.sql';
const resultMigrationScript = 'supabase/migrations/20261003050507_newsflow_candidate_ingress_result_metadata.sql';
const ingressWorkflow = '.github/workflows/candidate-ingress.yml';
const triggerFile = 'content/state/candidate-ingress-trigger.json';

for (const scriptPath of [ingressScript, transportScript, applyScript]) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, scriptPath)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${scriptPath} syntax failed:\n${syntax.stderr}`);
}

const [
  script, transport, apply, writer, reader, migration, resultMigration,
  workflow, config, publication, docs, triggerText
] = await Promise.all([
  read(ingressScript), read(transportScript), read(applyScript), read(writerScript), read(readerScript),
  read(migrationScript), read(resultMigrationScript), read(ingressWorkflow), read('config/content-workflow.json'),
  read('.github/workflows/publication-sync.yml'), read('docs/candidate-ingress.md'), read(triggerFile)
]);

for (const required of [
  "content/state/candidate-ingress-trigger.json",
  "'scripts/apply-content.mjs'", "'--stdin', '--apply'",
  'maxPlaintextBytes', 'inspectPayload', 'candidate_payload_malformed',
  'validateCandidateIngressPayload',
  'NEWSFLOW_CANDIDATE_INGRESS_READER_URL', 'newsflow-supabase-candidate-ingress-reader',
  "callIngressReader('claim'", "callIngressReader('complete'", "callIngressReader('fail'",
  'payload_type: payloadType', 'candidate_count: candidateCount',
  'reviewable_count: reviewableCount', 'audit_path: auditPath',
  "return 'candidate_pack'", "return 'single_candidate'", "return 'ndjson'",
  'classifyApplyFailure', 'candidate_schema_invalid', 'candidate_pack_invalid',
  'source_registry_invalid', 'evaluator_result_invalid', 'candidate_snapshot_missing',
  'oidc_runtime_unavailable', 'oidc_token_failed', 'oidc_writer_failed',
  'candidate_writer_unavailable', 'duplicate_scan_audit', 'apply_process_failed'
]) if (!script.includes(required)) throw new Error(`Candidate ingress script missing contract: ${required}`);

for (const forbidden of [
  'NEWSFLOW_CANDIDATE_PACK_REF_V1', 'NEWSFLOW_CANDIDATE_PACK_V2', 'NEWSFLOW_CANDIDATE_PACK_V1',
  'GITHUB_EVENT_PATH', 'GITHUB_REPOSITORY_OWNER', 'requestCommentId', 'expectedIssue',
  'generateKeyPairSync', 'privateDecrypt', 'createDecipheriv',
  'NEWSFLOW_APPLY_CHALLENGE_V1', 'NEWSFLOW_APPLY_PAYLOAD_V1',
  "from('newsflow_candidates')", 'SUPABASE_SERVICE_ROLE_KEY'
]) if (script.includes(forbidden)) throw new Error(`Candidate ingress script contains retired transport/persistence logic: ${forbidden}`);

for (const required of [
  "createHash('sha256')", 'Buffer.byteLength', 'parseCandidateIngressReference',
  'validateCandidateIngressPayload', 'invalid_transport_metadata',
  'payload_length_mismatch', 'payload_checksum_mismatch', 'payload_too_large',
  "Buffer.from(text, 'utf8')"
]) if (!transport.includes(required)) throw new Error(`Candidate ingress transport missing integrity contract: ${required}`);

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const referenceLines = (payload) => [
  `bytes: ${Buffer.byteLength(payload, 'utf8')}`,
  `sha256: ${sha256(payload)}`
];
const fixtures = [
  JSON.stringify({ schema_version: '1.0', candidates: [] }),
  JSON.stringify({
    schema_version: '1.0',
    edition_id: 'frontier-systems-review',
    candidates: [{ id: 'utf8-fixture', title: '中文 Candidate：电力、算力与成本', url: 'https://example.com/路径?q=中文' }]
  }),
  JSON.stringify({ schema_version: '1.0', candidates: [], collection_note: '中'.repeat(9000) })
];

for (const fixture of fixtures) {
  const reference = parseCandidateIngressReference(referenceLines(fixture), 32 * 1024);
  const decoded = validateCandidateIngressPayload(fixture, reference, 32 * 1024);
  if (decoded.toString('utf8') !== fixture) throw new Error('Candidate ingress changed Supabase payload bytes.');
  decoded.fill(0);
}
const largeFixtureBytes = Buffer.byteLength(fixtures[2], 'utf8');
if (largeFixtureBytes < 24 * 1024 || largeFixtureBytes >= 32 * 1024) {
  throw new Error(`Large ingress fixture must exercise the production-size range; got ${largeFixtureBytes} bytes.`);
}

const expectError = (fn, expectedCode) => {
  let actual = null;
  try { fn(); } catch (error) { actual = error?.code; }
  if (actual !== expectedCode) throw new Error(`Expected ${expectedCode}; got ${String(actual)}.`);
};
expectError(() => parseCandidateIngressReference(['bytes: 1', 'sha256: bad'], 32 * 1024), 'invalid_transport_metadata');
expectError(() => parseCandidateIngressReference(['bytes: 40000', `sha256: ${'0'.repeat(64)}`], 32 * 1024), 'payload_too_large');
{
  const fixture = fixtures[0];
  const reference = parseCandidateIngressReference(referenceLines(fixture), 32 * 1024);
  expectError(() => validateCandidateIngressPayload(fixture + ' ', reference, 32 * 1024), 'payload_length_mismatch');
  expectError(() => validateCandidateIngressPayload(fixture, { ...reference, payloadSha256: '0'.repeat(64) }, 32 * 1024), 'payload_checksum_mismatch');
}

for (const required of [
  'ACTIONS_ID_TOKEN_REQUEST_URL', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  'NEWSFLOW_CANDIDATE_WRITER_URL', 'newsflow-supabase-candidate-writer',
  "from('newsflow_candidates')", 'SUPABASE_SERVICE_ROLE_KEY',
  "source_tier: String(registeredSource?.tier || 'Unregistered')",
  'source_id: registeredSource?.id || null', 'preflight_status:', 'preflight_reasons:'
]) if (!apply.includes(required)) throw new Error(`Canonical apply missing writer/review contract: ${required}`);

for (const [name, source, audience] of [
  ['writer', writer, 'newsflow-supabase-candidate-writer'],
  ['reader', reader, 'newsflow-supabase-candidate-ingress-reader']
]) {
  for (const required of [
    'https://token.actions.githubusercontent.com', audience,
    "'liuh886/NewsFlow'", "'1321418658'", "'7567311'",
    "'liuh886/NewsFlow/.github/workflows/candidate-ingress.yml@refs/heads/main'",
    "payload?.event_name !== 'push'", "payload?.ref !== 'refs/heads/main'",
    "Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')"
  ]) if (!source.includes(required)) throw new Error(`Candidate ${name} missing push-OIDC contract: ${required}`);
  if (source.includes("payload?.event_name !== 'issue_comment'")) {
    throw new Error(`Candidate ${name} still trusts retired issue_comment OIDC.`);
  }
}
for (const required of [
  '/rest/v1/newsflow_candidates?on_conflict=candidate_id'
]) if (!writer.includes(required)) throw new Error(`Candidate writer missing persistence contract: ${required}`);

for (const required of [
  'newsflow_candidate_ingress?', "action === 'claim'", "action === 'complete' || action === 'fail'",
  'ingress_reference_mismatch', 'ingress_expired', 'ingress_already_claimed', 'ingress_integrity_failed',
  'payload_type: payloadType', 'candidate_count: candidateCount', 'reviewable_count: reviewableCount',
  'audit_path: auditPath', 'result_at: nowIso'
]) if (!reader.includes(required)) throw new Error(`Candidate ingress reader missing claim/result contract: ${required}`);

for (const required of [
  'create table public.newsflow_candidate_ingress',
  'payload_bytes = octet_length(payload_text)',
  "encode(extensions.digest(payload_text, 'sha256'), 'hex')",
  "status in ('pending', 'claimed', 'consumed', 'failed')",
  'enable row level security',
  'revoke all on table public.newsflow_candidate_ingress from anon, authenticated, service_role',
  'grant select, update, delete on table public.newsflow_candidate_ingress to service_role'
]) if (!migration.includes(required)) throw new Error(`Candidate ingress migration missing security/integrity contract: ${required}`);

for (const required of [
  'add column payload_type text',
  'add column candidate_count integer',
  'add column reviewable_count integer',
  'add column audit_path text',
  'add column result_at timestamptz',
  'newsflow_candidate_ingress_payload_type_check',
  'newsflow_candidate_ingress_audit_path_check'
]) if (!resultMigration.includes(required)) throw new Error(`Candidate ingress result migration missing contract: ${required}`);

for (const required of [
  'push:', 'branches: [main]', '- content/state/candidate-ingress-trigger.json',
  'contents: write', 'id-token: write',
  'NEWSFLOW_CANDIDATE_INGRESS_READER_URL', 'NEWSFLOW_CANDIDATE_INGRESS_READER_AUDIENCE',
  'NEWSFLOW_CANDIDATE_WRITER_URL', 'node scripts/candidate-ingress.mjs',
  'payload_type: result.payload_type', 'transport_finalize: result.transport_finalize',
  'content/runs/*.json', 'npm run content:status'
]) if (!workflow.includes(required)) throw new Error(`Candidate ingress workflow missing control-file push contract: ${required}`);

for (const forbidden of [
  'issue_comment:', 'issues: write', 'github.event.issue', 'github.event.comment',
  'NEWSFLOW_CANDIDATE_PACK_REF_V1', 'NEWSFLOW_CANDIDATE_PACK_V2', 'NEWSFLOW_CANDIDATE_PACK_V1',
  'gh api', 'workflow_dispatch:', 'repository_dispatch:', 'secrets.SUPABASE_SERVICE_ROLE_KEY',
  'npm run check', 'npm run build'
]) if (workflow.includes(forbidden)) throw new Error(`Candidate ingress workflow contains retired or forbidden trigger logic: ${forbidden}`);

const trigger = JSON.parse(triggerText);
if (
  trigger?.schema_version !== '1.0'
  || trigger?.active !== false
  || trigger?.request_id !== null
  || trigger?.payload_bytes !== 0
  || trigger?.payload_sha256 !== null
  || trigger?.created_at !== null
) throw new Error('Candidate ingress trigger baseline must be inactive and contain no payload reference.');

const workflowConfig = JSON.parse(config);
const scheduled = workflowConfig.scheduled_runtime;
if (
  !scheduled
  || scheduled.repository_shell_required !== false
  || scheduled.github_contents_access !== 'read_write_control_file'
  || scheduled.github_control_file !== triggerFile
  || scheduled.github_issue_access !== 'none'
) throw new Error('Scheduled runtime GitHub access must be read plus exact control-file write, with no Issue dependency.');

if (scheduled.public_web_discovery_required !== true || scheduled.base64_encoding_required !== false || scheduled.sha256_integrity_required !== true) {
  throw new Error('Scheduled runtime must provide public-web discovery and deterministic JSON SHA-256 integrity metadata.');
}
if (
  scheduled.supabase_green_lane_access !== 'read_only'
  || scheduled.supabase_candidate_verification_access !== 'read_only'
  || scheduled.supabase_candidate_write_allowed !== false
  || scheduled.supabase_ingress_transport_access !== 'insert_only'
  || scheduled.supabase_ingress_transport_table !== 'public.newsflow_candidate_ingress'
) throw new Error('Scheduled runtime may insert only into transient ingress and must never write Candidates directly.');
if (scheduled.submit_via !== 'supabase_ingress_git_control_file') {
  throw new Error('Scheduled runtime must submit via Supabase ingress + Git control file.');
}

const ingress = workflowConfig.agent_apply_ingress;
if (
  !ingress
  || ingress.transport !== 'supabase_ingress_git_control_file'
  || ingress.trigger_file !== triggerFile
  || ingress.result_store !== 'supabase:public.newsflow_candidate_ingress'
  || ingress.ingress_store !== 'supabase:public.newsflow_candidate_ingress'
  || ingress.ingress_store_write !== 'scheduled_agent_insert_only'
  || ingress.ingress_reader_auth !== 'github_actions_oidc'
) throw new Error('Content workflow must declare Supabase transient ingress + Git control-file trigger.');
if (ingress.canonical_command !== 'node scripts/apply-content.mjs --stdin --apply') throw new Error('Ingress must call canonical apply.');
if (
  ingress.writer_auth !== 'github_actions_oidc'
  || ingress.direct_candidate_sql_fallback_allowed !== false
  || ingress.candidate_payload_git_tracked !== false
  || ingress.control_reference_git_tracked !== true
) throw new Error('Ingress must preserve OIDC Candidate writer and keep Candidate payload out of Git.');

for (const required of [
  'public.newsflow_candidate_ingress', 'content/state/candidate-ingress-trigger.json',
  'insert-only transport row', 'event_name=push', 'pending → claimed → consumed',
  'public.newsflow_candidates', 'GitHub Actions OIDC', 'result state replaces the old Issue-comment'
]) if (!docs.includes(required)) throw new Error(`Candidate ingress docs missing control-file transport contract: ${required}`);

if (publication.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('Publication sync must remain isolated from Candidate credentials.');

console.log('Candidate ingress contract: OK (Supabase transient payload + path-scoped Git control-file push + GitHub OIDC reader + canonical apply + GitHub OIDC Candidate writer).');
