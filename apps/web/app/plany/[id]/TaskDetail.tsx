"use client";

import { useState, useEffect, useCallback } from "react";

interface Comment {
  id: string;
  content: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}

interface Subtask {
  id: string;
  title: string;
  status: string;
  assignee_name?: string;
}

interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  assigned_to?: string;
  assignee_name?: string;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  plan_title?: string;
  project_name?: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  subtasks: Subtask[];
  comments: Comment[];
}

interface Member {
  id: string;
  display_name: string;
}

interface TaskDetailProps {
  taskId: string;
  members?: Member[];
  onClose: () => void;
  onUpdated?: () => void;
}

const STATUS_OPTIONS = [
  { value: "todo", label: "K splneni", color: "#9898b0" },
  { value: "in_progress", label: "V praci", color: "#f59e0b" },
  { value: "review", label: "Kontrola", color: "#6366f1" },
  { value: "done", label: "Hotovo", color: "#22c55e" },
  { value: "cancelled", label: "Zruseno", color: "#ef4444" },
];

export function TaskDetail({ taskId, members = [], onClose, onUpdated }: TaskDetailProps) {
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
      }
    } catch (err) {
      console.error("Fetch task error:", err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  async function updateField(field: string, value: unknown) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        fetchTask();
        onUpdated?.();
      }
    } catch (err) {
      console.error("Update task error:", err);
    }
  }

  async function handleSaveTitle() {
    if (editTitle.trim() && editTitle !== task?.title) {
      await updateField("title", editTitle.trim());
    }
    setEditingTitle(false);
  }

  async function handleSaveDesc() {
    if (editDesc !== task?.description) {
      await updateField("description", editDesc);
    }
    setEditingDesc(false);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment("");
        fetchTask();
      }
    } catch (err) {
      console.error("Add comment error:", err);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtask.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtask.trim(),
          parent_task_id: taskId,
          plan_id: task?.plan_title ? undefined : undefined,
          status: "todo",
        }),
      });
      if (res.ok) {
        setNewSubtask("");
        fetchTask();
        onUpdated?.();
      }
    } catch (err) {
      console.error("Add subtask error:", err);
    }
  }

  async function toggleSubtask(subtask: Subtask) {
    const newStatus = subtask.status === "done" ? "todo" : "done";
    try {
      await fetch(`/api/tasks/${subtask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTask();
      onUpdated?.();
    } catch (err) {
      console.error("Toggle subtask error:", err);
    }
  }

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ padding: "40px", textAlign: "center", color: "#9898b0" }}>
            Nacitani...
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ padding: "40px", textAlign: "center", color: "#9898b0" }}>
            Ukol nenalezen
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === task.status);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "20px 24px 0",
          }}
        >
          <div style={{ flex: 1, marginRight: "16px" }}>
            {editingTitle ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                autoFocus
                style={{
                  width: "100%",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#e8e8f0",
                  background: "transparent",
                  border: "1px solid #6366f1",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  outline: "none",
                }}
              />
            ) : (
              <h2
                onClick={() => {
                  setEditTitle(task.title);
                  setEditingTitle(true);
                }}
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#e8e8f0",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                {task.title}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#9898b0",
              cursor: "pointer",
              padding: "4px",
              fontSize: "20px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 24px 24px", overflowY: "auto", maxHeight: "calc(80vh - 60px)" }}>
          {/* Status + Priority + Assignee row */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            {/* Status */}
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={task.status}
                onChange={(e) => updateField("status", e.target.value)}
                style={{
                  ...selectStyle,
                  color: currentStatus?.color,
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label style={labelStyle}>Priorita</label>
              <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p}
                    onClick={() => updateField("priority", p)}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      border: task.priority === p ? "2px solid #6366f1" : "1px solid #2a2a40",
                      background: task.priority <= p ? "transparent" : `${priorityColor(p)}20`,
                      color: task.priority <= p ? "#9898b0" : priorityColor(p),
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label style={labelStyle}>Prirazeno</label>
              <select
                value={task.assigned_to || ""}
                onChange={(e) => updateField("assigned_to", e.target.value || null)}
                style={selectStyle}
              >
                <option value="">Neprirazeno</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div>
              <label style={labelStyle}>Termin</label>
              <input
                type="date"
                value={task.due_date ? task.due_date.split("T")[0] : ""}
                onChange={(e) => updateField("due_date", e.target.value || null)}
                style={{
                  ...selectStyle,
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Popis</label>
            {editingDesc ? (
              <div>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={4}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#0a0a0f",
                    border: "1px solid #6366f1",
                    borderRadius: "8px",
                    color: "#e8e8f0",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    resize: "vertical",
                    outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button onClick={handleSaveDesc} style={btnPrimary}>
                    Ulozit
                  </button>
                  <button
                    onClick={() => setEditingDesc(false)}
                    style={btnSecondary}
                  >
                    Zrusit
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  setEditDesc(task.description || "");
                  setEditingDesc(true);
                }}
                style={{
                  padding: "10px",
                  background: "#0a0a0f",
                  border: "1px solid #2a2a40",
                  borderRadius: "8px",
                  color: task.description ? "#e8e8f0" : "#9898b0",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  cursor: "pointer",
                  minHeight: "60px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {task.description || "Klikni pro pridani popisu..."}
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              Podukoly ({task.subtasks.filter((s) => s.status === "done").length}/{task.subtasks.length})
            </label>

            {task.subtasks.length > 0 && (
              <div
                style={{
                  height: "3px",
                  background: "#1a1a2e",
                  borderRadius: "2px",
                  marginBottom: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${task.subtasks.length > 0 ? (task.subtasks.filter((s) => s.status === "done").length / task.subtasks.length) * 100 : 0}%`,
                    background: "#22c55e",
                    borderRadius: "2px",
                    transition: "width 0.3s",
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {task.subtasks.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => toggleSubtask(sub)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#1a1a2e";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "4px",
                      border: sub.status === "done" ? "none" : "2px solid #2a2a40",
                      background: sub.status === "done" ? "#22c55e" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {sub.status === "done" && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      color: sub.status === "done" ? "#9898b0" : "#e8e8f0",
                      textDecoration: sub.status === "done" ? "line-through" : "none",
                    }}
                  >
                    {sub.title}
                  </span>
                </div>
              ))}

              {/* Add subtask */}
              <form
                onSubmit={handleAddSubtask}
                style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}
              >
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Pridat podukol..."
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    background: "transparent",
                    border: "1px solid #2a2a40",
                    borderRadius: "6px",
                    color: "#e8e8f0",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </form>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label style={labelStyle}>Komentare ({task.comments.length})</label>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "12px" }}>
              {task.comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    display: "flex",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #6366f1, #818cf8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {comment.display_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#e8e8f0" }}>
                        {comment.display_name}
                      </span>
                      <span style={{ fontSize: "11px", color: "#9898b0" }}>
                        {new Date(comment.created_at).toLocaleString("cs-CZ")}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#c8c8d8",
                        lineHeight: 1.5,
                        marginTop: "4px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} style={{ display: "flex", gap: "8px" }}>
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Napsat komentar..."
                disabled={submittingComment}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: "#0a0a0f",
                  border: "1px solid #2a2a40",
                  borderRadius: "8px",
                  color: "#e8e8f0",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                style={{
                  ...btnPrimary,
                  opacity: submittingComment || !newComment.trim() ? 0.5 : 1,
                }}
              >
                Odeslat
              </button>
            </form>
          </div>

          {/* Activity info */}
          <div
            style={{
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid #2a2a40",
              fontSize: "12px",
              color: "#9898b0",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {task.creator_name && <span>Vytvoril/a: {task.creator_name}</span>}
            <span>Vytvoreno: {new Date(task.created_at).toLocaleString("cs-CZ")}</span>
            <span>Aktualizovano: {new Date(task.updated_at).toLocaleString("cs-CZ")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function priorityColor(p: number): string {
  const colors: Record<number, string> = {
    1: "#ef4444",
    2: "#f59e0b",
    3: "#eab308",
    4: "#6366f1",
    5: "#9898b0",
  };
  return colors[p] || "#9898b0";
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: "16px",
};

const modalStyle: React.CSSProperties = {
  background: "#12121a",
  border: "1px solid #2a2a40",
  borderRadius: "16px",
  width: "100%",
  maxWidth: "640px",
  maxHeight: "85vh",
  boxShadow: "0 16px 64px rgba(0,0,0,0.5)",
  overflow: "hidden",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#9898b0",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: "6px",
};

const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  background: "#0a0a0f",
  border: "1px solid #2a2a40",
  borderRadius: "6px",
  color: "#e8e8f0",
  fontSize: "13px",
  outline: "none",
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  padding: "6px 16px",
  background: "#6366f1",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  padding: "6px 16px",
  background: "transparent",
  color: "#9898b0",
  border: "1px solid #2a2a40",
  borderRadius: "6px",
  fontSize: "13px",
  cursor: "pointer",
};
