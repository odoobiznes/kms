"use client";

import { useState, useEffect } from "react";

interface AIStatsProps {
  projectId: string;
}

interface StatsData {
  total_contributions: number;
  ai_contributions: number;
  human_contributions: number;
  ai_percentage: number;
  models_used: { model: string; count: number }[];
}

const modelLabels: Record<string, string> = {
  "claude-sonnet": "Claude Sonnet",
  "claude-haiku": "Claude Haiku",
  "gpt-4o": "GPT-4o",
  "gemini-flash": "Gemini Flash",
  "groq-llama": "Groq Llama",
};

const modelColors: Record<string, string> = {
  "claude-sonnet": "#d97706",
  "claude-haiku": "#f59e0b",
  "gpt-4o": "#22c55e",
  "gemini-flash": "#3b82f6",
  "groq-llama": "#ec4899",
};

export function AIStats({ projectId }: AIStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ai/stats?project_id=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ padding: "16px", color: "#9898b0", fontSize: "13px" }}>
        Nacitani statistik...
      </div>
    );
  }

  if (!stats || stats.total_contributions === 0) {
    return (
      <div
        style={{
          background: "#12121a",
          border: "1px solid #2a2a40",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#e8e8f0", marginBottom: "8px" }}>
          AI Statistiky
        </h3>
        <p style={{ color: "#9898b0", fontSize: "13px" }}>Zatim zadne prispevky</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#12121a",
        border: "1px solid #2a2a40",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#e8e8f0", marginBottom: "16px" }}>
        AI Statistiky
      </h3>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <div style={{ textAlign: "center", padding: "12px", background: "#0a0a0f", borderRadius: "8px" }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#e8e8f0" }}>
            {stats.total_contributions}
          </div>
          <div style={{ fontSize: "11px", color: "#9898b0", marginTop: "2px" }}>Celkem</div>
        </div>
        <div style={{ textAlign: "center", padding: "12px", background: "#0a0a0f", borderRadius: "8px" }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#6366f1" }}>
            {stats.ai_contributions}
          </div>
          <div style={{ fontSize: "11px", color: "#9898b0", marginTop: "2px" }}>AI</div>
        </div>
        <div style={{ textAlign: "center", padding: "12px", background: "#0a0a0f", borderRadius: "8px" }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#22c55e" }}>
            {stats.human_contributions}
          </div>
          <div style={{ fontSize: "11px", color: "#9898b0", marginTop: "2px" }}>Lide</div>
        </div>
      </div>

      {/* AI vs Human bar */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9898b0", marginBottom: "4px" }}>
          <span>AI: {stats.ai_percentage}%</span>
          <span>Lide: {100 - stats.ai_percentage}%</span>
        </div>
        <div
          style={{
            width: "100%",
            height: "8px",
            background: "#22c55e30",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${stats.ai_percentage}%`,
              height: "100%",
              background: "linear-gradient(90deg, #6366f1, #818cf8)",
              borderRadius: "4px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Models used */}
      {stats.models_used.length > 0 && (
        <div>
          <div style={{ fontSize: "12px", color: "#9898b0", marginBottom: "8px" }}>
            Pouzite modely
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {stats.models_used.map((m) => (
              <div
                key={m.model}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  background: "#0a0a0f",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: modelColors[m.model] || "#9898b0",
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "#e8e8f0" }}>
                    {modelLabels[m.model] || m.model}
                  </span>
                </div>
                <span style={{ fontSize: "12px", color: "#9898b0" }}>
                  {m.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
