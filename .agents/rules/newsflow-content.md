# NewsFlow content rule

For every research or content-update request in this repository:

1. Read and follow `/WORKFLOW.md` as the canonical procedure.
2. Read `/config/content-workflow.json` for the machine contract and current workflow version.
3. Produce only the candidate-pack exchange format defined by `/schemas/content-candidate-pack.schema.json`.
4. Set `run.actor.agent_id` to `antigravity` and identify the actual runtime in `run.actor.runtime`.
5. Treat this file as an adapter. It must not override the Edition, trust policy, attention gate, source registry or deterministic validator.
6. Never run the apply command unless the operator explicitly authorized repository updates.
