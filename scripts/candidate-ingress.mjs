import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resultPath = resolve(root, process.env.NEWSFLOW_INGRESS_RESULT_PATH || 'artifacts/candidate-ingress-result.json');
const expectedIssue = Number(process.env.NEWSFLOW_INGRESS_ISSUE || '110');
const maxPlaintextBytes = Number(process.env.NEWSFLOW_INGRESS_MAX_PLAINTEXT_BYTES || String(32 * 1024));
const repositoryOwner = process.env.GITHUB_REPOSITORY_OWNER?.trim();
const eventPath = process.env.GITHUB_EVENT_PATH?.trim();

const MARKER = 'NEWSFLOW_CANDIDATE_PACK_V1';
const requestIdPattern = /^[A-Za-z0-9_-]{8,80}$/;

const writeResult = async (payload) => {
  await mkdir(dirname(resultPath), { recursive: true });
  await writeFile(resultPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const classifyApplyFailure = (result) => {
  if (result?.error) return 'apply_process_failed';
  const output = `${String(result?.stderr || '')}\n${String(result?.stdout || '')}`;
  const signatures = [
    ['Candidate pack failed JSON Schema validation:', 'candidate_schema_invalid'],
    ['Candidate pack failed:', 'candidate_pack_invalid'],
    ['Content source configuration failed:', 'source_registry_invalid'],
    ['Input must be a candidate pack, single candidate or NDJSON candidates.', 'candidate_input_invalid'],
    ['Apply requires a candidate pack, a single JSON candidate or NDJSON candidates.', 'candidate_input_invalid'],
    ['NDJSON line ', 'candidate_input_invalid'],
    ['Content evaluator did not return a valid JSON report.', 'evaluator_result_invalid'],
    ['Missing candidate snapshot for reviewable item', 'candidate_snapshot_missing'],
    ['GitHub Actions OIDC runtime is unavailable.', 'oidc_runtime_unavailable'],
    ['GitHub Actions OIDC token request failed with', 'oidc_token_failed'],
    ['GitHub Actions OIDC token response is invalid.', 'oidc_token_invalid'],
    ['OIDC Candidate writer failed with', 'oidc_writer_failed'],
    ['OIDC Candidate writer returned an invalid acknowledgement.', 'oidc_writer_ack_invalid'],
    ['Applying reviewable Candidates requires either', 'candidate_writer_unavailable'],
    ['This scan audit was already applied:', 'duplicate_scan_audit'],
    ['Content report has invalid run.as_of.', 'invalid_run_timestamp']
  ];
  return signatures.find(([signature]) => output.includes(signature))?.[1] || 'canonical_apply_failed';
};

let requestId = null;
let requestCommentId = null;

try {
  if (!repositoryOwner || !eventPath) {
    throw Object.assign(new Error('GitHub runtime metadata is missing.'), { code: 'missing_github_runtime' });
  }

  const event = JSON.parse(await readFile(eventPath, 'utf8'));
  requestCommentId = Number(event.comment?.id || 0) || null;
  const issueNumber = Number(event.issue?.number || 0);
  const commentAuthor = String(event.comment?.user?.login || '');
  const requestBody = String(event.comment?.body || '').trim();
  const [header, ...payloadLines] = requestBody.split(/\r?\n/);
  const requestMatch = header?.match(new RegExp(`^${MARKER} ([A-Za-z0-9_-]{8,80})$`));

  if (issueNumber !== expectedIssue || commentAuthor !== repositoryOwner || !requestMatch) {
    throw Object.assign(new Error('Ingress request did not match the owner-only endpoint contract.'), { code: 'invalid_request' });
  }

  requestId = requestMatch[1];
  if (!requestIdPattern.test(requestId)) {
    throw Object.assign(new Error('Request id is invalid.'), { code: 'invalid_request_id' });
  }

  const encoded = payloadLines.join('').trim();
  if (!encoded) {
    throw Object.assign(new Error('Candidate payload is missing.'), { code: 'missing_payload' });
  }
  if (encoded.length > Math.ceil(maxPlaintextBytes * 4 / 3) + 8) {
    throw Object.assign(new Error('Candidate payload exceeds the transport limit.'), { code: 'payload_too_large' });
  }

  const plaintext = Buffer.from(encoded, 'base64');
  if (!plaintext.length || plaintext.length > maxPlaintextBytes) {
    throw Object.assign(new Error('Candidate payload is outside the accepted size range.'), { code: 'payload_size_invalid' });
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
    throw Object.assign(new Error('Canonical Candidate apply rejected or failed.'), { code: classifyApplyFailure(apply) });
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
    error_code: errorCode
  }).catch(() => {});
  console.error(`Candidate ingress failed: ${errorCode}`);
  process.exit(1);
}
