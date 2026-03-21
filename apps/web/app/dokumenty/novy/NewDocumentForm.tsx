"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface NewDocFormProps {
  projects: Array<{ id: string; name: string }>;
}

export function NewDocumentForm({ projects }: NewDocFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          project_id: projectId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Chyba pri vytvareni dokumentu");
        return;
      }

      router.push(`/dokumenty/${data.document.id}`);
    } catch (err) {
      setError("Chyba pri komunikaci se serverem");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #2a2a40",
    background: "#12121a",
    color: "#e8e8f0",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box" as const,
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: "#12121a",
          border: "1px solid #2a2a40",
          borderRadius: "12px",
          padding: "32px",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "24px" }}>
          Vytvorit novy dokument
        </h2>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #ef444440",
              background: "#ef444415",
              color: "#ef4444",
              fontSize: "13px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              color: "#9898b0",
              marginBottom: "6px",
            }}
          >
            Nazev dokumentu *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nazev noveho dokumentu..."
            required
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
            onBlur={(e) => (e.target.style.borderColor = "#2a2a40")}
          />
        </div>

        <div style={{ marginBottom: "28px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              color: "#9898b0",
              marginBottom: "6px",
            }}
          >
            Projekt (nepovinne)
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{
              ...inputStyle,
              cursor: "pointer",
              appearance: "none" as const,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=12 height=12 viewBox=0 0 24 24 fill=none stroke=%239898b0 stroke-width=2%3E%3Cpolyline points=6 9 12 15 18 9/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              paddingRight: "36px",
            }}
          >
            <option value="">-- Bez projektu --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim()}
          style={{
            width: "100%",
            padding: "12px 24px",
            borderRadius: "8px",
            border: "none",
            background: loading || !title.trim() ? "#3a3a50" : "linear-gradient(135deg, #6366f1, #818cf8)",
            color: loading || !title.trim() ? "#666" : "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: loading || !title.trim() ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Vytvarim..." : "Vytvorit dokument"}
        </button>
      </div>
    </form>
  );
}
