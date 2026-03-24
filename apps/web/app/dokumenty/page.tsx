import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { DocumentFilters } from "./DocumentFilters";

export const dynamic = "force-dynamic";

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

const stageLabels: Record<number, string> = {
  1: "Koncept",
  2: "Revize",
  3: "Schvaleni",
  4: "Uzavreno",
};

export default async function DokumentyPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const projectFilter = sp.project || "";

  let sql = `
    SELECT d.*, pr.display_name AS author_name, p.name AS project_name
    FROM documents d
    LEFT JOIN profiles pr ON pr.id = d.created_by
    LEFT JOIN projects p ON p.id = d.project_id
  `;
  const params: string[] = [];

  if (projectFilter) {
    sql += " WHERE d.project_id = $1";
    params.push(projectFilter);
  }

  sql += " ORDER BY d.updated_at DESC";

  const docsResult = await query(sql, params);
  const docs = docsResult.rows;

  const projectsResult = await query("SELECT id, name FROM projects ORDER BY name");
  const projects = projectsResult.rows;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <AppHeader activePath="/dokumenty" />

      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 16px" }}>
        {/* Title + New doc button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#e8e8f0" }}>Dokumenty</h1>
          <Link
            href="/dokumenty/novy"
            style={{
              textDecoration: "none",
              padding: "8px 18px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novy dokument
          </Link>
        </div>

        {/* Filters */}
        <DocumentFilters
          projects={projects.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
          }))}
          currentProject={projectFilter}
        />

        {/* Document count */}
        <div style={{ marginBottom: "16px", fontSize: "13px", color: "#9898b0" }}>
          {docs.length} {docs.length === 1 ? "dokument" : docs.length < 5 ? "dokumenty" : "dokumentu"}
        </div>

        {/* Documents list */}
        {docs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "#9898b0" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 16px", opacity: 0.5 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p style={{ fontSize: "15px", marginBottom: "8px" }}>Zatim zadne dokumenty</p>
            <p style={{ fontSize: "13px" }}>Vytvorte prvni dokument kliknutim na tlacitko vyse.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {docs.map((doc: { id: string; title: string; status: string; project_name: string | null; author_name: string | null; stage_order: number; updated_at: string }) => (
              <Link
                key={doc.id}
                href={`/dokumenty/${doc.id}`}
                style={{
                  background: "#12121a",
                  border: "1px solid #2a2a40",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  display: "block",
                  transition: "all 0.2s",
                  textDecoration: "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#e8e8f0" }}>
                    {doc.title}
                  </h3>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "100px",
                      fontSize: "11px",
                      fontWeight: 500,
                      border: `1px solid ${(statusColors[doc.status] || "#9898b0")}30`,
                      color: statusColors[doc.status as string] || "#9898b0",
                      background: `${statusColors[doc.status as string] || "#9898b0"}10`,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      marginLeft: "12px",
                    }}
                  >
                    {statusLabels[doc.status] || (doc.status)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#9898b0", flexWrap: "wrap" }}>
                  {doc.project_name ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      {doc.project_name}
                    </span>
                  ) : null}
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.8 21a7 7 0 0 1 12.4 0"/></svg>
                    {doc.author_name || "Neznamy"}
                  </span>
                  <span>
                    Etapa: {stageLabels[doc.stage_order] || `${doc.stage_order}`}
                  </span>
                  <span>
                    {new Date(doc.updated_at).toLocaleDateString("cs-CZ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
