import { NextRequest, NextResponse } from "next/server";
import { query, createDocument } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    let sql = `
      SELECT d.*, pr.display_name AS author_name, p.name AS project_name
      FROM documents d
      LEFT JOIN profiles pr ON pr.id = d.created_by
      LEFT JOIN projects p ON p.id = d.project_id
    `;
    const params: string[] = [];

    if (projectId) {
      sql += " WHERE d.project_id = $1";
      params.push(projectId);
    }

    sql += " ORDER BY d.updated_at DESC";

    const res = await query(sql, params);
    return NextResponse.json({ documents: res.rows });
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json({ error: "Interni chyba serveru" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, project_id } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Nazev je povinny" }, { status: 400 });
    }

    const doc = await createDocument({
      title: title.trim(),
      project_id: project_id || null,
      created_by: user.id,
    });

    // Create default stages for the document
    const defaultStages = [
      { name: "Koncept", stage_order: 1 },
      { name: "Revize", stage_order: 2 },
      { name: "Schvaleni", stage_order: 3 },
      { name: "Uzavreno", stage_order: 4 },
    ];

    for (const stage of defaultStages) {
      await query(
        "INSERT INTO stages (document_id, name, stage_order, opened_by) VALUES ($1, $2, $3, $4)",
        [doc.id, stage.name, stage.stage_order, user.id]
      );
    }

    return NextResponse.json({ ok: true, document: doc }, { status: 201 });
  } catch (error) {
    console.error("Create document error:", error);
    return NextResponse.json({ error: "Interni chyba serveru" }, { status: 500 });
  }
}
