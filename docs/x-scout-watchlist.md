# X scout watchlist

Updated: 2026-08-10 (Asia/Shanghai)

X is a **problem-discovery surface**, not a trusted evidence tier. Its main value is not merely breaking news: domain experts often identify a bottleneck, failure mode, engineering trade-off or market contradiction before it has a conventional headline. Posts cannot be promoted directly into a NewsFlow Signal.

The machine-readable fixed scout list, topic searches and bias notes live in `config/content-scouts.json`. High-signal long-form canonical sites are separately registered in `config/content-sources.json` so a complete specialist analysis can pass the normal Candidate gate when the argument itself is the material contribution.

## Two discovery modes

NewsFlow uses both:

1. **Fixed scouts** — a bounded rotation of people or institutions with a strong record of surfacing inspectable artifacts and useful questions.
2. **Topic search** — configured queries that discover unfamiliar people, new terminology and problems outside the existing network.

A fixed expert list can become an echo chamber even when every individual source is high quality, so permanent scouts are a high-signal seed network rather than a complete map of the field.

## Native-only X runtime

X discovery is executed only when the runtime has genuine X search/timeline access.

- `native_x` — execute the configured `native_query` set and bounded fixed-scout scan.
- `not_run` — X access is unavailable; do not simulate it with indexed web search, cached snippets or `site:x.com` queries. Continue through the registered long-form sources, primary records, institutional reports and independent media.

This keeps the collection record honest: a run either queried X or it did not. The long-form specialist network is intentionally capable of carrying problem discovery when X is unavailable.

## Core list by layer

### Energy and large-load integration

- [Jesse Jenkins — @JesseJenkins](https://x.com/JesseJenkins): power systems, grid expansion, energy modeling and policy implementation.
- [Tyler Norris — @tylerhnorris](https://x.com/tylerhnorris): large-load interconnection, data-center flexibility, power-system planning and electricity affordability. Long-form analysis: Power & Policy.

### Chips and infrastructure

- [Dylan Patel — @dylan522p](https://x.com/dylan522p): accelerators, HBM, packaging, networking, datacenter capacity and token economics.
- [SemiAnalysis — @SemiAnalysis_](https://x.com/SemiAnalysis_): institutional account for the same research organization.
- [Ian Cutress — @IanCutress](https://x.com/IanCutress): semiconductor architecture, HBM/DRAM, manufacturing, systems and technical interviews. Long-form analysis: More Than Moore.
- [Asianometry — @asianometry](https://x.com/asianometry): semiconductor manufacturing, Asian supply chains, industrial policy and industry history.
- [Chip Huyen — @chipro](https://x.com/chipro): production AI systems, inference and model deployment.

Dylan Patel and SemiAnalysis are one evidence family. Agreement between those two accounts is not independent confirmation.

### Models, evaluation and production engineering

- [Simon Willison — @simonw](https://x.com/simonw): model releases, tool use, licensing, implementation and security.
- [Nathan Lambert — @natolambert](https://x.com/natolambert): open models, post-training, RLHF and model transparency.
- [François Chollet — @fchollet](https://x.com/fchollet): evaluation, abstraction, generalization and capability limits.
- [Andrej Karpathy — @karpathy](https://x.com/karpathy): training, agentic software, AI coding and developer workflows.
- [Hamel Husain — @HamelHusain](https://x.com/HamelHusain): evals, product debugging, coding agents and production reliability.
- [Shreya Shankar — @sh_reya](https://x.com/sh_reya): LLM evaluation, AI data systems, cost-quality trade-offs and human-AI workflows.
- [Jason Liu — @jxnlco](https://x.com/jxnlco): applied AI engineering, RAG, agents, evals and production workflows. Current employer/investment conflicts must remain explicit.
- [Eugene Yan — @eugeneyan](https://x.com/eugeneyan): applied ML, recommendation systems, product engineering and evaluation.

### Applications and counter-evidence

- [Ethan Mollick — @emollick](https://x.com/emollick): workplace adoption, education and productivity experiments.
- [Arvind Narayanan — @random_walker](https://x.com/random_walker): measurement failure, exaggerated capability claims and social-impact evidence.

### CCUS projects, markets and policy

- [Global CCS Institute — @GlobalCCS](https://x.com/GlobalCCS): project pipeline, technology, policy, market development and regional trends. Treat Institute positions as stakeholder/industry context and follow them to full reports or project records.
- [IEAGHG — @IEAGHG](https://x.com/IEAGHG): technical reports, GHGT research, capture/transport/storage engineering, monitoring and techno-economics.
- [Clean Air Task Force — @cleanaircatf](https://x.com/cleanaircatf): industrial decarbonization, carbon-capture policy, storage and implementation barriers. CATF is an advocacy organization; preserve that attribution.
- [Wood Mackenzie — @WoodMackenzie](https://x.com/WoodMackenzie): CCUS investment, project economics, CO2 shipping, market formation and regional outlooks. Proprietary or paywalled model claims remain discovery material unless the supporting method is inspectable.
- [Carbon Brief — @CarbonBrief](https://x.com/CarbonBrief): climate-policy and scientific reporting useful for independent context and counter-evidence around CCS claims.

CCUS topic search is especially important because useful discussion is distributed across project developers, regulators, engineers, academics, lenders, climate-policy analysts and regional specialists rather than concentrated in a few universal commentators.

## Topic-search contract

Configured searches cover:

- AI energy and grid/equipment constraints;
- HBM, packaging and semiconductor bottlenecks;
- data-center operations, utilization, cooling, financing and TCO;
- model economics, task horizons, reliability and openness;
- enterprise adoption, productivity and workflow failure;
- CCUS project conversion, EPC, commissioning and operational performance;
- CCUS financing, tariffs, network utilization, cost and supply-chain capacity;
- CCUS permits, MRV, liability, cross-border rules and policy durability.

A native X topic-search result does **not** need to come from an allowlisted scout to be useful. It is a lead. If an unfamiliar account links to a credible paper, dataset, filing or project record, follow the artifact through the normal evidence gate. Do not automatically add that account to the permanent scout list.

## Discovery workflow

```text
Native X scout/topic query (when available) OR registered long-form source
  ↓
Question, claim or linked artifact?
  ├─ no  → context only; do not create a Candidate
  └─ yes → identify the intellectual contribution and open the linked artifact
                    ↓
       full text / data / filing / paper / code / report
                    ↓
          normal source and evidence gates
```

For every useful post:

1. Verify identity, timestamp and current affiliation or commercial interests when the author matters to the interpretation.
2. Record the exact new question or claim. The framing itself may be useful even when the factual claim later fails verification.
3. Follow links to the canonical artifact and access its complete text or data.
4. Search for independent confirmation and counter-evidence, especially for leaks, benchmarks, capacity estimates and product claims.
5. If the post merely points to a factual artifact, create a Candidate using the canonical artifact rather than the X URL.
6. If the important contribution is a longer registered specialist analysis, preserve the analyst's article as the Candidate source rather than erasing the argument behind a primary citation.

## Yield telemetry

When the runtime can observe the discovery path, record per-origin counts:

`lead → full-text review → Candidate`

for fixed scouts, X topic searches, specialist sources and other discovery surfaces. This is observation only. It is **not** a source-ranking score and must not trigger automatic promotion, demotion or removal from a small sample.

## Rejection rules

- Screenshots, quote-posts, anonymous threads, engagement counts and community notes are not evidence.
- A post saying “sources tell me” remains an unverified lead until a named record or independently reported confirmation exists.
- A thread split across replies must not be reconstructed from missing or inaccessible fragments.
- Deleted or edited posts require an archived copy plus corroboration; the archive proves what was posted, not whether it was true.
- Model impressions and demo videos do not establish benchmark performance or production adoption.
- Personal forecasts, investment views and employer/product advocacy must remain attributed.
- Two accounts from the same organization, paper, dataset or leak count as one evidence family.

## Maintenance

Review permanent scouts at least every 90 days. Remove or demote accounts that become inactive, repeatedly publish unsupported claims, obscure conflicts, rely mainly on reposts or stop linking to inspectable artifacts.

Do **not** optimize the list yet from a few runs of yield data. First accumulate which scouts, topic searches, Storylines and evidence surfaces were actually checked and which origins produced Candidates. Permanent scout changes remain explicit editorial decisions.
