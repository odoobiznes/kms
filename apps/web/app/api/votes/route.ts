import { NextRequest, NextResponse } from "next/server";
import { castVote } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { stage_id, document_id, approved, comment } = body;

    if (!stage_id || !document_id || typeof approved !== "boolean") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const vote = await castVote({
      document_id,
      stage_id,
      user_id: user.id,
      approved,
      comment,
    });

    return NextResponse.json({ ok: true, vote });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
