#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# PayPol Agent Hiring Script for OpenClaw
# ═══════════════════════════════════════════════════════════════
#
# Usage:
#   ./paypol-hire.sh <agent-id> "<prompt>"
#
# Examples:
#   ./paypol-hire.sh contract-auditor "Audit this contract: ..."
#   ./paypol-hire.sh yield-optimizer "Best yield for 10K USDC"
#   ./paypol-hire.sh gas-predictor "Cheapest time to transact today"
#
# Environment Variables:
#   PAYPOL_API_KEY     - Required: Your PayPol API key
#   PAYPOL_AGENT_API   - Optional: API base URL (default: http://localhost:3001)
#   PAYPOL_WALLET      - Optional: Caller wallet ID (default: openclaw-agent)
#   PAYPOL_TIMEOUT     - Optional: Request timeout in seconds (default: 120)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Config ────────────────────────────────────────────────────
API_BASE="${PAYPOL_AGENT_API:-http://localhost:3001}"
API_KEY="${PAYPOL_API_KEY:?Error: PAYPOL_API_KEY environment variable is required}"
WALLET="${PAYPOL_WALLET:-openclaw-agent}"
TIMEOUT="${PAYPOL_TIMEOUT:-120}"

# ── Validation ────────────────────────────────────────────────
if [ $# -lt 2 ]; then
  echo "Usage: paypol-hire.sh <agent-id> \"<prompt>\""
  echo ""
  echo "Available agents:"
  echo "  Security:    contract-auditor, mev-sentinel, bridge-analyzer"
  echo "  DeFi:        yield-optimizer, liquidity-manager, omnibridge-router,"
  echo "               airdrop-tracker, defi-insurance, arbitrage-scanner"
  echo "  Analytics:   gas-predictor, risk-analyzer, portfolio-rebalancer,"
  echo "               whale-tracker, social-radar"
  echo "  Payroll:     payroll-planner, crypto-tax-navigator"
  echo "  Governance:  compliance-advisor, dao-advisor, proposal-writer,"
  echo "               vesting-planner"
  echo "  NFT:         nft-appraiser, nft-forensics"
  echo "  Deployment:  token-deployer, contract-deploy-pro"
  exit 1
fi

AGENT_ID="$1"
PROMPT="$2"

# ── Valid agent IDs ───────────────────────────────────────────
VALID_AGENTS=(
  "contract-auditor" "yield-optimizer" "payroll-planner" "gas-predictor"
  "arbitrage-scanner" "compliance-advisor" "nft-forensics" "bridge-analyzer"
  "dao-advisor" "risk-analyzer" "crypto-tax-navigator" "portfolio-rebalancer"
  "token-deployer" "airdrop-tracker" "mev-sentinel" "liquidity-manager"
  "whale-tracker" "social-radar" "omnibridge-router" "nft-appraiser"
  "proposal-writer" "vesting-planner" "defi-insurance" "contract-deploy-pro"
)

VALID=false
for agent in "${VALID_AGENTS[@]}"; do
  if [ "$agent" = "$AGENT_ID" ]; then
    VALID=true
    break
  fi
done

if [ "$VALID" = false ]; then
  echo "Error: Unknown agent '$AGENT_ID'"
  echo "Run without arguments to see available agents."
  exit 1
fi

# ── Execute ───────────────────────────────────────────────────
RESPONSE=$(curl -s --max-time "$TIMEOUT" \
  -X POST "${API_BASE}/agents/${AGENT_ID}/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "$(jq -n --arg prompt "$PROMPT" --arg wallet "$WALLET" \
    '{prompt: $prompt, callerWallet: $wallet}')")

# ── Output ────────────────────────────────────────────────────
STATUS=$(echo "$RESPONSE" | jq -r '.status // "unknown"')

if [ "$STATUS" = "success" ]; then
  echo "$RESPONSE" | jq '.result'
elif [ "$STATUS" = "error" ]; then
  echo "Agent Error: $(echo "$RESPONSE" | jq -r '.error')" >&2
  exit 1
else
  echo "$RESPONSE" | jq '.'
fi
