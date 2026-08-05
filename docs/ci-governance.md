# CI governance

NewsFlow uses progressive, capability-aware gates. The repository now contains an implemented static product, structured data payloads, a PWA shell and a GitHub Pages runtime, so validation has advanced beyond the original pre-implementation boundary.

## Required workflows

### NewsFlow Repository Contract

The baseline workflow verifies that the product boundary is coherent:

- required product, documentation, workflow and build files exist;
- exactly one recognized lockfile is committed;
- `check` and `build` scripts are present;
- the README identifies the implemented product, design system and deployment path.

This workflow remains read-only and repository-local.

### NewsFlow Frontend

The frontend workflow runs on pull requests and `main`:

1. install from the committed lockfile with `npm ci`;
2. validate JavaScript syntax, HTML references, structured news data, topic data, PWA metadata and critical responsive selectors;
3. produce a deterministic `dist/` artifact;
4. upload and deploy that artifact only for non-pull-request runs on `main`.

## Permission boundary

Pull-request validation does not deploy. Pages deployment is isolated to the dedicated workflow and uses only:

- `contents: read`
- `pages: write`
- `id-token: write`

No ingestion API key, model credential or external-service secret is required to validate or build the frontend.

## Agent content-update gates

Local content agents write temporary candidate packs rather than editing the public dataset. Repository checks validate the two Edition channels, Storyline routing, source registry, discovery plan, company-disclosure restrictions, duplicate rejection fixture and channel-aware Signal metadata. Formal application remains an explicit `content:update --apply` operation and writes an auditable run artifact.

## Package contract

- exactly one of `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock` or `bun.lockb` must be committed;
- scripts named `check` and `build` must remain non-empty and deterministic;
- `node_modules/` and `dist/` are generated locally or in CI and are never committed;
- source data used for acceptance checks must remain small, structured and provenance-aware.

## Next progressive gates

Browser screenshot regression and live-origin smoke tests may be added when they can run reliably without turning visual iteration into a brittle blocking gate. News ingestion and model-quality checks remain separate from the frontend deployment contract.
