import fs from 'fs';
import path from 'path';
import { MarkdownRenderer } from '../_components/MarkdownRenderer';
import { DocumentationClient } from './DocumentationClient';

export const metadata = {
    title: 'Documentation - Agentic Finance',
    description: 'Complete reference for Agentic Finance — MCP server, x402 payments, stealth addresses, verifiable AI, PayFi credit, ZK privacy, and 9 verified smart contracts.',
};

export default function DocumentationPage() {
    const filePath = path.join(process.cwd(), 'public', 'docs', 'agtfi-documentation.md');
    const content = fs.readFileSync(filePath, 'utf-8');

    return (
        <DocumentationClient>
            <MarkdownRenderer content={content} />
        </DocumentationClient>
    );
}
