import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeCandidateIngressPayload } from './candidate-ingress-transport.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const ingressScript = 'scripts/candidate-ingress.mjs';
const transportScript = 'scripts/candidate-ingress-transport.mjs';
const applyScript = 'scripts/apply-content.mjs';
const writerScript = 'supabase/functions/newsflow-candidate-writer/index.ts';
const ingressWorkflow = '.github/workflows/candidate-ingress.yml';

for (const scriptPath of [ingressScript, transportScript, applyScript]) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, scriptPath)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${scriptPath} syntax failed:\n${syntax.stderr}`);
}

const [script, transport, apply, writer, workflow, config, publication, docs] = await Promise.all([
  read(ingressScript), read(transportScript), read(applyScript), read(writerScript), read(ingressWorkflow),
  read('config/content-workflow.json'), read('.github/workflows/publication-sync.yml'), read('docs/candidate-ingress.md')
]);

for (const required of [
  'NEWSFLOW_CANDIDATE_PACK_V2',
  "'scripts/apply-content.mjs'", "'--stdin', '--apply'",
  'maxPlaintextBytes', 'inspectPayload', 'candidate_payload_malformed',
  'decodeCandidateIngressPayload',
  "return 'candidate_pack'", "return 'single_candidate'", "return 'ndjson'",
  'classifyApplyFailure', 'candidate_schema_invalid', 'candidate_pack_invalid', 'candidate_input_invalid',
  'source_registry_invalid', 'evaluator_result_invalid', 'candidate_snapshot_missing',
  'oidc_runtime_unavailable', 'oidc_token_failed', 'oidc_writer_failed',
  'candidate_writer_unavailable', 'duplicate_scan_audit', 'apply_process_failed'
]) if (!script.includes(required)) throw new Error(`Candidate ingress script missing contract: ${required}`);
for (const forbidden of [
  'NEWSFLOW_CANDIDATE_PACK_V1',
  'generateKeyPairSync', 'privateDecrypt', 'createDecipheriv',
  'NEWSFLOW_APPLY_CHALLENGE_V1', 'NEWSFLOW_APPLY_PAYLOAD_V1',
  'setTimeout(', 'payload_timeout', "from('newsflow_candidates')", 'SUPABASE_SERVICE_ROLE_KEY'
]) if (script.includes(forbidden)) throw new Error(`Candidate ingress contains retired transport/persistence logic: ${forbidden}`);

for (const required of [
  "createHash('sha256')", 'Buffer.byteLength', 'decodeCandidateIngressPayload',
  'invalid_transport_metadata', 'payload_length_mismatch', 'payload_checksum_mismatch',
  'payload_too_large', "Buffer.from(jsonText, 'utf8')"
]) if (!transport.includes(required)) throw new Error(`Candidate ingress transport missing integrity contract: ${required}`);
for (const forbidden of [
  'normalizeCandidateIngressBase64', "toString('base64')", 'replace(/\\s+/g'
]) if (transport.includes(forbidden)) throw new Error(`Candidate ingress transport still contains retired Base64 logic: ${forbidden}`);

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const transportLines = (payload, { bytes = Buffer.byteLength(payload, 'utf8'), digest = sha256(payload) } = {}) => [
  `bytes: ${bytes}`,
  `sha256: ${digest}`,
  payload
];

const fixtures = [
  JSON.stringify({ schema_version: '1.0', candidates: [] }),
  JSON.stringify({
    schema_version: '1.0',
    edition_id: 'frontier-systems-review',
    candidates: [{ id: 'utf8-fixture', title: '中文 Candidate：电力、算力与成本', url: 'https://example.com/路径?q=中文' }]
  }),
  JSON.stringify({
    schema_version: '1.0',
    candidates: [],
    collection_note: '中'.repeat(9000)
  })
];

for (const fixture of fixtures) {
  const decoded = decodeCandidateIngressPayload(transportLines(fixture), 32 * 1024);
  if (decoded.toString('utf8') !== fixture) throw new Error('Candidate ingress transport changed JSON payload bytes.');
  decoded.fill(0);
}
const largeFixtureBytes = Buffer.byteLength(fixtures[2], 'utf8');
if (largeFixtureBytes < 24 * 1024 || largeFixtureBytes >= 32 * 1024) {
  throw new Error(`Large transport fixture must exercise the production-size range; got ${largeFixtureBytes} bytes.`);
}

const expectTransportError = (lines, expectedCode, maxBytes = 32 * 1024) => {
  let errorCode = null;
  try {
    decodeCandidateIngressPayload(lines, maxBytes);
  } catch (error) {
    errorCode = error?.code;
  }
  if (errorCode !== expectedCode) {
    throw new Error(`Candidate ingress transport expected ${expectedCode}; got ${String(errorCode)}.`);
  }
};

expectTransportError(['bytes: 1', 'sha256: bad', '{}'], 'invalid_transport_metadata');
expectTransportError(transportLines(fixtures[0], { bytes: Buffer.byteLength(fixtures[0], 'utf8') + 1 }), 'payload_length_mismatch');
expectTransportError(transportLines(fixtures[0], { digest: '0'.repeat(64) }), 'payload_checksum_mismatch');
const oversized = JSON.stringify({ payload: 'x'.repeat(33 * 1024) });
expectTransportError(transportLines(oversized), 'payload_too_large');

for (const required of [
  'ACTIONS_ID_TOKEN_REQUEST_URL', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  'NEWSFLOW_CANDIDATE_WRITER_URL', 'newsflow-supabase-candidate-writer',
  "from('newsflow_candidates')", 'SUPABASE_SERVICE_ROLE_KEY',
  "source_tier: String(registeredSource?.tier || 'Unregistered')",
  'source_id: registeredSource?.id || null', 'preflight_status:', 'preflight_reasons:'
]) if (!apply.includes(required)) throw new Error(`Canonical apply missing writer/review contract: ${required}`);

for (const required of [
  'https://token.actions.githubusercontent.com', 'newsflow-supabase-candidate-writer',
  "'liuh886/NewsFlow'", "'1321418658'", "'7567311'",
  "'liuh886/NewsFlow/.github/workflows/candidate-ingress.yml@refs/heads/main'",
  "payload?.event_name !== 'issue_comment'", "payload?.ref !== 'refs/heads/main'",
  "Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')", '/rest/v1/newsflow_candidates?on_conflict=candidate_id'
]) if (!writer.includes(required)) throw new Error(`Candidate writer missing OIDC/private-store contract: ${required}`);

for (const required of [
  'issue_comment:', 'github.event.issue.number == 110',
  'github.event.comment.user.login == github.repository_owner',
  "startsWith(github.event.comment.body, 'NEWSFLOW_CANDIDATE_PACK_V2 ')",
  'contents: write', 'issues: write', 'id-token: write',
  'NEWSFLOW_CANDIDATE_WRITER_URL', 'node scripts/candidate-ingress.mjs',
  'payload_type: result.payload_type', 'payload_type: ${payload_type}',
  'content/runs/*.json', 'npm run content:status'
]) if (!workflow.includes(required)) throw new Error(`Candidate ingress workflow missing contract: ${required}`);
for (const forbidden of [
  'NEWSFLOW_CANDIDATE_PACK_V1',
  'NEWSFLOW_INGRESS_TIMEOUT_MS', 'NEWSFLOW_APPLY_CHALLENGE_V1', 'NEWSFLOW_APPLY_PAYLOAD_V1',
  'npm run check', 'npm run build', 'workflow_dispatch:', 'repository_dispatch:', 'secrets.SUPABASE_SERVICE_ROLE_KEY'
]) if (workflow.includes(forbidden)) throw new Error(`Candidate ingress workflow contains retired complexity: ${forbidden}`);

const workflowConfig = JSON.parse(config);
const scheduled = workflowConfig.scheduled_runtime;
if (!scheduled || scheduled.repository_shell_required !== false || scheduled.github_contents_access !== 'read' || scheduled.github_issue_access !== 'read_write') {
  throw new Error('Scheduled runtime must use GitHub read + Issue read/write without repository shell execution.');
}
if (scheduled.public_web_discovery_required !== true || scheduled.base64_encoding_required !== false || scheduled.sha256_integrity_required !== true) {
  throw new Error('Scheduled runtime must provide public-web discovery and deterministic JSON SHA-256 integrity metadata.');
}
if (scheduled.supabase_green_lane_access !== 'read_only' || scheduled.supabase_candidate_verification_access !== 'read_only' || scheduled.supabase_candidate_write_allowed !== false) {
  throw new Error('Scheduled runtime must keep Supabase access read-only and never write Candidates directly.');
}
if (scheduled.submit_via !== 'agent_apply_ingress') throw new Error('Scheduled runtime must submit through the canonical agent apply ingress.');

const ingress = workflowConfig.agent_apply_ingress;
if (!ingress || ingress.transport !== 'owner_issue_comment_json_sha256' || ingress.issue_number !== 110 || ingress.request_marker !== 'NEWSFLOW_CANDIDATE_PACK_V2') {
  throw new Error('Content workflow must declare the owner-only JSON + SHA-256 Candidate ingress.');
}
if (ingress.canonical_command !== 'node scripts/apply-content.mjs --stdin --apply') throw new Error('Ingress must call canonical apply.');
if (ingress.writer_auth !== 'github_actions_oidc' || ingress.direct_sql_fallback_allowed !== false || ingress.plaintext_git_tracked !== false) {
  throw new Error('Ingress must keep GitHub OIDC and forbid direct SQL/plaintext Git storage.');
}
for (const required of ['NEWSFLOW_CANDIDATE_PACK_V2', 'bytes:', 'sha256:', 'payload_length_mismatch', 'payload_checksum_mismatch']) {
  if (!docs.includes(required)) throw new Error(`Candidate ingress docs missing V2 transport contract: ${required}`);
}
if (publication.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('Publication sync must remain isolated from Candidate credentials.');

console.log('Candidate ingress contract: OK (plain compact JSON + byte length + SHA-256 integrity + scheduled runtime boundary + one-shot transport + canonical apply + GitHub OIDC writer).');
