import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { PlansFilter } from "./PlansFilter";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  draft: "Koncept",
  active: "Aktivni",
  completed: "Dokonceno",
  archived: "Archivovano",
};

const statusColors: Record<string, string> = {
  draft: "#9898b0",
  active: "#22c55e",
  completed: "#3b82f6",
  archived: "#6b7280",
};

export default async function PlanyPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; project_id?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status || "active";
  const projectFilter = sp.project_id || "";

  let plansSql = `
    SELECT p.*,
           pr.display_name AS creator_name,
           proj.name AS project_name,
           COUNT(t.id) AS task_count,
           COUNT(t.id) FILTER (WHERE t.status = 'done') AS done_count
    FROM plans p
    LEFT JOIN profiles pr ON pr.id = p.created_by
    LEFT JOIN projects proj ON proj.id = p.project_id
    LEFT JOIN tasks t ON t.plan_id = p.id AND t.parent_task_id IS NULL
  `;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (statusFilter && statusFilter !== "all") {
    params.push(statusFilter);
    conditions.push(`p.status = $${params.length}`);
  }
  if (projectFilter) {
    params.push(projectFilter);
    conditions.push(`p.project_id = $${params.length}`);
  }

  if (conditions.length > 0) {
    plansSql += " WHERE " + conditions.join(" AND ");
  }
  plansSql += " GROUP BY p.id, pr.display_name, proj.name ORDER BY p.updated_at DESC";

  const [plansRes, projectsRes] = await Promise.all([
    query(plansSql, params),
    query("SELECT id, name FROM projects WHERE status != 'archived' ORDER BY name"),
  ]);

  const plans = plansRes.rows;
  const projects = projectsRes.rows;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <AppHeader activePath="/plany" />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#e8e8f0" }}>Plany</h1>
            <p style={{ color: "#9898b0", fontSize: "14px", marginTop: "4px" }}>
              {plans.length} {plans.length === 1 ? "plan" : plans.length < 5 ? "plany" : "planu"}
            </p>
          </div>
          <Link
            href="/plany/novy"
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff",
              fontWeight: 500,
              fontSize: "14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novy plan
          </Link>
        </div>

        {/* Filters */}
        <PlansFilter
          currentStatus={statusFilter}
          currentProject={projectFilter}
          projects={projects}
        />

        {plans.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "#9898b0",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4a4a60"
              strokeWidth="1.5"
              style={{ margin: "0 auto 16px" }}
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 14l2 2 4-4" />
            </svg>
            <p style={{ fontSize: "16px", marginBottom: "8px" }}>Zatim zadne plany</p>
            <p style={{ fontSize: "14px" }}>Vytvorte svuj prvni plan kliknutim na tlacitko vyse</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "16px",
            }}
          >
            {plans.map((plan: Record<string, string | number>) => {
              const taskCount = Number(plan.task_count) || 0;
              const doneCount = Number(plan.done_count) || 0;
              const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

              return (
                <Link
                  key={String(plan.id)}
                  href={`/plany/${plan.id}`}
                  style={{
                    background: "#12121a",
                    border: "1px solid #2a2a40",
                    borderRadius: "12px",
                    padding: "24px",
                    display: "block",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px",
                    }}
                  >
                    <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#e8e8f0", flex: 1 }}>
                      {String(plan.title)}
                    </h3>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "100px",
                        fontSize: "12px",
                        fontWeight: 500,
                        backgroundColor: `${statusColors[String(plan.status)] || "#9898b0"}20`,
                        color: statusColors[String(plan.status)] || "#9898b0",
                        marginLeft: "8px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {statusLabels[String(plan.status)] || String(plan.status)}
                    </span>
                  </div>

                  {plan.description && (
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#9898b0",
                        lineHeight: 1.5,
                        marginBottom: "12px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {String(plan.description)}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "#9898b0" }}>
                        {doneCount}/{taskCount} ukolu
                      </span>
                      <span style={{ fontSize: "12px", color: "#9898b0" }}>{progress}%</span>
                    </div>
                    <div
                      style={{
                        height: "4px",
                        background: "#1a1a2e",
                        borderRadius: "2px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${progress}%`,
                          background: progress === 100 ? "#22c55e" : "#6366f1",
                          borderRadius: "2px",
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {plan.project_name ? (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 500,
                          backgroundColor: "#6366f115",
                          color: "#6366f1",
                          border: "1px solid #6366f130",
                        }}
                      >
                        {String(plan.project_name)}
                      </span>
                    ) : (
                      <span />
                    )}
                    {plan.due_date && (
                      <span style={{ fontSize: "13px", color: "#9898b0" }}>
                        {new Date(String(plan.due_date)).toLocaleDateString("cs-CZ")}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
