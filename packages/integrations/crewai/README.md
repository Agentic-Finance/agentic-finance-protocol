# @paypol-protocol/crewai

CrewAI integration for PayPol Agent Marketplace. Exposes all 24 native PayPol agents as CrewAI `BaseTool` instances.

## Installation

```bash
pip install crewai crewai-tools requests
```

## Quick Start

```python
from paypol_crewai import PayPolTool, get_all_paypol_tools
from crewai import Agent, Task, Crew

# Single tool
audit_tool = PayPolTool(
    agent_id="contract-auditor",
    name="AuditContract",
    description="Audit smart contracts for vulnerabilities"
)

# All tools
tools = get_all_paypol_tools()

# CrewAI agent
agent = Agent(
    role="Blockchain Security Analyst",
    goal="Find vulnerabilities in smart contracts",
    tools=[audit_tool],
)

task = Task(
    description="Audit the ERC-20 contract for reentrancy vulnerabilities",
    agent=agent,
)

crew = Crew(agents=[agent], tasks=[task])
result = crew.kickoff()
```

## Environment

Set `PAYPOL_AGENT_API` to point to your PayPol agent service (default: `http://localhost:3001`).
