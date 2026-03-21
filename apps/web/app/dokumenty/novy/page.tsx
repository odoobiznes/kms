import { getProjects } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewDocumentForm } from "./NewDocumentForm";

export const dynamic = "force-dynamic";

export default async function NovyDokumentPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const projects = await getProjects();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <header
        style={{
          borderBottom: "1px solid #2a2a40",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          background: "rgba(10, 10, 15, 0.9)",
          backdropFilter: "blur(12px)",
        }}
      >
        <a
          href="/dokumenty"
          style={{
            color: "#9898b0",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Dokumenty
        </a>
        <div style={{ width: "1px", height: "20px", background: "#2a2a40" }} />
        <h1 style={{ fontSize: "16px", fontWeight: 600 }}>Novy dokument</h1>
      </header>

      <main style={{ maxWidth: "600px", margin: "48px auto", padding: "0 24px" }}>
        <NewDocumentForm
          projects={projects.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
          }))}
        />
      </main>
    </div>
  );
}
