"use client";

import { CollabEditor } from "@/components/editor/CollabEditor";
import { StageManager } from "@/components/voting/StageManager";
import Link from "next/link";

interface DocEditorProps {
  doc: {
    id: string;
    title: string;
    status: string;
    stage_order: number;
    project_id: string | null;
    created_at: string;
    updated_at: string;
  };
  stages: Array<{
    id: string;
    name: string;
    stage_order: number;
    status: string;
    vote_count: number;
    approve_count: number;
    reject_count: number;
  }>;
  user: { id: string; display_name: string };
  memberCount: number;
}

const statusLabels: Record<string, string> = {
  draft: "Koncept",
  review: "Revize",
  voting: "Hlasovani",
  approved: "Schvaleno",
  closed: "Uzavreno",
};

const statusColors: Record<string, string> = {
  draft: "#9898b0",
  review: "#f59e0b",
  voting: "#6366f1",
  approved: "#22c55e",
  closed: "#3b82f6",
};

export function DocumentEditor({ doc, stages, user, memberCount }: DocEditorProps) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #2a2a40",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(10, 10, 15, 0.9)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link
            href="/dokumenty"
            style={{
              color: "#9898b0",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "color 0.2s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Dokumenty
          </Link>
          <div style={{ width: "1px", height: "20px", background: "#2a2a40" }} />
          <h1 style={{ fontSize: "16px", fontWeight: 600, color: "#e8e8f0" }}>
            {doc.title}
          </h1>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "100px",
              fontSize: "11px",
              fontWeight: 500,
              border: `1px solid ${statusColors[doc.status] || "#9898b0"}30`,
              color: statusColors[doc.status] || "#9898b0",
              background: `${statusColors[doc.status] || "#9898b0"}10`,
            }}
          >
            {statusLabels[doc.status] || doc.status}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", color: "#9898b0" }}>
            {user.display_name}
          </span>
          <Link
            href="/"
            style={{
              padding: "6px 16px",
              borderRadius: "8px",
              border: "1px solid #2a2a40",
              fontSize: "13px",
              color: "#9898b0",
              transition: "all 0.2s",
            }}
          >
            Domov
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "0",
          maxWidth: "1400px",
          margin: "0 auto",
          minHeight: "calc(100vh - 57px)",
        }}
      >
        {/* Editor area */}
        <div style={{ padding: "24px", borderRight: "1px solid #2a2a40" }}>
          <div
            style={{
              border: "1px solid #2a2a40",
              borderRadius: "12px",
              overflow: "hidden",
              height: "calc(100vh - 120px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CollabEditor
              documentId={doc.id}
              userName={user.display_name}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ padding: "24px", overflow: "auto" }}>
          <StageManager
            documentId={doc.id}
            stages={stages}
            currentStageOrder={doc.stage_order}
            userId={user.id}
            memberCount={memberCount}
            docStatus={doc.status}
          />

          {/* Document info */}
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              background: "#12121a",
              borderRadius: "12px",
              border: "1px solid #2a2a40",
            }}
          >
            <h3 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Informace
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9898b0" }}>Vytvoreno</span>
                <span style={{ color: "#e8e8f0" }}>
                  {new Date(doc.created_at).toLocaleDateString("cs-CZ")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9898b0" }}>Aktualizovano</span>
                <span style={{ color: "#e8e8f0" }}>
                  {new Date(doc.updated_at).toLocaleDateString("cs-CZ")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9898b0" }}>Stav</span>
                <span style={{ color: statusColors[doc.status] || "#9898b0" }}>
                  {statusLabels[doc.status] || doc.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
