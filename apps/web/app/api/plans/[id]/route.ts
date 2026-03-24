import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const planRes = await query(
      `SELECT p.*,
              pr.display_name AS creator_name,
              proj.name AS project_name
       FROM plans p
       LEFT JOIN profiles pr ON pr.id = p.created_by
       LEFT JOIN projects proj ON proj.id = p.project_id
       WHERE p.id = $1`,
      [id]
    );

    if (planRes.rows.length === 0) {
      return NextResponse.json({ error: "Plan nenalezen" }, { status: 404 });
    }

    const tasksRes = await query(
      `SELECT t.*,
              pr.display_name AS assignee_name,
              pr.avatar_url AS assignee_avatar,
              cr.display_name AS creator_name,
              (SELECT COUNT(*) FROM tasks sub WHERE sub.parent_task_id = t.id) AS subtask_count,
              (SELECT COUNT(*) FROM tasks sub WHERE sub.parent_task_id = t.id AND sub.status = 'done') AS subtask_done_count
       FROM tasks t
       LEFT JOIN profiles pr ON pr.id = t.assigned_to
       LEFT JOIN profiles cr ON cr.id = t.created_by
       WHERE t.plan_id = $1
       ORDER BY t.sort_order, t.created_at`,
      [id]
    );

    return NextResponse.json({
      ...planRes.rows[0],
      tasks: tasksRes.rows,
    });
  } catch (error) {
    console.error("Get plan error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const key of ["title", "description", "status", "priority", "due_date", "project_id"]) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(body[key]);
        idx++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Zadna data k aktualizaci" }, { status: 400 });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const res = await query(
      `UPDATE plans SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Plan nenalezen" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, plan: res.rows[0] });
  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const res = await query("DELETE FROM plans WHERE id = $1 RETURNING id", [id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Plan nenalezen" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete plan error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
