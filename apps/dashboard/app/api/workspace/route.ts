import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export const dynamic = 'force-dynamic';

async function getDb() {
    const dbPath = path.join(process.cwd(), 'paypol_saas.db'); 
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS workspaces (
            admin_wallet TEXT PRIMARY KEY,
            name TEXT,
            type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    return db;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get('wallet')?.trim();
        if (!wallet) return NextResponse.json({ error: "Missing wallet parameter" }, { status: 400 });

        const db = await getDb();
        const workspace = await db.get(`SELECT * FROM workspaces WHERE LOWER(admin_wallet) = LOWER(?)`, [wallet]);
        await db.close();
        
        return NextResponse.json({ workspace: workspace || null });
    } catch (error: any) {
        return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { adminWallet, name, type } = await req.json();
        const cleanWallet = adminWallet.trim().toLowerCase();
        const cleanName = name.trim();
        
        const db = await getDb();
        
        // 1. Check if wallet already owns a workspace
        const existingWallet = await db.get(`SELECT * FROM workspaces WHERE LOWER(admin_wallet) = ?`, [cleanWallet]);
        if (existingWallet) {
            await db.close();
            return NextResponse.json({ error: "This wallet is already bound to a workspace." }, { status: 403 });
        }

        // 🚀 2. FIXED: STRICT UNIQUE NAME CHECK
        const existingName = await db.get(`SELECT * FROM workspaces WHERE LOWER(name) = LOWER(?)`, [cleanName]);
        if (existingName) {
            await db.close();
            return NextResponse.json({ error: "Workspace name is already taken! Please use the 'Join Workspace' option." }, { status: 403 });
        }

        await db.run(`INSERT INTO workspaces (admin_wallet, name, type) VALUES (?, ?, ?)`, [cleanWallet, cleanName, type]);
        await db.close();
        
        return NextResponse.json({ success: true, workspace: { admin_wallet: cleanWallet, name: cleanName, type } });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}