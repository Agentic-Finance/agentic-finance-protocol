import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing employee ID" }, { status: 400 });
        }

        const dbPath = path.resolve(process.cwd(), '../../../payroll.db');
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Execute the delete command
        await db.run('DELETE FROM employees WHERE id = ?', [id]);
        await db.close();
        
        // We removed the strict check here. 
        // If it's already deleted (changes === 0), it's still a success!
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Database Delete Error:", error);
        return NextResponse.json({ 
            error: error.message || "Failed to delete employee" 
        }, { status: 500 });
    }
}