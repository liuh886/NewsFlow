# NewsFlow portable content-update workflow

This is the canonical, vendor-neutral procedure for updating NewsFlow evidence. Codex, Antigravity and other agents execute this file rather than inventing a tool-specific process.

The machine-readable companion is `config/content-workflow.json`. Candidate packs conform to `schemas/content-candidate-pack.schema.json`.

## Two different acceptance boundaries

NewsFlow deliberately distinguishes **evidence promotion** from **formal Issue adoption**:

1. the content workflow decides whether a sourced item is good enough to become a Reader/Editorial-Desk Signal or a review candidate;
2. the Editor Review Game decides whether that candidate receives 封面文章、录用、小修、大修 or 拒稿;
3. only an active owner's **封面文章 / 录用** decision can enter the next formal Issue.

A content-pipeline `accepted` result therefore does **not** mean “published in the formal Issue”. It means the evidence has passed the repository's sourcing/attention contract and may be shown or reviewed.

## Invocation

An operator may say:

> Read `WORKFLOW.md` and run `newsflow-content-update` for the current Edition. Use agent ID `<agent-id>`. Research and validate first; apply only if I explicitly authorize repository updates.

If the operator requests a content update, that authorizes research and creation of a candidate pack. It authorizes `--apply` only when the request clearly asks to update repository evidence. Dry-run is otherwise the default.

## Authority order

1. `editions/reference/edition.yaml` defines editorial intent and scope.
2. `config/content-workflow.json` defines the portable evidence-processing contract.
3. Source, discovery and scout registries define where and how to search.
4. The JSON Schema defines the exchange format.
5. `scripts/update-content.mjs` makes deterministic evidence-promotion decisions.
6. `scripts/apply-content.mjs` applies those decisions and persists durable human-preflight state.
7. the Review Game owns five-state editorial judgment;
8. active-owner Cover/Accept projection owns formal Issue adoption;
9. `scripts/publish-edition.mjs` compiles the 1st/15th formal Issue.
10. Agent-specific files are adapters only; they may not weaken or extend this workflow.

If two layers conflict, stop before applying and report the conflict.

## Procedure

### 1. Establish the run

- Read the Edition, current Signals and Storylines, then every file listed under `required_inputs` in the workflow manifest.
- Use the generated reader profile to prioritize search and rank only; it may never weaken evidence or attention gates.
- Declare `as_of`, `coverage_start`, `coverage_end` and `Asia/Shanghai` before searching.
- Record `run.actor.agent_id`, `run.actor.runtime`, `run.actor.workflow_id` and `run.actor.workflow_version` exactly as required by the manifest.

### 2. Discover broadly, verify narrowly

- Search each active Storyline using normal and counter-evidence queries.
- Prefer primary records; use registered institutions and mainstream reporting for context or independent confirmation.
- Track leading companies and recurring CCUS institutional reports.
- Use registered social accounts only as discovery scouts. Follow leads to the canonical source; never submit a social URL as final evidence when a primary source exists.
- Access the full source and verify dates, publication version, data cutoff, methodology and project status where applicable.

### 3. Earn attention

- Compare each item with existing Signals and state the precise information delta.
- Score each candidate on facts, source, timeliness, news quality and industry impact per `docs/attention-policy.md`.
- Reject an item when it does not change a material decision, scale, economics, constraint, demand signal, rule or prior belief.
- A zero-candidate pack is a valid outcome.

### 4. Produce the exchange artifact

- Write one JSON candidate pack to `content/inbox/` using `schemas/content-candidate-pack.schema.json`.
- Include claim-level evidence and short excerpts from the same canonical URL.
- Do not edit the Edition worldview, `public/data/issues.json` or formal editorial decisions directly.

### 5. Validate and apply evidence

Run the deterministic dry-run:

```bash
npm run content:update -- --input=content/inbox/<candidate-pack>.json
```

Inspect every `accepted`, `needs_review` and `rejected` decision. Never reinterpret `needs_review` as accepted.

Only with explicit update authorization:

```bash
npm run content:update -- --input=content/inbox/<candidate-pack>.json --apply
npm run check
npm run build
```

The apply command may promote evidence to the continuous Signal set and synchronizes durable human-preflight state. A `needs_review` candidate stays available to the Editor Review Game after transient inbox cleanup.

### 6. Editorial judgment

The Editor Review Game presents pending real candidates newest first. The editor chooses exactly one of:

- 封面文章;
- 录用;
- 小修;
- 大修;
- 拒稿.

All five decisions can be preserved in the editor's private NewsFlow account state. Only active-owner `封面文章` and `录用` are projected to `newsflow_editorial_adoptions` for formal publication. Guest and non-authoritative editor opinions do not gain publication authority.

### 7. Formal Issue publication

On the 1st and 15th, `scripts/publish-edition.mjs`:

- calculates the half-month coverage window;
- reads the public owner-adoption projection;
- admits only Cover/Accept candidates in that window;
- respects Edition Issue/channel caps;
- persists the selected cover as `cover_signal_id`;
- promotes selected inbox evidence to `public/data/news.json` when needed;
- freezes the formal Issue in `public/data/issues.json`;
- emits a valid no-change Issue when there is no eligible owner adoption.

There is no quality-score fallback that silently substitutes for the owner's formal adoption decision.

### 8. Handoff

Report the time window, agent identity and workflow version; sources and Storylines checked; evidence promotion/review/rejection counts; files changed; unresolved uncertainty; and validation results. An applied run leaves its audit under `content/runs/` when the existing content pipeline requires one.

## Terminal outcomes

- `completed_no_material_change`: research completed, but no candidate earned attention.
- `completed_dry_run`: candidate pack and decision report produced; repository evidence not changed.
- `completed_applied`: evidence update applied and checks passed; formal Issue adoption still awaits editor decisions.
- `needs_human_review`: at least one material candidate remains for Editor Review Game judgment.
- `blocked`: required evidence, access or contract inputs are unavailable; do not fabricate a substitute.
