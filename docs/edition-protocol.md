# NewsFlow Edition Protocol

## 1. Product definition

NewsFlow is a GitHub-native publishing system with a private editorial workflow.

The reference governance rule is:

> **Machines collect. Editors advise. The Editor-in-Chief decides. Readers see only adopted publication content.**

The Edition is the written editorial constitution; the Editor-in-Chief is the only human authority allowed to change it or decide public adoption.

## 2. Strong chief-editor model

NewsFlow deliberately separates evidence processing from publication authority:

- automated workflows discover, validate, score and route evidence into private Candidates;
- Editors independently review Candidates and produce advisory five-state opinions;
- only the Editor-in-Chief can issue a final publication decision;
- only chief `cover_story` / `accept` decisions become public adoption;
- automated workflows never silently rewrite the Edition or a Storyline's chief `current_view`;
- only an audited chief governance publication committed back to GitHub changes canonical editorial judgment.

No quality score, majority vote or recommendation algorithm can substitute for the chief.

## 3. GitHub + Supabase operating model

### GitHub is canonical publication state

GitHub provides:

- version history for Edition, Storylines and trusted-source policy;
- durable public Signal and Issue artifacts;
- scheduled validation/synchronization with GitHub Actions;
- static Reader publication through GitHub Pages.

Canonical files include:

- `public/data/edition.json`;
- `public/data/storylines.json`;
- `config/content-sources.json`;
- `public/data/news.json`;
- `public/data/issues.json`.

`public/data/edition.json` is the single Edition authority. The duplicate YAML source is retired.

### Supabase is private workflow state

Supabase stores:

- authenticated editorial membership;
- private Candidate payloads;
- normalized Editor/Chief reviews;
- minimal chief adoption projection;
- chief governance drafts/publication queue.

RLS prevents Readers from accessing private editorial data. Service-role credentials exist only in server-side GitHub Actions.

## 4. Core objects

### Edition

The editorial constitution: reader promise, editorial view, scope, materiality, publishing cadence, writing rules and Storyline definitions.

### Candidate

A private manuscript that passed enough deterministic preflight to deserve editorial judgment. Collection/preflight can create a Candidate but cannot create a public Signal.

### Editorial review

One five-state opinion/decision per editorial member and Candidate:

`cover_story | accept | minor_revision | major_revision | reject`

For an Editor it is advisory. For the Editor-in-Chief it is final editorial judgment.

### Signal

A public evidence/article unit. A Candidate becomes a public Signal only after chief Cover/Accept adoption.

### Storyline

A persistent editorial question with chief current view, watch items, falsifiers and evidence movement across cycles.

### Issue

A frozen formal artifact produced on the 1st and 15th from eligible chief-adopted Signals in the coverage window.

### Archive

The chronological record of Issues, cutoffs and editorial movement.

## 5. Publication lifecycle

```text
research
  → candidate pack
  → deterministic preflight
  → private Candidate
  → Editor advisory reviews
  → Editor-in-Chief final review
      ├─ revision/reject → private
      └─ cover/accept → adoption
            → Reader Latest
            → 1st/15th Issue freeze
            → Archive
```

The public Reader site never exposes unpublished Candidate packets or review votes.

## 6. Continuous publication vs formal Issues

Chief-adopted Signals can enter Reader **最新** between formal publication dates. This gives NewsFlow a continuous web publication surface while preserving fixed Issue cadence.

Formal Issues run at 09:15 Asia/Shanghai:

- 1st: previous month 16th through month-end;
- 15th: current month 1st through 14th.

The schedule is fixed; Issue length is not. A no-change Issue is valid.

## 7. Edition responsibilities

The canonical Edition must define:

1. `reader_promise`;
2. `editorial_view`;
3. `scope.include` / `scope.exclude`;
4. source-policy principles;
5. `materiality`;
6. long-running `storylines`;
7. `publishing` cadence;
8. `writing` rules;
9. subject `channels`.

The chief can edit reader promise, editorial view and core questions in Publication Settings. Existing active Storylines can be edited independently for question/current view/watch/falsifiers.

Source-level operational policy lives in `config/content-sources.json` so individual source domains, routing, allowed uses and limitations remain explicit and auditable.

## 8. Trusted-source governance

A source entry may define:

- stable ID;
- name/domain/path scope;
- class/tier;
- allowed Sections and Storylines;
- allowed uses;
- limitations;
- report/stakeholder metadata where relevant.

The chief may edit/add sources online, but a browser write only creates a private governance draft/publication row. GitHub Actions validates and commits the canonical source file; the browser never receives a GitHub credential.

Company pages are attributable primary evidence about the company, not independent market verification. Targets, contracted capacity, construction, commissioning and operating results remain distinct states.

## 9. Storyline governance

A Storyline's `current_view` is an explicit chief judgment. Evidence may be tagged as strengthening, weakening or complicating it, but automation cannot rewrite that field.

Chief-editable Storyline fields include:

- title;
- research question;
- current view;
- watch items;
- falsifiers.

This is the formal place for the publication's evolving long-term interpretation.

## 10. Issue contract

Every published Issue records:

- issue number and coverage period;
- publication time/Edition version;
- central judgment;
- adopted Signal IDs;
- optional `cover_signal_id`;
- Storyline movement;
- next-watch items;
- candidate/selected/source counts;
- whether the formal editorial view changed;
- publication provenance.

The compiler can synthesize evidence movement but never invent chief adoption or change the Edition worldview.

## 11. Trust rules

- Facts, provenance and editorial interpretation remain distinguishable.
- Original sources remain reachable.
- Candidate/review data is private.
- A stale dataset is never described as current.
- Lack of material change is valid.
- Source tiers/quality scores do not imply independent verification.
- Chief authority is explicit and auditable.
- Browser assets never contain GitHub/service-role credentials.

## 12. Forking

A fork becomes a different publication by changing its canonical Edition/Storylines/source policy, not by duplicating the frontend engine.

Minimal canonical layout:

```text
edition-repository/
├── public/data/edition.json
├── public/data/storylines.json
├── public/data/news.json
├── public/data/issues.json
├── config/content-sources.json
├── supabase/newsflow-editorial.sql
├── scripts/publish-edition.mjs
└── .github/workflows/
```

GitHub history is the human-readable audit trail; a duplicate YAML authority is unnecessary.
