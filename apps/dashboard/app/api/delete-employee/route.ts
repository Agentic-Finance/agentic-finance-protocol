import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing employee ID" }, { status: 400 });
        }

        await prisma.employee.delete({
            where: { id },
        }).catch(() => {
            // If already deleted, treat as success
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Database Delete Error:", error);
        return NextResponse.json({
            error: error.message || "Failed to delete employee"
        }, { status: 500 });
    }
}
