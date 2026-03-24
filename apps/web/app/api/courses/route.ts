import { NextRequest, NextResponse } from "next/server";
import { query, createProject } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await query(`
      SELECT p.*,
             COUNT(DISTINCT pm.id) AS member_count,
             COUNT(DISTINCT d.id) AS lesson_count,
             COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'approved') AS approved_count,
             pr.display_name AS owner_name
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      LEFT JOIN documents d ON d.project_id = p.id
      LEFT JOIN profiles pr ON pr.id = p.owner_id
      WHERE p.category = 'course'
      GROUP BY p.id, pr.display_name
      ORDER BY p.updated_at DESC
    `);

    return NextResponse.json({ courses: res.rows });
  } catch (error) {
    console.error("List courses error:", error);
    return NextResponse.json({ error: "Interni chyba serveru" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nazev kurzu je povinny" }, { status: 400 });
    }

    const course = await createProject({
      name: name.trim(),
      description: description?.trim() || "",
      category: "course",
      owner_id: user.id,
    });

    return NextResponse.json({ ok: true, course }, { status: 201 });
  } catch (error) {
    console.error("Create course error:", error);
    return NextResponse.json({ error: "Interni chyba serveru" }, { status: 500 });
  }
}
