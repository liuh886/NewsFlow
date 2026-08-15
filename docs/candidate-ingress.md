# Candidate ingress

Issue #110 is the owner-only bridge for agents that can use GitHub but do not have a trusted shell in the NewsFlow repository. The bridge is intentionally small: one Candidate-pack comment triggers the existing canonical `node scripts/apply-content.mjs --stdin --apply` path.

## Architecture

The ingest path has four responsibilities only:

1. accept one owner-authored Candidate pack on Issue #110;
2. pass it unchanged to the canonical deterministic preflight/apply command;
3. let GitHub Actions OIDC authenticate the existing Supabase Candidate writer;
4. keep only sanitized run metadata in Git and delete the transport comment after processing.

The ingress does not discover news, duplicate schema logic, write `newsflow_candidates` directly, own a database secret, or publish Reader content.

`apply-content.mjs` remains the single owner of Candidate evaluation, row shaping and persistence. Reader publication remains downstream of Editor-in-Chief adoption and `publication-sync.yml`.

## Transport

Post one comment to Issue #110:

```text
NEWSFLOW_CANDIDATE_PACK_V1 <request_id>
<base64-encoded compact Candidate-pack JSON>
```

`request_id` is an 8–80 character identifier using letters, digits, `_` or `-`. The decoded Candidate pack is capped at 32 KiB.

Base64 is only a transport encoding. It is **not encryption** and must not contain credentials, personal secrets, private editorial notes or other confidential material. Candidate packs for this bridge should contain only public-source research material intended for the private editorial queue. The source comment is deleted after processing, but deletion is cleanup rather than a confidentiality guarantee.

There is no request/challenge handshake, polling loop, RSA keypair, AES envelope, second queue or fallback transport.

## Canonical apply

The Action pipes the decoded pack directly to:

```bash
node scripts/apply-content.mjs --stdin --apply
```

The canonical apply re-runs the existing schema/evaluator checks, shapes reviewable Candidate rows, requests a short-lived GitHub Actions OIDC token, and POSTs those rows to `newsflow-candidate-writer`. GitHub stores no long-lived Supabase service-role secret for this path.

The Action then makes a best-effort commit of the sanitized `content/runs/*.json` audit and refreshed `public/data/data-status.json`. A failure in this public audit side effect does not roll back or invalidate a successful private Candidate write.

The ingest workflow deliberately does **not** run the full frontend `npm run check` or `npm run build`. Those checks belong to code changes and normal CI; Candidate ingestion is a data operation and should not be blocked by unrelated frontend validation.

## Result

A successful core write reports:

```text
NEWSFLOW_APPLY_RESULT_V1 <request_id>
status: applied
candidate_count: <n>
reviewable_count: <n>
audit_commit: success|failure|skipped
```

A failed core write reports a bounded error code. There is no direct-SQL fallback.
