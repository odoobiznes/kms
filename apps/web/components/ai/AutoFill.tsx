"use client";

import { useState, useCallback } from "react";

interface AutoFillSuggestions {
  description?: string;
  goals?: string;
  category?: string;
  tags?: string[];
}

interface AutoFillProps {
  type: "project" | "course" | "plan";
  getName: () => string;
  getDescription: () => string;
  getCategory?: () => string;
  onApply: (field: string, value: string) => void;
}

export function AutoFill({ type, getName, getDescription, getCategory, onApply }: AutoFillProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AutoFillSuggestions | null>(null);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const handleAutoFill = useCallback(async () => {
    const name = getName();
    if (!name.trim()) {
      setError("Nejdrive vyplnte nazev");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestions(null);
    setApplied(new Set());

    const desc = getDescription();
    const cat = getCategory?.() || "";

    const typeLabels: Record<string, string> = {
      project: "projektu",
      course: "kurzu",
      plan: "planu",
    };

    const prompt = `Na zaklade nazvu ${typeLabels[type] || "projektu"} "${name}"${desc ? ` a castecneho popisu "${desc}"` : ""}${cat ? ` (kategorie: ${cat})` : ""}, navrhni v JSON formatu:
{
  "description": "navrzeny detailni popis (2-3 vety)",
  "goals": "hlavni cile (3-5 bodu, kazdy na novem radku)",
  "category": "navrzena kategorie (project/course/review/research/document)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
Odpovez POUZE validnim JSON bez dalsiho textu.`;

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: undefined,
          aiContext: { type: "general" },
        }),
      });

      if (!res.ok) {
        setError("Chyba pri generovani");
        setLoading(false);
        return;
      }

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || "";
                fullText += content;
              } catch {
                // skip
              }
            }
          }
        }

        // Parse JSON from response - handle markdown code blocks
        let jsonStr = fullText.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        // Also try extracting just the JSON object
        const objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) {
          jsonStr = objMatch[0];
        }

        try {
          const result = JSON.parse(jsonStr) as AutoFillSuggestions;
          setSuggestions(result);
        } catch {
          setError("AI odpoved nelze zpracovat. Zkuste znovu.");
        }
      }
    } catch (err) {
      setError(`Chyba: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [getName, getDescription, getCategory, type]);

  const handleApply = (field: string, value: string) => {
    onApply(field, value);
    setApplied((prev) => new Set(prev).add(field));
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={handleAutoFill}
        disabled={loading}
        style={{
          padding: "6px 14px",
          borderRadius: "6px",
          border: "1px solid #6366f140",
          background: loading ? "#2a2a40" : "#6366f115",
          color: loading ? "#9898b0" : "#818cf8",
          fontSize: "12px",
          fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s",
        }}
      >
        {loading ? (
          <>
            <div
              style={{
                width: "12px",
                height: "12px",
                border: "2px solid #2a2a40",
                borderTopColor: "#6366f1",
                borderRadius: "50%",
                animation: "autofill-spin 0.8s linear infinite",
              }}
            />
            Generuji...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3V6a4 4 0 0 1 4-4z" />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
            </svg>
            AI Doplnit
          </>
        )}
      </button>

      {error && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            minWidth: "300px",
            padding: "10px 14px",
            background: "#1a1a2e",
            border: "1px solid #ef444440",
            borderRadius: "10px",
            color: "#ef4444",
            fontSize: "13px",
            zIndex: 100,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {error}
          <button
            onClick={() => setError("")}
            style={{
              position: "absolute",
              top: "6px",
              right: "8px",
              background: "none",
              border: "none",
              color: "#9898b0",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            x
          </button>
        </div>
      )}

      {suggestions && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            minWidth: "380px",
            maxWidth: "450px",
            background: "#12121a",
            border: "1px solid #2a2a40",
            borderRadius: "12px",
            padding: "16px",
            zIndex: 100,
            boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#e8e8f0" }}>
              AI navrhy
            </span>
            <button
              onClick={() => setSuggestions(null)}
              style={{
                background: "none",
                border: "none",
                color: "#9898b0",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              x
            </button>
          </div>

          {suggestions.description && (
            <SuggestionItem
              label="Popis"
              value={suggestions.description}
              applied={applied.has("description")}
              onApply={() => handleApply("description", suggestions.description!)}
            />
          )}

          {suggestions.goals && (
            <SuggestionItem
              label="Cile"
              value={suggestions.goals}
              applied={applied.has("goals")}
              onApply={() => handleApply("goals", suggestions.goals!)}
            />
          )}

          {suggestions.category && type === "project" && (
            <SuggestionItem
              label="Kategorie"
              value={suggestions.category}
              applied={applied.has("category")}
              onApply={() => handleApply("category", suggestions.category!)}
            />
          )}

          {suggestions.tags && suggestions.tags.length > 0 && (
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "11px", color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                Tagy
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {suggestions.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: "#6366f115",
                      color: "#818cf8",
                      fontSize: "11px",
                      border: "1px solid #6366f130",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes autofill-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function SuggestionItem({
  label,
  value,
  applied,
  onApply,
}: {
  label: string;
  value: string;
  applied: boolean;
  onApply: () => void;
}) {
  return (
    <div
      style={{
        marginTop: "10px",
        padding: "10px 12px",
        background: applied ? "#22c55e08" : "#0a0a0f",
        border: `1px solid ${applied ? "#22c55e30" : "#2a2a40"}`,
        borderRadius: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {label}
        </span>
        <button
          onClick={onApply}
          disabled={applied}
          style={{
            padding: "3px 10px",
            borderRadius: "4px",
            border: "none",
            background: applied ? "#22c55e20" : "#6366f1",
            color: applied ? "#22c55e" : "#fff",
            fontSize: "11px",
            fontWeight: 500,
            cursor: applied ? "default" : "pointer",
          }}
        >
          {applied ? "Pouzito" : "Pouzit"}
        </button>
      </div>
      <div style={{ fontSize: "13px", color: "#e8e8f0", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
        {value}
      </div>
    </div>
  );
}
