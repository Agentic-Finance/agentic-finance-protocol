"""
PayPol CrewAI Integration
========================

Exposes PayPol marketplace agents as CrewAI BaseTool instances, enabling
multi-agent orchestration with PayPol's 17 on-chain agents.

Usage:
    from paypol_crewai import PayPolTool, get_all_paypol_tools

    # Single tool
    audit_tool = PayPolTool(
        agent_id="contract-auditor",
        name="SmartContractAudit",
        description="Audit smart contracts for vulnerabilities"
    )

    # All 17 tools at once
    all_tools = get_all_paypol_tools()

    # Use in CrewAI agent
    from crewai import Agent, Task, Crew
    agent = Agent(role="Security Analyst", tools=[audit_tool], ...)
"""

import json
import os
from typing import Any, Optional, Type

import requests
from pydantic import BaseModel, Field

try:
    from crewai_tools import BaseTool
except ImportError:
    # Fallback for environments without crewai installed
    class BaseTool:  # type: ignore
        name: str = ""
        description: str = ""
        def _run(self, **kwargs: Any) -> str:
            raise NotImplementedError


PAYPOL_AGENT_API = os.environ.get("PAYPOL_AGENT_API", "http://localhost:3001")


class PayPolToolInput(BaseModel):
    prompt: str = Field(..., description="Task description or data for the PayPol agent")
    caller_wallet: str = Field(default="crewai-agent", description="Caller wallet address")


class PayPolTool(BaseTool):
    """Generic PayPol agent wrapper for CrewAI."""

    name: str = "PayPolAgent"
    description: str = "Execute a task using a PayPol marketplace agent"
    args_schema: Type[BaseModel] = PayPolToolInput
    agent_id: str = ""

    def __init__(self, agent_id: str, name: str = "", description: str = "", **kwargs: Any):
        super().__init__(**kwargs)
        self.agent_id = agent_id
        if name:
            self.name = name
        if description:
            self.description = description

    def _run(self, prompt: str, caller_wallet: str = "crewai-agent") -> str:
        """Call the PayPol agent service."""
        try:
            response = requests.post(
                f"{PAYPOL_AGENT_API}/agents/{self.agent_id}/execute",
                json={"prompt": prompt, "callerWallet": caller_wallet},
                timeout=120,
            )
            data = response.json()
            if data.get("status") == "error":
                return f"Agent error: {data.get('error', 'Unknown error')}"
            return json.dumps(data.get("result", data), indent=2)
        except Exception as e:
            return f"PayPol API error: {str(e)}"


# ── Pre-built tools for all 17 agents ──────────────────────

AGENT_CATALOG = [
    ("contract-auditor",     "AuditSmartContract",     "Audit Solidity smart contracts for security vulnerabilities"),
    ("yield-optimizer",      "OptimizeYield",          "Find best DeFi yield strategies and APY opportunities"),
    ("payroll-planner",      "PlanPayroll",            "Optimize batch payroll distribution and gas costs"),
    ("gas-predictor",        "PredictGas",             "Predict optimal gas prices and transaction timing"),
    ("arbitrage-scanner",    "ScanArbitrage",          "Detect cross-DEX arbitrage opportunities"),
    ("compliance-advisor",   "CheckCompliance",        "Crypto regulatory compliance analysis"),
    ("nft-forensics",        "AnalyzeNFT",             "NFT wash trading and provenance forensics"),
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


def get_all_paypol_tools() -> list:
    """Return all 17 PayPol agent tools ready for CrewAI."""
    return [
        PayPolTool(agent_id=aid, name=name, description=desc)
        for aid, name, desc in AGENT_CATALOG
    ]


def get_tools_by_category(category: str) -> list:
    """Return PayPol tools filtered by agent category."""
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
        PayPolTool(agent_id=aid, name=name, description=desc)
        for aid, name, desc in AGENT_CATALOG
        if aid in agent_ids
    ]
