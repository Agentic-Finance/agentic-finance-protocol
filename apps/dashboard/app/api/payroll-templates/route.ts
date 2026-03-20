import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// GET: List templates for a workspace
export async function GET(req: NextRequest) {
    try {
        const wallet = req.nextUrl.searchParams.get('wallet')?.trim();
        if (!wallet) {
            return NextResponse.json({ success: false, error: 'Missing wallet parameter' }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
            where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
        });

        if (!workspace) {
            return NextResponse.json({ success: true, templates: [] });
        }

        const templates = await prisma.payrollTemplate.findMany({
            where: { workspaceId: workspace.id },
            orderBy: { createdAt: 'desc' },
        });

        // Parse JSON recipients
        const parsed = templates.map(t => ({
            ...t,
            recipients: JSON.parse(t.recipients),
        }));

        return NextResponse.json({ success: true, templates: parsed });
    } catch (error) {
        console.error('[payroll-templates] GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch templates' }, { status: 500 });
    }
}

// POST: Save a payroll template
export async function POST(req: NextRequest) {
    try {
        const wallet = req.headers.get('x-wallet-address') || req.headers.get('X-Wallet-Address');
        if (!wallet) {
            return NextResponse.json({ success: false, error: 'Missing wallet header' }, { status: 401 });
        }

        const workspace = await prisma.workspace.findFirst({
            where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
        });

        if (!workspace) {
            return NextResponse.json({ success: false, error: 'Workspace not found' }, { status: 404 });
        }

        const body = await req.json();
        const { name, recipients, isShielded } = body;

        if (!name?.trim()) {
            return NextResponse.json({ success: false, error: 'Template name required' }, { status: 400 });
        }

        if (!Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ success: false, error: 'At least 1 recipient required' }, { status: 400 });
        }

        const template = await prisma.payrollTemplate.create({
            data: {
                workspaceId: workspace.id,
                name: name.trim(),
                recipients: JSON.stringify(recipients),
                isShielded: isShielded ?? true,
            },
        });

        return NextResponse.json({
            success: true,
            template: { ...template, recipients: JSON.parse(template.recipients) },
        });
    } catch (error) {
        console.error('[payroll-templates] POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save template' }, { status: 500 });
    }
}

// DELETE: Remove a template
export async function DELETE(req: NextRequest) {
    try {
        const wallet = req.headers.get('x-wallet-address') || req.headers.get('X-Wallet-Address');
        if (!wallet) {
            return NextResponse.json({ success: false, error: 'Missing wallet header' }, { status: 401 });
        }

        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing template ID' }, { status: 400 });
        }

        await prisma.payrollTemplate.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[payroll-templates] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete template' }, { status: 500 });
    }
}
