import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const ingressScript = 'scripts/candidate-ingress.mjs';
const applyScript = 'scripts/apply-content.mjs';
const writerScript = 'supabase/functions/newsflow-candidate-writer/index.ts';
const ingressWorkflow = '.github/workflows/candidate-ingress.yml';

for (const scriptPath of [ingressScript, applyScript]) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, scriptPath)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${scriptPath} syntax failed:\n${syntax.stderr}`);
}

const [script, apply, writer, workflow, config, publication] = await Promise.all([
  read(ingressScript), read(applyScript), read(writerScript), read(ingressWorkflow),
  read('config/content-workflow.json'), read('.github/workflows/publication-sync.yml')
]);

for (const required of [
  'NEWSFLOW_CANDIDATE_PACK_V1',
  "'scripts/apply-content.mjs'", "'--stdin', '--apply'",
  'maxPlaintextBytes', 'inspectPayload', 'candidate_payload_malformed',
  "return 'candidate_pack'", "return 'single_candidate'", "return 'ndjson'",
  'classifyApplyFailure', 'candidate_schema_invalid', 'candidate_pack_invalid', 'candidate_input_invalid',
  'source_registry_invalid', 'evaluator_result_invalid', 'candidate_snapshot_missing',
  'oidc_runtime_unavailable', 'oidc_token_failed', 'oidc_writer_failed',
  'candidate_writer_unavailable', 'duplicate_scan_audit', 'apply_process_failed'
]) if (!script.includes(required)) throw new Error(`Candidate ingress script missing contract: ${required}`);
for (const forbidden of [
  'generateKeyPairSync', 'privateDecrypt', 'createDecipheriv',
  'NEWSFLOW_APPLY_CHALLENGE_V1', 'NEWSFLOW_APPLY_PAYLOAD_V1',
  'setTimeout(', 'payload_timeout', "from('newsflow_candidates')", 'SUPABASE_SERVICE_ROLE_KEY'
]) if (script.includes(forbidden)) throw new Error(`Candidate ingress contains retired transport/persistence logic: ${forbidden}`);

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
  "startsWith(github.event.comment.body, 'NEWSFLOW_CANDIDATE_PACK_V1 ')",
  'contents: write', 'issues: write', 'id-token: write',
  'NEWSFLOW_CANDIDATE_WRITER_URL', 'node scripts/candidate-ingress.mjs',
  'payload_type: result.payload_type', 'payload_type: ${payload_type}',
  'content/runs/*.json', 'npm run content:status'
]) if (!workflow.includes(required)) throw new Error(`Candidate ingress workflow missing contract: ${required}`);
for (const forbidden of [
  'NEWSFLOW_INGRESS_TIMEOUT_MS', 'NEWSFLOW_APPLY_CHALLENGE_V1', 'NEWSFLOW_APPLY_PAYLOAD_V1',
  'npm run check', 'npm run build', 'workflow_dispatch:', 'repository_dispatch:', 'secrets.SUPABASE_SERVICE_ROLE_KEY'
]) if (workflow.includes(forbidden)) throw new Error(`Candidate ingress workflow contains retired complexity: ${forbidden}`);

const workflowConfig = JSON.parse(config);
const ingress = workflowConfig.agent_apply_ingress;
if (!ingress || ingress.transport !== 'owner_issue_comment_base64' || ingress.issue_number !== 110) {
  throw new Error('Content workflow must declare the simple owner-only Candidate ingress.');
}
if (ingress.canonical_command !== 'node scripts/apply-content.mjs --stdin --apply') throw new Error('Ingress must call canonical apply.');
if (ingress.writer_auth !== 'github_actions_oidc' || ingress.direct_sql_fallback_allowed !== false || ingress.plaintext_git_tracked !== false) {
  throw new Error('Ingress must keep GitHub OIDC and forbid direct SQL/plaintext Git storage.');
}
if (publication.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('Publication sync must remain isolated from Candidate credentials.');

console.log('Candidate ingress contract: OK (one-shot transport + payload-shape diagnostics + canonical apply + GitHub OIDC writer).');
