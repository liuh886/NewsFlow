# Candidate ingress

The scheduled Candidate ingress separates three authorities:

1. **Supabase transient ingress** carries exact Candidate-pack bytes;
2. **one small Git control file** triggers the canonical server-side run;
3. **canonical apply + the existing OIDC Candidate writer** alone may persist reviewable Candidates.

Candidate content is never placed in the Git trigger, and transient ingress storage is not Candidate persistence or Reader publication.

## Architecture

```text
scheduled agent
→ build one complete Candidate pack
→ compact UTF-8 JSON
→ compute exact byte length + lowercase SHA-256
→ INSERT exact payload once into public.newsflow_candidate_ingress
→ update content/state/candidate-ingress-trigger.json on main
→ path-scoped GitHub push workflow
→ GitHub Actions OIDC
→ newsflow-candidate-ingress-reader claims exact payload
→ local byte-length + SHA-256 verification
→ node scripts/apply-content.mjs --stdin --apply
→ GitHub Actions OIDC
→ newsflow-candidate-writer
→ public.newsflow_candidates
→ sanitized content/runs audit side effect
```

The transient ingress table is transport only. The Git control file is trigger metadata only. Neither is an editorial queue, durable Candidate store, publication store, retry queue, worker or alternate writer.

`apply-content.mjs` remains the single owner of schema validation, deterministic preflight, Candidate row shaping and persistence. Reader publication remains exclusively downstream of Editor-in-Chief adoption and `publication-sync.yml`.

## Scheduled runtime boundary

A scheduled agent does **not** need repository shell execution and does not receive Candidate persistence credentials.

Its permitted writes are exactly:

- Supabase `public.newsflow_candidate_ingress`: **one insert-only transport row** per run;
- GitHub `content/state/candidate-ingress-trigger.json`: **one control-file update** after the Supabase insert succeeds.

Its other Supabase access remains read-only:

- Green Lane;
- post-apply Candidate verification;
- ingress-row result verification.

It must never write `public.newsflow_candidates` directly, mutate another repository path during submission, create another queue/staging/worker/fallback, or invoke `apply-content.mjs` from the scheduled client runtime.

Native X is optional. If unavailable, record `x_query_runtime=not_run` and continue through the configured public-web surfaces.

## Candidate-pack generation and transient insert

Build exactly one complete Candidate pack conforming to the current `schemas/content-candidate-pack.schema.json`. The scheduled path never submits a single Candidate or NDJSON.

Serialize deterministically as compact UTF-8 JSON and compute:

- `payload_bytes = UTF-8 byte length`;
- `payload_sha256 = lowercase SHA-256 of those exact bytes`.

The payload must not exceed the current `max_plaintext_bytes`.

Insert the exact payload once into `public.newsflow_candidate_ingress`. The database enforces request-id shape, byte length, SHA-256 integrity, payload size and bounded expiry. When SQL transport is used, choose a dollar-quote delimiter that does not occur in the payload and never edit the JSON after hashing it.

A duplicate `request_id` is a terminal transport failure for that run. Do not retry the same pack through another path.

## Git control file

Only after the Supabase insert succeeds, fetch the current blob SHA of:

`content/state/candidate-ingress-trigger.json`

and replace that exact file on `main` with:

```json
{
  "schema_version": "1.0",
  "active": true,
  "request_id": "<request_id>",
  "payload_bytes": 9000,
  "payload_sha256": "<64-character-lowercase-sha256>",
  "created_at": "<ISO-8601>"
}
```

No Candidate content, summaries, evidence or source excerpts belong in this file.

The workflow is triggered only by a `push` to `main` whose changed path includes this control file. Audit commits do not touch the control file and therefore do not recursively trigger Candidate ingress.

The baseline file may use `active=false`. An inactive trigger is a successful no-op.

Retired transports are forbidden:

- Issue #110 transport comments or title edits;
- `NEWSFLOW_CANDIDATE_PACK_REF_V1`;
- `NEWSFLOW_CANDIDATE_PACK_V2`;
- `NEWSFLOW_CANDIDATE_PACK_V1`;
- `NEWSFLOW_APPLY_REQUEST_V1`;
- Base64, challenge, RSA/AES or encrypted envelopes.

## Supabase ingress lifecycle

Rows move through:

```text
pending → claimed → consumed
                 ↘ failed
```

The OIDC reader claims one pending row matching `request_id + bytes + sha256` and rejects missing, expired, mismatched or already-claimed references.

On canonical success the row stores sanitized result metadata:

- `status=consumed`;
- `payload_type`;
- `candidate_count`;
- `reviewable_count`;
- `audit_path`;
- `result_at`.

On canonical failure it stores `status=failed`, `error_code` and `result_at`.

The row's result state replaces the old Issue-comment `NEWSFLOW_APPLY_RESULT_V1` response.

Writing the transient row does **not** mean a Candidate was accepted, persisted or published.

## GitHub Actions OIDC

Both `newsflow-candidate-ingress-reader` and `newsflow-candidate-writer` verify GitHub OIDC directly. Their accepted identity is constrained to:

- issuer `https://token.actions.githubusercontent.com`;
- repository `liuh886/NewsFlow`;
- repository id `1321418658`;
- owner actor id `7567311`;
- `event_name=push`;
- `ref=refs/heads/main`;
- exact workflow ref `liuh886/NewsFlow/.github/workflows/candidate-ingress.yml@refs/heads/main`;
- their respective expected audiences.

The Edge Functions use `verify_jwt=false` at the Supabase platform layer because GitHub OIDC is not a Supabase Auth JWT; each function validates the GitHub token signature and claims itself before using its internal service-role capability.

## Local integrity and canonical apply

After claim, `candidate-ingress.mjs` recomputes byte length and SHA-256 before shallow payload inspection.

Transport errors remain separate from Candidate schema/editorial errors, including:

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

Only after transport integrity succeeds does the workflow execute:

```bash
node scripts/apply-content.mjs --stdin --apply
```

The canonical evaluator owns Candidate schema, source, evidence and preflight validation. Reviewable rows are persisted only through the existing `newsflow-candidate-writer`.

If canonical apply succeeds but transient-result finalization fails, the Candidate write remains successful and must not be repeated. If the public audit commit later fails, report **private write success / public audit side-effect failure** and do not rewrite the Candidate.

## Verification

A scheduled run reads the ingress row after the workflow finishes.

Success requires:

- ingress row `status=consumed`;
- `payload_type=candidate_pack`;
- expected candidate/reviewable counts;
- reviewable Candidate rows verified read-only in `public.newsflow_candidates`;
- the reported `audit_path` exists on GitHub and `public/data/data-status.json` agrees with the latest true audit.

A failed row must report its bounded `error_code`; the scheduled runtime does not bypass canonical apply.

Private Candidate ingestion is not Reader publication. Publication may be reported only when chief adoption plus publication state proves it.
