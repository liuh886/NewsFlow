import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const ingressScript = 'scripts/candidate-ingress.mjs';
const ingressWorkflow = '.github/workflows/candidate-ingress.yml';
const syntax = spawnSync(process.execPath, ['--check', resolve(root, ingressScript)], { encoding: 'utf8' });
if (syntax.status !== 0) throw new Error(`${ingressScript} syntax failed:\n${syntax.stderr}`);

const [script, workflow, config, publication] = await Promise.all([
  read(ingressScript),
  read(ingressWorkflow),
  read('config/content-workflow.json'),
  read('.github/workflows/publication-sync.yml')
]);

for (const required of [
  'NEWSFLOW_APPLY_REQUEST_V1',
  'NEWSFLOW_APPLY_CHALLENGE_V1',
  'NEWSFLOW_APPLY_PAYLOAD_V1',
  'RSA_PKCS1_OAEP_PADDING',
  "oaepHash: 'sha256'",
  "createDecipheriv('aes-256-gcm'",
  "'scripts/apply-content.mjs'",
  "'--stdin', '--apply'",
  'SUPABASE_SERVICE_ROLE_KEY',
  'maxPlaintextBytes'
]) {
  if (!script.includes(required)) throw new Error(`Candidate ingress script missing contract: ${required}`);
}
for (const forbidden of [
  "from('newsflow_candidates')",
  'public/data/news.json',
  "writeFile(resolve(root, 'content/inbox"
]) {
  if (script.includes(forbidden)) throw new Error(`Candidate ingress must not create a second persistence/publication path: ${forbidden}`);
}

for (const required of [
  'issue_comment:',
  'github.event.issue.number == 110',
  'github.event.comment.user.login == github.repository_owner',
  "startsWith(github.event.comment.body, 'NEWSFLOW_APPLY_REQUEST_V1 ')",
  'contents: write',
  'issues: write',
  'secrets.SUPABASE_SERVICE_ROLE_KEY',
  'node scripts/candidate-ingress.mjs',
  'content/runs/*.json',
  'npm run content:status',
  'public/data/data-status.json',
  'npm run check',
  'npm run build'
]) {
  if (!workflow.includes(required)) throw new Error(`Candidate ingress workflow missing contract: ${required}`);
}
for (const forbidden of ['workflow_dispatch:', 'repository_dispatch:', 'content/inbox/']) {
  if (workflow.includes(forbidden)) throw new Error(`Candidate ingress workflow exposes or duplicates transport: ${forbidden}`);
}

const workflowConfig = JSON.parse(config);
const ingress = workflowConfig.agent_apply_ingress;
if (!ingress || ingress.transport !== 'encrypted_issue_comment_handshake' || ingress.issue_number !== 110) {
  throw new Error('Content workflow must declare the encrypted scheduled-agent ingress.');
}
if (ingress.canonical_command !== 'node scripts/apply-content.mjs --stdin --apply') {
  throw new Error('Encrypted ingress must call the canonical Candidate apply command.');
}
if (ingress.direct_sql_fallback_allowed !== false || ingress.plaintext_git_tracked !== false) {
  throw new Error('Encrypted ingress must forbid direct SQL fallback and plaintext Git tracking.');
}
if (publication.includes('SUPABASE_SERVICE_ROLE_KEY')) {
  throw new Error('Publication sync must remain isolated from Candidate service-role credentials.');
}

console.log('Candidate ingress contract: OK');
