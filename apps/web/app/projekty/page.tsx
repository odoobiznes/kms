import { getProjects } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";

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

export const dynamic = "force-dynamic";

export default async function ProjektyPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const projects = await getProjects();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <AppHeader activePath="/projekty" />

      {/* Content */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#e8e8f0" }}>Projekty</h1>
            <p style={{ color: "#9898b0", fontSize: "13px", marginTop: "4px" }}>
              {projects.length} {projects.length === 1 ? "projekt" : projects.length < 5 ? "projekty" : "projektu"}
            </p>
          </div>
          <Link
            href="/projekty/novy"
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff",
              fontWeight: 500,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novy projekt
          </Link>
        </div>

        {projects.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#9898b0",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4a4a60"
              strokeWidth="1.5"
              style={{ margin: "0 auto 16px" }}
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ fontSize: "15px", marginBottom: "8px" }}>Zatim zadne projekty</p>
            <p style={{ fontSize: "13px" }}>Vytvorte svuj prvni projekt kliknutim na tlacitko vyse</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {projects.map((project: Record<string, string>) => (
              <Link
                key={project.id}
                href={`/projekty/${project.id}`}
                style={{
                  background: "#12121a",
                  border: "1px solid #2a2a40",
                  borderRadius: "12px",
                  padding: "20px",
                  transition: "all 0.2s ease",
                  display: "block",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "10px",
                  }}
                >
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#e8e8f0" }}>
                    {project.name}
                  </h3>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "100px",
                      fontSize: "11px",
                      fontWeight: 500,
                      backgroundColor: `${statusColors[project.status]}20`,
                      color: statusColors[project.status],
                      flexShrink: 0,
                      marginLeft: "8px",
                    }}
                  >
                    {statusLabels[project.status] || project.status}
                  </span>
                </div>

                {project.description && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#9898b0",
                      lineHeight: 1.5,
                      marginBottom: "14px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {project.description}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "auto",
                  }}
                >
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 500,
                      backgroundColor: `${categoryColors[project.category]}15`,
                      color: categoryColors[project.category],
                      border: `1px solid ${categoryColors[project.category]}30`,
                    }}
                  >
                    {categoryLabels[project.category] || project.category}
                  </span>
                  <span style={{ fontSize: "12px", color: "#9898b0" }}>
                    {project.member_count} {Number(project.member_count) === 1 ? "clen" : Number(project.member_count) < 5 ? "clenove" : "clenu"}
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
