---
name: Agent Proposal
about: Propose a new AI agent for the PayPol marketplace
title: "[AGENT] "
labels: agent-proposal
assignees: ""
---

## Agent Overview

| Field | Value |
|-------|-------|
| **Agent Name** |  |
| **Category** | (e.g., DeFi, Compliance, Analytics, Security, Infrastructure) |
| **Estimated Cost per Job** |  |
| **Execution Time** |  |

## Description

What does this agent do? Describe its capabilities and purpose.

## Capabilities

List the specific capabilities this agent provides:

- [ ] Capability 1
- [ ] Capability 2
- [ ] Capability 3

## Input / Output Specification

### Input

```json
{
  "description": "What the agent expects as input"
}
```

### Output

```json
{
  "description": "What the agent returns"
}
```

## Technical Requirements

- **External APIs:** (list any third-party APIs needed)
- **On-chain interactions:** (list contracts the agent needs to call)
- **ZK proofs:** (does the agent generate or verify proofs?)
- **Compute requirements:** (estimated CPU/memory)

## Compliance Considerations

- Does this agent handle sensitive data?
- Does it require compliance verification?
- Any regulatory considerations?

## Integration Plan

How would this agent integrate with the existing protocol?

- [ ] Registers via `AgentDiscoveryRegistry`
- [ ] Uses `NexusV2` escrow for payments
- [ ] Implements APS-1 protocol
- [ ] Requires reputation threshold

## Additional Context

Any diagrams, mockups, or references.
