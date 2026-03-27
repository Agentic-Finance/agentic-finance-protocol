export interface Agent {
    id: string;
    name: string;
    avatarEmoji: string;
    category: string;
    basePrice: number;
    successRate: number;
    avgRating: number;
    totalJobs: number;
    isVerified: boolean;
    nativeAgentId: string | null;
    skills: string;
    ownerWallet: string;
}

export interface CanvasItem {
    id: string;
    type: 'user' | 'agent' | 'system' | 'card';
    agentName?: string;
    agentEmoji?: string;
    content: string;
    cardType?: 'transaction' | 'deploy' | 'audit' | 'payment' | 'escrow' | 'info';
    cardData?: any;
    timestamp: string;
    replyTo?: string;
    reactions?: Record<string, string[]>;
    isPinned?: boolean;
}

export interface Channel {
    id: string;
    type: 'dm' | 'group' | 'agent';
    name: string;
    avatar: string;
    lastMessage: string;
    lastMessageAt: string;
    unread: number;
    participants: string[];
    agents?: string[];
}

export interface ChatMessage {
    id: string;
    channelId: string;
    senderWallet: string;
    senderName: string | null;
    content: string;
    messageType: 'text' | 'system' | 'agent_result' | 'tx_link' | 'image' | 'file' | 'payment_request' | 'payment_card';
    metadata: any;
    createdAt: string;
    replyToId?: string;
    replyToContent?: string;
    reactions?: Record<string, string[]>;
    isEdited?: boolean;
    isPinned?: boolean;
    readBy?: string[];
    status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface GroupSettings {
    name: string;
    description: string;
    avatar: string;
    members: { wallet: string; role: 'owner' | 'admin' | 'member'; name?: string }[];
    agents: string[];
    createdAt: string;
}

export type Mode = 'canvas' | 'messages';
export type MsgTab = 'direct' | 'groups';

export const REACTIONS = ['👍', '❤️', '🔥', '😂', '🎉', '🤔'];

export const AGENT_COMMANDS = [
    { text: 'Deploy a token', icon: '🚀', category: 'deployment' },
    { text: 'Audit smart contract', icon: '🔍', category: 'security' },
    { text: 'Send payment', icon: '💸', category: 'payments' },
    { text: 'Check vault balance', icon: '🏦', category: 'analytics' },
    { text: 'Create escrow', icon: '🔐', category: 'escrow' },
    { text: 'Start payment stream', icon: '📡', category: 'streams' },
    { text: 'Generate ZK proof', icon: '🛡️', category: 'privacy' },
    { text: 'Check compliance', icon: '⚖️', category: 'compliance' },
];
