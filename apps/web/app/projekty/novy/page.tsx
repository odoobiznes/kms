"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const categories = [
  { value: "project", label: "Projekt" },
  { value: "document", label: "Dokument" },
  { value: "course", label: "Kurz" },
  { value: "review", label: "Revize" },
  { value: "research", label: "Vyzkum" },
];

export default function NovyProjektPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("project");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Chyba pri vytvareni projektu");
        return;
      }

      router.push(`/projekty/${data.project.id}`);
    } catch {
      setError("Nelze se pripojit k serveru");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #2a2a40",
    background: "#0a0a0f",
    color: "#e8e8f0",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      {/* Navigation */}
      <header
        style={{
          borderBottom: "1px solid #2a2a40",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(10, 10, 15, 0.8)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "14px",
              color: "#fff",
            }}
          >
            K
          </div>
          <span style={{ fontWeight: 600, fontSize: "18px", color: "#e8e8f0" }}>KMS</span>
        </Link>
        <span style={{ color: "#2a2a40", margin: "0 8px" }}>/</span>
        <Link href="/projekty" style={{ color: "#9898b0", fontSize: "15px" }}>
          Projekty
        </Link>
        <span style={{ color: "#2a2a40", margin: "0 8px" }}>/</span>
        <span style={{ color: "#e8e8f0", fontSize: "15px" }}>Novy projekt</span>
      </header>

      <main style={{ maxWidth: "600px", margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#e8e8f0", marginBottom: "32px" }}>
          Novy projekt
        </h1>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "20px",
              color: "#ef4444",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#9898b0", marginBottom: "6px" }}>
              Nazev projektu *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nazev vaseho projektu"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#9898b0", marginBottom: "6px" }}>
              Popis
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kratky popis projektu..."
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#9898b0", marginBottom: "6px" }}>
              Kategorie *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                ...inputStyle,
                cursor: "pointer",
                appearance: "none",
              }}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                background: loading ? "#4b4b6b" : "linear-gradient(135deg, #6366f1, #818cf8)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "15px",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Vytvari se..." : "Vytvorit projekt"}
            </button>
            <Link
              href="/projekty"
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "1px solid #2a2a40",
                color: "#9898b0",
                fontSize: "15px",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Zrusit
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
