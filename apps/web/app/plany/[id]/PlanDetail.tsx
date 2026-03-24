"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskDetail } from "./TaskDetail";
import { AIAssistant } from "@/components/editor/AIAssistant";

interface Plan {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  due_date?: string;
  project_name?: string;
  project_id?: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  assigned_to?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  due_date?: string;
  subtask_count?: number;
  subtask_done_count?: number;
  tags?: string[];
}

interface Member {
  id: string;
  display_name: string;
}

interface PlanDetailProps {
  plan: Plan;
  initialTasks: Task[];
  members: Member[];
}

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

export function PlanDetail({ plan, initialTasks, members }: PlanDetailProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${plan.id}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Refresh tasks error:", err);
    }
  }, [plan.id]);

  async function handleStatusChange(newStatus: string) {
    try {
      await fetch(`/api/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (err) {
      console.error("Update plan status error:", err);
    }
    setEditingStatus(false);
  }

  async function handleDelete() {
    if (!confirm("Opravdu chcete smazat tento plan a vsechny jeho ukoly?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/plany");
      }
    } catch (err) {
      console.error("Delete plan error:", err);
    }
    setDeleting(false);
  }

  return (
    <>
      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 24px" }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "20px", fontSize: "13px", color: "#9898b0" }}>
          <Link href="/plany" style={{ color: "#9898b0" }}>
            Plany
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span style={{ color: "#e8e8f0" }}>{plan.title}</span>
        </div>

        {/* Plan header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "8px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#e8e8f0" }}>
                {plan.title}
              </h1>

              {/* Status badge */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setEditingStatus(!editingStatus)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "100px",
                    fontSize: "12px",
                    fontWeight: 500,
                    backgroundColor: `${statusColors[plan.status] || "#9898b0"}20`,
                    color: statusColors[plan.status] || "#9898b0",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {statusLabels[plan.status] || plan.status}
                </button>
                {editingStatus && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      background: "#12121a",
                      border: "1px solid #2a2a40",
                      borderRadius: "8px",
                      padding: "4px",
                      zIndex: 20,
                      minWidth: "140px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    }}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => handleStatusChange(value)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "6px 12px",
                          background: plan.status === value ? "rgba(99,102,241,0.1)" : "transparent",
                          border: "none",
                          borderRadius: "6px",
                          color: statusColors[value],
                          fontSize: "13px",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {plan.description && (
              <p style={{ fontSize: "14px", color: "#9898b0", lineHeight: 1.6, marginBottom: "12px", maxWidth: "700px" }}>
                {plan.description}
              </p>
            )}

            {/* Progress + info row */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              {/* Progress */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "200px" }}>
                <div
                  style={{
                    flex: 1,
                    height: "6px",
                    background: "#1a1a2e",
                    borderRadius: "3px",
                    overflow: "hidden",
                    maxWidth: "160px",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: progress === 100 ? "#22c55e" : "#6366f1",
                      borderRadius: "3px",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
                <span style={{ fontSize: "13px", color: "#9898b0", whiteSpace: "nowrap" }}>
                  {doneTasks}/{totalTasks} ({progress}%)
                </span>
              </div>

              {plan.project_name && (
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
                  {plan.project_name}
                </span>
              )}

              {plan.due_date && (
                <span style={{ fontSize: "13px", color: "#9898b0" }}>
                  Termin: {new Date(plan.due_date).toLocaleDateString("cs-CZ")}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #2a2a40",
                background: "transparent",
                color: "#9898b0",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Info
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(239,68,68,0.3)",
                background: "transparent",
                color: "#ef4444",
                fontSize: "13px",
                cursor: deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.5 : 1,
              }}
            >
              Smazat
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
          {/* Board */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <TaskBoard
              tasks={tasks}
              planId={plan.id}
              projectId={plan.project_id}
              onTaskClick={(taskId) => setSelectedTaskId(taskId)}
              onRefresh={refreshTasks}
            />
          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div
              style={{
                width: "280px",
                flexShrink: 0,
                background: "#12121a",
                border: "1px solid #2a2a40",
                borderRadius: "12px",
                padding: "20px",
                height: "fit-content",
                position: "sticky",
                top: "72px",
              }}
            >
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#e8e8f0", marginBottom: "16px" }}>
                Informace o planu
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <InfoRow label="Vytvoril/a" value={plan.creator_name || "\u2014"} />
                <InfoRow label="Vytvoreno" value={new Date(plan.created_at).toLocaleDateString("cs-CZ")} />
                <InfoRow label="Aktualizovano" value={new Date(plan.updated_at).toLocaleDateString("cs-CZ")} />
                {plan.due_date && (
                  <InfoRow label="Termin" value={new Date(plan.due_date).toLocaleDateString("cs-CZ")} />
                )}
                <InfoRow label="Priorita" value={`${plan.priority}/5`} />
                <InfoRow label="Celkem ukolu" value={String(totalTasks)} />
                <InfoRow label="Dokonceno" value={String(doneTasks)} />

                <div style={{ borderTop: "1px solid #2a2a40", paddingTop: "12px", marginTop: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Clenove
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                    {members.slice(0, 10).map((m) => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #6366f1, #818cf8)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#fff",
                          }}
                        >
                          {m.display_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span style={{ fontSize: "13px", color: "#e8e8f0" }}>
                          {m.display_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Task detail modal */}
      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          members={members}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={refreshTasks}
        />
      )}

      {/* Context-aware AI Assistant */}
      <AIAssistant
        context={{
          type: "plan",
          planName: plan.title,
          projectName: plan.project_name,
          goals: plan.description,
        }}
      />

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .task-board-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .task-board-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: "11px", color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </span>
      <div style={{ fontSize: "13px", color: "#e8e8f0", marginTop: "2px" }}>{value}</div>
    </div>
  );
}
