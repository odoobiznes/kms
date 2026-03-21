import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await query(
      `SELECT id, event_type, source_system, status, details, data, created_at
       FROM integration_events
       ORDER BY created_at DESC
       LIMIT 50`
    );

    return NextResponse.json({ events: result.rows });
  } catch (error) {
    console.error("Events GET error:", error);
    return NextResponse.json({ error: "Interni chyba serveru" }, { status: 500 });
  }
}
