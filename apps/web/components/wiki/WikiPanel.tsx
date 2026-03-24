"use client";

import { useState, useCallback } from "react";

interface WikiArticle {
  id: number;
  title: string;
  slug: string;
  category_name: string;
  category_slug: string;
  tags: string[];
  views: number;
  created_at: string;
  updated_at: string;
  version_num?: number;
  content?: string;
  content_html?: string;
}

interface WikiPanelProps {
  projectId?: string | null;
  onImported?: (docId: string) => void;
}

export function WikiPanel({ projectId, onImported }: WikiPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<WikiArticle[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const doSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSelectedArticle(null);
    setImportMsg("");
    try {
      const res = await fetch(`/api/wiki?action=search&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const loadArticle = useCallback(async (slug: string) => {
    setLoadingArticle(true);
    setImportMsg("");
    try {
      const res = await fetch(`/api/wiki?action=article&slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setSelectedArticle(data.article || null);
    } catch {
      setSelectedArticle(null);
    } finally {
      setLoadingArticle(false);
    }
  }, []);

  const importArticle = useCallback(async () => {
    if (!selectedArticle) return;
    setImporting(true);
    setImportMsg("");
    try {
      const res = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_article",
          slug: selectedArticle.slug,
          project_id: projectId || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setImportMsg(`Importovano jako "${data.title}"`);
        onImported?.(data.document_id);
      } else {
        setImportMsg(`Chyba: ${data.error}`);
      }
    } catch (err) {
      setImportMsg(`Chyba: ${String(err)}`);
    } finally {
      setImporting(false);
    }
  }, [selectedArticle, projectId, onImported]);

  return (
    <div
      style={{
        background: "#12121a",
        borderRadius: "12px",
        border: "1px solid #2a2a40",
        overflow: "hidden",
      }}
    >
      {/* Header - toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#e8e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "#9898b0",
            }}
          >
            WikiSys
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9898b0"
          strokeWidth="2"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 16px" }}>
          {/* Search */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Hledat ve WikiSys..."
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #2a2a40",
                background: "#0a0a0f",
                color: "#e8e8f0",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              onClick={doSearch}
              disabled={searching}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #f59e0b40",
                background: "rgba(245,158,11,0.1)",
                color: "#f59e0b",
                fontSize: "12px",
                cursor: searching ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {searching ? "..." : "Hledat"}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && !selectedArticle && (
            <div
              style={{
                maxHeight: "240px",
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {results.map((art) => (
                <button
                  key={art.id}
                  onClick={() => loadArticle(art.slug)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #1a1a2e",
                    background: "#0a0a0f",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                    color: "#e8e8f0",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor = "#f59e0b40")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor = "#1a1a2e")
                  }
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      marginBottom: "4px",
                      color: "#e8e8f0",
                    }}
                  >
                    {art.title}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#9898b0",
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: "rgba(245,158,11,0.1)",
                        color: "#f59e0b",
                        fontSize: "10px",
                      }}
                    >
                      {art.category_name}
                    </span>
                    {art.tags && art.tags.length > 0 && (
                      <span>{art.tags.slice(0, 3).join(", ")}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && searchQuery && !searching && (
            <div
              style={{
                textAlign: "center",
                padding: "16px",
                color: "#9898b0",
                fontSize: "13px",
              }}
            >
              Zadne vysledky
            </div>
          )}

          {/* Article Preview */}
          {loadingArticle && (
            <div
              style={{
                textAlign: "center",
                padding: "16px",
                color: "#9898b0",
                fontSize: "13px",
              }}
            >
              Nacitam clanek...
            </div>
          )}

          {selectedArticle && (
            <div
              style={{
                background: "#0a0a0f",
                border: "1px solid #2a2a40",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "8px",
                }}
              >
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#e8e8f0", margin: 0 }}>
                  {selectedArticle.title}
                </h4>
                <button
                  onClick={() => setSelectedArticle(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#9898b0",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: "0 4px",
                  }}
                >
                  x
                </button>
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "#9898b0",
                  marginBottom: "8px",
                  display: "flex",
                  gap: "8px",
                }}
              >
                <span>{selectedArticle.category_name}</span>
                <span>v{selectedArticle.version_num || 1}</span>
              </div>

              {/* Content preview */}
              <div
                style={{
                  maxHeight: "200px",
                  overflow: "auto",
                  fontSize: "12px",
                  lineHeight: "1.6",
                  color: "#c8c8d0",
                  padding: "8px",
                  background: "#12121a",
                  borderRadius: "6px",
                  marginBottom: "12px",
                }}
              >
                {selectedArticle.content
                  ? selectedArticle.content.substring(0, 800) +
                    (selectedArticle.content.length > 800 ? "..." : "")
                  : "Bez obsahu"}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={importArticle}
                  disabled={importing}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #6366f1",
                    background: importing ? "rgba(99,102,241,0.2)" : "#6366f1",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: importing ? "not-allowed" : "pointer",
                  }}
                >
                  {importing ? "Importuji..." : "Importovat do KMS"}
                </button>
                <a
                  href={`https://wikisys.it-enterprise.pro/wiki/${selectedArticle.category_slug}/${selectedArticle.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #2a2a40",
                    color: "#9898b0",
                    fontSize: "12px",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  Otevrit
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>

              {importMsg && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: importMsg.startsWith("Chyba")
                      ? "rgba(239,68,68,0.1)"
                      : "rgba(34,197,94,0.1)",
                    color: importMsg.startsWith("Chyba") ? "#ef4444" : "#22c55e",
                  }}
                >
                  {importMsg}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
