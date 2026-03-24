import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { PlanDetail } from "./PlanDetail";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

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
    notFound();
  }

  const plan = planRes.rows[0];

  // Get tasks for this plan
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
     WHERE t.plan_id = $1 AND t.parent_task_id IS NULL
     ORDER BY t.sort_order, t.created_at`,
    [id]
  );

  // Get all profiles as potential members
  const membersRes = await query(
    "SELECT id, display_name FROM profiles WHERE is_active = true ORDER BY display_name"
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <AppHeader activePath="/plany" />
      <PlanDetail
        plan={plan}
        initialTasks={tasksRes.rows}
        members={membersRes.rows}
      />
    </div>
  );
}
