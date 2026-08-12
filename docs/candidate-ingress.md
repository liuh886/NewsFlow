# Secure Candidate ingress

Issue #110 exists because scheduled/interactive agents can research and use connected GitHub/Supabase tools but do not have a trusted shell in the NewsFlow repository. The supported bridge is an encrypted GitHub Actions handshake that still ends at the canonical `node scripts/apply-content.mjs --stdin --apply` command.

## Security and architecture invariants

- Candidate plaintext is transient and never committed to Git, placed in workflow inputs, uploaded as an artifact, or stored in a staging table.
- Request/challenge/ciphertext transport uses Issue #110; only the repository owner's request can start the Action.
- GitHub does **not** store a long-lived Supabase service-role secret for this path.
- The Action requests a short-lived GitHub Actions OIDC token (`id-token: write`) with audience `newsflow-supabase-candidate-writer`.
- The Supabase Edge Function validates the GitHub OIDC signature and pins repository, repository ID, owner actor ID, `issue_comment`, `refs/heads/main`, and the exact `candidate-ingress.yml` workflow ref.
- The Edge Function is a thin private writer only. It does not perform discovery, preflight, row shaping, editorial review, adoption, or publication.
- `apply-content.mjs` remains the single owner of deterministic preflight → registered-source row shaping → Candidate persistence → sanitized run audit.
- Local/trusted server execution may still use `SUPABASE_SERVICE_ROLE_KEY`; GitHub Actions uses OIDC instead.
- Direct connector SQL into `newsflow_candidates` is not a supported fallback.
- Reader publication remains exclusively downstream of Editor-in-Chief adoption and `publication-sync.yml`.

## Encrypted transport

A request is posted to Issue #110:

```text
NEWSFLOW_APPLY_REQUEST_V1 <request_id>
```

The Action posts a one-time RSA public key:

```text
NEWSFLOW_APPLY_CHALLENGE_V1 <request_id>
<base64-encoded PEM SubjectPublicKeyInfo>
```

The agent encrypts the compact UTF-8 Candidate pack with AES-256-GCM, authenticating AAD `newsflow-candidate-ingress-v1:<request_id>`. The random AES key is wrapped with RSA-OAEP/SHA-256 and sent as:

```text
NEWSFLOW_APPLY_PAYLOAD_V1 <request_id>
<base64-encoded envelope JSON>
```

The envelope fields are `v`, `request_id`, `wrapped_key`, `iv`, `tag`, and `ciphertext`. Candidate plaintext is capped at 32 KiB. The RSA private key exists only inside the active Action process. Request, challenge, and encrypted-payload comments are deleted after processing.

## Canonical apply and OIDC writer

After in-memory decryption, the Action pipes plaintext directly to:

```bash
node scripts/apply-content.mjs --stdin --apply
```

`apply-content.mjs` re-runs deterministic preflight and creates the exact `newsflow_candidates` rows. In GitHub Actions it then:

1. requests a GitHub Actions OIDC token using the runtime `ACTIONS_ID_TOKEN_REQUEST_URL` / `ACTIONS_ID_TOKEN_REQUEST_TOKEN`;
2. sets audience `newsflow-supabase-candidate-writer`;
3. POSTs only the already-shaped Candidate rows to `newsflow-candidate-writer`;
4. requires a matching `{ "ok": true, "row_count": n }` acknowledgement;
5. writes the normal sanitized `content/runs/*.json` audit.

The writer is deployed from `supabase/functions/newsflow-candidate-writer/index.ts`. It accepts a maximum of eight rows, rejects unknown row fields, and uses Supabase's server-side service-role credential only after validating the GitHub OIDC identity. An empty row array is a legitimate authenticated probe and writes nothing.

The Action then runs `npm run content:status`, commits the sanitized audit plus `public/data/data-status.json` atomically, and validates with `npm run check` and `npm run build`.

## Result contract

Success leaves only a sanitized result comment:

```text
NEWSFLOW_APPLY_RESULT_V1 <request_id>
status: applied
candidate_count: <n>
reviewable_count: <n>
audit: content/runs/<file>.json
```

A failure reports only a safe stage/error code. There is no direct-SQL fallback.

## Scheduled-agent procedure

1. Read the current NewsFlow workflow and build a transient Candidate pack normally.
2. Post `NEWSFLOW_APPLY_REQUEST_V1` on #110 and wait for the matching challenge.
3. Encrypt and post the Candidate pack under `NEWSFLOW_APPLY_PAYLOAD_V1`.
4. Wait for `NEWSFLOW_APPLY_RESULT_V1`.
5. Verify Candidate/Review/Adoption state in Supabase and the sanitized GitHub audit.
6. If the handshake fails, update the relevant Issue and stop; never bypass preflight with connector SQL.
