"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AutoFill } from "@/components/ai/AutoFill";

export default function NovyKurzPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nazev kurzu je povinny");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/kurzy/${data.course.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Chyba pri vytvareni kurzu");
      }
    } catch {
      setError("Chyba pripojeni");
    } finally {
      setSaving(false);
    }
  }

  function handleAutoFillApply(field: string, value: string) {
    if (field === "description") {
      setDescription(value);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <AppHeader activePath="/kurzy" />

      <main style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#e8e8f0" }}>
            Novy kurz
          </h1>
          <AutoFill
            type="course"
            getName={() => name}
            getDescription={() => description}
            onApply={handleAutoFillApply}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              background: "#12121a",
              border: "1px solid #2a2a40",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", color: "#9898b0", marginBottom: "6px" }}>
                Nazev kurzu *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Napr. Zaklady TypeScript"
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #2a2a40",
                  background: "#0a0a0f",
                  color: "#e8e8f0",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "13px", color: "#9898b0", marginBottom: "6px" }}>
                Popis
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kratky popis kurzu..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #2a2a40",
                  background: "#0a0a0f",
                  color: "#e8e8f0",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {error && (
              <div style={{ marginBottom: "16px", padding: "10px 14px", borderRadius: "8px", background: "#ef444415", border: "1px solid #ef444440", color: "#ef4444", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  background: saving ? "#4a4a60" : "linear-gradient(135deg, #6366f1, #818cf8)",
                  color: "#fff",
                  fontWeight: 500,
                  fontSize: "14px",
                  border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Vytvarim..." : "Vytvorit kurz"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/kurzy")}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "1px solid #2a2a40",
                  background: "transparent",
                  color: "#9898b0",
                  fontWeight: 500,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Zrusit
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
