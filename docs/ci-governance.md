# CI governance

NewsFlow begins with a repository contract, not a guessed production architecture.

## Current required check

`NewsFlow Repository Contract` is the only blocking workflow. It uses no project dependencies and verifies documentation and package-manager boundaries.

## Progressive gates

Add a gate only when the corresponding capability exists:

1. **Repository contract** — required now.
2. **Static/type checks and production build** — required when an application stack is committed.
3. **Unit and browser acceptance** — required when user-facing behavior exists.
4. **Data/provider evidence** — required when ingestion or persistence exists.
5. **Deployment and live-origin verification** — required only after a public runtime is selected.

## Package contract

When `package.json` is introduced:

- exactly one of `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock` or `bun.lockb` must be committed;
- scripts named `check` and `build` must be present and non-empty;
- CI should use the package manager implied by the committed lockfile;
- deployment permissions must remain outside pull-request validation.

No secret, external API or scheduled-ingestion dependency belongs in the baseline repository check.
