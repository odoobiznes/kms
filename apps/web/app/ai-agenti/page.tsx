"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/layout/LogoutButton";

interface AIModel {
  id: string;
  object: string;
}

interface AIConfig {
  id: string;
  provider: string;
  model: string;
  is_default: boolean;
}

const modelLabels: Record<string, string> = {
  "claude-sonnet": "Claude Sonnet",
  "claude-haiku": "Claude Haiku",
  "gpt-4o": "GPT-4o",
  "gemini-flash": "Gemini Flash",
  "groq-llama": "Groq Llama",
};

const providerFromModel: Record<string, string> = {
  "claude-sonnet": "anthropic",
  "claude-haiku": "anthropic",
  "gpt-4o": "openai",
  "gemini-flash": "google",
  "groq-llama": "groq",
};

const providerLabels: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  groq: "Groq",
};

const providerColors: Record<string, string> = {
  anthropic: "#d97706",
  openai: "#22c55e",
  google: "#3b82f6",
  groq: "#ec4899",
};

export default function AIAgentiPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("claude-sonnet");
  const [apiKey, setApiKey] = useState("");
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [user, setUser] = useState<{ display_name: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [modelsRes, settingsRes, meRes] = await Promise.all([
        fetch("/api/ai/models"),
        fetch("/api/ai/settings"),
        fetch("/api/auth/me"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user || meData);
      }

      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        setModels(modelsData.data || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSelectedModel(settingsData.default_model || "claude-sonnet");
        setConfigs(settingsData.configs || []);
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave() {
    setSaving(true);
    setSaveResult(null);
    try {
      const provider = providerFromModel[selectedModel] || "anthropic";
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model: selectedModel,
          api_key: apiKey || undefined,
        }),
      });

      if (res.ok) {
        setSaveResult({ ok: true, message: "Nastaveni ulozeno" });
        setApiKey("");
        loadData();
      } else {
        const data = await res.json();
        setSaveResult({ ok: false, message: data.error || "Chyba pri ukladani" });
      }
    } catch {
      setSaveResult({ ok: false, message: "Chyba pripojeni" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Rekni Pripojeni uspesne! v jedne vete.",
          model: selectedModel,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE data
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
                // skip unparseable
              }
            }
          }
        }

        setTestResult({
          ok: true,
          message: fullText || "Model odpoved uspesne (prazdna odpoved)",
        });
      } else {
        const errData = await res.json().catch(() => ({ error: "Neznama chyba" }));
        setTestResult({ ok: false, message: errData.error || "Test selhal" });
      }
    } catch (err) {
      setTestResult({ ok: false, message: `Chyba: ${err}` });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#9898b0", fontSize: "16px" }}>Nacitani...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      {/* Navigation */}
      <header
        style={{
          borderBottom: "1px solid #2a2a40",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(10, 10, 15, 0.8)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
          <span style={{ color: "#9898b0", fontSize: "15px" }}>AI Agenti</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#9898b0", fontSize: "14px" }}>{user?.display_name}</span>
          <LogoutButton />
        </div>
      </header>

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#e8e8f0", marginBottom: "8px" }}>
          AI Agenti
        </h1>
        <p style={{ color: "#9898b0", fontSize: "14px", marginBottom: "32px" }}>
          Konfigurace preferovaneho AI modelu a nastaveni
        </p>

        {/* Available Models */}
        <div
          style={{
            background: "#12121a",
            border: "1px solid #2a2a40",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#e8e8f0", marginBottom: "16px" }}>
            Dostupne modely
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
            {models.map((m) => {
              const provider = providerFromModel[m.id] || "unknown";
              const color = providerColors[provider] || "#9898b0";
              const isSelected = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    border: `2px solid ${isSelected ? color : "#2a2a40"}`,
                    background: isSelected ? `${color}10` : "#0a0a0f",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 600, color: isSelected ? color : "#e8e8f0", marginBottom: "4px" }}>
                    {modelLabels[m.id] || m.id}
                  </div>
                  <div style={{ fontSize: "12px", color: "#9898b0" }}>
                    {providerLabels[provider] || provider}
                  </div>
                </button>
              );
            })}
            {models.length === 0 && (
              <div style={{ color: "#9898b0", fontSize: "14px", gridColumn: "1 / -1" }}>
                Zadne modely nejsou dostupne. Zkontrolujte AI gateway.
              </div>
            )}
          </div>
        </div>

        {/* Configuration */}
        <div
          style={{
            background: "#12121a",
            border: "1px solid #2a2a40",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#e8e8f0", marginBottom: "16px" }}>
            Nastaveni
          </h2>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#9898b0", marginBottom: "6px" }}>
              Vybrany model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #2a2a40",
                background: "#0a0a0f",
                color: "#e8e8f0",
                fontSize: "14px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {modelLabels[m.id] || m.id} ({providerLabels[providerFromModel[m.id]] || ""})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#9898b0", marginBottom: "6px" }}>
              Vlastni API klic (volitelne)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-... (ponechte prazdne pro sdileny klic)"
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

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleSave}
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
                transition: "all 0.2s",
              }}
            >
              {saving ? "Ukladam..." : "Ulozit nastaveni"}
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "1px solid #2a2a40",
                background: testing ? "#1a1a2e" : "transparent",
                color: "#e8e8f0",
                fontWeight: 500,
                fontSize: "14px",
                cursor: testing ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {testing ? "Testuji..." : "Test pripojeni"}
            </button>
          </div>

          {saveResult && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 16px",
                borderRadius: "8px",
                background: saveResult.ok ? "#22c55e15" : "#ef444415",
                border: `1px solid ${saveResult.ok ? "#22c55e40" : "#ef444440"}`,
                color: saveResult.ok ? "#22c55e" : "#ef4444",
                fontSize: "13px",
              }}
            >
              {saveResult.message}
            </div>
          )}

          {testResult && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 16px",
                borderRadius: "8px",
                background: testResult.ok ? "#22c55e15" : "#ef444415",
                border: `1px solid ${testResult.ok ? "#22c55e40" : "#ef444440"}`,
                color: testResult.ok ? "#22c55e" : "#ef4444",
                fontSize: "13px",
                whiteSpace: "pre-wrap",
              }}
            >
              {testResult.ok ? "Odpoved:" : "Chyba:"} {testResult.message}
            </div>
          )}
        </div>

        {/* Current configs */}
        {configs.length > 0 && (
          <div
            style={{
              background: "#12121a",
              border: "1px solid #2a2a40",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#e8e8f0", marginBottom: "16px" }}>
              Ulozene konfigurace
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {configs.map((cfg) => {
                const color = providerColors[cfg.provider] || "#9898b0";
                return (
                  <div
                    key={cfg.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      background: "#0a0a0f",
                      border: `1px solid ${cfg.is_default ? color + "60" : "#2a2a40"}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: color,
                        }}
                      />
                      <span style={{ fontSize: "14px", color: "#e8e8f0" }}>
                        {modelLabels[cfg.model] || cfg.model}
                      </span>
                      <span style={{ fontSize: "12px", color: "#9898b0" }}>
                        {providerLabels[cfg.provider] || cfg.provider}
                      </span>
                    </div>
                    {cfg.is_default && (
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: "100px",
                          fontSize: "11px",
                          fontWeight: 500,
                          background: `${color}20`,
                          color,
                        }}
                      >
                        Vychozi
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
