"use client";

import { useState, useCallback } from "react";
import { QuickTask } from "./QuickTask";

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

interface TaskBoardProps {
  tasks: Task[];
  planId?: string;
  projectId?: string;
  onTaskClick?: (taskId: string) => void;
  onRefresh?: () => void;
}

const COLUMNS = [
  { key: "todo", label: "K splneni", color: "#9898b0" },
  { key: "in_progress", label: "V praci", color: "#f59e0b" },
  { key: "review", label: "Kontrola", color: "#6366f1" },
  { key: "done", label: "Hotovo", color: "#22c55e" },
];

const priorityColors: Record<number, string> = {
  1: "#ef4444",
  2: "#f59e0b",
  3: "#eab308",
  4: "#6366f1",
  5: "#9898b0",
};

export function TaskBoard({ tasks, planId, projectId, onTaskClick, onRefresh }: TaskBoardProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const getColumnTasks = useCallback(
    (status: string) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  async function handleDrop(newStatus: string) {
    if (!dragging) return;
    setDragOver(null);

    const task = tasks.find((t) => t.id === dragging);
    if (!task || task.status === newStatus) {
      setDragging(null);
      return;
    }

    try {
      await fetch(`/api/tasks/${dragging}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh?.();
    } catch (err) {
      console.error("Move task error:", err);
    }
    setDragging(null);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    const formatted = d.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });

    if (days < 0) return { text: formatted, color: "#ef4444" };
    if (days <= 2) return { text: formatted, color: "#f59e0b" };
    return { text: formatted, color: "#9898b0" };
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px",
        minHeight: "400px",
        overflowX: "auto",
      }}
      className="task-board-grid"
    >
      {COLUMNS.map((col) => {
        const colTasks = getColumnTasks(col.key);
        const isOver = dragOver === col.key;

        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.key);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(col.key);
            }}
            style={{
              background: isOver ? "rgba(99,102,241,0.05)" : "transparent",
              borderRadius: "12px",
              padding: "4px",
              minWidth: "240px",
              transition: "background 0.2s",
              border: isOver ? "1px dashed #6366f1" : "1px solid transparent",
            }}
          >
            {/* Column header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 8px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: col.color,
                  }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#e8e8f0",
                  }}
                >
                  {col.label}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#9898b0",
                    background: "#1a1a2e",
                    padding: "1px 8px",
                    borderRadius: "100px",
                  }}
                >
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Task cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => {
                    setDragging(null);
                    setDragOver(null);
                  }}
                  onClick={() => onTaskClick?.(task.id)}
                  style={{
                    background: "#12121a",
                    border: dragging === task.id ? "1px solid #6366f1" : "1px solid #2a2a40",
                    borderRadius: "8px",
                    padding: "12px",
                    cursor: "pointer",
                    opacity: dragging === task.id ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (dragging !== task.id) {
                      (e.currentTarget as HTMLElement).style.borderColor = "#3a3a55";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (dragging !== task.id) {
                      (e.currentTarget as HTMLElement).style.borderColor = "#2a2a40";
                    }
                  }}
                >
                  {/* Priority dot + title */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: priorityColors[task.priority] || "#9898b0",
                        marginTop: "6px",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#e8e8f0",
                        lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}
                    >
                      {task.title}
                    </span>
                  </div>

                  {/* Bottom row: assignee + due date */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "10px",
                    }}
                  >
                    {/* Assignee */}
                    {task.assignee_name ? (
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #6366f1, #818cf8)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#fff",
                        }}
                        title={task.assignee_name}
                      >
                        {task.assignee_name.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div />
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {/* Subtask count */}
                      {task.subtask_count && Number(task.subtask_count) > 0 && (
                        <span style={{ fontSize: "11px", color: "#9898b0" }}>
                          {task.subtask_done_count}/{task.subtask_count}
                        </span>
                      )}

                      {/* Due date */}
                      {task.due_date && (() => {
                        const { text, color } = formatDate(task.due_date);
                        return (
                          <span style={{ fontSize: "11px", color }}>
                            {text}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Quick add */}
              <QuickTask
                planId={planId}
                projectId={projectId}
                status={col.key}
                onCreated={() => onRefresh?.()}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
