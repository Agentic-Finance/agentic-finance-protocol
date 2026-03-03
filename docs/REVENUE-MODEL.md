# PayPol Protocol — Revenue Model v2.0

> Last updated: 2026-03-03
> Status: Active

---

## 1. Executive Summary

PayPol Protocol generates revenue from 4 main sources:
1. **Fiat Card Payment** — processing fee on card-to-crypto conversion
2. **Shield ZK Privacy** — fee for zero-knowledge private transactions
3. **Agent Marketplace** — platform fee on AI agent job escrows
4. **Payroll Batch** — future fee on batch salary disbursements

This document outlines the current fee structure, problems identified,
and the proposed changes for sustainable growth.

---

## 2. Current Fee Structure

### 2.1 Fiat Card → Crypto

| Parameter | Value | Notes |
|---|---|---|
| Platform markup | 5% | Added on top of crypto amount |
| Fixed fee | $1.00 | Covers payment processor fixed costs |
| Min transaction | $5 | Prevents losses on tiny transactions |
| Max transaction | $10,000 | |
| Paddle fee (cost) | ~5% + $0.50 | Deducted from PayPol's revenue |

### 2.2 Shield ZK Privacy

| Parameter | Value |
|---|---|
| Fee | 0.5% of escrow amount |
| Max fee | $10 |

### 2.3 Agent Marketplace (NexusV2 Escrow)

| Parameter | Value | Contract |
|---|---|---|
| Platform fee | 5% (500 bps) | NexusV2, StreamV1 |
| Arbitration penalty | 3% (300 bps) | NexusV2 |
| Max platform fee | 30% (3000 bps) | On-chain cap |
| Security Deposit discount | 0.5–3% | Bronze/Silver/Gold tiers |

**Net agent fee with Security Deposit:**
```
No deposit:  5.0% platform fee
Bronze ($50 deposit):  4.5% (5.0 - 0.5%)
Silver ($200 deposit): 3.5% (5.0 - 1.5%)
Gold ($1000 deposit):  2.0% (5.0 - 3.0%)
```

### 2.4 Payroll Batch

| Parameter | Value |
|---|---|
| Platform fee | Free |
| Gas cost | User pays on-chain gas |

---

## 3. Fee Structure Details & Margin Analysis

### 3.1 Fiat Card → Crypto: 5% + $1 Fixed Fee

| Parameter | Value | Reason |
|---|---|---|
| Platform markup | **5%** | Competitive (Moonpay ~4.5%, Transak ~5%) |
| Fixed fee | **$1.00** | Covers Paddle's $0.50 fixed cost + profit |
| Min transaction | **$5** | Prevents losses on tiny transactions |
| Max transaction | $10,000 | Standard cap |

**Margin analysis with new fees:**

```
Example A: User buys 5 AlphaUSD (minimum)
  Card charge:     5.00 × 1.05 + $1.00 = $6.25
  Paddle fee:      5% × $6.25 + $0.50 = -$0.81
  PayPol receives: $6.25 - $0.81 = $5.44
  PayPol sends:    5.00 AlphaUSD
  Net profit:      $5.44 - $5.00 = +$0.44 (7.0% margin)

Example B: User buys 10 AlphaUSD
  Card charge:     10 × 1.05 + $1.00 = $11.50
  Paddle fee:      5% × $11.50 + $0.50 = -$1.08
  PayPol receives: $11.50 - $1.08 = $10.42
  PayPol sends:    10 AlphaUSD
  Net profit:      $10.42 - $10.00 = +$0.42 (3.6% margin)

Example C: User buys 50 AlphaUSD
  Card charge:     50 × 1.05 + $1.00 = $53.50
  Paddle fee:      5% × $53.50 + $0.50 = -$3.18
  PayPol receives: $53.50 - $3.18 = $50.32
  PayPol sends:    50 AlphaUSD
  Net profit:      $50.32 - $50.00 = +$0.32 (0.6% margin)

Example D: User buys 100 AlphaUSD
  Card charge:     100 × 1.05 + $1.00 = $106.00
  Paddle fee:      5% × $106.00 + $0.50 = -$5.80
  PayPol receives: $106.00 - $5.80 = $100.20
  PayPol sends:    100 AlphaUSD
  Net profit:      $100.20 - $100.00 = +$0.20 (0.2% margin)

Example E: User buys 500 AlphaUSD
  Card charge:     500 × 1.05 + $1.00 = $526.00
  Paddle fee:      5% × $526.00 + $0.50 = -$26.80
  PayPol receives: $526.00 - $26.80 = $499.20
  PayPol sends:    500 AlphaUSD
  Net profit:      $499.20 - $500.00 = -$0.80 (LOSS!)
```

**Important note:** At high amounts (>$400), the 5% markup barely covers
Paddle's 5% fee and the $1 fixed fee becomes negligible. The margin
approaches zero or goes slightly negative.

**Revised recommendation:** To ensure profitability at all amounts,
consider **5.5% + $0.50** or keep **5% + $1.00** and accept ~0% margin
at large transactions (volume-based strategy).

```
With 5.5% + $0.50:

  $5:    charge $5.78  → profit $0.40 (7.5%)
  $10:   charge $11.05 → profit $0.47 (4.1%)
  $50:   charge $53.25 → profit $0.09 (0.2%)
  $100:  charge $106.00 → profit $0.20 (0.2%)
  $500:  charge $528.00 → profit $1.60 (0.3%)
  $1000: charge $1055.50 → profit $2.72 (0.3%)
```

### 3.2 Shield ZK Privacy: 0.5% (max $10)

| Parameter | Value | Reason |
|---|---|---|
| Fee percent | **0.5%** | Covers ZK proof gas + profit |
| Max fee | **$10** | Higher cap for large transactions |

```
Examples:
  $10 escrow  → Shield fee: $0.05
  $100 escrow → Shield fee: $0.50
  $500 escrow → Shield fee: $2.50
  $2000+ escrow → Shield fee: $10.00 (capped)
```

ZK privacy is a premium feature — users who choose it understand
the value of on-chain unlinkability and will pay for it.

### 3.3 Agent Marketplace: 5% Platform Fee

| Parameter | Value | Reason |
|---|---|---|
| Platform fee | **5% (500 bps)** | Competitive rate to attract agents & users |
| Arbitration penalty | 3% | Deters frivolous disputes |
| Security Deposit discounts | 0.5–3% | Rewards committed agents |

**Net agent fee with Security Deposit:**
```
No deposit:  5.0% platform fee
Bronze ($50 deposit):  4.5% (5.0 - 0.5%)
Silver ($200 deposit): 3.5% (5.0 - 1.5%)
Gold ($1000 deposit):  2.0% (5.0 - 3.0%)
```

This creates a strong incentive to stake while keeping base fee competitive.

### 3.4 Payroll Batch: Free (Phase 1)

| Parameter | Phase 1 (now) | Phase 2 (6mo+) |
|---|---|---|
| Per-transfer fee | Free | $0.01/transfer |
| Batch fee | Free | 0.1% of total |
| Shield ZK add-on | 0.5% | 0.5% |

Free payroll builds enterprise adoption. Revenue comes later.

---

## 4. Revenue Projections

### Phase 1: Launch (0–6 months)

| Source | Avg Txn | Volume/mo | Fee Rate | Revenue/mo |
|---|---|---|---|---|
| Card purchases | $50 | $25,000 | ~1% net | $250 |
| Agent jobs | $30 | $15,000 | 5% | $750 |
| Shield ZK | $40 | $5,000 | 0.5% | $25 |
| Payroll | — | — | Free | $0 |
| **Total** | | **$45,000** | | **$1,025/mo** |

### Phase 2: Growth (6–18 months)

| Source | Volume/mo | Fee Rate | Revenue/mo |
|---|---|---|---|
| Card purchases | $200,000 | ~1% | $2,000 |
| Agent jobs | $100,000 | 5% | $5,000 |
| Shield ZK | $30,000 | 0.5% | $150 |
| Payroll | $50,000 | 0.1% | $50 |
| Premium subs | 50 users | $29/mo | $1,450 |
| **Total** | **$380,000** | | **$8,650/mo** |

### Phase 3: Scale (18+ months)

| Source | Volume/mo | Fee Rate | Revenue/mo |
|---|---|---|---|
| Card purchases | $2,000,000 | ~1.5% (negotiated Paddle) | $30,000 |
| Agent jobs | $500,000 | 5% | $25,000 |
| Shield ZK | $200,000 | 0.5% | $1,000 |
| Payroll | $500,000 | 0.1% | $500 |
| Premium subs | 500 users | $29/mo | $14,500 |
| API/White-label | — | — | $5,000 |
| **Total** | **$3,200,000** | | **$76,000/mo** |

---

## 5. Competitive Analysis

| Platform | Card Fee | Marketplace Fee | Min Txn |
|---|---|---|---|
| **PayPol (proposed)** | **5% + $1** | **5%** | **$5** |
| Moonpay | 4.5% | N/A | $30 |
| Transak | 5% | N/A | $15 |
| Ramp Network | 2.5% | N/A | $5 |
| Fiverr | N/A | 5.5% buyer + 20% seller | $5 |
| Upwork | N/A | 10% | $5 |
| OpenAI API | N/A | Per-token pricing | $5 |

PayPol's 5% + $1 is competitive with major fiat on-ramps.
The 5% agent fee is significantly lower than Fiverr/Upwork, creating
a strong value proposition for AI agent creators.

---

## 6. Smart Contract Fee Parameters

### On-chain (requires contract owner tx to update):

| Contract | Parameter | Current | Proposed | Function |
|---|---|---|---|---|
| NexusV2 | `platformFeeBps` | 500 (5%) | — | `setPlatformFee(500)` |
| StreamV1 | `platformFeeBps` | 500 (5%) | — | `setPlatformFee(500)` |
| SecurityDeposit | Discount tiers | 50/150/300 bps | Unchanged | — |

### Off-chain (code config):

| Config | File | Current | Proposed |
|---|---|---|---|
| `platformMarkupPercent` | `fiat-onramp.ts` | 5 | — |
| `platformFixedFee` | `fiat-onramp.ts` | $1.00 | — |
| `minAmount` | `fiat-onramp.ts` | 5 | — |
| `SHIELD_FEE_PERCENT` | `DealConfirmation.tsx`, `FiatCheckout.tsx`, `checkout/route.ts` | 0.5 | — |
| `SHIELD_FEE_MAX` | Same files | $10 | — |
| `CARD_MARKUP_PERCENT` | `DealConfirmation.tsx` | 5 | — |
| Negotiation engine fee | `negotiation-engine.ts` | 0.05 (5%) | — |

---

## 7. Implementation Checklist

### Code Changes:
- [ ] `apps/dashboard/app/lib/fiat-onramp.ts` — Update `platformMarkupPercent` to 5, add `platformFixedFee: 1.00`
- [ ] `apps/dashboard/app/lib/fiat-onramp.ts` — Update `calculateMarkup()` to include fixed fee
- [ ] `apps/dashboard/app/api/fiat/checkout/route.ts` — Shield fee 0.2% → 0.5%, max $5 → $10
- [ ] `apps/dashboard/app/components/omni/DealConfirmation.tsx` — Update SHIELD_FEE_PERCENT, CARD_MARKUP_PERCENT
- [ ] `apps/dashboard/app/components/FiatCheckout.tsx` — Update MARKUP_PERCENT, SHIELD constants
- [ ] `apps/dashboard/app/lib/negotiation-engine.ts` — Platform fee 8% → 5%
- [ ] `apps/dashboard/app/page.tsx` — Update any UI references to 8%

### Smart Contract Changes (on-chain tx):
- [ ] Call `NexusV2.setPlatformFee(500)` from owner wallet
- [ ] Call `StreamV1.setPlatformFee(500)` from owner wallet

### UI Updates:
- [ ] Fee breakdown shows "5% + $1.00 processing fee"
- [ ] Shield ZK toggle shows "0.5% fee (max $10)"
- [ ] Agent job confirmation shows "5% platform fee"

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Users leave due to fee increase (Shield 0.2→0.5%) | Low | Low | 0.5% still very low; privacy has high perceived value |
| Card fee too low at high amounts | Medium | Medium | $1 fixed fee ensures min profit; monitor and adjust |
| Agent marketplace 5% undercuts competitors | Low | Positive | Attracts more agents/users vs Fiverr 20%+ |
| Paddle negotiates lower rates at volume | High | Positive | At $1M+/mo volume, request 3% rate |
| Min $5 blocks micro-transactions | Medium | Low | Crypto direct payment has no minimum |

---

## 9. Fee Flow Diagram

```
USER (Card Payment)
  │
  ├─ Card charged: amount × 1.05 + $1.00 + Shield fee
  │
  ▼
PADDLE (Payment Processor)
  │
  ├─ Paddle keeps: ~5% + $0.50
  │
  ▼
PAYPOL TREASURY (Fiat Account)
  │
  ├─ Receives: totalCharge - paddleFee
  │
  ▼
PAYPOL TREASURY (On-chain Wallet: 0x33F7e5...)
  │
  ├─ Sends: {amount} AlphaUSD
  │   ├─ Shield OFF → direct transfer to user wallet
  │   └─ Shield ON  → deposit to ShieldVaultV2 (ZK commitment)
  │                    └─ Daemon generates ZK proof
  │                    └─ executeShieldedPayout → user wallet
  │
  ▼
USER WALLET
  │
  ├─ Receives: {amount} AlphaUSD
  │
  ▼
AGENT ESCROW (NexusV2 / StreamV1)
  │
  ├─ On settlement: 5% platform fee → PayPol treasury
  │                  95% → Agent wallet
  │
  ▼
PAYPOL REVENUE
  ├─ Card processing margin: ~0.2–7% per transaction
  ├─ Shield ZK fee: 0.5% (max $10)
  ├─ Agent platform fee: 5% of escrow
  └─ Total margin: weighted average ~3–5%
```

---

*Document prepared for PayPol Protocol internal review.*
*All figures are estimates based on current Paddle sandbox rates.*
*Production Paddle rates may differ after volume negotiations.*
