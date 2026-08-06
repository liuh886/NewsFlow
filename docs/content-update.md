# Content update mechanism

NewsFlow uses a small two-stage mechanism: an agent researches a candidate evidence pack, then a deterministic local command decides whether each candidate is safe to promote. The agent never writes formal Signals directly.

`WORKFLOW.md` is the portable execution entrypoint, `config/content-workflow.json` is its machine-readable manifest, and `schemas/content-candidate-pack.schema.json` is the cross-agent exchange contract. Tool-specific files only point to these shared rules.

```text
Edition + trusted sources + time window
                  ↓
           candidate evidence pack
                  ↓
     facts → source → timeliness → news quality → industry impact
                  ↓
      accepted / needs_review / rejected
                  ↓
       news.json + immutable run audit
```

## 1. Source registry

`config/content-sources.json` is an allowlist, not a complete map of the world. It records sources already approved for automatic promotion and sets two thresholds:

- `score_min_per_dimension`: every dimension must pass independently (default 2).
- `score_mean_min`: the mean across all five dimensions must pass (default 3.5).

`config/content-scouts.json` is a separate discovery-only registry for selected X accounts. It is deliberately not merged into the trusted-source allowlist. A scout post may reveal a lead, linked artifact or useful counter-question, but an X URL is rejected as both a candidate source and claim-level evidence. The candidate must use the full canonical paper, repository, filing, release, dataset or blog entry instead.

`config/content-discovery.json` routes each approved source into one or more channels and Storylines, and defines the allowed event types, normal queries and counter-evidence queries. `docs/domain-watchlist.md` records what to monitor at leading companies; `docs/ccus-report-watchlist.md` records CCUS institutions, recurring report families and their evidence limits. Corporate pages remain attributed self-reporting even when the company is a market leader. Industry-association and coalition reports remain attributed stakeholder evidence.

AI candidates use the taxonomy in `docs/ai-five-layer-watchlist.md`: Energy, Chips, Infrastructure, Models and Applications. Energy is one layer rather than a proxy for AI infrastructure as a whole. A candidate may link multiple layers only when its evidence establishes the connection; retired Storylines cannot accept new Signals.

## 2. Candidate pack

Create a JSON file under `content/inbox/`. The directory is ignored by Git because a successful apply writes the durable evidence and decisions to `content/runs/`.

```json
{
  "schema_version": "1.0",
  "edition_id": "frontier-systems-review",
  "run": {
    "as_of": "YYYY-MM-DDTHH:mm:ss+08:00",
    "coverage_start": "YYYY-MM-DDTHH:mm:ss+08:00",
    "coverage_end": "YYYY-MM-DDTHH:mm:ss+08:00",
    "timezone": "Asia/Shanghai",
    "actor": {
      "agent_id": "codex-or-antigravity-or-other",
      "runtime": "Actual agent runtime",
      "workflow_id": "newsflow-content-update",
      "workflow_version": "1.0.0"
    }
  },
  "candidates": [
    {
      "id": "stable-signal-id",
      "channel_id": "ai-infrastructure",
      "event_type": "capacity_commissioned",
      "event_date": "YYYY-MM-DD",
      "title": "Factual Chinese headline",
      "url": "https://approved-source.example/original-record",
      "published_at": "ISO-8601 timestamp from the source",
      "retrieved_at": "ISO-8601 access timestamp",
      "short_summary": "Source-supported summary",
      "long_summary": "Facts separated from editorial interpretation",
      "tags": ["Existing topic"],
      "storyline_ids": ["existing-storyline-id"],
      "scores": {
        "facts": 4.5,
        "source": 4.0,
        "timeliness": 4.2,
        "news_quality": 3.8,
        "industry_impact": 4.3
      },
      "verification": {
        "full_text_accessed": true,
        "summary_supported_sentence_by_sentence": true,
        "attributed_to_source": true,
        "stakeholder_position_attributed": true,
        "report_context": {
          "report_title": "Exact report title",
          "report_version": "Edition, year or version identifier",
          "publication_date_verified": true,
          "data_cutoff": "YYYY-MM-DD or not_disclosed",
          "methodology_reviewed": true,
          "observed_and_modeled_separated": true
        }
      },
      "evidence": [
        {
          "claim": "One atomic factual claim used by the summary.",
          "source_excerpt": "A short source passage that directly supports the claim.",
          "source_url": "https://approved-source.example/original-record"
        }
      ]
    }
  ]
}
```

Each dimension is scored 0–5. The rubric is defined in `docs/attention-policy.md`. Evidence excerpts are deliberately short; store only what is necessary to audit a claim.

`run.actor` makes provenance portable across agents. The agent ID is descriptive rather than privileged: every agent has the same write boundary, and the validator rejects a missing or stale workflow identity.

`report_context` is mandatory for sources marked `report_source`. `stakeholder_position_attributed` is additionally mandatory for sources marked `stakeholder_source`. If a report does not disclose its underlying data cutoff, use `not_disclosed`; the command sends it to `needs_review` rather than treating publication recency as data recency.

## 3. Run safely

Dry-run is the default:

```bash
node scripts/update-content.mjs --input=content/inbox/2026-08-03.json
```

The report classifies every candidate:

- `accepted`: every hard gate passed;
- `needs_review`: the source is unregistered, the candidate resembles an existing Signal, or another ambiguity requires human judgment;
- `rejected`: time, evidence, novelty, score, identity or structure failed.

Apply only after reading the dry-run report:

```bash
node scripts/update-content.mjs --input=content/inbox/2026-08-03.json --apply
npm run check
npm run build
```

Apply writes accepted Signals to `public/data/news.json` and writes the full decision trail to `content/runs/`. Rejected and review candidates never enter the public dataset. A zero-item update is a successful and meaningful result.

## 4. What the command enforces

- the run cutoff cannot be in the future;
- publication and retrieval timestamps must fit the declared window;
- URLs must use HTTPS and resolve to the trusted source registry;
- existing IDs and normalized URLs are rejected;
- near-duplicate titles require review;
- every candidate names a valid channel, event type, event date and Storyline;
- every dimension (facts, source, timeliness, news quality, industry impact) must score ≥ 2;
- the mean across all five dimensions must be ≥ 3.5;
- no dimension can compensate for another;
- every candidate includes claim-level evidence from its own source URL;
- full-text access and sentence-level summary verification are explicit;
- Storyline references must already exist;
- source metadata and the display quality score are derived by the command, not freely authored.
- corporate disclosures must be explicitly attributed; a facts score above 4.5 requires independent non-corporate evidence.
- institutional reports require a verified publication date, an explicit data cutoff, methodology review and separation of observed and modeled claims;
- reports with an undisclosed data cutoff require review;
- industry-association, advisory-platform and coalition positions must be explicitly attributed.

The command validates provenance and process. It cannot prove that an external source is correct, so primary evidence, independent confirmation for disputed claims and periodic editorial audits remain necessary.
