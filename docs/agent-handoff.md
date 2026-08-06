# Running the same update with any agent

The repository owns the method; the agent supplies research and execution. Start the agent in the repository root and give it one of the following requests.

## Portable dry-run request

```text
Read WORKFLOW.md and run the newsflow-content-update workflow for the current Edition.
Identify yourself in run.actor and use the workflow ID and version from config/content-workflow.json.
Research the declared coverage window, create a schema-valid candidate pack, and run the deterministic dry-run.
Do not apply changes. Report the terminal outcome, evidence coverage, all decisions and uncertainties.
```

## Portable update request

```text
Read WORKFLOW.md and run the newsflow-content-update workflow for the current Edition.
I authorize promotion of candidates accepted by the deterministic validator.
Identify yourself in run.actor, create the candidate pack, inspect the dry-run, apply only accepted Signals, then run the repository checks and build.
Do not self-approve needs_review items. Report the audit path and validation results.
```

## Antigravity

Open the repository as an Antigravity workspace and invoke `/update-content`. Its project rule and workflow are thin adapters under `.agents/`; the source of truth remains `WORKFLOW.md`.

## Safe handoff between agents

Another agent may continue from a candidate pack in `content/inbox/` or an audit in `content/runs/`. It must preserve the original `run.actor`; any materially revised research should become a new pack with the new agent's identity and a new `as_of`. Agents never pass conclusions only: they pass the structured evidence artifact and let the same local validator decide.
