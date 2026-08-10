# AI five-layer research framework

Updated: 2026-08-10 (Asia/Shanghai)

NewsFlow uses the five-layer model as its vertical editorial taxonomy:

```text
Energy → Chips → Infrastructure → Models → Applications
```

The five layers answer **where** a change occurs. They are not sufficient on their own to answer whether the whole system is becoming more valuable or more constrained. Every serious research pass therefore also applies the horizontal lenses defined in `public/data/edition.json`:

```text
Capacity realism | Economics & capital | Bottleneck migration
Demand & utilisation | Regional & policy divergence | Substitution & falsification
```

The model is a taxonomy, not a source-quality shortcut. No vendor forecast or product claim becomes independent evidence merely because it fits a layer.

## Layer contract

| Layer | Long-horizon question | Primary evidence units | Reject or demote |
| --- | --- | --- | --- |
| Energy | Can generation, grid, equipment, siting and power economics keep pace with real AI load? | MW/GW by stage, energized load, interconnection decision, contracted supply, delivered equipment, queue attrition, energy cost per useful output | Generic electricity news; announced generation without delivery status; queue MW treated as live load |
| Chips | Can logic, memory, packaging, networking and semiconductor equipment deliver the required system capacity at acceptable cost? | Shipped units/revenue, wafer and packaging output, HBM qualification/production, yield, equipment orders, supply contract, system-level cost/performance | Product launch without production consequences; samples or design wins described as shipments |
| Infrastructure | Do chips become commissioned, reliable, utilized and financeable AI factories? | Commissioned capacity, server installation, utilization, uptime, financing close, lease/precommit, rack/network delivery, cloud price and TCO | Capex described as commissioned capacity; building shell described as usable compute; component peak performance described as fleet output |
| Models | Does capability improve faster than training, inference, deployment and governance cost? | Training resources, inference cost, price/performance, task horizon, reliability, deployment controls, reproducible evaluation with resource data | Benchmark rank without deployment/resource implications; demos; capability claims with no cost or reliability denominator |
| Applications | Does AI become paid, retained and productive work rather than pilots and demos? | Paid workload, revenue, retention, task completion, productivity, defect/error rate, human-review cost, production scale, rollback | Pilot announcements, logo lists, user counts without activity, vague productivity claims |

## Cross-cutting lenses

### 1. Capacity realism

For any capacity claim, identify the stage explicitly:

```text
announced → contracted/ordered → financed → under construction → commissioned → utilized
```

Never collapse these states. The gap between them is itself evidence.

### 2. Economics and capital

Track not only the asset but who funds it, on what terms and with what return logic:

- capex and depreciation;
- debt, leases and project finance;
- cloud/API pricing and customer commitments;
- unit economics such as cost per token, task or useful output;
- risk allocation between hyperscaler, utility, landlord, vendor and customer.

### 3. Bottleneck migration

A solved constraint often moves elsewhere. Look deliberately for sequences such as:

```text
GPU shortage → HBM/packaging → networking → power → grid connection → utilization → application demand
```

A Signal is especially valuable when it proves that the limiting factor has moved.

### 4. Demand and utilisation

Upstream supply is not end demand. Seek contracted load, paid usage, retained workloads, utilization, productivity and customer economics. Ask whether demand is broad or concentrated in a few hyperscalers or flagship customers.

### 5. Regional and policy divergence

Track why the same technology scales differently by region: power price, interconnection, industrial policy, export controls, permitting, water/land constraints, supply-chain location and sovereign requirements.

### 6. Substitution and falsification

Search for evidence that makes the bullish or constrained thesis wrong: efficiency gains, lower-cost architectures, small models, custom silicon, delayed demand, overcapacity, policy reversals, project cancellations and poor production reliability.

## Evidence-surface rotation

A normal run does not need every URL. It does need more than one **kind** of evidence. Rotate across:

- regulators, system operators and official planning records;
- filings, earnings and company technical disclosures;
- datasets and reproducible benchmarks;
- engineering/procurement signals such as equipment orders, lead times and delivery milestones;
- specialist blogs and X problem discovery;
- field experiments, postmortems and failure reports;
- independent reporting.

The weekly deep review should revisit all six horizontal lenses and deliberately inspect a surface that produced no headline during routine runs.

## Cross-layer rule

An AI Signal may belong to more than one layer, but the relationship must be explicit. Examples:

- a power agreement belongs to Energy; it also belongs to Infrastructure only when it changes a named facility's delivery schedule or usable capacity;
- a new accelerator belongs to Chips; it also belongs to Infrastructure when rack, network, cooling or cloud deployment evidence is available;
- a model release belongs to Models only when it changes capability, resource demand, inference cost or deployability; it belongs to Applications only when production adoption is measured;
- application demand should be traced downward to model workload, infrastructure utilization, chip demand and energy consequences when evidence permits.

Do not collapse the five layers into one total-capacity number. Announced energy, chips, data-center capacity, model capability and application value are different states and units.

## Source coverage

### Energy

Use energy agencies, grid and regulatory records, utility/system-operator plans, named hyperscaler agreements, equipment suppliers, specialist power-system analysis and independent reporting. Track queue attrition, energized load, equipment lead times, land/water permitting and cost allocation—not just broad electricity-demand narratives.

### Chips

Core corporate-primary entry points include NVIDIA, TSMC, AMD, Broadcom, Micron, SK hynix and Samsung semiconductor disclosures. Pair these with technical analysis and evidence from semiconductor equipment, packaging, memory qualification and customer deployment.

Company roadmaps and demand forecasts remain attributed self-reporting. Cross-check production, shipment and customer deployment claims wherever material.

### Infrastructure

Track hyperscalers, systems vendors, data-center projects, power/cooling suppliers, financing structures and operational evidence. The core test is whether components become commissioned, reliable, utilized capacity—not how much capital was announced.

### Models

Track frontier and efficient models only when evidence changes training resources, inference economics, task reliability, deployment constraints or the demand placed on lower layers. Preserve hardware, precision, context, quality, task duration and cost assumptions when they affect comparisons.

### Applications

Track production adoption across enterprise agents, coding, industrial systems, science and robotics. Prefer measured workload, retention, revenue, field experiments and operating evidence over vendor case studies. Record both the value metric and the full cost of inference, integration, human review and failures.

## Questions for every AI candidate

1. Which layer changed, and what is the concrete new evidence?
2. Which horizontal lens makes the change material?
3. Is the claim a target, queue entry, contract, production ramp, commissioned asset, measured workload or realized outcome?
4. Does it create, remove or move a verified constraint into another layer?
5. Are denominator, time window, geography, hardware and operating state comparable with existing evidence?
6. What demand or utilization evidence exists downstream?
7. What evidence would falsify the interpretation?
8. Does the evidence show end-to-end value, or only movement inside one layer?

It is valid to publish a strong single-layer Signal. It is not valid to imply that progress in one layer proves the full AI system is scaling successfully.
