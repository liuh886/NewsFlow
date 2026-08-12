import { constants, createDecipheriv, generateKeyPairSync, privateDecrypt } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resultPath = resolve(root, process.env.NEWSFLOW_INGRESS_RESULT_PATH || 'artifacts/candidate-ingress-result.json');
const expectedIssue = Number(process.env.NEWSFLOW_INGRESS_ISSUE || '110');
const timeoutMs = Number(process.env.NEWSFLOW_INGRESS_TIMEOUT_MS || '240000');
const pollMs = Number(process.env.NEWSFLOW_INGRESS_POLL_MS || '3000');
const maxPlaintextBytes = Number(process.env.NEWSFLOW_INGRESS_MAX_PLAINTEXT_BYTES || String(32 * 1024));
const token = process.env.GITHUB_TOKEN?.trim();
const repository = process.env.GITHUB_REPOSITORY?.trim();
const repositoryOwner = process.env.GITHUB_REPOSITORY_OWNER?.trim();
const eventPath = process.env.GITHUB_EVENT_PATH?.trim();
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const REQUEST_MARKER = 'NEWSFLOW_APPLY_REQUEST_V1';
const CHALLENGE_MARKER = 'NEWSFLOW_APPLY_CHALLENGE_V1';
const PAYLOAD_MARKER = 'NEWSFLOW_APPLY_PAYLOAD_V1';
const AAD_PREFIX = 'newsflow-candidate-ingress-v1:';
const requestIdPattern = /^[A-Za-z0-9_-]{16,80}$/;

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

const writeResult = async (payload) => {
  await mkdir(dirname(resultPath), { recursive: true });
  await writeFile(resultPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const github = async (path, options = {}) => {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    throw Object.assign(new Error(`GitHub API request failed with ${response.status}.`), { code: 'github_api_failed' });
  }
  if (response.status === 204) return null;
  return response.json();
};

let requestId = null;
let requestCommentId = null;
let challengeCommentId = null;
let payloadCommentId = null;

try {
  if (!token || !repository || !repositoryOwner || !eventPath) {
    throw Object.assign(new Error('GitHub runtime metadata is missing.'), { code: 'missing_github_runtime' });
  }
  if (!supabaseUrl || !serviceRoleKey) {
    throw Object.assign(new Error('Canonical apply credentials are unavailable.'), { code: 'missing_runtime_secret' });
  }

  const event = JSON.parse(await readFile(eventPath, 'utf8'));
  requestCommentId = Number(event.comment?.id || 0) || null;
  const issueNumber = Number(event.issue?.number || 0);
  const commentAuthor = String(event.comment?.user?.login || '');
  const requestBody = String(event.comment?.body || '').trim();
  const requestMatch = requestBody.match(new RegExp(`^${REQUEST_MARKER} ([A-Za-z0-9_-]{16,80})$`));

  if (issueNumber !== expectedIssue || commentAuthor !== repositoryOwner || !requestMatch) {
    throw Object.assign(new Error('Ingress request did not match the owner-only endpoint contract.'), { code: 'invalid_request' });
  }
  requestId = requestMatch[1];
  if (!requestIdPattern.test(requestId)) {
    throw Object.assign(new Error('Request id is invalid.'), { code: 'invalid_request_id' });
  }

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const challengeBody = `${CHALLENGE_MARKER} ${requestId}\n${Buffer.from(publicKey, 'utf8').toString('base64')}`;
  const challenge = await github(`/repos/${repository}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: challengeBody })
  });
  challengeCommentId = Number(challenge?.id || 0) || null;

  const deadline = Date.now() + timeoutMs;
  let payloadBody = null;
  while (Date.now() < deadline) {
    const comments = await github(`/repos/${repository}/issues/${issueNumber}/comments?per_page=100`);
    const prefix = `${PAYLOAD_MARKER} ${requestId}\n`;
    const match = [...comments].reverse().find((comment) =>
      Number(comment.id || 0) > Number(challengeCommentId || 0)
      && String(comment.user?.login || '') === repositoryOwner
      && String(comment.body || '').startsWith(prefix)
    );
    if (match) {
      payloadCommentId = Number(match.id || 0) || null;
      payloadBody = String(match.body || '').slice(prefix.length).trim();
      break;
    }
    await sleep(pollMs);
  }
  if (!payloadBody) {
    throw Object.assign(new Error('Encrypted Candidate payload was not supplied before the deadline.'), { code: 'payload_timeout' });
  }
  if (payloadBody.length > 60000) {
    throw Object.assign(new Error('Encrypted payload exceeds the transport limit.'), { code: 'payload_too_large' });
  }

  let envelope;
  try {
    envelope = JSON.parse(Buffer.from(payloadBody, 'base64').toString('utf8'));
  } catch {
    throw Object.assign(new Error('Encrypted payload envelope is malformed.'), { code: 'invalid_payload_envelope' });
  }
  if (
    envelope?.v !== 1
    || envelope.request_id !== requestId
    || typeof envelope.wrapped_key !== 'string'
    || typeof envelope.iv !== 'string'
    || typeof envelope.tag !== 'string'
    || typeof envelope.ciphertext !== 'string'
  ) {
    throw Object.assign(new Error('Encrypted payload envelope is incomplete.'), { code: 'invalid_payload_envelope' });
  }

  let plaintext;
  try {
    const wrappedKey = Buffer.from(envelope.wrapped_key, 'base64');
    const iv = Buffer.from(envelope.iv, 'base64');
    const tag = Buffer.from(envelope.tag, 'base64');
    const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
    if (iv.length !== 12 || tag.length !== 16 || !wrappedKey.length || !ciphertext.length) {
      throw new Error('Invalid encrypted field sizes.');
    }
    const aesKey = privateDecrypt({
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    }, wrappedKey);
    if (aesKey.length !== 32) throw new Error('Invalid AES key length.');
    const decipher = createDecipheriv('aes-256-gcm', aesKey, iv);
    decipher.setAAD(Buffer.from(`${AAD_PREFIX}${requestId}`, 'utf8'));
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    aesKey.fill(0);
  } catch {
    throw Object.assign(new Error('Candidate payload could not be decrypted or authenticated.'), { code: 'decrypt_failed' });
  }

  if (!plaintext.length || plaintext.length > maxPlaintextBytes) {
    plaintext.fill(0);
    throw Object.assign(new Error('Candidate plaintext is outside the accepted size range.'), { code: 'plaintext_size_invalid' });
  }

  let candidatePack;
  try {
    candidatePack = JSON.parse(plaintext.toString('utf8'));
  } catch {
    plaintext.fill(0);
    throw Object.assign(new Error('Candidate plaintext is not valid JSON.'), { code: 'invalid_candidate_pack' });
  }
  if (candidatePack?.schema_version !== '1.0' || !candidatePack.run || !Array.isArray(candidatePack.candidates)) {
    plaintext.fill(0);
    throw Object.assign(new Error('Candidate plaintext does not match the exchange envelope shape.'), { code: 'invalid_candidate_pack' });
  }

  const apply = spawnSync(process.execPath, [resolve(root, 'scripts/apply-content.mjs'), '--stdin', '--apply'], {
    cwd: root,
    env: process.env,
    input: plaintext,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024
  });
  plaintext.fill(0);
  if (apply.status !== 0) {
    throw Object.assign(new Error('Canonical Candidate apply rejected or failed.'), { code: 'canonical_apply_failed' });
  }

  const summaryMatch = String(apply.stdout || '').match(/Content scan applied: (\d+)\/(\d+) item\(s\) submitted to the private Supabase editorial queue; no Reader publication changed\. Public audit: (.+)\s*$/m);
  if (!summaryMatch) {
    throw Object.assign(new Error('Canonical apply returned an unexpected result shape.'), { code: 'result_parse_failed' });
  }

  const reviewableCount = Number(summaryMatch[1]);
  const candidateCount = Number(summaryMatch[2]);
  const absoluteAuditPath = resolve(summaryMatch[3].trim());
  const auditPath = relative(root, absoluteAuditPath).replaceAll('\\', '/');
  if (!/^content\/runs\/[A-Za-z0-9._-]+\.json$/.test(auditPath)) {
    throw Object.assign(new Error('Canonical apply returned an unsafe audit path.'), { code: 'unsafe_audit_path' });
  }

  await writeResult({
    schema_version: '1.0',
    status: 'applied',
    request_id: requestId,
    request_comment_id: requestCommentId,
    challenge_comment_id: challengeCommentId,
    payload_comment_id: payloadCommentId,
    candidate_count: candidateCount,
    reviewable_count: reviewableCount,
    audit_path: auditPath
  });
  console.log(`Candidate ingress applied ${reviewableCount}/${candidateCount}; audit=${auditPath}`);
} catch (error) {
  const errorCode = String(error?.code || 'ingress_failed');
  await writeResult({
    schema_version: '1.0',
    status: 'failed',
    request_id: requestId,
    request_comment_id: requestCommentId,
    challenge_comment_id: challengeCommentId,
    payload_comment_id: payloadCommentId,
    error_code: errorCode
  }).catch(() => {});
  console.error(`Candidate ingress failed: ${errorCode}`);
  process.exit(1);
}
