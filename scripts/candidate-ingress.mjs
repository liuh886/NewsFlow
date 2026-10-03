import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateCandidateIngressPayload } from './candidate-ingress-transport.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resultPath = resolve(root, process.env.NEWSFLOW_INGRESS_RESULT_PATH || 'artifacts/candidate-ingress-result.json');
const triggerPath = resolve(root, process.env.NEWSFLOW_INGRESS_TRIGGER_PATH || 'content/state/candidate-ingress-trigger.json');
const maxPlaintextBytes = Number(process.env.NEWSFLOW_INGRESS_MAX_PLAINTEXT_BYTES || String(32 * 1024));
const readerUrl = process.env.NEWSFLOW_CANDIDATE_INGRESS_READER_URL?.trim();
const readerAudience = process.env.NEWSFLOW_CANDIDATE_INGRESS_READER_AUDIENCE?.trim() || 'newsflow-supabase-candidate-ingress-reader';

const requestIdPattern = /^[A-Za-z0-9_-]{8,80}$/;
const shaPattern = /^[a-f0-9]{64}$/;
const boundedCodePattern = /^[a-z0-9_]{1,80}$/;

const writeResult = async (payload) => {
  await mkdir(dirname(resultPath), { recursive: true });
  await writeFile(resultPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const inspectPayload = (plaintext) => {
  const text = plaintext.toString('utf8').trim();
  if (!text) throw Object.assign(new Error('Candidate payload is empty.'), { code: 'candidate_payload_malformed' });

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (Array.isArray(parsed.candidates)) return 'candidate_pack';
      if (typeof parsed.id === 'string' && parsed.id.trim()) return 'single_candidate';
      return 'json_object';
    }
    return Array.isArray(parsed) ? 'json_array' : 'json_scalar';
  } catch {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    try {
      const rows = lines.map((line) => JSON.parse(line));
      if (rows.length && rows.every((row) => row && typeof row === 'object' && !Array.isArray(row) && typeof row.id === 'string' && row.id.trim())) {
        return 'ndjson';
      }
    } catch {}
    throw Object.assign(new Error('Candidate payload is neither JSON nor Candidate NDJSON.'), { code: 'candidate_payload_malformed' });
  }
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

let readerOidcToken = null;
const requestReaderOidcToken = async () => {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL?.trim();
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN?.trim();
  if (!requestUrl || !requestToken) {
    throw Object.assign(new Error('GitHub Actions OIDC runtime is unavailable for ingress reader.'), { code: 'ingress_oidc_runtime_unavailable' });
  }
  const url = new URL(requestUrl);
  url.searchParams.set('audience', readerAudience);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${requestToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    throw Object.assign(new Error(`Ingress OIDC token request failed with ${response.status}.`), { code: 'ingress_oidc_token_failed' });
  }
  const body = await response.json();
  if (typeof body?.value !== 'string' || !body.value) {
    throw Object.assign(new Error('Ingress OIDC token response is invalid.'), { code: 'ingress_oidc_token_invalid' });
  }
  return body.value;
};

const callIngressReader = async (action, requestId, reference, extra = {}) => {
  if (!readerUrl) {
    throw Object.assign(new Error('Supabase Candidate ingress reader URL is unavailable.'), { code: 'ingress_reader_unavailable' });
  }
  if (!readerOidcToken) readerOidcToken = await requestReaderOidcToken();

  const response = await fetch(readerUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${readerOidcToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      action,
      request_id: requestId,
      bytes: reference.payloadBytes,
      sha256: reference.payloadSha256,
      ...extra
    }),
    signal: AbortSignal.timeout(20000)
  });

  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok || body?.ok !== true) {
    const remoteCode = String(body?.error || '');
    const errorCode = boundedCodePattern.test(remoteCode) ? remoteCode : 'ingress_reader_failed';
    throw Object.assign(new Error(`Supabase Candidate ingress reader rejected ${action}.`), { code: errorCode });
  }
  return body;
};

let requestId = null;
let payloadType = null;
let reference = null;
let claimed = false;
let transportFinalize = null;
let transportFinalizeError = null;

try {
  const trigger = JSON.parse(await readFile(triggerPath, 'utf8'));
  if (trigger?.active !== true) {
    await writeResult({ schema_version: '1.0', status: 'idle', request_id: null });
    console.log('Candidate ingress trigger is inactive.');
    process.exit(0);
  }

  requestId = String(trigger.request_id || '');
  const payloadBytes = Number(trigger.payload_bytes || 0);
  const payloadSha256 = String(trigger.payload_sha256 || '');
  if (!requestIdPattern.test(requestId) || !Number.isSafeInteger(payloadBytes) || payloadBytes < 1 || payloadBytes > maxPlaintextBytes || !shaPattern.test(payloadSha256)) {
    throw Object.assign(new Error('Candidate ingress control file is invalid.'), { code: 'invalid_transport_metadata' });
  }
  reference = { payloadBytes, payloadSha256 };

  const claim = await callIngressReader('claim', requestId, reference);
  claimed = true;
  const plaintext = validateCandidateIngressPayload(claim.payload_text, reference, maxPlaintextBytes);
  claim.payload_text = '';

  let apply;
  try {
    payloadType = inspectPayload(plaintext);
    console.log(`Candidate ingress payload type: ${payloadType}`);
    apply = spawnSync(process.execPath, [resolve(root, 'scripts/apply-content.mjs'), '--stdin', '--apply'], {
      cwd: root,
      env: process.env,
      input: plaintext,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024
    });
  } finally {
    plaintext.fill(0);
  }

  if (apply.status !== 0) {
    const applyCode = classifyApplyFailure(apply);
    try {
      await callIngressReader('fail', requestId, reference, { error_code: applyCode });
      claimed = false;
    } catch (finalizeError) {
      console.error(`Candidate ingress failure finalization also failed: ${String(finalizeError?.code || 'ingress_finalize_failed')}`);
    }
    throw Object.assign(new Error('Canonical Candidate apply rejected or failed.'), { code: applyCode });
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

  try {
    await callIngressReader('complete', requestId, reference, {
      payload_type: payloadType,
      candidate_count: candidateCount,
      reviewable_count: reviewableCount,
      audit_path: auditPath
    });
    claimed = false;
    transportFinalize = 'success';
  } catch (finalizeError) {
    transportFinalize = 'failure';
    transportFinalizeError = String(finalizeError?.code || 'ingress_finalize_failed');
    console.error(`Candidate ingress completion finalization failed: ${transportFinalizeError}`);
  }

  await writeResult({
    schema_version: '1.0',
    status: 'applied',
    request_id: requestId,
    payload_type: payloadType,
    candidate_count: candidateCount,
    reviewable_count: reviewableCount,
    audit_path: auditPath,
    transport_finalize: transportFinalize,
    transport_finalize_error: transportFinalizeError
  });
  console.log(`Candidate ingress applied ${reviewableCount}/${candidateCount}; audit=${auditPath}`);
} catch (error) {
  const errorCode = String(error?.code || 'ingress_failed');
  if (claimed && requestId && reference) {
    try {
      await callIngressReader('fail', requestId, reference, { error_code: boundedCodePattern.test(errorCode) ? errorCode : 'ingress_failed' });
      claimed = false;
    } catch {}
  }
  await writeResult({
    schema_version: '1.0',
    status: 'failed',
    request_id: requestId,
    payload_type: payloadType,
    error_code: boundedCodePattern.test(errorCode) ? errorCode : 'ingress_failed'
  }).catch(() => {});
  console.error(`Candidate ingress failed: ${errorCode}`);
  process.exit(1);
}
