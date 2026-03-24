import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const status = searchParams.get("status");

    let sql = `
      SELECT p.*,
             pr.display_name AS creator_name,
             proj.name AS project_name,
             COUNT(t.id) AS task_count,
             COUNT(t.id) FILTER (WHERE t.status = 'done') AS done_count
      FROM plans p
      LEFT JOIN profiles pr ON pr.id = p.created_by
      LEFT JOIN projects proj ON proj.id = p.project_id
      LEFT JOIN tasks t ON t.plan_id = p.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (projectId) {
      params.push(projectId);
      conditions.push(`p.project_id = $${params.length}`);
    }
    if (status && status !== "all") {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " GROUP BY p.id, pr.display_name, proj.name ORDER BY p.updated_at DESC";

    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("List plans error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, project_id, due_date, priority } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Nazev je povinny" }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO plans (title, description, project_id, due_date, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description || null, project_id || null, due_date || null, priority || 5, user.id]
    );

    return NextResponse.json({ ok: true, plan: res.rows[0] });
  } catch (error) {
    console.error("Create plan error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
