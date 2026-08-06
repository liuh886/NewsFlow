# X scout watchlist

Updated: 2026-08-04 (Asia/Shanghai)

X is a discovery surface, not a trusted evidence tier. The accounts below are monitored because they frequently surface useful technical changes, original artifacts, practitioner failures or counter-evidence early. Their posts cannot be promoted directly into a NewsFlow Signal.

The machine-readable allowlist and bias notes live in `config/content-scouts.json`.

## Core list by layer

### Energy

- [Jesse Jenkins — @JesseJenkins](https://x.com/JesseJenkins): power systems, grid expansion, energy modeling and policy implementation.

### Chips and infrastructure

- [Dylan Patel — @dylan522p](https://x.com/dylan522p): accelerators, HBM, packaging, networking, datacenter capacity and token economics.
- [SemiAnalysis — @SemiAnalysis_](https://x.com/SemiAnalysis_): institutional account for the same research organization.
- [Chip Huyen — @chipro](https://x.com/chipro): production AI systems, inference and model deployment.

Dylan Patel and SemiAnalysis are one evidence family. Agreement between those two accounts is not independent confirmation.

### Models

- [Simon Willison — @simonw](https://x.com/simonw): model releases, tool use, licensing, implementation and security.
- [Nathan Lambert — @natolambert](https://x.com/natolambert): open models, post-training, RLHF and model transparency.
- [François Chollet — @fchollet](https://x.com/fchollet): evaluation, abstraction, generalization and capability limits.
- [Andrej Karpathy — @karpathy](https://x.com/karpathy): training, agentic software, AI coding and developer workflows.

### Applications, evaluation and counter-evidence

- [Hamel Husain — @HamelHusain](https://x.com/HamelHusain): evals, product debugging, coding agents and production reliability.
- [Eugene Yan — @eugeneyan](https://x.com/eugeneyan): applied ML, recommendation systems, product engineering and evaluation.
- [Ethan Mollick — @emollick](https://x.com/emollick): workplace adoption, education and productivity experiments.
- [Arvind Narayanan — @random_walker](https://x.com/random_walker): measurement failure, exaggerated capability claims and social-impact evidence.

## Discovery workflow

```text
X post
  ↓ identity, timestamp and disclosure check
Concrete claim or linked artifact?
  ├─ no  → context only; do not create a candidate
  └─ yes → open the paper, repository, benchmark, filing, blog or official release
                    ↓
             normal source and evidence gates
```

For every useful post:

1. Verify the handle against the allowlist and recheck the person's current affiliation or commercial interests.
2. Record the exact new claim, but do not paraphrase beyond what the post says.
3. Follow links to the canonical artifact and access its complete text or data.
4. Search for independent confirmation and counter-evidence, especially for leaks, benchmarks, capacity estimates and product claims.
5. Create a candidate using the canonical URL—not the X URL.

## Rejection rules

- Screenshots, quote-posts, anonymous threads, engagement counts and community notes are not evidence.
- A post saying “sources tell me” remains an unverified lead until a named record or independently reported confirmation exists.
- A thread split across replies must not be reconstructed from missing or inaccessible fragments.
- Deleted or edited posts require an archived copy plus corroboration; the archive proves what was posted, not whether it was true.
- Model impressions and demo videos do not establish benchmark performance or production adoption.
- Personal forecasts, investment views and employer/product advocacy must remain attributed.
- Two accounts from the same organization, paper, dataset or leak count as one evidence family.

## Maintenance

Review the list at least every 90 days. Remove or demote accounts that become inactive, repeatedly publish unsupported claims, obscure conflicts, rely mainly on reposts or stop linking to inspectable artifacts. New accounts are proposed outside a content run and never self-approved by the researching Agent.
