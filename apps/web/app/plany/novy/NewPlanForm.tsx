"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AutoFill } from "@/components/ai/AutoFill";

interface Project {
  id: string;
  name: string;
}

export function NewPlanForm({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      title: title.trim(),
      description: description.trim(),
      project_id: form.get("project_id") as string || null,
      due_date: form.get("due_date") as string || null,
      priority: Number(form.get("priority")) || 5,
    };

    if (!data.title) {
      setError("Nazev je povinny");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        router.push(`/plany/${result.plan.id}`);
      } else {
        const err = await res.json();
        setError(err.error || "Nepodarilo se vytvorit plan");
      }
    } catch {
      setError("Chyba pripojeni");
    } finally {
      setLoading(false);
    }
  }

  function handleAutoFillApply(field: string, value: string) {
    if (field === "description") {
      setDescription(value);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <AutoFill
          type="plan"
          getName={() => title}
          getDescription={() => description}
          onApply={handleAutoFillApply}
        />
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px",
              color: "#ef4444",
              fontSize: "14px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* Title */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Nazev planu *</label>
          <input
            name="title"
            type="text"
            required
            placeholder="Nazev planu..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Popis</label>
          <textarea
            name="description"
            rows={4}
            placeholder="Popis planu..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* Project */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Projekt</label>
          <select name="project_id" style={inputStyle}>
            <option value="">-- Bez projektu --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Due date + Priority row */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Termin</label>
            <input
              name="due_date"
              type="date"
              style={{ ...inputStyle, colorScheme: "dark" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Priorita (1=nejvyssi, 5=nejnizsi)</label>
            <select name="priority" defaultValue="5" style={inputStyle}>
              <option value="1">1 - Kriticka</option>
              <option value="2">2 - Vysoka</option>
              <option value="3">3 - Stredni</option>
              <option value="4">4 - Nizka</option>
              <option value="5">5 - Minimalni</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "15px",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Vytvari se..." : "Vytvorit plan"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              background: "transparent",
              color: "#9898b0",
              fontWeight: 500,
              fontSize: "15px",
              border: "1px solid #2a2a40",
              cursor: "pointer",
            }}
          >
            Zrusit
          </button>
        </div>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#9898b0",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "#12121a",
  border: "1px solid #2a2a40",
  borderRadius: "8px",
  color: "#e8e8f0",
  fontSize: "14px",
  outline: "none",
};
