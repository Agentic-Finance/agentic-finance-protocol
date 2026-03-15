# @agtfi-protocol/crewai

CrewAI integration for Agentic Finance Agent Marketplace. Exposes all 24 native Agentic Finance agents as CrewAI `BaseTool` instances.

## Installation

```bash
pip install crewai crewai-tools requests
```

## Quick Start

```python
from agtfi_crewai import Agentic FinanceTool, get_all_agtfi_tools
from crewai import Agent, Task, Crew

# Single tool
audit_tool = Agentic FinanceTool(
    agent_id="contract-auditor",
    name="AuditContract",
    description="Audit smart contracts for vulnerabilities"
)

# All tools
tools = get_all_agtfi_tools()

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

Set `AGTFI_AGENT_API` to point to your Agentic Finance agent service (default: `http://localhost:3001`).
