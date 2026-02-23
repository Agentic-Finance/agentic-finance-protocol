"""
PayPol Olas (Autonolas) Integration
====================================

Wraps PayPol marketplace agents as Olas skill behaviours, enabling
autonomous agent services to hire PayPol agents for on-chain tasks.

Usage:
    from paypol_olas import PayPolSkill, get_all_skills

    # Single skill
    skill = PayPolSkill(agent_id="contract-auditor")
    result = skill.execute("Audit this contract: ...")

    # All skills
    skills = get_all_skills()

Integration with Olas service:
    class MyBehaviour(BaseBehaviour):
        def act(self):
            skill = PayPolSkill(agent_id="contract-auditor")
            result = skill.execute(self.context.prompt)
            self.context.logger.info(result)
"""

import json
import os
from typing import Any, Dict, List, Optional

import requests


PAYPOL_AGENT_API = os.environ.get("PAYPOL_AGENT_API", "http://localhost:3001")


class PayPolSkill:
    """Olas-compatible skill wrapper for PayPol agents."""

    def __init__(
        self,
        agent_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ):
        self.agent_id = agent_id
        catalog_entry = next((c for c in AGENT_CATALOG if c[0] == agent_id), None)
        self.name = name or (catalog_entry[1] if catalog_entry else agent_id)
        self.description = description or (catalog_entry[2] if catalog_entry else f"PayPol agent: {agent_id}")

    def execute(self, prompt: str, caller_wallet: str = "olas-agent") -> Dict[str, Any]:
        """Execute the PayPol agent and return the result."""
        try:
            response = requests.post(
                f"{PAYPOL_AGENT_API}/agents/{self.agent_id}/execute",
                json={"prompt": prompt, "callerWallet": caller_wallet},
                timeout=120,
            )
            data = response.json()
            return {
                "success": data.get("status") == "success",
                "result": data.get("result"),
                "error": data.get("error"),
                "execution_time_ms": data.get("executionTimeMs", 0),
            }
        except Exception as e:
            return {"success": False, "result": None, "error": str(e), "execution_time_ms": 0}

    def to_dict(self) -> Dict[str, str]:
        """Return skill metadata as dict."""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "description": self.description,
        }


# ── Agent catalog ──────────────────────────────────────────

AGENT_CATALOG = [
    ("contract-auditor",     "AuditSmartContract",     "Audit Solidity smart contracts for security vulnerabilities"),
    ("yield-optimizer",      "OptimizeYield",          "Find best DeFi yield strategies and APY opportunities"),
    ("payroll-planner",      "PlanPayroll",            "Optimize batch payroll distribution and gas costs"),
    ("gas-predictor",        "PredictGas",             "Predict optimal gas prices and transaction timing"),
    ("arbitrage-scanner",    "ScanArbitrage",          "Detect cross-DEX arbitrage opportunities"),
    ("compliance-advisor",   "CheckCompliance",        "Crypto regulatory compliance analysis"),
    ("nft-forensics",        "AnalyzeNFTForensics",    "NFT wash trading and provenance forensics"),
    ("bridge-analyzer",      "AnalyzeBridge",          "Cross-chain bridge security assessment"),
    ("dao-advisor",          "AdviseDAO",              "DAO governance strategy and proposal analysis"),
    ("risk-analyzer",        "AnalyzeRisk",            "DeFi portfolio risk scoring and assessment"),
    ("crypto-tax-navigator", "NavigateCryptoTax",      "Classify crypto transactions and generate tax reports"),
    ("portfolio-rebalancer", "RebalancePortfolio",     "Analyze and rebalance crypto portfolio allocation"),
    ("token-deployer",       "DeployToken",            "Generate ERC-20/721 contracts with deployment scripts"),
    ("airdrop-tracker",      "TrackAirdrops",          "Scan wallet for airdrop eligibility and farming guides"),
    ("mev-sentinel",         "ShieldFromMEV",          "Protect transactions from sandwich attacks and frontrunning"),
    ("liquidity-manager",    "ManageLiquidity",        "Manage Uniswap V3 positions and impermanent loss"),
    ("whale-tracker",        "TrackWhales",            "Track large wallet movements and smart money flows"),
    ("social-radar",         "AnalyzeSentiment",       "Analyze crypto sentiment across social platforms"),
    ("omnibridge-router",    "RouteBridge",            "Find cheapest cross-chain bridge routes"),
    ("nft-appraiser",        "AppraiseNFT",            "Valuate NFTs using rarity and market analysis"),
    ("proposal-writer",      "WriteProposal",          "Draft governance proposals for DAOs"),
    ("vesting-planner",      "PlanVesting",            "Design token vesting schedules and tokenomics"),
    ("defi-insurance",       "FindInsurance",          "Compare DeFi insurance coverage options"),
    ("contract-deploy-pro",  "DeployContract",         "Deploy production smart contracts (multisig, vault, proxy)"),
]


def get_all_skills() -> List[PayPolSkill]:
    """Return all 24 PayPol agent skills."""
    return [
        PayPolSkill(agent_id=aid, name=name, description=desc)
        for aid, name, desc in AGENT_CATALOG
    ]


def get_skills_by_category(category: str) -> List[PayPolSkill]:
    """Return PayPol skills filtered by category."""
    category_map = {
        "security":    ["contract-auditor", "mev-sentinel"],
        "defi":        ["yield-optimizer", "arbitrage-scanner", "airdrop-tracker", "liquidity-manager", "omnibridge-router", "defi-insurance"],
        "payroll":     ["payroll-planner"],
        "analytics":   ["gas-predictor", "risk-analyzer", "portfolio-rebalancer", "whale-tracker", "social-radar"],
        "compliance":  ["compliance-advisor", "vesting-planner"],
        "governance":  ["dao-advisor", "proposal-writer"],
        "nft":         ["nft-forensics", "nft-appraiser"],
        "tax":         ["crypto-tax-navigator"],
        "deployment":  ["token-deployer", "contract-deploy-pro"],
    }
    agent_ids = category_map.get(category, [])
    return [
        PayPolSkill(agent_id=aid, name=name, description=desc)
        for aid, name, desc in AGENT_CATALOG
        if aid in agent_ids
    ]
