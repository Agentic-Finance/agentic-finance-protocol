import fs from 'fs';
import path from 'path';
import { MarkdownRenderer } from '../_components/MarkdownRenderer';
import { ResearchPaperClient } from './ResearchPaperClient';

export const metadata = {
    title: 'Research Paper - PayPol Protocol',
    description: 'PayPol: A Deterministic Financial Substrate for Autonomous Agent Economies — MCP, x402, stealth addresses, verifiable AI, PayFi credit, and ZK privacy.',
};

export default function ResearchPaperPage() {
    const filePath = path.join(process.cwd(), 'public', 'docs', 'paypol-research-paper.md');
    const content = fs.readFileSync(filePath, 'utf-8');

    return (
        <ResearchPaperClient>
            <MarkdownRenderer content={content} />
        </ResearchPaperClient>
    );
}
