---
name: newsflow-recommender
description: Run NewsFlow as an evidence-constrained adaptive editorial recommender. Use when an agent is asked to research or update an Edition, rank Signals, ingest feedback exported by the PWA, learn reader preferences, evaluate recommendation quality, or explain why an item deserves attention. Works with Codex, Antigravity and other repository-capable agents through the project workflow and deterministic scripts.
---

# NewsFlow Recommender

Treat the repository as the system of record. Use this Skill as the execution controller; never copy changing Edition, source, Signal or feedback state into the Skill.

## Start

1. Read `/WORKFLOW.md` and `/config/content-workflow.json`.
2. Read [references/input-map.md](references/input-map.md) and only the inputs required for the requested mode.
3. Identify the actual agent and workflow version in every candidate pack.

## Select a mode

- **Research or update**: execute `newsflow-content-update` from `/WORKFLOW.md`.
- **Ingest PWA feedback**: dry-run, then explicitly apply `scripts/import-feedback.mjs` when authorized.
- **Learn preferences**: run `scripts/build-profile.mjs`; inspect the generated profile before applying it.
- **Rank current Signals**: run `scripts/rank-signals.mjs` and report both scores and reasons.
- **Evaluate or revise policy**: compare logged outcomes with `/config/recommendation-policy.json`; propose governance changes separately.

## Preserve the two-stage decision boundary

1. Apply evidence, source, time, novelty and attention gates first.
2. Rank only candidates that passed those gates.

Never let preference compensate for weak evidence. Never treat clicks, bookmarks, LLM reflections or the learned profile as factual evidence.

## Learn conservatively

- Prefer explicit feedback such as `useful`, `not_interested`, `hide` and `evidence_issue` over passive behavioral proxies.
- Preserve the append-only raw events and regenerate learned state deterministically.
- Keep feedback local and anonymous unless the operator deliberately exports it.
- Use negative feedback to alter search and ranking, not to erase historical facts.
- Maintain exploration and cross-channel diversity within the bounds set by the recommendation policy.
- Propose changes to the Edition, trusted-source registry, quality thresholds or governance policy for human review; never self-approve them.

## Finish

Report the mode, inputs, event counts, profile or ranking changes, rejected records, unresolved uncertainty and verification results. A valid outcome may contain no new recommendation or no policy change.
