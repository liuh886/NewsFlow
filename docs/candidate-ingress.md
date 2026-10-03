# Candidate ingress

Issue #110 remains the owner-only trigger for scheduled agents that do not have a trusted repository shell. Candidate-pack bytes no longer travel through the Issue comment. The complete compact UTF-8 Candidate pack is staged transiently in Supabase, while Issue #110 carries only a small immutable reference.

## Architecture

The scheduled path is:

```text
scheduled agent
→ build one complete Candidate pack
→ compact UTF-8 JSON
→ compute exact byte length + lowercase SHA-256
→ INSERT exact payload once into public.newsflow_candidate_ingress
→ post one owner-authored Issue #110 reference
→ GitHub Actions OIDC
→ newsflow-candidate-ingress-reader claims exact payload
→ local byte-length + SHA-256 verification
→ node scripts/apply-content.mjs --stdin --apply
→ GitHub Actions OIDC
→ newsflow-candidate-writer
→ public.newsflow_candidates
→ sanitized audit side effect
```

This is one pipeline, not a second Candidate writer. The transient ingress table carries transport bytes only. It is not an editorial queue, Candidate store, publication store, retry queue, staging worker or fallback persistence path.

`apply-content.mjs` remains the single owner of schema validation, deterministic preflight, row shaping and Candidate persistence. Reader publication remains downstream of Editor-in-Chief adoption and `publication-sync.yml`.

## Scheduled runtime contract

A scheduled agent does **not** need repository shell execution and must not receive Candidate write credentials. Its permitted Supabase surface is deliberately split:

- Green Lane: read-only;
- Candidate verification after apply: read-only;
- `public.newsflow_candidate_ingress`: **insert-only transport access** for one exact Candidate-pack payload per daily run;
- `public.newsflow_candidates`: **no direct write access**.

The scheduled runtime may use the connected Supabase SQL tool only to insert the exact transient payload into `public.newsflow_candidate_ingress`. It must not use direct SQL to write, update or delete `newsflow_candidates`, and it must not create another queue, staging table, worker or fallback path.

Native X remains optional. If native X access is unavailable, record `x_query_runtime=not_run` and continue the public-web discovery surfaces.

## Candidate-pack generation

Build exactly one complete object conforming to the current `schemas/content-candidate-pack.schema.json`. The scheduled path never submits a single Candidate or NDJSON.

Serialize the complete object deterministically as compact UTF-8 JSON. Compute:

- `payload_bytes = UTF-8 byte length`;
- `payload_sha256 = lowercase SHA-256 of those exact bytes`.

The payload must not exceed the current `max_plaintext_bytes`.

The transient table enforces all of the following at insert time:

- request-id shape;
- lowercase SHA-256 shape;
- 32 KiB maximum;
- `payload_bytes = octet_length(payload_text)`;
- `payload_sha256 = SHA-256(payload_text)`;
- bounded 24-hour default / 48-hour maximum expiry.

A canonical insert is conceptually:

```sql
insert into public.newsflow_candidate_ingress
  (request_id, payload_text, payload_sha256, payload_bytes)
values
  (<request_id>, <exact compact JSON text>, <sha256>, <bytes>);
```

The runtime must preserve the exact JSON text. When constructing SQL, use a dollar-quoted delimiter that does not occur inside the payload; never alter the JSON after computing the digest. One run inserts one request_id exactly once. A duplicate primary key is a bounded failure, not a retry signal.

## Issue #110 reference

After the Supabase insert succeeds, create exactly one owner-authored Issue #110 comment:

```text
NEWSFLOW_CANDIDATE_PACK_REF_V1 <request_id>
bytes: <exact-utf8-byte-length>
sha256: <64-character-lowercase-hex-digest>
```

No Candidate content is placed in the Issue comment.

Do not use retired transports:

- `NEWSFLOW_CANDIDATE_PACK_V2` plaintext payload comments;
- `NEWSFLOW_CANDIDATE_PACK_V1` Base64 comments;
- `NEWSFLOW_APPLY_REQUEST_V1`;
- challenge / RSA / AES / encrypted envelopes;
- single Candidate / NDJSON scheduled submissions.

## Supabase ingress store

`public.newsflow_candidate_ingress` is a transient transport table. It is RLS-protected and grants no `anon` or `authenticated` access. The scheduled agent inserts through the connected privileged Supabase tool; normal clients cannot read or mutate the table.

Rows move through:

```text
pending → claimed → consumed
                 ↘ failed
```

The payload is retained only for bounded transport diagnosis and expires quickly. The OIDC reader opportunistically removes stale expired rows.

This table is distinct from `public.newsflow_candidates`. Writing to the ingress table does **not** mean a Candidate has been accepted, persisted for editorial review or published.

## GitHub Actions OIDC reader

The Issue comment triggers `.github/workflows/candidate-ingress.yml`. The workflow requests a short-lived GitHub Actions OIDC token with audience:

```text
newsflow-supabase-candidate-ingress-reader
```

The `newsflow-candidate-ingress-reader` Edge Function verifies:

- GitHub token issuer and RS256 signature;
- repository `liuh886/NewsFlow`;
- repository id and owner actor id;
- `event_name=issue_comment`;
- `ref=refs/heads/main`;
- exact `candidate-ingress.yml@main` workflow ref;
- expected audience.

It then atomically claims the pending row matching `request_id + bytes + sha256`, returns the exact `payload_text`, and rejects expired, mismatched, missing or already-claimed references.

The Edge Function intentionally runs with Supabase's platform JWT check disabled because GitHub OIDC is not a Supabase Auth JWT; authorization is implemented explicitly in the function by verifying the GitHub OIDC token.

## Local integrity verification

After the reader returns the payload, `candidate-ingress.mjs` recomputes UTF-8 byte length and SHA-256 before shallow payload inspection. Transport failures remain separate from Candidate schema/editorial failures.

Bounded transport errors include:

```text
invalid_transport_metadata
payload_too_large
ingress_oidc_runtime_unavailable
ingress_oidc_token_failed
ingress_oidc_token_invalid
ingress_reader_unavailable
ingress_not_found
ingress_reference_mismatch
ingress_expired
ingress_already_claimed
ingress_claim_failed
ingress_integrity_failed
payload_length_mismatch
payload_checksum_mismatch
candidate_payload_malformed
```

Schema, run, source, evidence and editorial validation remain owned by `apply-content.mjs` / `update-content.mjs`.

## Canonical apply

Only after successful claim and integrity verification does the workflow pipe the exact payload to:

```bash
node scripts/apply-content.mjs --stdin --apply
```

The canonical apply re-runs the current deterministic evaluator, shapes reviewable rows, requests the existing writer OIDC token and sends those rows to `newsflow-candidate-writer`.

The existing Candidate writer remains the only scheduled-path persistence authority for `public.newsflow_candidates`. No Supabase ingress row can bypass canonical apply.

If canonical apply fails, the transient ingress row is marked `failed` with a bounded error code. If canonical apply succeeds, the row is marked `consumed`. Failure to finalize the transient row after a successful Candidate write is reported separately and must never trigger a duplicate Candidate write.

## Result and audit

A successful result remains:

```text
NEWSFLOW_APPLY_RESULT_V1 <request_id>
status: applied
payload_type: candidate_pack
candidate_count: <n>
reviewable_count: <n>
transport_finalize: success|failure
audit_commit: success|failure|skipped
```

A failed core run reports `status: failed` and a bounded `error_code`.

The Action then makes a best-effort commit of the sanitized `content/runs/*.json` audit and refreshed `public/data/data-status.json`. A public audit side-effect failure does not roll back a successful private Candidate write.

Reader publication is unchanged: private Candidate ingestion is not publication. Publication still requires chief adoption and the existing publication state.
