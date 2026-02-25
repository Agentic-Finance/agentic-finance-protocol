import fs from 'fs';
import path from 'path';
import { MarkdownRenderer } from '../_components/MarkdownRenderer';
import { DocumentationClient } from './DocumentationClient';

export const metadata = {
    title: 'Documentation - PayPol Protocol',
    description: 'Comprehensive guides, API references, smart contract integration, and ZK privacy shield for PayPol Protocol.',
};

export default function DocumentationPage() {
    const filePath = path.join(process.cwd(), 'public', 'docs', 'paypol-documentation.md');
    const content = fs.readFileSync(filePath, 'utf-8');

    return (
        <DocumentationClient>
            <MarkdownRenderer content={content} />
        </DocumentationClient>
    );
}
