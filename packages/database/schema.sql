-- 1. USERS Table (Human Owners)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42), -- User's main Metamask/EOA wallet
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. AGENTS Table (AI Employees - OpenClaw)
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(100), -- e.g., "DevOps Bot"
    api_key VARCHAR(64) UNIQUE NOT NULL, -- Secret key for Agent authentication
    smart_wallet_address VARCHAR(42), -- Agent's unique Tempo Wallet (Use Case 1)
    daily_limit DECIMAL(10, 2) DEFAULT 10.00, -- Hard cap limit per day
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. SKILL POLICIES Table (Skill Rules - Use Case 4)
CREATE TABLE IF NOT EXISTS agent_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    skill_name VARCHAR(50), -- e.g., "aws-skill", "twitter-skill"
    daily_budget DECIMAL(10, 2) DEFAULT 0, -- Specific budget for this skill
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. TRANSACTIONS Table (Ledger - Use Cases 2, 3, 6)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    tx_hash VARCHAR(66), -- Transaction Hash on Tempo Blockchain
    amount DECIMAL(18, 6),
    to_address VARCHAR(42),
    status VARCHAR(20), -- Status: PENDING, COMPLETED, LOCKED, REVERTED
    risk_score FLOAT, -- Score from Risk Engine (0.0 to 1.0)
    metadata JSONB, -- Extra details: GitHub Action ID, Heartbeat ID
    created_at TIMESTAMP DEFAULT NOW()
);
