import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stage_id, document_id } = await request.json();

    if (!stage_id || !document_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await query(
      "UPDATE stages SET status = $1 WHERE id = $2 AND document_id = $3",
      ["voting", stage_id, document_id]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Start voting error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
