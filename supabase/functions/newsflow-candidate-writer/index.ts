const EXPECTED_ISSUER = 'https://token.actions.githubusercontent.com';
const EXPECTED_AUDIENCE = 'newsflow-supabase-candidate-writer';
const EXPECTED_REPOSITORY = 'liuh886/NewsFlow';
const EXPECTED_REPOSITORY_ID = '1321418658';
const EXPECTED_ACTOR_ID = '7567311';
const EXPECTED_WORKFLOW_REF = 'liuh886/NewsFlow/.github/workflows/candidate-ingress.yml@refs/heads/main';
const GITHUB_JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks';
const MAX_ROWS = 8;
const MAX_BODY_BYTES = 96 * 1024;
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
    'RSASSA-PKCS1-v1_5', key, base64UrlToBytes(encodedSignature),
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
  if (payload?.event_name !== 'issue_comment' || payload?.ref !== 'refs/heads/main') throw new Error('oidc_event_ref');
  if (payload?.workflow_ref !== EXPECTED_WORKFLOW_REF) throw new Error('oidc_workflow_ref');
  return payload;
};

const allowedRowKeys = new Set([
  'candidate_id', 'edition_id', 'title', 'short_summary', 'source', 'url', 'channel_id',
  'storyline_ids', 'event_type', 'published_at', 'payload', 'synced_at'
]);

const validateRows = (rows: unknown) => {
  if (!Array.isArray(rows) || rows.length > MAX_ROWS) throw new Error('rows_shape');
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('row_shape');
    const record = row as Record<string, unknown>;
    for (const key of Object.keys(record)) if (!allowedRowKeys.has(key)) throw new Error('row_field');
    for (const key of ['candidate_id', 'edition_id', 'title', 'source', 'url', 'channel_id', 'event_type', 'synced_at']) {
      if (typeof record[key] !== 'string' || !String(record[key]).trim()) throw new Error(`row_${key}`);
    }
    if (!String(record.url).startsWith('https://')) throw new Error('row_url');
    if (!Array.isArray(record.storyline_ids) || !record.storyline_ids.every((value) => typeof value === 'string')) throw new Error('row_storylines');
    if (!record.payload || typeof record.payload !== 'object' || Array.isArray(record.payload)) throw new Error('row_payload');
    if (String((record.payload as Record<string, unknown>).id || '') !== String(record.candidate_id)) throw new Error('row_payload_id');
    if (JSON.stringify(record).length > 32 * 1024) throw new Error('row_too_large');
  }
  return rows as Record<string, unknown>[];
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
    if (!body || Object.keys(body).some((key) => key !== 'rows')) return json(400, { ok: false, error: 'invalid_envelope' });
    let rows: Record<string, unknown>[];
    try { rows = validateRows(body.rows); } catch (error) {
      return json(400, { ok: false, error: String((error as Error)?.message || 'invalid_rows') });
    }

    if (rows.length) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
      if (!supabaseUrl || !serviceRoleKey) return json(500, { ok: false, error: 'writer_secret_unavailable' });
      const response = await fetch(`${supabaseUrl}/rest/v1/newsflow_candidates?on_conflict=candidate_id`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(rows)
      });
      if (!response.ok) return json(502, { ok: false, error: 'candidate_upsert_failed' });
    }

    return json(200, { ok: true, row_count: rows.length });
  } catch (error) {
    const code = String((error as Error)?.message || 'unauthorized');
    return json(401, { ok: false, error: code.startsWith('oidc_') ? code : 'unauthorized' });
  }
});
