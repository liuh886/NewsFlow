# Content update mechanism

NewsFlow content collection is a **Candidate-generation pipeline**, not a publication pipeline.

```text
Edition + Storylines + trusted sources + time window
                      ↓
               candidate evidence pack
                      ↓
 facts → source → timeliness → news quality → industry impact
                      ↓
       accepted / needs_review / rejected
                      ↓
        private Candidate queue + run audit
                      ↓
                  Editor review
                      ↓
             Editor-in-Chief decision
                      ↓
          only Cover / Accept becomes public
```

`WORKFLOW.md` is the portable execution entrypoint, `config/content-workflow.json` is its machine-readable manifest, and `schemas/content-candidate-pack.schema.json` is the cross-agent exchange contract.

## 1. Source registry

`config/content-sources.json` is the canonical trusted-source registry. It records source identity, domain/path scope, class/tier, permitted Sections/Storylines, allowed uses and limitations.

It also defines deterministic preflight thresholds:

- `score_min_per_dimension` — every dimension must pass independently;
- `score_mean_min` — the mean across all five dimensions must pass.

A registered source is not automatically true and an unregistered source is not automatically false. Registration defines what the automated workflow is allowed to treat as known editorial infrastructure. New source policy belongs to the Editor-in-Chief's Publication Settings and GitHub governance sync.

`config/content-scouts.json` is discovery-only. Social posts cannot serve as final Candidate URLs/evidence when a canonical source exists.

`config/content-discovery.json` routes approved sources into Channels/Storylines and defines event types plus normal/counter-evidence queries.

## 2. Candidate pack

Create JSON under `content/inbox/` using the schema contract. Each Candidate contains:

- stable ID;
- Channel and Storyline IDs;
- event type/date;
- canonical source URL + publication/retrieval timestamps;
- short and long summaries;
- tags;
- five 0–5 scores: facts, source, timeliness, news quality, industry impact;
- explicit verification state;
- claim-level evidence with short excerpts.

`report_context` is mandatory for registered report sources. Stakeholder sources require explicit attribution. `not_disclosed` is a valid report data-cutoff value but forces human review.

## 3. Deterministic dry-run

```bash
npm run content:update -- --input=content/inbox/<candidate-pack>.json
```

The evaluator is read-only and classifies each Candidate:

- `accepted` — deterministic gates passed; the item may enter private editorial review;
- `needs_review` — an ambiguity requires human preflight attention;
- `rejected` — source/time/evidence/novelty/score/structure failed.

`accepted` **does not mean public Signal**.

Direct `scripts/update-content.mjs --apply` is retired and intentionally fails so the evaluator cannot regain publication side effects.

## 4. Persist reviewable Candidates

When the content task explicitly authorizes repository Candidate updates:

```bash
npm run content:update -- --input=content/inbox/<candidate-pack>.json --apply
npm run check
npm run build
```

The package command routes apply through `scripts/apply-content.mjs`.

Apply writes non-rejected Candidate snapshots directly to the RLS-protected Supabase `newsflow_candidates` table and records only a sanitized `content/runs/*.json` audit artifact in the repository. The transient Candidate pack remains gitignored.

It must **not** write `public/data/news.json`, formal Issues or a repository Candidate queue. The Reader static build never contains Candidate packets.

## 5. What preflight enforces

- run cutoff cannot be in the future;
- publication/retrieval timestamps fit the declared window;
- HTTPS canonical URLs;
- duplicate public Signal IDs/URLs are rejected;
- near-duplicate titles require review;
- valid Channel, event date/type and existing active Storylines;
- all five score dimensions pass the floor and mean threshold;
- claim-level evidence points to trusted canonical sources;
- full-text access and sentence-level summary verification are explicit;
- corporate disclosures are attributed and high-confidence claims require independent support where configured;
- institutional reports preserve version/date/cutoff/methodology distinctions;
- stakeholder positions remain attributed;
- social scout URLs remain discovery-only.

The evaluator validates process and provenance; it does not prove that an external claim is true and it never makes the publication decision.

## 6. Publication happens later

Appointed Editors review private Candidates in the five-state Review Game. Their records are advisory.

Only the Editor-in-Chief's `cover_story` or `accept` decision creates the minimal adoption projection. The hourly editorial sync can then promote that Candidate to `public/data/news.json` for Reader Latest; the 1st/15th compiler may freeze it into a formal Issue.

Chief revision/reject decisions remain private and can withdraw an adopted Signal before it is frozen into an Issue.

This boundary is intentional:

> **Research quality earns a manuscript the right to be judged; only the chief earns it the right to be published.**
