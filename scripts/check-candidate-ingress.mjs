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
  'NEWSFLOW_APPLY_REQUEST_V1', 'NEWSFLOW_APPLY_CHALLENGE_V1', 'NEWSFLOW_APPLY_PAYLOAD_V1',
  'RSA_PKCS1_OAEP_PADDING', "oaepHash: 'sha256'", "createDecipheriv('aes-256-gcm'",
  "'scripts/apply-content.mjs'", "'--stdin', '--apply'", 'maxPlaintextBytes',
  'classifyApplyFailure', 'candidate_schema_invalid', 'candidate_pack_invalid',
  'source_registry_invalid', 'oidc_writer_failed', 'duplicate_scan_audit'
]) if (!script.includes(required)) throw new Error(`Candidate ingress script missing contract: ${required}`);
for (const forbidden of ["from('newsflow_candidates')", 'public/data/news.json', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (script.includes(forbidden)) throw new Error(`Candidate ingress must not persist or own database secrets: ${forbidden}`);
}

for (const required of [
  'ACTIONS_ID_TOKEN_REQUEST_URL', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  'NEWSFLOW_CANDIDATE_WRITER_URL', 'newsflow-supabase-candidate-writer',
  "from('newsflow_candidates')", 'SUPABASE_SERVICE_ROLE_KEY',
  "source_tier: String(registeredSource?.tier || 'Unregistered')",
  'source_id: registeredSource?.id || null',
  'preflight_status:', 'preflight_reasons:'
]) if (!apply.includes(required)) throw new Error(`Canonical apply missing writer/review contract: ${required}`);
if (apply.includes('uses an unregistered source:')) throw new Error('Canonical apply must not contradict evaluator needs_review semantics for unregistered sources.');
if (!apply.includes('if (!candidateRows.length) return;')) throw new Error('Canonical apply must preserve credential-free zero-Candidate local runs.');

for (const required of [
  'https://token.actions.githubusercontent.com', 'newsflow-supabase-candidate-writer',
  "'liuh886/NewsFlow'", "'1321418658'", "'7567311'",
  "'liuh886/NewsFlow/.github/workflows/candidate-ingress.yml@refs/heads/main'",
  "payload?.event_name !== 'issue_comment'", "payload?.ref !== 'refs/heads/main'",
  "Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')", '/rest/v1/newsflow_candidates?on_conflict=candidate_id',
  'resolution=merge-duplicates,return=minimal'
]) if (!writer.includes(required)) throw new Error(`Candidate writer missing OIDC/private-store contract: ${required}`);
if (writer.includes('public/data/news.json')) throw new Error('Candidate writer must never own Reader publication.');

for (const required of [
  'issue_comment:', 'github.event.issue.number == 110',
  'github.event.comment.user.login == github.repository_owner',
  "startsWith(github.event.comment.body, 'NEWSFLOW_APPLY_REQUEST_V1 ')",
  'contents: write', 'issues: write', 'id-token: write',
  'NEWSFLOW_CANDIDATE_WRITER_URL', 'node scripts/candidate-ingress.mjs',
  'content/runs/*.json', 'npm run content:status', 'public/data/data-status.json',
  'npm run check', 'npm run build'
]) if (!workflow.includes(required)) throw new Error(`Candidate ingress workflow missing contract: ${required}`);
for (const forbidden of ['workflow_dispatch:', 'repository_dispatch:', 'content/inbox/', 'secrets.SUPABASE_SERVICE_ROLE_KEY']) {
  if (workflow.includes(forbidden)) throw new Error(`Candidate ingress workflow exposes or duplicates transport/secret state: ${forbidden}`);
}

const workflowConfig = JSON.parse(config);
const ingress = workflowConfig.agent_apply_ingress;
if (!ingress || ingress.transport !== 'encrypted_issue_comment_handshake' || ingress.issue_number !== 110) {
  throw new Error('Content workflow must declare the encrypted scheduled-agent ingress.');
}
if (ingress.canonical_command !== 'node scripts/apply-content.mjs --stdin --apply') throw new Error('Ingress must call canonical apply.');
if (ingress.writer_auth !== 'github_actions_oidc' || ingress.direct_sql_fallback_allowed !== false || ingress.plaintext_git_tracked !== false) {
  throw new Error('Ingress must use GitHub OIDC and forbid direct SQL/plaintext Git transport.');
}
if (publication.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('Publication sync must remain isolated from Candidate credentials.');

console.log('Candidate ingress contract: OK (encrypted transport + reviewable unregistered sources + bounded failure codes + GitHub OIDC writer).');
