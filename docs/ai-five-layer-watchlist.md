# AI five-layer research framework

Updated: 2026-08-04 (Asia/Shanghai)

NewsFlow uses NVIDIA's five-layer model as an editorial taxonomy:

```text
Energy → Chips → Infrastructure → Models → Applications
```

The model is useful because it connects upstream physical supply to downstream economic value. It is not a source-quality shortcut and it does not make NVIDIA's forecasts or product claims independently verified evidence.

## Layer contract

| Layer | In scope | Primary evidence units | Reject or demote |
| --- | --- | --- | --- |
| Energy | Generation, grid connection, storage, power equipment, power quality and energy cost | MW/GW available by date, interconnection decision, contracted supply, delivered equipment, energy cost per useful output | Generic electricity news with no AI load connection; announced generation without delivery status |
| Chips | Accelerators, CPUs, HBM, networking silicon, foundry nodes, advanced packaging and custom ASICs | Shipped units or revenue, wafer/packaging capacity, production ramp, yield, supply contract, system-level cost/performance | Product launch without production or deployment consequences; design wins described as shipments |
| Infrastructure | AI factories, data centers, racks, servers, networks, storage, cooling, cloud capacity and orchestration | Commissioned capacity, utilization, uptime, financing close, rack/network delivery, cost per token or workload | Capital expenditure described as commissioned capacity; component peak performance described as fleet output |
| Models | Architecture, capability, efficiency, openness, training and inference methods | Training resources, inference cost, throughput/quality trade-off, deployment requirement, reproducible evaluation with resource data | Benchmark rank without resource or deployment implications; unverified capability demos |
| Applications | Enterprise software, agents, robotics, industrial and scientific AI | Production users, paid workload, revenue, task completion, defect rate, productivity, deployment scale, failure or rollback | Pilot announcements, user counts without activity, demos without production evidence, vague productivity claims |

## Cross-layer rule

An AI Signal may belong to more than one layer, but the relationship must be explicit. Examples:

- a power agreement belongs to Energy; it also belongs to Infrastructure only when it changes a named facility's delivery schedule or usable capacity;
- a new accelerator belongs to Chips; it also belongs to Infrastructure when rack, network, cooling or cloud deployment evidence is available;
- a model release belongs to Models only when it changes capability, resource demand, inference cost or deployability; it belongs to Applications only when production adoption is measured;
- application demand should be traced downward to model workload, infrastructure utilization, chip demand and energy consequences when evidence permits.

Do not collapse the five layers into one total-capacity number. Announced energy, chips, data-center capacity, model capability and application value are different states and units.

## Source coverage

### Energy

Use energy agencies, grid and regulatory records first, then named hyperscaler agreements and independent reporting. Track available capacity and delivery dates rather than broad electricity-demand narratives.

### Chips

Core corporate-primary entry points:

- [NVIDIA Investor Relations](https://investor.nvidia.com/) and [NVIDIA Newsroom](https://nvidianews.nvidia.com/);
- [TSMC Investor Relations](https://investor.tsmc.com/english) for foundry process, capacity and packaging disclosures;
- [AMD Investor Relations](https://ir.amd.com/) for accelerators, CPUs and rack-scale systems;
- [Broadcom Investor Relations](https://investors.broadcom.com/) for custom silicon and AI networking.

Company roadmaps and demand forecasts remain attributed self-reporting. Cross-check production, shipment and customer deployment claims wherever material.

### Infrastructure

Track NVIDIA and AMD systems, Microsoft/Azure, Google, Meta, data-center operators and power/cooling suppliers. The core test is whether components become commissioned, reliable, utilized capacity—not how much capital was announced.

### Models

Track frontier and efficient models only when the evidence changes training resources, inference economics, deployment constraints or the demand placed on lower layers. Model announcements should retain evaluation method, hardware, precision, batch size, context and quality assumptions when those affect comparisons.

### Applications

Track production adoption across enterprise agents, coding, industrial systems, science and robotics. Prefer customer or audited operating evidence over vendor case studies. Record both the value metric and the full cost of model inference, integration, human review and failures.

## Five questions for every AI candidate

1. Which layer changed, and what is the concrete new evidence?
2. Is the claim a target, contract, production ramp, commissioned asset, measured workload or realized outcome?
3. Does it create a verified constraint or demand signal for another layer?
4. Are the denominator, time window, geography, hardware and operating state comparable with existing evidence?
5. Does the evidence show end-to-end value, or only movement inside one layer?

It is valid to publish a strong single-layer Signal. It is not valid to imply that progress in one layer proves the full AI system is scaling successfully.
