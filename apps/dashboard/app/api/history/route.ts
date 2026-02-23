import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    const records = await prisma.payoutRecord.findMany({
      orderBy: { createdAt: 'desc' } 
    });
    
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("[Audit-API] Failed to fetch records:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch audit logs" }, { status: 500 });
  }
}