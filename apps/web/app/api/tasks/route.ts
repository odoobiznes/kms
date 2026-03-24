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
    const planId = searchParams.get("plan_id");
    const projectId = searchParams.get("project_id");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assigned_to");

    let sql = `
      SELECT t.*,
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
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (planId) {
      params.push(planId);
      conditions.push(`t.plan_id = $${params.length}`);
    }
    if (projectId) {
      params.push(projectId);
      conditions.push(`t.project_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }
    if (assignedTo) {
      params.push(assignedTo);
      conditions.push(`t.assigned_to = $${params.length}`);
    }

    // Only top-level tasks (not subtasks) unless specific plan requested
    conditions.push("t.parent_task_id IS NULL");

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY t.sort_order, t.created_at DESC";

    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("List tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      title, description, plan_id, project_id, status: taskStatus,
      priority, assigned_to, due_date, estimated_hours, tags,
      sort_order, parent_task_id
    } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Nazev ukolu je povinny" }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO tasks (title, description, plan_id, project_id, status, priority,
                          assigned_to, due_date, estimated_hours, tags, sort_order,
                          parent_task_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        title,
        description || null,
        plan_id || null,
        project_id || null,
        taskStatus || "todo",
        priority || 5,
        assigned_to || null,
        due_date || null,
        estimated_hours || null,
        tags || null,
        sort_order || 0,
        parent_task_id || null,
        user.id,
      ]
    );

    return NextResponse.json({ ok: true, task: res.rows[0] });
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
