"use client";

import { useState, useEffect, useCallback } from "react";

interface WikiCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  article_count: number;
}

interface WikiExportProps {
  documentId: string;
  documentTitle: string;
  documentContent?: string;
  documentStatus?: string;
}

export function WikiExport({
  documentId,
  documentTitle,
  documentContent,
  documentStatus,
}: WikiExportProps) {
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(1);
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft");
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [loadingCats, setLoadingCats] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoadingCats(true);
    try {
      const res = await fetch("/api/wiki?action=categories");
      const data = await res.json();
      setCategories(data.categories || []);
      if (data.categories?.length > 0) {
        setSelectedCategory(data.categories[0].id);
      }
    } catch {
      setCategories([]);
    } finally {
      setLoadingCats(false);
    }
  }, []);

  useEffect(() => {
    if (showModal) {
      fetchCategories();
      setResult(null);
    }
  }, [showModal, fetchCategories]);

  const doExport = useCallback(async () => {
    setExporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "export_document",
          document_id: documentId,
          category_id: selectedCategory,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          status,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ ok: true, message: data.message });
      } else {
        setResult({ ok: false, message: data.error || "Neznama chyba" });
      }
    } catch (err) {
      setResult({ ok: false, message: String(err) });
    } finally {
      setExporting(false);
    }
  }, [documentId, selectedCategory, tags, status]);

  // Content preview
  const preview = documentContent
    ? documentContent.substring(0, 500) + (documentContent.length > 500 ? "..." : "")
    : "(Obsah dokumentu)";

  return (
    <>
      {/* Export button */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px solid #f59e0b40",
          background: "rgba(245,158,11,0.08)",
          color: "#f59e0b",
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.2s",
          width: "100%",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.15)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.08)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <polyline points="9 15 12 12 15 15" />
        </svg>
        Exportovat do WikiSys
      </button>

      {/* Modal overlay */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: "#12121a",
              border: "1px solid #2a2a40",
              borderRadius: "16px",
              padding: "24px",
              width: "480px",
              maxWidth: "90vw",
              maxHeight: "85vh",
              overflow: "auto",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#e8e8f0", margin: 0 }}>
                Export do WikiSys
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9898b0",
                  cursor: "pointer",
                  fontSize: "18px",
                  padding: "4px 8px",
                }}
              >
                x
              </button>
            </div>

            {/* Document info */}
            <div
              style={{
                padding: "12px",
                background: "#0a0a0f",
                borderRadius: "8px",
                border: "1px solid #1a1a2e",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#e8e8f0", marginBottom: "4px" }}>
                {documentTitle}
              </div>
              <div style={{ fontSize: "11px", color: "#9898b0" }}>
                Status: {documentStatus || "draft"}
              </div>
            </div>

            {/* Category */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#9898b0",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Kategorie
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(Number(e.target.value))}
                disabled={loadingCats}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #2a2a40",
                  background: "#0a0a0f",
                  color: "#e8e8f0",
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.article_count} clanku)
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#9898b0",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Tagy (oddelene carkou)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="dokumentace, kms, projekt"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #2a2a40",
                  background: "#0a0a0f",
                  color: "#e8e8f0",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Status */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#9898b0",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Status clanku
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { value: "draft", label: "Koncept" },
                  { value: "published", label: "Publikovano" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${status === opt.value ? "#f59e0b" : "#2a2a40"}`,
                      background: status === opt.value ? "rgba(245,158,11,0.1)" : "transparent",
                      color: status === opt.value ? "#f59e0b" : "#9898b0",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#9898b0",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Nahled obsahu
              </label>
              <div
                style={{
                  padding: "12px",
                  background: "#0a0a0f",
                  borderRadius: "8px",
                  border: "1px solid #1a1a2e",
                  maxHeight: "120px",
                  overflow: "auto",
                  fontSize: "12px",
                  lineHeight: "1.6",
                  color: "#c8c8d0",
                  whiteSpace: "pre-wrap",
                }}
              >
                {preview}
              </div>
            </div>

            {/* Result message */}
            {result && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  background: result.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  color: result.ok ? "#22c55e" : "#ef4444",
                  border: `1px solid ${result.ok ? "#22c55e30" : "#ef444430"}`,
                }}
              >
                {result.message}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid #2a2a40",
                  background: "transparent",
                  color: "#9898b0",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Zrusit
              </button>
              <button
                onClick={doExport}
                disabled={exporting || (result?.ok ?? false)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    exporting || result?.ok ? "rgba(245,158,11,0.3)" : "#f59e0b",
                  color: "#000",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: exporting || result?.ok ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {exporting
                  ? "Exportuji..."
                  : result?.ok
                  ? "Exportovano"
                  : "Exportovat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
