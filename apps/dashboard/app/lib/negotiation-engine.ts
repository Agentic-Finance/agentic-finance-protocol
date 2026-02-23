/**
 * Dynamic Negotiation Engine for PayPol Agent Marketplace
 * Replaces the hardcoded 85% pricing with demand-based negotiation
 */

export interface NegotiationRound {
    type: 'SYSTEM' | 'SENT' | 'RECEIVED' | 'SUCCESS' | 'STRATEGY';
    message: string;
    timestamp: string;
}

export interface NegotiationResult {
    rounds: NegotiationRound[];
    finalPrice: number;
    platformFee: number;
    savings: number;
    agentPay: number;
}

interface AgentProfile {
    name: string;
    basePrice: number;
    totalJobs: number;
    avgRating: number;
    successRate: number;
    responseTime: number;
    isVerified: boolean;
}

export function negotiate(budget: number, agent: AgentProfile): NegotiationResult {
    const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false });

    // ══════════════════════════════════════
    // DYNAMIC PRICING ALGORITHM
    // ══════════════════════════════════════

    // Demand multiplier: popular agents charge more
    const demandMultiplier = agent.totalJobs > 100 ? 1.12
        : agent.totalJobs > 50 ? 1.05
        : agent.totalJobs > 20 ? 1.0
        : 0.92; // discount for newer agents

    // Rating premium: high-rated agents hold price better
    const ratingMultiplier = agent.avgRating >= 4.8 ? 1.08
        : agent.avgRating >= 4.5 ? 1.03
        : 1.0;

    // Verified agents have price floor
    const verifiedFloor = agent.isVerified ? agent.basePrice * 0.85 : agent.basePrice * 0.70;

    // Agent's "ask" price
    const agentAsk = Math.max(agent.basePrice * demandMultiplier * ratingMultiplier, verifiedFloor);

    // If budget is provided and sufficient, negotiate from there
    const effectiveBudget = budget > 0 ? budget : agentAsk * 1.2;

    // ══════════════════════════════════════
    // MULTI-ROUND NEGOTIATION SIMULATION
    // ══════════════════════════════════════

    // Round 1: Our opening offer (aggressive anchor)
    const round1Offer = Math.max(effectiveBudget * 0.65, agentAsk * 0.75);

    // Round 2: Agent counters (firm but willing to negotiate)
    const round2Counter = agentAsk * 0.97;

    // Round 3: Our improved offer
    const round3Offer = (round1Offer + round2Counter) / 2;

    // Round 4: Final agreement (split the remaining difference)
    const finalAgentPay = Math.round(((round3Offer + round2Counter) / 2) * 100) / 100;

    // Platform fee: 8% of agent pay
    const platformFee = Math.round(finalAgentPay * 0.08 * 100) / 100;
    const finalPrice = Math.round((finalAgentPay + platformFee) * 100) / 100;
    const savings = Math.round((effectiveBudget - finalPrice) * 100) / 100;

    // ══════════════════════════════════════
    // GENERATE NEGOTIATION LOG
    // ══════════════════════════════════════
    const rounds: NegotiationRound[] = [
        {
            type: 'SYSTEM',
            message: `[OmniRouter] Establishing secure channel with ${agent.name}...`,
            timestamp: ts(),
        },
        {
            type: 'STRATEGY',
            message: `[PayPol AI] Agent profile: ${agent.totalJobs} jobs completed, ${agent.successRate}% success, ${agent.avgRating}★ rating. Initiating aggressive anchor strategy.`,
            timestamp: ts(),
        },
        {
            type: 'SENT',
            message: `To ${agent.name}: Opening offer: ${round1Offer.toFixed(2)} AlphaUSD for this task.`,
            timestamp: ts(),
        },
        {
            type: 'RECEIVED',
            message: `From ${agent.name}: My standard rate is ${agentAsk.toFixed(2)} AlphaUSD. I can do ${round2Counter.toFixed(2)} given the scope.`,
            timestamp: ts(),
        },
        {
            type: 'SENT',
            message: `To ${agent.name}: We value your ${agent.avgRating}★ track record. Can we meet at ${round3Offer.toFixed(2)}?`,
            timestamp: ts(),
        },
        {
            type: 'RECEIVED',
            message: `From ${agent.name}: Deal. Final: ${finalAgentPay.toFixed(2)} AlphaUSD. Ready to execute.`,
            timestamp: ts(),
        },
        {
            type: 'SUCCESS',
            message: `Deal Struck! Agent Pay: ${finalAgentPay.toFixed(2)} + Platform Fee: ${platformFee.toFixed(2)} = Total: ${finalPrice.toFixed(2)} AlphaUSD. You save ${savings.toFixed(2)} AlphaUSD.`,
            timestamp: ts(),
        },
    ];

    return {
        rounds,
        finalPrice,
        platformFee,
        savings: Math.max(savings, 0),
        agentPay: finalAgentPay,
    };
}
