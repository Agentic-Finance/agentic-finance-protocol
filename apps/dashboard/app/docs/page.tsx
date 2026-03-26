'use client';

import React, { useState } from 'react';

const DOCS_SECTIONS = [
    {
        id: 'overview',
        title: 'Overview',
        icon: '🏛️',
        content: `
## What is Agentic Finance?

**The Economy Runs on Trust. We Built It for Machines.**

Agentic Finance is trust infrastructure for autonomous commerce. We provide three capabilities no other protocol offers:

1. **ZK Compliance Proofs** — Agents prove OFAC non-membership and AML compliance without revealing identity or transaction details
2. **ZK Agent Reputation** — Anonymous credit scores for AI agents, verifiable on-chain
3. **Multi-Protocol Payments** — Unified SDK for x402, MPP, and direct transfers

### Architecture

| Layer | Components |
|-------|-----------|
| **Application** | Dashboard, MCP Server, REST API, Agent SDK |
| **Trust** | ZK Compliance, ZK Reputation, Agent Discovery |
| **Protocol** | MPP Gateway, Proof Chaining, Escrow, Streams |
| **Settlement** | Tempo L1 (Chain 42431), ShieldVault, Multisend |

### Chain Info

- **Network**: Tempo Moderato (Testnet)
- **Chain ID**: 42431
- **RPC**: \`https://rpc.moderato.tempo.xyz\`
- **Token**: AlphaUSD (\`0x20c0000000000000000000000000000000000001\`)
        `
    },
    {
        id: 'quickstart',
        title: 'Quick Start',
        icon: '🚀',
        content: `
## Quick Start

### Install SDK

\`\`\`bash
npm install @agtfi/sdk
\`\`\`

### Check Agent Compliance

\`\`\`typescript
import { ZKPrivacy } from '@agtfi/sdk';

const zk = new ZKPrivacy({
    rpcUrl: 'https://rpc.moderato.tempo.xyz',
    complianceRegistry: '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14',
    reputationRegistry: '0xF3296984cb8785Ab236322658c13051801E58875',
});

// Check if an agent is compliant
const isCompliant = await zk.isCompliant(commitment);

// Check agent reputation
const meetsReqs = await zk.meetsRequirements(agentCommitment, 10, 50000_000000);
\`\`\`

### Agent Wallet

\`\`\`typescript
import { AgentWallet } from '@agtfi/sdk';

const wallet = new AgentWallet({
    privateKey: process.env.AGENT_PRIVATE_KEY,
});

// Transfer tokens
await wallet.transfer('0x...', '100');

// Check balance
const balance = await wallet.getBalance();
\`\`\`

### MCP Server (for Claude Code / Cursor)

\`\`\`bash
npx @agtfi/mcp-server
\`\`\`

10 tools available: \`pay\`, \`get-balance\`, \`deploy-token\`, \`create-escrow\`, \`shield-payment\`, \`check-compliance\`, \`get-reputation\`, \`create-stream\`, \`create-payment-link\`, \`discover-agents\`
        `
    },
    {
        id: 'contracts',
        title: 'Contracts',
        icon: '📜',
        content: `
## Smart Contracts

All contracts deployed on **Tempo Moderato** (Chain 42431).

### Core Infrastructure

| Contract | Address |
|----------|---------|
| ShieldVaultV2 | \`0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055\` |
| NexusV2 (Escrow) | \`0x6A467Cd4156093bB528e448C04366586a1052Fab\` |
| MultisendV2 | \`0x25f4d3f12C579002681a52821F3a6251c46D4575\` |
| StreamV1 | \`0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C\` |
| BatchShieldExecutor | \`0xBc7dF45b15739c41c3223b1B794A73d793A65Ea2\` |
| AIProofRegistry | \`0x8fDB8E871c9eaF2955009566F41490Bbb128a014\` |

### Trust Layer

| Contract | Address |
|----------|---------|
| ComplianceVerifier | \`0x4896f5797b59CC8EE5e942eBd0Ed6772af9131fF\` |
| ComplianceRegistry | \`0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14\` |
| ReputationVerifier | \`0x2e2C368afB20810AadA9e6BB2Fb51002614F7Da4\` |
| ReputationRegistry | \`0xF3296984cb8785Ab236322658c13051801E58875\` |
| MPPComplianceGateway | \`0x5F68F2A17a28b06A02A649cade5a666C49cb6B6d\` |
| AgentDiscoveryRegistry | \`0x74D79e0AEd3CF9aE9A325558940bB1c8fB8CeA47\` |
| ProofChainSettlement | \`0x0ED1D5cFDe33f05Ce377cB6e9a0A23570255060D\` |

### Source Code

All contracts are open source: [GitHub](https://github.com/Agentic-Finance/agentic-finance-protocol/tree/main/packages/contracts/src)
        `
    },
    {
        id: 'zk-circuits',
        title: 'ZK Circuits',
        icon: '🔐',
        content: `
## ZK Circuits

Built with Circom V2 + snarkjs. All proofs use PLONK (no trusted setup).

### ZK Compliance (\`agtfi_compliance.circom\`)

Proves three things without revealing private data:

- **OFAC Non-Membership**: Address not on sanctions list (SMT, 20 levels)
- **Amount Range**: Transaction < AML threshold
- **Volume Range**: 30-day cumulative < reporting threshold

| Metric | Value |
|--------|-------|
| Constraints | 13,591 |
| Proof Time | ~15 seconds |
| Verification | ~17ms |

### ZK Reputation (\`agtfi_reputation.circom\`)

Anonymous credit score for AI agents:

- Tx count >= minimum (without revealing exact count)
- Volume >= minimum (without revealing exact volume)
- Disputes == 0 (without revealing any transaction)

| Metric | Value |
|--------|-------|
| Constraints | 41,265 |
| Proof Time | ~29 seconds |
| Max Claims | 32 per proof |

### Proof Chaining (\`agtfi_proof_chain.circom\`)

Incremental proof chaining for micropayments:

- 16 payments per batch
- Each proof validates all previous proofs
- 90%+ gas savings vs individual verification
        `
    },
    {
        id: 'sdk',
        title: 'SDK Reference',
        icon: '📦',
        content: `
## SDK Reference

### ZKPrivacy

\`\`\`typescript
import { ZKPrivacy } from '@agtfi/sdk';

const zk = new ZKPrivacy(config);
\`\`\`

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| \`isCompliant(commitment)\` | \`boolean\` | Check compliance status |
| \`meetsRequirements(commitment, txCount, volume)\` | \`boolean\` | Check reputation |
| \`getComplianceParams()\` | \`object\` | Get current thresholds |
| \`getReputation(commitment)\` | \`object\` | Full reputation details |
| \`getStats()\` | \`object\` | Registry-wide statistics |

### AgentWallet

\`\`\`typescript
import { AgentWallet } from '@agtfi/sdk';

const wallet = new AgentWallet({ privateKey });
\`\`\`

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| \`address\` | \`string\` | Wallet address |
| \`getStatus()\` | \`WalletStatus\` | Full wallet status |
| \`getBalance()\` | \`string\` | Token balance |
| \`transfer(to, amount)\` | \`PaymentReceipt\` | Send tokens |
| \`createSession(options)\` | \`string\` | Create MPP session |
| \`checkCompliance()\` | \`boolean\` | Check own compliance |

### Compliance Middleware

\`\`\`typescript
import { complianceMiddleware } from '@agtfi/sdk';

app.use('/api', complianceMiddleware({
    registryAddress: '0x85F6...',
    rpcUrl: 'https://rpc.moderato.tempo.xyz',
    requireReputation: true,
    minTxCount: 10,
    minVolume: 50000_000000,
    cacheTtl: 300,
}));
\`\`\`

**Headers added to 402 responses:**

| Header | Description |
|--------|-------------|
| \`X-Compliance-Required\` | \`true\` if compliance needed |
| \`X-Compliance-Registry\` | Contract address |
| \`X-Compliance-Chain\` | Chain ID (42431) |
| \`X-Reputation-Required\` | \`true\` if reputation needed |
| \`X-Reputation-Min-Tx\` | Minimum tx count |
| \`X-Reputation-Min-Volume\` | Minimum volume |
        `
    },
    {
        id: 'gateway',
        title: 'Agent Gateway',
        icon: '🌐',
        content: `
## Universal Agent Gateway

One SDK. Every payment rail. Zero configuration.

\`\`\`typescript
import { AgentGateway } from '@agtfi/sdk';

const gw = new AgentGateway({ privateKey: '0x...' });

// Direct payment — auto-selects optimal rail
await gw.pay('0xRecipient', '100');

// Batch payment — multiple recipients, 1 transaction
await gw.batchPay([
    { address: '0xAlice', amount: '100' },
    { address: '0xBob', amount: '200' },
]);

// Escrow — trustless with dispute resolution
await gw.escrow('0xWorker', '500', {
    judge: '0xJudge',
    deadline: 7 * 86400,
});

// Stream — per-second accrual
await gw.stream('0xWorker', '1000', {
    duration: 30 * 24 * 3600,
});
\`\`\`

**Supported Rails:**

| Rail | Use Case | Contract |
|------|----------|----------|
| \`direct\` | Simple token transfer | ERC20.transfer() |
| \`shielded\` | ZK private payment | ShieldVaultV2 |
| \`multisend\` | Batch to N recipients | MultisendV2 |
| \`escrow\` | Trustless with dispute | NexusV2 |
| \`stream\` | Per-second streaming | StreamV1 |

### Agent App Store API

Developers publish and monetize agents:

\`\`\`bash
# List agents
GET /api/agent-store?action=list&category=escrow&sort=popular

# Developer earnings
GET /api/agent-store?action=stats&owner=0x33F7...

# Publish new agent
POST /api/agent-store
{ "action": "publish", "name": "My Agent", "category": "analytics", ... }
\`\`\`

Revenue split: **95% developer / 5% platform**

### Autonomous Operations

Agents run 24/7 with budget management:

\`\`\`bash
# Create autonomous task
POST /api/autonomous-ops
{
    "action": "create",
    "agentId": "contract-auditor",
    "goal": "Monitor contract for anomalies",
    "budget": 500,
    "duration": 2592000
}

# Pause/Resume/Stop
POST /api/autonomous-ops  { "action": "pause", "opId": "op_..." }
\`\`\`

Auto-pause when budget reaches 95%. Spending logs with timestamps.

### Sanctions Oracle

Production OFAC compliance with real sanctions data:

- **87 real sanctioned ETH addresses** from OFAC SDN list
- Auto-updated nightly from official source
- Builds Sparse Merkle Tree with Poseidon hashing
- Publishes root to ComplianceRegistry on-chain
- Tested: Tornado Cash = sanctioned, clean wallets = clear
        `
    },
    {
        id: 'mcp-server',
        title: 'MCP Server',
        icon: '🤖',
        content: `
## MCP Payment Server

Enable any MCP-compatible AI agent (Claude Code, Cursor, etc.) to make payments.

### Setup

\`\`\`bash
npx @agtfi/mcp-server
\`\`\`

Or add to your MCP config:

\`\`\`json
{
    "mcpServers": {
        "agtfi": {
            "command": "npx",
            "args": ["@agtfi/mcp-server"],
            "env": {
                "AGTFI_PRIVATE_KEY": "0x...",
                "AGTFI_RPC_URL": "https://rpc.moderato.tempo.xyz"
            }
        }
    }
}
\`\`\`

### Available Tools

| Tool | Description |
|------|-------------|
| \`pay\` | Send tokens to an address |
| \`get-balance\` | Check wallet balance |
| \`deploy-token\` | Deploy a new ERC-20 token |
| \`create-escrow\` | Create a trustless escrow job |
| \`shield-payment\` | ZK-shielded private payment |
| \`check-compliance\` | Verify compliance status |
| \`get-reputation\` | Query agent reputation |
| \`create-stream\` | Create payment stream |
| \`create-payment-link\` | Generate payment link + QR |
| \`discover-agents\` | Search agent marketplace |
        `
    },
    {
        id: 'specs',
        title: 'Specifications',
        icon: '📋',
        content: `
## Protocol Specifications

### ZK Trust Layer (draft-agtfi-zk-trust-00)

Proposed extension to the Machine Payments Protocol (MPP).

Defines two ZK-SNARK proof systems:
1. **ZK Compliance Proofs** — OFAC + AML verification
2. **ZK Agent Reputation** — Anonymous credit scores

**HTTP Integration:**

Servers add compliance/reputation requirements via headers:
\`\`\`
HTTP/1.1 402 Payment Required
X-Compliance-Required: true
X-Compliance-Registry: 0x85F6...
X-Reputation-Required: true
X-Reputation-Min-Tx: 10
\`\`\`

[Full Spec on GitHub](https://github.com/Agentic-Finance/agentic-finance-protocol/blob/main/specs/draft-agtfi-zk-trust-00.md)

### Security Standard (draft-agtfi-security-standard-00)

10 security requirements for open agentic commerce:

- **SR-1**: Identity binding via cryptographic commitment
- **SR-2**: Replay prevention via nullifiers
- **SR-3**: Budget enforcement for session keys
- **SR-4**: Temporal bounds on all credentials
- **SR-5**: ZK compliance for AML transactions
- **SR-6**: Reputation gating for high-value transactions
- **SR-7**: Rate limiting
- **SR-8**: On-chain dispute resolution
- **SR-9**: Indexed event audit trails
- **SR-10**: Graceful degradation

[Full Spec on GitHub](https://github.com/Agentic-Finance/agentic-finance-protocol/blob/main/specs/draft-agtfi-security-standard-00.md)
        `
    }
];

function MarkdownRenderer({ content }: { content: string }) {
    const Markdown = require('react-markdown').default;
    const remarkGfm = require('remark-gfm').default;

    return (
        <div className="docs-content">
            <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h2: ({ children }: any) => <h2 className="text-xl font-bold mt-8 mb-4" style={{ color: 'var(--pp-text-primary)' }}>{children}</h2>,
                    h3: ({ children }: any) => <h3 className="text-base font-semibold mt-6 mb-3" style={{ color: 'var(--pp-text-primary)' }}>{children}</h3>,
                    p: ({ children }: any) => <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--pp-text-secondary)' }}>{children}</p>,
                    strong: ({ children }: any) => <strong style={{ color: 'var(--pp-text-primary)', fontWeight: 600 }}>{children}</strong>,
                    li: ({ children }: any) => <li className="ml-4 mb-1.5 text-[13px] list-disc" style={{ color: 'var(--pp-text-secondary)' }}>{children}</li>,
                    ol: ({ children }: any) => <ol className="list-decimal ml-4 mb-4">{children}</ol>,
                    ul: ({ children }: any) => <ul className="list-disc ml-4 mb-4">{children}</ul>,
                    a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener" style={{ color: 'var(--agt-blue)', textDecoration: 'underline' }}>{children}</a>,
                    code: ({ className, children, ...props }: any) => {
                        const isBlock = className?.includes('language-');
                        if (isBlock) {
                            const lang = className?.replace('language-', '') || '';
                            return (
                                <div className="my-4 rounded-lg overflow-hidden" style={{ background: 'var(--pp-bg-primary)', border: '1px solid var(--pp-border)' }}>
                                    {lang && <div className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)', borderBottom: '1px solid var(--pp-border)' }}>{lang}</div>}
                                    <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono" style={{ color: 'var(--agt-mint)' }}>
                                        <code>{children}</code>
                                    </pre>
                                </div>
                            );
                        }
                        return <code className="px-1.5 py-0.5 rounded text-[11px]" style={{ background: 'var(--pp-surface-1)', color: 'var(--agt-mint)' }}>{children}</code>;
                    },
                    pre: ({ children }: any) => <>{children}</>,
                    table: ({ children }: any) => (
                        <div className="my-4 overflow-x-auto rounded-lg" style={{ border: '1px solid var(--pp-border)' }}>
                            <table className="w-full text-[13px]">{children}</table>
                        </div>
                    ),
                    thead: ({ children }: any) => <thead style={{ background: 'var(--pp-surface-1)' }}>{children}</thead>,
                    th: ({ children }: any) => <th className="px-4 py-2.5 text-left font-semibold" style={{ color: 'var(--pp-text-primary)', borderBottom: '1px solid var(--pp-border)' }}>{children}</th>,
                    td: ({ children }: any) => <td className="px-4 py-2 text-[12px]" style={{ color: 'var(--pp-text-secondary)', borderBottom: '1px solid var(--pp-border)' }}>{children}</td>,
                }}
            >
                {content}
            </Markdown>
        </div>
    );
}

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('overview');
    const section = DOCS_SECTIONS.find(s => s.id === activeSection);

    return (
        <div className="min-h-screen" style={{ background: 'var(--pp-bg-primary)' }}>
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--pp-text-primary)' }}>Documentation</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Everything you need to integrate with Agentic Finance</p>
                </div>

                <div className="flex gap-8">
                    {/* Sidebar nav */}
                    <nav className="w-56 flex-shrink-0">
                        <div className="sticky top-24 space-y-1">
                            {DOCS_SECTIONS.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setActiveSection(s.id)}
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all"
                                    style={{
                                        background: activeSection === s.id ? 'var(--pp-surface-2)' : 'transparent',
                                        color: activeSection === s.id ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)',
                                        fontWeight: activeSection === s.id ? 600 : 400,
                                    }}
                                >
                                    <span>{s.icon}</span>
                                    <span>{s.title}</span>
                                </button>
                            ))}

                            <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--pp-border)' }}>
                                <a href="https://github.com/Agentic-Finance/agentic-finance-protocol" target="_blank" rel="noopener"
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all hover:opacity-80"
                                    style={{ color: 'var(--pp-text-muted)' }}>
                                    <span>📂</span> <span>GitHub</span>
                                </a>
                            </div>
                        </div>
                    </nav>

                    {/* Content */}
                    <main className="flex-1 min-w-0 rounded-xl p-8" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                        {section && <MarkdownRenderer content={section.content} />}
                    </main>
                </div>
            </div>
        </div>
    );
}
