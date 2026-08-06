# Update NewsFlow content

Execute the repository workflow `newsflow-content-update`.

1. Read `/skills/newsflow-recommender/SKILL.md`, `/WORKFLOW.md`, `/config/content-workflow.json` and all `required_inputs` in the manifest.
2. Declare the current `as_of` and coverage window in `Asia/Shanghai`.
3. Research both active channels and their Storylines using the registered source hierarchy, leader-company watchlists, CCUS report institutions and discovery-only X scouts.
4. Create `/content/inbox/<as-of>-antigravity.json` conforming to `/schemas/content-candidate-pack.schema.json` with:
   - `agent_id`: `antigravity`
   - `runtime`: `Google Antigravity`
   - the workflow ID and version from the manifest
5. Run the dry-run command from the manifest and inspect every decision.
6. Apply only when the operator explicitly requested repository updates; then run all verification commands.
7. Return one of the manifest's terminal outcomes and the complete handoff described in `/WORKFLOW.md`.

Do not invent missing evidence, approve a new source during the same run, promote an X post, fill a quota or directly edit generated datasets.
