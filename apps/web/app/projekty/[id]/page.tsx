import { getProject, getProjectMembers, getDocuments, getStages } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { VotePanel } from "@/components/voting/VotePanel";
import { AIStats } from "@/components/ui/AIStats";

const categoryLabels: Record<string, string> = {
  course: "Kurz",
  project: "Projekt",
  review: "Revize",
  research: "Vyzkum",
  document: "Dokument",
};

const categoryColors: Record<string, string> = {
  course: "#f59e0b",
  project: "#6366f1",
  review: "#ec4899",
  research: "#22c55e",
  document: "#3b82f6",
};

const statusLabels: Record<string, string> = {
  draft: "Koncept",
  active: "Aktivni",
  paused: "Pozastaveno",
  completed: "Dokonceno",
  archived: "Archivovano",
};

const statusColors: Record<string, string> = {
  draft: "#9898b0",
  active: "#22c55e",
  paused: "#f59e0b",
  completed: "#3b82f6",
  archived: "#6b7280",
};

const docStatusLabels: Record<string, string> = {
  draft: "Koncept",
  in_review: "V revizi",
  approved: "Schvaleno",
  closed: "Uzavreno",
  reopened: "Znovu otevreno",
};

const docStatusColors: Record<string, string> = {
  draft: "#9898b0",
  in_review: "#f59e0b",
  approved: "#22c55e",
  closed: "#6b7280",
  reopened: "#3b82f6",
};

const stageStatusLabels: Record<string, string> = {
  open: "Otevrena",
  voting: "Hlasovani",
  approved: "Schvalena",
  rejected: "Zamitnuta",
  closed: "Uzavrena",
};

const stageStatusColors: Record<string, string> = {
  open: "#3b82f6",
  voting: "#f59e0b",
  approved: "#22c55e",
  rejected: "#ef4444",
  closed: "#6b7280",
};

const aiModelBadge: Record<string, { label: string; color: string }> = {
  "claude-sonnet": { label: "Claude", color: "#d97706" },
  "claude-haiku": { label: "Haiku", color: "#f59e0b" },
  "gpt-4o": { label: "GPT-4o", color: "#22c55e" },
  "gemini-flash": { label: "Gemini", color: "#3b82f6" },
  "groq-llama": { label: "Llama", color: "#ec4899" },
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [members, documents] = await Promise.all([
    getProjectMembers(id),
    getDocuments(id),
  ]);

  // Get stages for all documents
  const documentStages: Record<string, Record<string, string>[]> = {};
  for (const doc of documents) {
    documentStages[doc.id] = await getStages(doc.id);
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
          <Link href="/projekty" style={{ color: "#9898b0", fontSize: "15px" }}>
            Projekty
          </Link>
          <span style={{ color: "#2a2a40", margin: "0 8px" }}>/</span>
          <span style={{ color: "#e8e8f0", fontSize: "15px" }}>{project.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#9898b0", fontSize: "14px" }}>{user.display_name}</span>
          <LogoutButton />
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Project Header */}
        <div
          style={{
            background: "#12121a",
            border: "1px solid #2a2a40",
            borderRadius: "16px",
            padding: "32px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px",
            }}
          >
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#e8e8f0" }}>
                {project.name}
              </h1>
              {project.description && (
                <p style={{ color: "#9898b0", fontSize: "15px", marginTop: "8px", lineHeight: 1.6 }}>
                  {project.description}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <span
                style={{
                  padding: "5px 14px",
                  borderRadius: "100px",
                  fontSize: "13px",
                  fontWeight: 500,
                  backgroundColor: `${categoryColors[project.category]}15`,
                  color: categoryColors[project.category],
                  border: `1px solid ${categoryColors[project.category]}30`,
                }}
              >
                {categoryLabels[project.category] || project.category}
              </span>
              <span
                style={{
                  padding: "5px 14px",
                  borderRadius: "100px",
                  fontSize: "13px",
                  fontWeight: 500,
                  backgroundColor: `${statusColors[project.status]}20`,
                  color: statusColors[project.status],
                }}
              >
                {statusLabels[project.status] || project.status}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "24px", fontSize: "13px", color: "#9898b0" }}>
            <span>Vlastnik: {project.owner_name || "---"}</span>
            <span>Konsenzus: {Math.round(project.consensus_threshold * 100)}%</span>
            <span>Vytvoreno: {new Date(project.created_at).toLocaleDateString("cs")}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px" }}>
          {/* Documents */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#e8e8f0" }}>
                Dokumenty ({documents.length})
              </h2>
              <button
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #6366f1, #818cf8)",
                  color: "#fff",
                  fontWeight: 500,
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Novy dokument
              </button>
            </div>

            {documents.length === 0 ? (
              <div
                style={{
                  background: "#12121a",
                  border: "1px solid #2a2a40",
                  borderRadius: "12px",
                  padding: "48px 20px",
                  textAlign: "center",
                  color: "#9898b0",
                }}
              >
                <p style={{ fontSize: "15px" }}>Zatim zadne dokumenty</p>
                <p style={{ fontSize: "13px", marginTop: "4px" }}>
                  Pridejte prvni dokument do tohoto projektu
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {documents.map((doc: Record<string, string>) => (
                  <div
                    key={doc.id}
                    style={{
                      background: "#12121a",
                      border: "1px solid #2a2a40",
                      borderRadius: "12px",
                      padding: "20px 24px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#e8e8f0" }}>
                        {doc.title}
                      </h3>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "100px",
                          fontSize: "12px",
                          fontWeight: 500,
                          backgroundColor: `${docStatusColors[doc.status]}20`,
                          color: docStatusColors[doc.status],
                        }}
                      >
                        {docStatusLabels[doc.status] || doc.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#9898b0", marginBottom: "4px" }}>
                      Autor: {doc.author_name || "---"} | Verze: {doc.current_version} | Faze: {doc.stage_order}
                    </div>

                    {/* Stages */}
                    {documentStages[doc.id] && documentStages[doc.id].length > 0 && (
                      <div style={{ marginTop: "16px" }}>
                        <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#9898b0", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Faze dokumentu
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {documentStages[doc.id].map((stage: Record<string, string>) => (
                            <div
                              key={stage.id}
                              style={{
                                background: "#0a0a0f",
                                border: "1px solid #2a2a40",
                                borderRadius: "8px",
                                padding: "12px 16px",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#e8e8f0" }}>
                                    {stage.stage_order}. {stage.name}
                                  </span>
                                  <span
                                    style={{
                                      padding: "2px 8px",
                                      borderRadius: "100px",
                                      fontSize: "11px",
                                      fontWeight: 500,
                                      backgroundColor: `${stageStatusColors[stage.status]}20`,
                                      color: stageStatusColors[stage.status],
                                    }}
                                  >
                                    {stageStatusLabels[stage.status] || stage.status}
                                  </span>
                                </div>
                                <span style={{ fontSize: "12px", color: "#9898b0" }}>
                                  {stage.approve_count}/{stage.vote_count} hlasu
                                </span>
                              </div>
                              {(stage.status === "voting" || stage.status === "open") && (
                                <VotePanel
                                  stageId={stage.id}
                                  documentId={doc.id}
                                  userId={user.id}
                                  approveCount={Number(stage.approve_count)}
                                  rejectCount={Number(stage.reject_count)}
                                  totalMembers={members.length}
                                  threshold={Number(project.consensus_threshold)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Members + AI Stats */}
          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#e8e8f0",
                marginBottom: "16px",
              }}
            >
              Clenove ({members.length})
            </h2>
            <div
              style={{
                background: "#12121a",
                border: "1px solid #2a2a40",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "24px",
              }}
            >
              {members.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "#9898b0", fontSize: "14px" }}>
                  Zatim zadni clenove
                </div>
              ) : (
                members.map((member: Record<string, string>, index: number) => {
                  const badge = member.ai_model ? aiModelBadge[member.ai_model] : null;
                  return (
                    <div
                      key={member.id}
                      style={{
                        padding: "14px 20px",
                        borderBottom: index < members.length - 1 ? "1px solid #2a2a40" : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "#1a1a2e",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#6366f1",
                          flexShrink: 0,
                        }}
                      >
                        {member.display_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "#e8e8f0",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {member.display_name}
                          </span>
                          {badge && (
                            <span
                              style={{
                                padding: "1px 7px",
                                borderRadius: "100px",
                                fontSize: "10px",
                                fontWeight: 600,
                                background: `${badge.color}20`,
                                color: badge.color,
                                border: `1px solid ${badge.color}40`,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9898b0" }}>
                          {member.role}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* AI Stats */}
            <AIStats projectId={id} />
          </div>
        </div>
      </main>
    </div>
  );
}
