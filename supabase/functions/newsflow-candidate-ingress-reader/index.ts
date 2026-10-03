const EXPECTED_ISSUER = 'https://token.actions.githubusercontent.com';
const EXPECTED_AUDIENCE = 'newsflow-supabase-candidate-ingress-reader';
const EXPECTED_REPOSITORY = 'liuh886/NewsFlow';
const EXPECTED_REPOSITORY_ID = '1321418658';
const EXPECTED_ACTOR_ID = '7567311';
const EXPECTED_WORKFLOW_REF = 'liuh886/NewsFlow/.github/workflows/candidate-ingress.yml@refs/heads/main';
const GITHUB_JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks';
const MAX_BODY_BYTES = 8 * 1024;
const MAX_PAYLOAD_BYTES = 32 * 1024;
const CLOCK_SKEW_SECONDS = 60;

const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

const base64UrlToBytes = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const decodeJsonPart = (value: string) => JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
const audienceMatches = (aud: unknown) => Array.isArray(aud) ? aud.includes(EXPECTED_AUDIENCE) : aud === EXPECTED_AUDIENCE;

const verifyGitHubOidc = async (token: string) => {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('oidc_shape');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJsonPart(encodedHeader);
  const payload = decodeJsonPart(encodedPayload);
  if (header?.alg !== 'RS256' || typeof header?.kid !== 'string') throw new Error('oidc_header');

  const jwksResponse = await fetch(GITHUB_JWKS_URL, { headers: { Accept: 'application/json' } });
  if (!jwksResponse.ok) throw new Error('oidc_jwks');
  const jwks = await jwksResponse.json();
  const jwk = Array.isArray(jwks?.keys) ? jwks.keys.find((key: Record<string, unknown>) => key.kid === header.kid && key.kty === 'RSA') : null;
  if (!jwk) throw new Error('oidc_key');

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  if (!verified) throw new Error('oidc_signature');

  const now = Math.floor(Date.now() / 1000);
  const exp = Number(payload?.exp || 0);
  const nbf = Number(payload?.nbf || 0);
  if (!exp || exp < now - CLOCK_SKEW_SECONDS) throw new Error('oidc_expired');
  if (nbf && nbf > now + CLOCK_SKEW_SECONDS) throw new Error('oidc_not_yet_valid');
  if (payload?.iss !== EXPECTED_ISSUER || !audienceMatches(payload?.aud)) throw new Error('oidc_issuer_audience');
  if (payload?.repository !== EXPECTED_REPOSITORY || String(payload?.repository_id || '') !== EXPECTED_REPOSITORY_ID) throw new Error('oidc_repository');
  if (String(payload?.actor_id || '') !== EXPECTED_ACTOR_ID) throw new Error('oidc_actor');
  if (payload?.event_name !== 'push' || payload?.ref !== 'refs/heads/main') throw new Error('oidc_event_ref');
  if (payload?.workflow_ref !== EXPECTED_WORKFLOW_REF) throw new Error('oidc_workflow_ref');
};

const requestIdPattern = /^[A-Za-z0-9_-]{8,80}$/;
const shaPattern = /^[a-f0-9]{64}$/;
const errorCodePattern = /^[a-z0-9_]{1,80}$/;

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const serviceHeaders = () => {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!serviceRoleKey) throw new Error('reader_secret_unavailable');
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
};

const restUrl = (path: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  if (!supabaseUrl) throw new Error('reader_secret_unavailable');
  return `${supabaseUrl}/rest/v1/${path}`;
};

const fetchRows = async (requestId: string) => {
  const response = await fetch(
    restUrl(`newsflow_candidate_ingress?request_id=eq.${encodeURIComponent(requestId)}&select=request_id,payload_sha256,payload_bytes,status,expires_at`),
    { headers: serviceHeaders() }
  );
  if (!response.ok) throw new Error('ingress_lookup_failed');
  return await response.json();
};

const patchRows = async (query: string, body: Record<string, unknown>, select: string) => {
  const response = await fetch(restUrl(`newsflow_candidate_ingress?${query}&select=${encodeURIComponent(select)}`), {
    method: 'PATCH',
    headers: { ...serviceHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('ingress_update_failed');
  return await response.json();
};

const classifyClaimMiss = async (requestId: string, expectedBytes: number, expectedSha: string) => {
  const rows = await fetchRows(requestId);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return 'ingress_not_found';
  if (String(row.payload_sha256 || '') !== expectedSha || Number(row.payload_bytes || 0) !== expectedBytes) return 'ingress_reference_mismatch';
  if (new Date(String(row.expires_at || '')).getTime() <= Date.now()) return 'ingress_expired';
  if (String(row.status || '') !== 'pending') return 'ingress_already_claimed';
  return 'ingress_claim_failed';
};

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
    const lengthHeader = Number(req.headers.get('content-length') || 0);
    if (lengthHeader > MAX_BODY_BYTES) return json(413, { ok: false, error: 'body_too_large' });

    const authorization = req.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json(401, { ok: false, error: 'missing_oidc' });
    await verifyGitHubOidc(authorization.slice('Bearer '.length).trim());

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json(400, { ok: false, error: 'invalid_json' }); }

    const action = String(body?.action || '');
    const requestId = String(body?.request_id || '');
    const expectedSha = String(body?.sha256 || '').toLowerCase();
    const expectedBytes = Number(body?.bytes || 0);
    if (!requestIdPattern.test(requestId) || !shaPattern.test(expectedSha) || !Number.isSafeInteger(expectedBytes) || expectedBytes < 1 || expectedBytes > MAX_PAYLOAD_BYTES) {
      return json(400, { ok: false, error: 'invalid_reference' });
    }

    if (action === 'claim') {
      const nowIso = new Date().toISOString();
      const query = [
        `request_id=eq.${encodeURIComponent(requestId)}`,
        'status=eq.pending',
        `payload_sha256=eq.${expectedSha}`,
        `payload_bytes=eq.${expectedBytes}`,
        `expires_at=gt.${encodeURIComponent(nowIso)}`
      ].join('&');
      const rows = await patchRows(query, { status: 'claimed', claimed_at: nowIso }, 'request_id,payload_text,payload_sha256,payload_bytes,status');
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return json(409, { ok: false, error: await classifyClaimMiss(requestId, expectedBytes, expectedSha) });

      const payloadText = String(row.payload_text || '');
      const actualBytes = new TextEncoder().encode(payloadText).byteLength;
      const actualSha = await sha256(payloadText);
      if (actualBytes !== expectedBytes || actualSha !== expectedSha) {
        await patchRows(
          `request_id=eq.${encodeURIComponent(requestId)}&status=eq.claimed`,
          { status: 'failed', failed_at: new Date().toISOString(), error_code: 'ingress_integrity_failed' },
          'request_id'
        ).catch(() => {});
        return json(409, { ok: false, error: 'ingress_integrity_failed' });
      }

      const staleBefore = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      fetch(restUrl(`newsflow_candidate_ingress?expires_at=lt.${encodeURIComponent(staleBefore)}`), {
        method: 'DELETE',
        headers: serviceHeaders()
      }).catch(() => {});

      return json(200, {
        ok: true,
        request_id: requestId,
        payload_text: payloadText,
        payload_sha256: expectedSha,
        payload_bytes: expectedBytes
      });
    }

    if (action === 'complete' || action === 'fail') {
      const errorCode = action === 'fail' ? String(body?.error_code || 'canonical_apply_failed') : null;
      if (errorCode && !errorCodePattern.test(errorCode)) return json(400, { ok: false, error: 'invalid_error_code' });
      const nowIso = new Date().toISOString();
      const query = [
        `request_id=eq.${encodeURIComponent(requestId)}`,
        'status=eq.claimed',
        `payload_sha256=eq.${expectedSha}`,
        `payload_bytes=eq.${expectedBytes}`
      ].join('&');
      const payloadType = action === 'complete' ? String(body?.payload_type || '') : null;
      const candidateCount = action === 'complete' ? Number(body?.candidate_count) : null;
      const reviewableCount = action === 'complete' ? Number(body?.reviewable_count) : null;
      const auditPath = action === 'complete' ? String(body?.audit_path || '') : null;
      if (action === 'complete') {
        if (!['candidate_pack','single_candidate','ndjson','json_object','json_array','json_scalar'].includes(payloadType)) {
          return json(400, { ok: false, error: 'invalid_result_metadata' });
        }
        if (!Number.isInteger(candidateCount) || candidateCount < 0 || !Number.isInteger(reviewableCount) || reviewableCount < 0) {
          return json(400, { ok: false, error: 'invalid_result_metadata' });
        }
        if (!/^content\/runs\/[A-Za-z0-9._-]+\.json$/.test(auditPath)) {
          return json(400, { ok: false, error: 'invalid_result_metadata' });
        }
      }
      const update = action === 'complete'
        ? {
            status: 'consumed',
            consumed_at: nowIso,
            result_at: nowIso,
            error_code: null,
            payload_type: payloadType,
            candidate_count: candidateCount,
            reviewable_count: reviewableCount,
            audit_path: auditPath
          }
        : { status: 'failed', failed_at: nowIso, result_at: nowIso, error_code: errorCode };
      const rows = await patchRows(query, update, 'request_id,status');
      if (!Array.isArray(rows) || rows.length !== 1) return json(409, { ok: false, error: 'ingress_finalize_failed' });
      return json(200, { ok: true, request_id: requestId, status: rows[0].status });
    }

    return json(400, { ok: false, error: 'invalid_action' });
  } catch (error) {
    const code = String((error as Error)?.message || 'unauthorized');
    return json(code.startsWith('oidc_') ? 401 : 500, { ok: false, error: code });
  }
});
