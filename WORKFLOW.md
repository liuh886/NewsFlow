# NewsFlow portable content-update workflow

This is the canonical, vendor-neutral procedure for updating NewsFlow content. Codex, Antigravity and other agents must execute this file rather than inventing a tool-specific process.

The machine-readable companion is `config/content-workflow.json`. Candidate packs must conform to `schemas/content-candidate-pack.schema.json`; the local promotion command remains the final authority on acceptance.

## Invocation

An operator may say:

> Read `WORKFLOW.md` and run `newsflow-content-update` for the current Edition. Use agent ID `<agent-id>`. Research and validate first; apply only if I explicitly authorize repository updates.

If the operator requests a content update, that authorizes research and creation of a candidate pack. It authorizes `--apply` only when the request clearly asks to update the repository or publish accepted Signals. Dry-run is otherwise the default.

## Authority order

1. `editions/reference/edition.yaml` defines editorial intent and scope.
2. `config/content-workflow.json` defines the portable execution contract.
3. Source, discovery and scout registries define where and how to search.
4. The JSON Schema defines the exchange format.
5. `scripts/update-content.mjs` makes deterministic promotion decisions.
6. Agent-specific files are adapters only; they may not weaken or extend this workflow.

If two layers conflict, stop before applying and report the conflict.

## Procedure

### 1. Establish the run

- Read the Edition, current Signals and Storylines, then every file listed under `required_inputs` in the workflow manifest.
- Use the generated reader profile to prioritize search and rank only; it may never weaken evidence or attention gates.
- Declare `as_of`, `coverage_start`, `coverage_end` and `Asia/Shanghai` before searching.
- Record `run.actor.agent_id`, `run.actor.runtime`, `run.actor.workflow_id` and `run.actor.workflow_version` exactly as required by the manifest.

### 2. Discover broadly, verify narrowly

- Search each active Storyline using its normal and counter-evidence queries.
- Use primary records first; use registered institutions and mainstream reporting for context or independent confirmation.
- Track leading companies and recurring CCUS institutional reports.
- Use registered X accounts only as discovery scouts. Follow every lead to its canonical source; never submit an X URL as evidence.
- Access the full source and verify dates, publication version, data cutoff, methodology and project status where applicable.

### 3. Earn attention

- Compare each item with existing Signals and state the precise information delta.
- Score each candidate on five dimensions (facts, source, timeliness, news quality, industry impact) per the rubric in `docs/attention-policy.md`.
- Reject an item when it does not change a material decision, scale, economics, constraint, demand signal, rule or prior belief.
- A zero-candidate pack is a valid outcome.

### 4. Produce the exchange artifact

- Write one JSON candidate pack to `content/inbox/` using `schemas/content-candidate-pack.schema.json`.
- Include claim-level evidence and short excerpts from the same canonical URL.
- Do not edit the Edition, Storyline views, application code, `public/data/news.json` or `public/data/issues.json` directly.

### 5. Validate and promote

Run the deterministic dry-run:

```bash
node scripts/update-content.mjs --input=content/inbox/<candidate-pack>.json
```

Inspect every `accepted`, `needs_review` and `rejected` decision. Never reinterpret `needs_review` as accepted.

Only with explicit update authorization:

```bash
node scripts/update-content.mjs --input=content/inbox/<candidate-pack>.json --apply
npm run check
npm run build
```

### 6. Handoff

Report the declared time window, agent identity and workflow version; sources and Storylines checked; accepted/review/rejected counts; files changed; unresolved uncertainty; and validation results. An applied run must leave its immutable audit under `content/runs/`.

## Terminal outcomes

- `completed_no_material_change`: research completed, but no candidate earned attention.
- `completed_dry_run`: candidate pack and decision report produced; repository data not changed.
- `completed_applied`: accepted Signals promoted, audit written, checks passed.
- `needs_human_review`: at least one material ambiguity or unregistered source remains; do not self-approve it.
- `blocked`: required evidence, access or contract inputs are unavailable; do not fabricate a substitute.
