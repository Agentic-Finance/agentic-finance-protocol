import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { hash, amount, token, employeeIds } = await request.json();
        const dbPath = path.resolve(process.cwd(), '../../../payroll.db');
        const db = await open({ filename: dbPath, driver: sqlite3.Database });

        const executionDate = new Date().toLocaleTimeString() + " " + new Date().toLocaleDateString();

        // 1. Mark employees as Paid in the system
        const placeholders = employeeIds.map(() => '?').join(',');
        await db.run(`UPDATE employees SET status = 'Paid' WHERE id IN (${placeholders})`, employeeIds);

        // 2. Insert into permanent payout history
        await db.run(
            "INSERT INTO payout_history (hash, amount, token, date) VALUES (?, ?, ?, ?)",
            [hash, amount, token, executionDate]
        );

        await db.close();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Database Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}