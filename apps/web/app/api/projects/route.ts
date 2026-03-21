import { NextRequest, NextResponse } from "next/server";
import { createProject } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, category } = await request.json();

    if (!name || !category) {
      return NextResponse.json(
        { error: "Nazev a kategorie jsou povinne" },
        { status: 400 }
      );
    }

    const project = await createProject({
      name,
      description,
      category,
      owner_id: user.id,
    });

    return NextResponse.json({ ok: true, project });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
