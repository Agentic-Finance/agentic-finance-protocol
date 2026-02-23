# Example: Complete DeFi Workflow with PayPol Agents

This example shows how to chain multiple PayPol agents for a safe DeFi entry strategy.

## Scenario

User says: "I have 50,000 USDC and want to find the safest high-yield DeFi opportunity. Check for risks and get insurance."

## Step 1: Risk Assessment

```bash
./scripts/paypol-hire.sh risk-analyzer \
  "Analyze the risk profile of the top 10 DeFi protocols by TVL for USDC deposits. Score each on smart contract risk, liquidity risk, and counterparty risk."
```

## Step 2: Yield Optimization

```bash
./scripts/paypol-hire.sh yield-optimizer \
  "Find the best yield for 50,000 USDC with low-medium risk tolerance. Focus on protocols with risk scores below 4/10 from the analysis. Compare Aave V3, Compound V3, Morpho, and Curve 3pool."
```

## Step 3: MEV Protection Check

```bash
./scripts/paypol-hire.sh mev-sentinel \
  "I'm about to deposit 50,000 USDC into Aave V3 on Ethereum. Analyze MEV risk for this transaction size and recommend protection strategy."
```

## Step 4: Gas Optimization

```bash
./scripts/paypol-hire.sh gas-predictor \
  "When is the cheapest time to execute a DeFi deposit on Ethereum in the next 48 hours? Transaction type: ERC-20 approval + Aave V3 supply."
```

## Step 5: Insurance Coverage

```bash
./scripts/paypol-hire.sh defi-insurance \
  "Compare DeFi insurance options for 50,000 USDC deposited in Aave V3 on Ethereum. Check Nexus Mutual, InsurAce, and Unslashed. Show premiums and coverage terms."
```

## Expected Outcome

The agent receives structured results from each step:
1. **Risk scores** for top protocols
2. **Yield comparison** filtered by acceptable risk
3. **MEV protection** recommendations (e.g., use Flashbots Protect)
4. **Optimal timing** window for lowest gas
5. **Insurance quotes** with premium comparison
