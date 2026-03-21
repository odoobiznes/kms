"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface AIAssistantProps {
  documentId: string;
  documentContent?: string;
  onInsert?: (text: string) => void;
  onAddContribution?: (text: string) => void;
}

const quickPrompts = [
  { label: "Navrhnout obsah", prompt: "Navrhni obsah pro tuto sekci dokumentu." },
  { label: "Prepsat profesionalneji", prompt: "Prepis tento text profesionalneji a srozumitelneji." },
  { label: "Shrnout", prompt: "Shrun tento dokument do klicovych bodu." },
  { label: "Opravit gramatiku", prompt: "Oprav gramaticke chyby v textu a vylepsit stylistiku." },
  { label: "Rozsirit", prompt: "Rozsir a doplni tento text o dalsi detaily a vysvetleni." },
];

export function AIAssistant({ documentId, documentContent, onInsert, onAddContribution }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.default_model) setModel(data.default_model);
      })
      .catch(() => {});
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse("");
    setError("");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          context: documentContent || undefined,
          model: model || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Neznama chyba" }));
        setError(errData.error || "Generovani selhalo");
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
                setResponse(fullText);
              } catch {
                // skip
              }
            }
          }
        }

        if (!fullText) {
          setResponse("(Model odpoved uspesne, ale bez obsahu)");
        }
      }
    } catch (err) {
      setError(`Chyba: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [prompt, documentContent, model]);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  const modelLabels: Record<string, string> = {
    "claude-sonnet": "Claude Sonnet",
    "claude-haiku": "Claude Haiku",
    "gpt-4o": "GPT-4o",
    "gemini-flash": "Gemini Flash",
    "groq-llama": "Groq Llama",
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #818cf8)",
          border: "none",
          color: "#fff",
          fontSize: "24px",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(99, 102, 241, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          transition: "transform 0.2s",
        }}
        title="AI Asistent"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3V6a4 4 0 0 1 4-4z" />
          <path d="M9 18v3" />
          <path d="M15 18v3" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
        </svg>
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "420px",
        maxHeight: "600px",
        background: "#12121a",
        border: "1px solid #2a2a40",
        borderRadius: "16px",
        boxShadow: "0 8px 48px rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #2a2a40",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, #6366f115, #818cf810)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3V6a4 4 0 0 1 4-4z" />
            <circle cx="9" cy="10" r="1" fill="#6366f1" />
            <circle cx="15" cy="10" r="1" fill="#6366f1" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: "15px", color: "#e8e8f0" }}>AI Asistent</span>
          {model && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "100px",
                fontSize: "11px",
                fontWeight: 500,
                background: "#6366f120",
                color: "#818cf8",
              }}
            >
              {modelLabels[model] || model}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "#9898b0",
            cursor: "pointer",
            fontSize: "20px",
            padding: "4px",
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>

      {/* Quick prompts */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          borderBottom: "1px solid #2a2a40",
        }}
      >
        {quickPrompts.map((qp) => (
          <button
            key={qp.label}
            onClick={() => {
              setPrompt(qp.prompt);
            }}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              border: "1px solid #2a2a40",
              background: "transparent",
              color: "#9898b0",
              fontSize: "11px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Response area */}
      <div
        ref={responseRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          minHeight: "120px",
          maxHeight: "300px",
        }}
      >
        {loading && !response && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9898b0", fontSize: "14px" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid #2a2a40",
                borderTopColor: "#6366f1",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Generuji odpoved...
          </div>
        )}
        {error && (
          <div style={{ color: "#ef4444", fontSize: "13px", padding: "8px 12px", background: "#ef444415", borderRadius: "8px" }}>
            {error}
          </div>
        )}
        {response && (
          <div
            style={{
              fontSize: "14px",
              color: "#e8e8f0",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {response}
          </div>
        )}
        {!loading && !error && !response && (
          <div style={{ color: "#4a4a60", fontSize: "14px", textAlign: "center", padding: "24px 0" }}>
            Zadejte prompt nebo zvolte rychly prikaz
          </div>
        )}
      </div>

      {/* Action buttons for response */}
      {response && !loading && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid #2a2a40",
            display: "flex",
            gap: "8px",
          }}
        >
          {onInsert && (
            <button
              onClick={() => onInsert(response)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Vlozit do dokumentu
            </button>
          )}
          {onAddContribution && (
            <button
              onClick={() => onAddContribution(response)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #22c55e40",
                background: "#22c55e15",
                color: "#22c55e",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Pridat jako prispevek
            </button>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(response);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #2a2a40",
              background: "transparent",
              color: "#9898b0",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Kopirovat
          </button>
        </div>
      )}

      {/* Input area */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #2a2a40",
          display: "flex",
          gap: "8px",
        }}
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !loading) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder="Zadejte prompt pro AI..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #2a2a40",
            background: "#0a0a0f",
            color: "#e8e8f0",
            fontSize: "14px",
            outline: "none",
          }}
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            background: loading || !prompt.trim() ? "#2a2a40" : "linear-gradient(135deg, #6366f1, #818cf8)",
            color: "#fff",
            cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
            fontSize: "14px",
            transition: "all 0.2s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
