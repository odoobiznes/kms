"use client";

import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/layout/AppHeader";

interface IntegrationSystem {
  id: string;
  name: string;
  icon: string;
  description: string;
  lastSync: string | null;
  status: "connected" | "disconnected" | "syncing";
  color: string;
}

interface IntegrationEvent {
  id: string;
  event_type: string;
  source_system: string;
  status: string;
  details: string;
  data: Record<string, unknown>;
  created_at: string;
}

interface WikiStatus {
  connected: boolean;
  version?: string;
  exported_count?: number;
  last_export?: string | null;
}

const SYSTEMS: IntegrationSystem[] = [
  { id: "mngmt", name: "Mngmt", icon: "M", description: "Dashboard, Salt, monitoring", lastSync: null, status: "connected", color: "#6366f1" },
  { id: "ops", name: "OPS", icon: "O", description: "Projekty, kolaborace", lastSync: null, status: "connected", color: "#3b82f6" },
  { id: "vpn", name: "VPN", icon: "V", description: "WireGuard, enrollment", lastSync: null, status: "connected", color: "#22c55e" },
  { id: "wikisys", name: "WikiSys", icon: "W", description: "Wiki, znalostni baze", lastSync: null, status: "disconnected", color: "#f59e0b" },
  { id: "sso", name: "SSO", icon: "S", description: "Single Sign-On, OIDC", lastSync: null, status: "disconnected", color: "#ec4899" },
  { id: "analytics", name: "Analytics", icon: "A", description: "Analytika, metriky", lastSync: null, status: "disconnected", color: "#8b5cf6" },
  { id: "trezor", name: "Trezor", icon: "T", description: "Sifrovany uloziste", lastSync: null, status: "disconnected", color: "#14b8a6" },
  { id: "backups", name: "Backups", icon: "B", description: "Zalohovani, obnova", lastSync: null, status: "disconnected", color: "#f97316" },
  { id: "projects", name: "Projects", icon: "P", description: "Projektovy management", lastSync: null, status: "connected", color: "#06b6d4" },
  { id: "chat", name: "Chat", icon: "C", description: "Tymova komunikace", lastSync: null, status: "disconnected", color: "#84cc16" },
  { id: "tasks", name: "Tasks", icon: "U", description: "Sprava uloh", lastSync: null, status: "disconnected", color: "#e11d48" },
  { id: "collab", name: "Collab", icon: "K", description: "Kolaboracni worker", lastSync: null, status: "connected", color: "#7c3aed" },
  { id: "dev", name: "Dev", icon: "D", description: "Vyvojove prostredi", lastSync: null, status: "disconnected", color: "#0ea5e9" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "prave ted";
  if (minutes < 60) return `pred ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `pred ${hours}h`;
  const days = Math.floor(hours / 24);
  return `pred ${days}d`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    connected: { bg: "rgba(34,197,94,0.1)", text: "#22c55e", dot: "#22c55e" },
    disconnected: { bg: "rgba(156,163,175,0.1)", text: "#9898b0", dot: "#6b6b80" },
    syncing: { bg: "rgba(99,102,241,0.1)", text: "#6366f1", dot: "#6366f1" },
    success: { bg: "rgba(34,197,94,0.1)", text: "#22c55e", dot: "#22c55e" },
    error: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", dot: "#ef4444" },
  };
  const c = colors[status] || colors.disconnected;
  const labels: Record<string, string> = {
    connected: "Pripojeno",
    disconnected: "Odpojeno",
    syncing: "Synchronizace...",
    success: "OK",
    error: "Chyba",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "100px",
        background: c.bg,
        color: c.text,
        fontSize: "12px",
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: c.dot,
        }}
      />
      {labels[status] || status}
    </span>
  );
}

export default function WorkflowsPage() {
  const [systems, setSystems] = useState<IntegrationSystem[]>(SYSTEMS);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [wikiStatus, setWikiStatus] = useState<WikiStatus | null>(null);
  const [wikiSyncing, setWikiSyncing] = useState(false);
  const [wikiSyncResult, setWikiSyncResult] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);

        // Update last sync times from events
        setSystems((prev) =>
          prev.map((sys) => {
            const lastEvent = (data.events || []).find(
              (e: IntegrationEvent) =>
                e.source_system.toLowerCase() === sys.id ||
                e.source_system.toLowerCase() === sys.name.toLowerCase()
            );
            return lastEvent
              ? { ...sys, lastSync: lastEvent.created_at }
              : sys;
          })
        );
      }
    } catch {
      // silent
    }
  }, []);

  const fetchWikiStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/wiki?action=status");
      if (res.ok) {
        const data = await res.json();
        setWikiStatus(data);

        // Update WikiSys card status
        setSystems((prev) =>
          prev.map((sys) =>
            sys.id === "wikisys"
              ? {
                  ...sys,
                  status: data.connected ? "connected" : "disconnected",
                  lastSync: data.last_export || sys.lastSync,
                }
              : sys
          )
        );
      }
    } catch {
      setWikiStatus({ connected: false });
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchWikiStatus();
  }, [fetchEvents, fetchWikiStatus]);

  async function syncAll() {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    await fetchEvents();
    await fetchWikiStatus();
    setSyncing(false);
  }

  async function syncWikiClosed() {
    setWikiSyncing(true);
    setWikiSyncResult(null);
    try {
      const res = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_closed" }),
      });
      const data = await res.json();
      if (data.ok) {
        setWikiSyncResult(
          `Synchronizovano ${data.exported_count} dokumentu` +
            (data.error_count > 0 ? ` (${data.error_count} chyb)` : "")
        );
        await fetchWikiStatus();
        await fetchEvents();
      } else {
        setWikiSyncResult(`Chyba: ${data.error}`);
      }
    } catch (err) {
      setWikiSyncResult(`Chyba: ${String(err)}`);
    } finally {
      setWikiSyncing(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <AppHeader activePath="/workflows" />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Page title */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#e8e8f0", marginBottom: "8px" }}>
              Integrace a Workflow
            </h1>
            <p style={{ fontSize: "14px", color: "#9898b0" }}>
              Prehled integrovanych systemu a n8n automatizaci
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={syncAll}
              disabled={syncing}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #6366f1",
                background: syncing ? "rgba(99,102,241,0.2)" : "#6366f1",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                cursor: syncing ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {syncing ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </span>
                  Synchronizuji...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Sync vsechny
                </>
              )}
            </button>
            <a
              href="/n8n/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #2a2a40",
                background: "transparent",
                color: "#e8e8f0",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textDecoration: "none",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              n8n Dashboard
            </a>
          </div>
        </div>

        {/* WikiSys Detail Card */}
        <div
          style={{
            background: "#12121a",
            border: "1px solid #f59e0b30",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(245,158,11,0.15)",
                  color: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "18px",
                }}
              >
                W
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "16px", color: "#e8e8f0" }}>
                  WikiSys
                </div>
                <div style={{ fontSize: "13px", color: "#9898b0", marginTop: "2px" }}>
                  Znalostni baze - bidirekcni integrace
                </div>
              </div>
            </div>
            <StatusBadge status={wikiStatus?.connected ? "connected" : "disconnected"} />
          </div>

          {/* Wiki stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                padding: "16px",
                background: "#0a0a0f",
                borderRadius: "8px",
                border: "1px solid #1a1a2e",
              }}
            >
              <div style={{ fontSize: "11px", color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                Status pripojeni
              </div>
              <div style={{ fontSize: "18px", fontWeight: 600, color: wikiStatus?.connected ? "#22c55e" : "#ef4444" }}>
                {wikiStatus?.connected ? "Online" : "Offline"}
              </div>
              {wikiStatus?.version && (
                <div style={{ fontSize: "11px", color: "#9898b0", marginTop: "2px" }}>
                  API v{wikiStatus.version}
                </div>
              )}
            </div>
            <div
              style={{
                padding: "16px",
                background: "#0a0a0f",
                borderRadius: "8px",
                border: "1px solid #1a1a2e",
              }}
            >
              <div style={{ fontSize: "11px", color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                Exportovano clanku
              </div>
              <div style={{ fontSize: "18px", fontWeight: 600, color: "#f59e0b" }}>
                {wikiStatus?.exported_count ?? 0}
              </div>
            </div>
            <div
              style={{
                padding: "16px",
                background: "#0a0a0f",
                borderRadius: "8px",
                border: "1px solid #1a1a2e",
              }}
            >
              <div style={{ fontSize: "11px", color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                Posledni export
              </div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#e8e8f0" }}>
                {wikiStatus?.last_export
                  ? timeAgo(wikiStatus.last_export)
                  : "Zatim zadny"}
              </div>
            </div>
          </div>

          {/* Sync actions */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={syncWikiClosed}
              disabled={wikiSyncing || !wikiStatus?.connected}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #f59e0b",
                background: wikiSyncing ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)",
                color: "#f59e0b",
                fontSize: "13px",
                fontWeight: 500,
                cursor: wikiSyncing || !wikiStatus?.connected ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {wikiSyncing ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </span>
                  Synchronizuji...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Sync vsechny uzavrene dokumenty
                </>
              )}
            </button>
            <a
              href="https://wikisys.it-enterprise.pro"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #2a2a40",
                color: "#9898b0",
                fontSize: "13px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Otevrit WikiSys
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>

          {wikiSyncResult && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                background: wikiSyncResult.startsWith("Chyba")
                  ? "rgba(239,68,68,0.1)"
                  : "rgba(34,197,94,0.1)",
                color: wikiSyncResult.startsWith("Chyba") ? "#ef4444" : "#22c55e",
                border: `1px solid ${wikiSyncResult.startsWith("Chyba") ? "#ef444420" : "#22c55e20"}`,
              }}
            >
              {wikiSyncResult}
            </div>
          )}
        </div>

        {/* Systems Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          {systems.map((sys) => (
            <div
              key={sys.id}
              style={{
                background: "#12121a",
                border: "1px solid #2a2a40",
                borderRadius: "12px",
                padding: "20px",
                transition: "all 0.2s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = sys.color;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${sys.color}15`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#2a2a40";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: `${sys.color}20`,
                      color: sys.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "14px",
                    }}
                  >
                    {sys.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#e8e8f0" }}>
                      {sys.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9898b0", marginTop: "2px" }}>
                      {sys.description}
                    </div>
                  </div>
                </div>
                <StatusBadge status={sys.status} />
              </div>
              <div style={{ fontSize: "11px", color: "#6b6b80" }}>
                {sys.lastSync ? `Posledni sync: ${timeAgo(sys.lastSync)}` : "Zatim bez synchronizace"}
              </div>
            </div>
          ))}
        </div>

        {/* Events Log */}
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#e8e8f0", marginBottom: "16px" }}>
            Log udalosti
          </h2>
          <div
            style={{
              background: "#12121a",
              border: "1px solid #2a2a40",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            {events.length === 0 ? (
              <div
                style={{
                  padding: "48px 16px",
                  textAlign: "center",
                  color: "#9898b0",
                  fontSize: "14px",
                }}
              >
                Zadne udalosti k zobrazeni
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid #2a2a40",
                      color: "#9898b0",
                      fontSize: "12px",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.5px",
                    }}
                  >
                    <th style={{ padding: "12px 16px", textAlign: "left" as const, fontWeight: 500 }}>Cas</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" as const, fontWeight: 500 }}>Typ</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" as const, fontWeight: 500 }}>Zdroj</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" as const, fontWeight: 500 }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" as const, fontWeight: 500 }}>Detaily</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      style={{
                        borderBottom: "1px solid #1a1a2e",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.03)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <td style={{ padding: "10px 16px", color: "#9898b0", whiteSpace: "nowrap" as const }}>
                        {new Date(event.created_at).toLocaleString("cs-CZ", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td style={{ padding: "10px 16px", color: "#e8e8f0", fontFamily: "monospace", fontSize: "12px" }}>
                        {event.event_type}
                      </td>
                      <td style={{ padding: "10px 16px", color: "#e8e8f0" }}>{event.source_system}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <StatusBadge status={event.status} />
                      </td>
                      <td
                        style={{
                          padding: "10px 16px",
                          color: "#9898b0",
                          maxWidth: "300px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap" as const,
                        }}
                      >
                        {event.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
