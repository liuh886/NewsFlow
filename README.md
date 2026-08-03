# NewsFlow

NewsFlow is an upcoming product for turning high-volume news streams into a focused, reviewable information flow.

## Status

The repository is intentionally in **pre-implementation** status. Product scope, runtime, storage and deployment architecture have not yet been frozen. It therefore starts with a minimal governance contract rather than a speculative application stack.

## Development boundary

- Changes should be proposed through pull requests.
- CI remains deterministic, read-only and repository-local.
- External services, secrets, scheduled ingestion and deployment are added only when the corresponding product capability exists.
- A JavaScript or TypeScript implementation must commit exactly one recognized lockfile and expose `check` and `build` scripts.
- Browser, database and end-to-end gates belong to later capability-specific stages.

See `docs/ci-governance.md` for the enforceable repository contract.

## First product milestone

Before implementation expands, define the user and decision workflow, source-ingestion boundary, evidence/provenance requirements, local-versus-cloud ownership, and the smallest deployable vertical slice.
