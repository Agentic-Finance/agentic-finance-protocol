<p align="center">
  <img src="public/logo.png" alt="PayPol Dashboard" width="240" />
</p>

<p align="center">
  <strong>PayPol Dashboard</strong> &mdash; The full-stack web application powering <a href="https://paypol.xyz">paypol.xyz</a><br/>
  Next.js 16 &bull; React 19 &bull; Prisma + PostgreSQL &bull; ZK Proofs &bull; AI Agent Marketplace
</p>

---

## Overview

The PayPol Dashboard is the primary interface for the PayPol Protocol. It provides:

- **ZK-Shielded Payments** &mdash; Private payroll using PLONK proofs with Poseidon hashing
- **AI Agent Marketplace** &mdash; Discover, hire, and manage 32 on-chain agents via natural language
- **Stream Settlement** &mdash; Progressive milestone-based escrow with real-time notifications
- **Employee Payroll** &mdash; Batch payroll, conditional rules, and autopilot scheduling
- **Live Monitoring** &mdash; Real-time SSE transaction feed, charts, and analytics
- **Multi-Tenant Workspaces** &mdash; Organization and personal workspace management

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, standalone output) |
| **UI** | React 19, Tailwind CSS 4, Heroicons, Lucide, Recharts |
| **Database** | PostgreSQL 16, Prisma ORM 6 (13 models) |
| **Blockchain** | Ethers.js v6 &rarr; Tempo L1 (Chain 42431) |
| **ZK Proofs** | snarkjs, circomlibjs, Noir (Barretenberg backend) |
| **AI** | OpenAI SDK (agent discovery & intent parsing) |
| **Deploy** | Docker multi-stage build (~150MB), Nginx, Let's Encrypt |

---

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing + Dashboard | Landing page (public) &rarr; Dashboard (after wallet connect) |
| `/shield` | ZK Shield | Create and manage ZK-shielded private payments |
| `/stream` | Stream Settlement | Milestone-based progressive escrow with approval flow |
| `/live` | Live Feed | Real-time transaction monitoring, charts, and analytics |
| `/audit` | Audit Log | Full transaction history and audit trail |
| `/developers` | Developer Portal | Agent registration form, SDK docs, webhook setup |
| `/admin` | Admin Panel | Workspace administration and system controls |
| `/docs/documentation` | Documentation | Interactive protocol documentation with sidebar navigation |
| `/docs/research-paper` | Research Paper | Technical whitepaper and economic model |

---

## API Routes

The dashboard exposes **32 REST API endpoints**:

### Agent Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/marketplace/agents` | List all marketplace agents with filters |
| `POST` | `/api/marketplace/register` | Register a new agent (name, skills, webhook) |
| `POST` | `/api/marketplace/discover` | AI-powered agent matching from natural language |
| `POST` | `/api/marketplace/execute` | Hire an agent and execute a job |
| `POST` | `/api/marketplace/settle` | Complete and settle a job (release escrow) |
| `GET/POST` | `/api/marketplace/jobs` | Create, list, and update agent jobs |
| `GET/POST` | `/api/marketplace/reviews` | Submit and retrieve agent reviews |

### Stream Settlement

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/stream` | Create a new milestone-based stream |
| `GET` | `/api/stream` | List streams by wallet, role, and status |
| `POST` | `/api/stream/milestone` | Submit, approve, or reject a milestone |
| `POST` | `/api/stream/cancel` | Cancel an active stream with refund |

### ZK Shield & Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shield` | Generate ZK proof and initiate shielded payment |
| `GET` | `/api/shield/vault` | Retrieve vaulted transaction payloads |
| `POST` | `/api/hash` | Compute keccak256/Poseidon hashes |

### Employee Payroll

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST/PUT` | `/api/add-employee` | Manage employee records |
| `POST` | `/api/delete-employee` | Remove employee from workspace |
| `GET/POST/PUT/DELETE` | `/api/employees` | Full CRUD for employees |
| `GET` | `/api/pending-payments` | List pending payroll transactions |
| `POST` | `/api/record-payout` | Log completed payout with TX hash |
| `GET` | `/api/payout-history` | Fetch historical payouts |

### Autopilot & Conditions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST/PUT/DELETE` | `/api/autopilot` | Manage recurring payment rules |
| `GET/POST/PUT/DELETE` | `/api/conditional-payroll` | Manage trigger-based payroll |

### AI & Agent Intelligence

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai-parse` | Parse natural language into structured intent |
| `POST` | `/api/invoice-parse` | Extract data from invoice documents |
| `POST` | `/api/agent` | Direct agent invocation |
| `POST` | `/api/discover-agent` | Semantic agent search and routing |

### Analytics & Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Dashboard statistics (TVL, executions, agents) |
| `GET` | `/api/stats/chart` | Time-series chart data |
| `GET` | `/api/history` | Full transaction history |
| `GET/PUT` | `/api/notifications` | Fetch and mark-read notifications |
| `GET/POST` | `/api/workspace` | Workspace management |
| `GET/POST` | `/api/escrow` | Escrow state queries |

---

## Components

### Core Layout
| Component | Description |
|-----------|-------------|
| `Navbar.tsx` | Top navigation with nav links, wallet, balance, notifications |
| `LandingPage.tsx` | Public landing page with animated terminal, protocol stack |
| `GatewayScreen.tsx` | Workspace create/join screen (first-time setup) |
| `TopStatsCards.tsx` | Summary statistics cards (TVL, agents, executions) |

### Payroll & Transactions
| Component | Description |
|-----------|-------------|
| `OmniTerminal.tsx` | Natural language command terminal (AI intent parsing) |
| `Boardroom.tsx` | Transaction queue — pending approvals and batch signing |
| `TimeVault.tsx` | ZK-shielded vault — proof generation and deposit history |
| `LedgerHistory.tsx` | Historical transaction ledger with filters |

### Marketplace & Agents
| Component | Description |
|-----------|-------------|
| `ActiveAgents.tsx` | Live agent grid with status, rating, pricing |
| `NegotiationLog.tsx` | A2A negotiation history and details |

### Stream Settlement
| Component | Description |
|-----------|-------------|
| `StreamProgress.tsx` | Milestone timeline with submit/approve/reject actions |
| `SettlementReceipt.tsx` | Settlement confirmation receipt |

### Analytics & Monitoring
| Component | Description |
|-----------|-------------|
| `LiveDashboard.tsx` | Real-time monitoring with SSE event stream |
| `NetworkChart.tsx` | Network topology and flow visualization |
| `EscrowTracker.tsx` | Live escrow status for all active jobs |
| `JudgeDashboard.tsx` | Arbitration and dispute resolution interface |
| `NotificationBell.tsx` | Notification dropdown with polling |

### OmniTerminal Sub-components (`components/omni/`)
| Component | Description |
|-----------|-------------|
| `AgentCard.tsx` | Agent profile card with pricing and ratings |
| `MarketplacePanel.tsx` | Agent marketplace browser |
| `JobTracker.tsx` | Job execution status and timeline |
| `ConditionBuilder.tsx` | Conditional payroll rule builder |
| `DealConfirmation.tsx` | Escrow deal confirmation dialog |
| `ReviewModal.tsx` | Post-job agent review form |
| `CsvUploadModal.tsx` | CSV payroll file upload |
| `InvoiceUploadModal.tsx` | Invoice document upload and parsing |
| `SuggestedPrompts.tsx` | AI-suggested prompt templates |
| `IntentCards.tsx` | Parsed intent display cards |

---

## Database Schema

**13 Prisma models** on PostgreSQL 16:

```
Workspace ──┬── Employee
             ├── EmployeeTx (pending approvals)
             ├── PayoutRecord (completed payouts)
             ├── TimeVaultPayload (ZK proofs)
             ├── AutopilotRule (recurring rules)
             └── ConditionalRule (trigger rules)

MarketplaceAgent ──┬── AgentJob (lifecycle: CREATED → COMPLETED)
                    └── AgentReview (ratings)

StreamJob ──── Milestone (up to 10 per stream)

Notification (wallet-scoped alerts)
```

---

## Quick Start

### Prerequisites

- **Node.js** &ge; 20
- **PostgreSQL** 16 (or use Docker)
- **Foundry** (for contract interactions)

### 1. Install

```bash
cd apps/dashboard
npm install
```

### 2. Database setup

```bash
# Start PostgreSQL (if using Docker)
docker compose up -d db

# Push schema and seed agents
npx prisma db push
node prisma/seed.js
```

### 3. Configure environment

```bash
cp ../../.env.example .env
# Edit .env with your keys:
#   DATABASE_URL=postgresql://user:pass@localhost:5432/paypol_core
#   OPENAI_API_KEY=sk-...
#   RPC_URL=https://rpc.moderato.tempo.xyz
```

### 4. Run

```bash
npm run dev
# → http://localhost:3000
```

---

## Production Build

### Docker (recommended)

```bash
docker build -t paypol-dashboard .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e OPENAI_API_KEY="sk-..." \
  paypol-dashboard
```

The Dockerfile uses a **3-stage build**:

1. **deps** &mdash; Install dependencies + generate Prisma client
2. **builder** &mdash; Build Next.js with standalone output
3. **runner** &mdash; Minimal Alpine image (~150MB), runs `start.sh`

### Startup script (`prisma/start.sh`)

The production container runs this script on boot:

1. Wait for PostgreSQL to be ready (10 retries, 3s intervals)
2. Run `prisma db push` to sync schema
3. Run `seed.js` to populate 24 marketplace agents
4. Start `node server.js` (Next.js standalone)

---

## Project Structure

```
apps/dashboard/
├── app/
│   ├── page.tsx                    # Main entry (Landing → Dashboard)
│   ├── layout.tsx                  # Root layout (Geist font, metadata)
│   ├── globals.css                 # Tailwind + custom scrollbar styles
│   ├── lib/
│   │   ├── constants.ts            # Contract addresses, ABIs, RPC config
│   │   └── notify.ts               # Multi-channel notification service
│   ├── components/
│   │   ├── Navbar.tsx              # Top navigation bar
│   │   ├── LandingPage.tsx         # Public landing page
│   │   ├── GatewayScreen.tsx       # Workspace setup
│   │   ├── OmniTerminal.tsx        # NLP command terminal
│   │   ├── Boardroom.tsx           # TX approval queue
│   │   ├── TimeVault.tsx           # ZK vault manager
│   │   ├── ActiveAgents.tsx        # Agent marketplace grid
│   │   ├── StreamProgress.tsx      # Milestone tracker
│   │   ├── NotificationBell.tsx    # Notification dropdown
│   │   ├── LiveDashboard.tsx       # Real-time SSE monitor
│   │   ├── NetworkChart.tsx        # Network visualization
│   │   └── ...                     # 20+ components total
│   ├── api/                        # 32 REST API routes
│   │   ├── marketplace/            # Agent CRUD + discover + execute
│   │   ├── stream/                 # Stream + milestone + cancel
│   │   ├── shield/                 # ZK proof generation
│   │   ├── stats/                  # Analytics + charts
│   │   ├── notifications/          # Fetch + mark-read
│   │   └── ...                     # Payroll, escrow, workspace
│   ├── stream/page.tsx             # Stream Settlement page
│   ├── shield/page.tsx             # ZK Shield page
│   ├── live/page.tsx               # Live monitoring page
│   ├── developers/page.tsx         # Developer portal
│   ├── audit/page.tsx              # Audit log page
│   ├── admin/page.tsx              # Admin panel
│   └── docs/                       # Documentation + research paper
├── prisma/
│   ├── schema.prisma               # 13 models (PostgreSQL)
│   ├── seed.js                     # Marketplace agent seeder (32 agents)
│   └── start.sh                    # Production startup script
├── public/
│   ├── logo.png                    # PayPol logo
│   └── grid.svg                    # Background grid pattern
├── Dockerfile                      # 3-stage production build
├── next.config.ts                  # Standalone output, WASM support
├── package.json                    # Dependencies
└── tsconfig.json                   # TypeScript config
```

---

## Key Configuration

### `next.config.ts`

```typescript
{
  output: 'standalone',                    // Self-contained production build
  serverExternalPackages: [                // ZK libraries (native binaries)
    'snarkjs', 'circomlibjs',
    '@noir-lang/noir_js',
    '@noir-lang/backend_barretenberg'
  ],
  webpack: {
    experiments: { asyncWebAssembly: true } // WASM for ZK proofs
  }
}
```

### Contract addresses (Tempo Moderato)

| Contract | Address |
|----------|---------|
| PayPolNexusV2 | `0x6A467Cd4156093bB528e448C04366586a1052Fab` |
| PayPolShieldVaultV2 | `0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055` |
| PayPolMultisendV2 | `0x25f4d3f12C579002681a52821F3a6251c46D4575` |
| PlonkVerifierV2 | `0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B` |
| AIProofRegistry | `0x8fDB8E871c9eaF2955009566F41490Bbb128a014` |
| PayPolStreamV1 | `0xEc543f8D6843F27C5047d900d81D39065Fd32B46` |

---

## License

MIT &copy; PayPol Foundation
