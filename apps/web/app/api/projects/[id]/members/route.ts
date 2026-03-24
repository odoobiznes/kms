import { NextRequest, NextResponse } from "next/server";
import { getProjectMembers } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const members = await getProjectMembers(id);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Get project members error:", error);
    return NextResponse.json({ error: "Interni chyba serveru" }, { status: 500 });
  }
}
