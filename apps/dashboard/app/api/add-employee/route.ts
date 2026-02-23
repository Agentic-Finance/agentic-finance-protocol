import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

function getDatabasePath() {
    const cwd = process.cwd();
    const possiblePaths = [
        path.join(cwd, '../../../payroll.db'),
        path.join(cwd, 'payroll.db'),
        path.join(cwd, '../../payroll.db')
    ];
    return possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
}

async function getDb() {
    const dbPath = getDatabasePath();
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    
    const newColumns = ['name', 'note', 'token', 'address', 'wallet_address', 'proposal_id', 'unlock_time', 'trap_hash'];
    for (const col of newColumns) {
        try { await db.exec(`ALTER TABLE employees ADD COLUMN ${col} TEXT`); } catch (e) {}
    }
    return db;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const db = await getDb();
        
        const payloads = Array.isArray(body) ? body : [body];
        let insertedCount = 0;

        for (const payload of payloads) {
            if (!payload.wallet || !payload.amount) continue; 
            
            // 🚀 UPGRADED: Payloads are now locked in 'Awaiting_Approval' state
            await db.run(
                `INSERT INTO employees (name, address, wallet_address, amount, status, token, note) VALUES (?, ?, ?, ?, 'Awaiting_Approval', 'AlphaUSD', ?)`,
                [payload.name || 'Anonymous', payload.wallet, payload.wallet, payload.amount, payload.note || '']
            );
            insertedCount++;
        }
        
        await db.close();
        return NextResponse.json({ success: true, count: insertedCount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const db = await getDb();
        // 🚀 UPGRADED: Fetching the Boardroom awaiting list
        const awaiting = await db.all(`SELECT * FROM employees WHERE status = 'Awaiting_Approval'`);
        const pending = await db.all(`SELECT * FROM employees WHERE status = 'Pending'`);
        const vaulted = await db.all(`SELECT * FROM employees WHERE status = 'Vaulted'`);
        await db.close();
        return NextResponse.json({ awaiting, pending, vaulted });
    } catch (error: any) {
        return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { action } = await req.json();
        const db = await getDb();
        
        if (action === 'cancel_vault') {
            await db.run(`UPDATE employees SET status = 'Cancel_Requested' WHERE status = 'Vaulted'`);
        } 
        // 🚀 UPGRADED: Boardroom Approval Logic
        else if (action === 'approve') {
            await db.run(`UPDATE employees SET status = 'Pending' WHERE status = 'Awaiting_Approval'`);
        }
        
        await db.close();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Action failed" }, { status: 500 });
    }
}