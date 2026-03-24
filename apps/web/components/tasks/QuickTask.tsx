"use client";

import { useState } from "react";

interface QuickTaskProps {
  planId?: string;
  projectId?: string;
  status?: string;
  onCreated?: (task: Record<string, unknown>) => void;
}

export function QuickTask({ planId, projectId, status = "todo", onCreated }: QuickTaskProps) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          plan_id: planId || null,
          project_id: projectId || null,
          status,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTitle("");
        setOpen(false);
        onCreated?.(data.task);
      }
    } catch (err) {
      console.error("Quick task error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      setTitle("");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "transparent",
          border: "1px dashed #2a2a40",
          borderRadius: "8px",
          color: "#9898b0",
          fontSize: "13px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "#6366f1";
          (e.currentTarget as HTMLElement).style.color = "#e8e8f0";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "#2a2a40";
          (e.currentTarget as HTMLElement).style.color = "#9898b0";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Pridat ukol
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nazev ukolu... (Enter = vytvorit, Esc = zrusit)"
        autoFocus
        disabled={loading}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "#0a0a0f",
          border: "1px solid #6366f1",
          borderRadius: "8px",
          color: "#e8e8f0",
          fontSize: "13px",
          outline: "none",
          opacity: loading ? 0.6 : 1,
        }}
      />
    </form>
  );
}
