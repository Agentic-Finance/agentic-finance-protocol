import React from 'react';

export interface ParsedIntent {
    name: string;
    wallet: string;
    isRawWallet: boolean;
    amount: string;
    token: string;
    indexId: number;
    schedule?: string;
    timelock?: string;
    note?: string;
}

// Legacy types kept for backwards compatibility
export interface NeuralAgent {
    id: string;
    name: string;
    category: string;
    price: number;
    rating: number;
    icon: React.ReactNode;
    skills: string[];
}

export interface RouterAnalysisResult {
    intent: 'INHOUSE_AI' | 'MARKETPLACE' | 'WRONG_TAB' | 'UNKNOWN';
    recommendedAgents: NeuralAgent[];
    systemLog: string[];
}

export interface NegotiationResultData {
    finalPrice: string;
    fee: string;
    savings: string;
    agentName: string;
    agentWallet: string;
    budget: string;
    token: string;
}
