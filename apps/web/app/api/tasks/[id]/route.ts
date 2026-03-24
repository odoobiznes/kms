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

    const taskRes = await query(
      `SELECT t.*,
              pr.display_name AS assignee_name,
              pr.avatar_url AS assignee_avatar,
              cr.display_name AS creator_name,
              pl.title AS plan_title,
              proj.name AS project_name
       FROM tasks t
       LEFT JOIN profiles pr ON pr.id = t.assigned_to
       LEFT JOIN profiles cr ON cr.id = t.created_by
       LEFT JOIN plans pl ON pl.id = t.plan_id
       LEFT JOIN projects proj ON proj.id = t.project_id
       WHERE t.id = $1`,
      [id]
    );

    if (taskRes.rows.length === 0) {
      return NextResponse.json({ error: "Ukol nenalezen" }, { status: 404 });
    }

    // Get subtasks
    const subtasksRes = await query(
      `SELECT t.*, pr.display_name AS assignee_name
       FROM tasks t
       LEFT JOIN profiles pr ON pr.id = t.assigned_to
       WHERE t.parent_task_id = $1
       ORDER BY t.sort_order, t.created_at`,
      [id]
    );

    // Get comments
    const commentsRes = await query(
      `SELECT c.*, pr.display_name, pr.avatar_url
       FROM task_comments c
       JOIN profiles pr ON pr.id = c.user_id
       WHERE c.task_id = $1
       ORDER BY c.created_at`,
      [id]
    );

    return NextResponse.json({
      ...taskRes.rows[0],
      subtasks: subtasksRes.rows,
      comments: commentsRes.rows,
    });
  } catch (error) {
    console.error("Get task error:", error);
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

    for (const key of [
      "title", "description", "status", "priority", "assigned_to",
      "due_date", "estimated_hours", "tags", "sort_order", "plan_id", "project_id"
    ]) {
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
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Ukol nenalezen" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, task: res.rows[0] });
  } catch (error) {
    console.error("Update task error:", error);
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

    const res = await query("DELETE FROM tasks WHERE id = $1 RETURNING id", [id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Ukol nenalezen" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
