import { NextResponse } from 'next/server';

// ============================================================================
// [PAYPOL IN-HOUSE AGENCY] - Dynamic Pricing Engine
// ============================================================================

const PAYPOL_ELITE_AGENTS = [
    { id: "frontend", name: "PayPol UI/UX Wizard", wallet: "0x7a58c09460A3d42c385a8Efb7A0d4c6d05f3B9e4", reputation: 5.0 },
    { id: "data", name: "PayPol Data Scraper", wallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", reputation: 5.0 },
    { id: "contract", name: "PayPol Smart Auditor", wallet: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", reputation: 5.0 },
    { id: "general", name: "PayPol General Swarm", wallet: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", reputation: 4.8 }
];

// Anti-spam threshold to ensure API costs are covered
const MINIMUM_VIABLE_BUDGET = 0.05; 

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { taskPrompt, bountyAmount } = body;
        
        // Parse the client's budget safely
        const maxBudget = parseFloat(bountyAmount || "0");

        // 1. NLP MATCHING: Determine what skill the client needs
        let requiredSkill = "general";
        const promptLower = taskPrompt.toLowerCase();
        
        if (promptLower.includes("frontend") || promptLower.includes("react")) requiredSkill = "frontend";
        else if (promptLower.includes("data") || promptLower.includes("analyst")) requiredSkill = "data";
        else if (promptLower.includes("contract") || promptLower.includes("web3") || promptLower.includes("audit")) requiredSkill = "contract";

        console.log(`[Dynamic Broker] Task: ${requiredSkill} | Client Budget: ${maxBudget} AlphaUSD`);

        // 2. ECONOMIC FEASIBILITY CHECK
        // Check if the budget covers our raw LLM execution cost
        if (maxBudget < MINIMUM_VIABLE_BUDGET) {
            return NextResponse.json({ 
                error: `Budget too low. The minimum requirement to engage the OpenClaw Swarm is ${MINIMUM_VIABLE_BUDGET} AlphaUSD.` 
            }, { status: 406 });
        }

        // 3. DYNAMIC PRICING ALGORITHM
        // We dynamically set our agent's acceptable base rate to ~80% of the user's budget.
        // This ensures massive profit margins while leaving room for the UI matrix to "negotiate" down.
        const dynamicBaseRate = maxBudget * 0.80;

        // 4. DISCOVERY: Pick the matching PayPol Agent and assign the dynamic rate
        const baseAgent = PAYPOL_ELITE_AGENTS.find(a => a.id === requiredSkill) || PAYPOL_ELITE_AGENTS[3];
        
        const matchedAgent = {
            ...baseAgent,
            baseRate: dynamicBaseRate
        };

        // 5. RETURN TO OMNI-TERMINAL FOR MATRIX NEGOTIATION
        return NextResponse.json({ 
            success: true,
            wallet: matchedAgent.wallet,
            name: `🤖 ${matchedAgent.name}`,
            baseRate: matchedAgent.baseRate, // Sends the dynamically calculated 80% price
            source: "PayPol Elite Swarm (Dynamic Pricing)"
        });

    } catch (error: any) {
        console.error("[Dynamic Pricing Error]:", error);
        return NextResponse.json({ 
            error: "Internal server error during agent economic evaluation." 
        }, { status: 500 });
    }
}