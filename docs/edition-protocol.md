# NewsFlow Edition Protocol

## 1. Product definition

NewsFlow is a GitHub-native autonomous publishing system. An editor writes an Edition file that defines how a publication observes a domain. The repository then keeps a continuous Editorial Desk and automatically compiles a formal issue twice each month.

The Edition—not the account, interface, model or schedule—is the editorial authority.

## 2. Strong-editor model

NewsFlow intentionally uses a strong-editor model:

- the Edition file states the reader promise, scope, current editorial view, source policy, long-running storylines and materiality rules;
- automated workflows may collect evidence, reject low-value candidates, connect signals to storylines and describe whether new evidence strengthens, weakens or complicates an existing view;
- automated workflows must not silently rewrite the editor's position;
- only a committed change to the Edition file changes the publication's formal editorial view.

This creates a visible boundary between evidence processing and editorial authority.

## 3. GitHub-first operating model

NewsFlow does not require an additional account, certification or publication marketplace in its first stage.

GitHub provides:

- version history for the Edition file;
- reviewable changes through pull requests;
- scheduled execution through GitHub Actions;
- durable issue artifacts committed to the repository;
- forkability for people who want to create a different editorial system;
- static publication through GitHub Pages.

Technically, anyone can fork the protocol. The official NewsFlow interface remains a deliberately small shelf of editor-selected Editions rather than an unmoderated directory.

## 4. Core objects

### Edition

The executable editorial constitution. It defines the publication's identity and rules.

### Signal

A traceable unit of new evidence. A Signal is not automatically an article in a formal issue.

### Editorial Desk

The continuously updated working surface. It exposes material signals after collection, normalization, deduplication and source assessment.

### Storyline

A persistent question or thesis that accumulates evidence across many publication cycles.

### Issue

A frozen publication artifact produced on the 1st and 15th of each month. An Issue is a cognitive settlement of the period, not a ranked list of links.

### Archive

The chronological record of Issues, data cutoffs and editorial movement.

## 5. Automatic semi-monthly publication

The reference workflow runs at 09:15 Asia/Shanghai on the 1st and 15th of each month.

- The 1st covers the 16th through the final day of the previous month.
- The 15th covers the 1st through the 14th of the current month.
- The schedule is fixed.
- The length is not fixed.
- When no candidate reaches the Edition's materiality threshold, the workflow still publishes a short no-material-change issue.

A stable rhythm builds reader trust. Refusing to pad an issue protects editorial quality.

## 6. Edition file responsibilities

An Edition file must define:

1. `reader_promise` — what a reader should become capable of judging through continued reading;
2. `editorial_view` — the editor's current explicit interpretation of the field;
3. `scope.include` and `scope.exclude` — hard editorial boundaries;
4. `source_policy` — what each source class is suitable for and what must be rejected;
5. `materiality` — what qualifies as a formal signal;
6. `storylines` — persistent questions with stable identifiers and matching vocabulary;
7. `publishing` — Desk and Issue cadence;
8. `writing` — tone and evidence/interpretation separation.

Keywords are discovery aids, not the editorial model.

## 7. Issue contract

Every published Issue records:

- issue number and coverage period;
- publication time and Edition version;
- central judgment;
- adopted Signal IDs;
- Storyline movement;
- next-watch items;
- candidate, selected and primary-source counts;
- whether the formal editorial view changed;
- whether the artifact was generated automatically.

The current deterministic compiler is deliberately conservative: it can record new evidence and publish on schedule, but it never claims to have changed the editor's worldview. A future model-backed Agent may improve synthesis while preserving this boundary.

## 8. Trust rules

- Facts, source metadata and editorial interpretation must remain distinguishable.
- Original sources must remain directly reachable.
- Repository payloads and fallback content remain mutually exclusive.
- A stale dataset must never be described as current.
- Automated publication must expose its data cutoff and method.
- Lack of material change is a valid editorial result.
- The interface must not imply independent fact verification merely because a source tier or quality score exists.

## 9. Forking an Edition

A fork should change the Edition file rather than duplicate the frontend engine. A fork becomes a genuinely different publication when it changes its reader promise, scope, source policy, storylines, materiality or editorial view.

Recommended repository layout:

```text
edition-repository/
├── edition.yaml
├── public/data/edition.json
├── public/data/news.json
├── public/data/storylines.json
├── public/data/issues.json
├── scripts/publish-edition.mjs
└── .github/workflows/publish-edition.yml
```

The YAML file is the human-maintained source. JSON is the runtime projection consumed by the static frontend.
