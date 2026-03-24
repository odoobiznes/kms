import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Webhook endpoint for syncing with external Tasks system (ops.it-enterprise.pro)
// Placeholder for future bi-directional sync
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get("x-webhook-secret");
    const expectedSecret = process.env.TASK_SYNC_SECRET;

    if (expectedSecret && authHeader !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, task } = body;

    if (!action || !task) {
      return NextResponse.json({ error: "Missing action or task data" }, { status: 400 });
    }

    switch (action) {
      case "create": {
        const res = await query(
          `INSERT INTO tasks (title, description, status, priority, created_by)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [task.title, task.description || null, task.status || "todo", task.priority || 5, task.created_by || null]
        );
        return NextResponse.json({ ok: true, task: res.rows[0] });
      }

      case "update": {
        if (!task.id) {
          return NextResponse.json({ error: "Task ID required for update" }, { status: 400 });
        }
        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        for (const key of ["title", "description", "status", "priority", "assigned_to"]) {
          if (task[key] !== undefined) {
            fields.push(`${key} = $${idx}`);
            values.push(task[key]);
            idx++;
          }
        }

        if (fields.length === 0) {
          return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        fields.push(`updated_at = NOW()`);
        values.push(task.id);

        const res = await query(
          `UPDATE tasks SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
          values
        );
        return NextResponse.json({ ok: true, task: res.rows[0] });
      }

      case "delete": {
        if (!task.id) {
          return NextResponse.json({ error: "Task ID required for delete" }, { status: 400 });
        }
        await query("DELETE FROM tasks WHERE id = $1", [task.id]);
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Task sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
