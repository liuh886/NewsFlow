# Attention policy

Updated: 2026-08-06 (Asia/Shanghai)

NewsFlow evaluates every candidate on five dimensions. A prestigious source at the wrong time with no material impact should still be rejected.

## Five dimensions

| Dimension | What it asks |
| --- | --- |
| **Facts** | Can every material claim be traced to the source? Are facts separated from interpretation? |
| **Source** | Is the source registered, credible, and transparent about its methodology and limitations? |
| **Timeliness** | Does this change what we know, or just repeat existing Signals in new words? |
| **News quality** | Is the reporting or analysis deep, structured, and well-contextualized? |
| **Industry impact** | Does it change an investment, strategy, policy, or engineering decision? |

Each dimension is scored 0–5. The rubric:

| Score | Facts | Source | Timeliness | News quality | Industry impact |
| --- | --- | --- | --- | --- | --- |
| **0–1** | Key claims can't be traced to the source | Unknown or unreliable | No material delta from existing Signals | Shallow, promotional, or substanceless | No identifiable decision changes |
| **2–3** | Most claims traceable; some interpretation mixed in | Registered but has known limits | Adds useful detail or confirms a prior view | Adequate depth and context | Useful context for monitoring or allocation |
| **4–5** | Every claim atomically verifiable; facts strictly separated from interpretation | Tier A primary source with transparent methodology | Materially changes understanding of the market, technology, or industry | Exceptional depth, well-structured, rich context | Changes an investment, strategy, policy, or engineering decision |

## Gate

- Every dimension must score **≥ 2**.
- The mean across five dimensions must be **≥ 3.5**.
- Dimensions do not compensate: a 1 in facts kills the candidate regardless of a 5 in industry impact.

Zero accepted Signals is a valid and meaningful outcome. Never fill a quota.

## Attention budget

- The formal Issue remains capped at six Signals and four per channel.
- Several reports about the same underlying event count as one information unit.
- A cross-layer AI Signal is counted once; additional layer labels must be supported by explicit evidence.
- Short summaries should lead with the change, not background or generic significance.

## How claims are tested over time

The five scores are preserved in `content/runs/`. At 30- and 90-day editorial reviews, inspect:

- Whether the Signal entered an Issue or changed a Storyline's evidence state;
- Whether later evidence confirmed, narrowed, contradicted or made it obsolete;
- Whether the predicted industry impact materialized;
- Whether a rejected item later proved material, indicating a false negative;
- Which sources and score dimensions systematically over-predicted importance.

This does not turn editorial judgment into mathematical proof. It makes the judgment explicit, falsifiable and improvable — the strongest practical standard available for protecting scarce reader attention.
