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

## Candidate-pack generation

`apply-content.mjs` can parse a full Candidate pack, a single Candidate object, or Candidate NDJSON. The Issue #110 agent bridge uses **one full Candidate pack** so the run metadata and coverage window are never lost in transport.

The generator must build the object defined by `schemas/content-candidate-pack.schema.json`. At minimum the envelope is:

```json
{
  "schema_version": "1.0",
  "edition_id": "frontier-systems-review",
  "run": {
    "as_of": "<ISO-8601>",
    "coverage_start": "<ISO-8601>",
    "coverage_end": "<ISO-8601>",
    "timezone": "Asia/Shanghai",
    "actor": {
      "agent_id": "<agent>",
      "runtime": "<runtime>",
      "workflow_id": "newsflow-content-update",
      "workflow_version": "1.0.0"
    }
  },
  "candidates": [
    {
      "id": "<stable-id>",
      "channel_id": "<channel>",
      "event_type": "<event-type>",
      "event_date": "<YYYY-MM-DD>",
      "title": "<title>",
      "url": "https://...",
      "published_at": "<ISO-8601>",
      "retrieved_at": "<ISO-8601>",
      "short_summary": "<summary>",
      "long_summary": "<summary>",
      "tags": ["<tag>"],
      "storyline_ids": ["<storyline>"],
      "scores": {
        "facts": 0,
        "source": 0,
        "timeliness": 0,
        "news_quality": 0,
        "industry_impact": 0
      },
      "verification": {
        "full_text_accessed": true,
        "summary_supported_sentence_by_sentence": true
      },
      "evidence": [
        {
          "claim": "<claim>",
          "source_excerpt": "<bounded excerpt>",
          "source_url": "https://..."
        }
      ]
    }
  ]
}
```

This is an envelope example, not a relaxation of the schema. Source-specific verification fields and all current evaluator rules still apply. The generator must use the repository's current schema and workflow version rather than maintaining a second Candidate definition.

Serialize the complete pack as compact UTF-8 JSON, Base64-encode those exact bytes as one line, and post:

```text
NEWSFLOW_CANDIDATE_PACK_V1 <request_id>
<base64-of-complete-candidate-pack>
```

Do not post the old `NEWSFLOW_APPLY_REQUEST_V1`, challenge, encrypted payload, individual Candidate JSON, or NDJSON from the scheduled-agent path. Those are not the scheduled-agent transport contract.

## Transport diagnostics

`candidate-ingress.mjs` performs only a shallow payload-shape inspection before canonical apply. It does not duplicate the Candidate schema or editorial evaluator.

The sanitized result records `payload_type` as `candidate_pack`, `single_candidate`, `ndjson`, `json_object`, `json_array` or `json_scalar`. Bytes that are neither valid JSON nor valid Candidate NDJSON fail early as:

```text
candidate_payload_malformed
```

Schema, run, source, evidence and editorial validation remain owned by `apply-content.mjs` / `update-content.mjs` and continue to return their bounded stage-specific errors.

## Transport

`request_id` is an 8–80 character identifier using letters, digits, `_` or `-`. The decoded payload is capped at 32 KiB.

Base64 is only a transport encoding. It is **not encryption** and must not contain credentials, personal secrets, private editorial notes or other confidential material. Candidate packs for this bridge should contain only public-source research material intended for the private editorial queue. The source comment is deleted after processing, but deletion is cleanup rather than a confidentiality guarantee.

There is no request/challenge handshake, polling loop, RSA keypair, AES envelope, second queue or fallback transport.

## Canonical apply

The Action pipes the decoded payload directly to:

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
payload_type: candidate_pack
candidate_count: <n>
reviewable_count: <n>
audit_commit: success|failure|skipped
```

A failed core write reports `payload_type` when it can be determined and a bounded error code. There is no direct-SQL fallback.
