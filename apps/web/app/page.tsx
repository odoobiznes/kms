import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  // Fetch counts
  const [projectsRes, documentsRes, coursesRes, plansRes] = await Promise.all([
    query("SELECT COUNT(*) AS count FROM projects WHERE status != 'archived'"),
    query("SELECT COUNT(*) AS count FROM documents"),
    query("SELECT COUNT(*) AS count FROM projects WHERE category = 'course'"),
    query("SELECT COUNT(*) AS count FROM plans WHERE status != 'archived'"),
  ]);

  const projectCount = Number(projectsRes.rows[0]?.count || 0);
  const documentCount = Number(documentsRes.rows[0]?.count || 0);
  const courseCount = Number(coursesRes.rows[0]?.count || 0);
  const planCount = Number(plansRes.rows[0]?.count || 0);

  const cards = [
    {
      title: "Plany",
      description: "Planovani, kanban board a sprava ukolu",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      ),
      href: "/plany",
      color: "#f59e0b",
      count: planCount,
    },
    {
      title: "Projekty",
      description: "Sprava projektu, ukolu a tymu na jednom miste",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
      href: "/projekty",
      color: "#6366f1",
      count: projectCount,
    },
    {
      title: "Dokumenty",
      description: "Kolaborativni editace dokumentu v realnem case",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      href: "/dokumenty",
      color: "#22c55e",
      count: documentCount,
    },
    {
      title: "Kurzy",
      description: "Online kurzy, lekce a vzdelavaci materialy",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
        </svg>
      ),
      href: "/kurzy",
      color: "#f59e0b",
      count: courseCount,
    },
    {
      title: "AI Agenti",
      description: "Inteligentni asistenti pro automatizaci a analyzu",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <circle cx="12" cy="16" r="1" />
        </svg>
      ),
      href: "/ai-agenti",
      color: "#ec4899",
      count: null,
    },
    {
      title: "Integrace",
      description: "Automatizovane pracovni postupy a workflow",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
      href: "/workflows",
      color: "#3b82f6",
      count: null,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <AppHeader activePath="/" />

      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 16px" }}>
        {/* Welcome */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#e8e8f0", marginBottom: "6px" }}>
            Vitejte, {user.display_name}
          </h1>
          <p style={{ fontSize: "14px", color: "#9898b0" }}>
            Kolaborativni platforma pro tymy + AI agenty
          </p>
        </div>

        {/* Cards grid */}
        <div
          className="dashboard-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              style={{
                background: "#12121a",
                border: "1px solid #2a2a40",
                borderRadius: "12px",
                padding: "24px 20px",
                display: "block",
                textDecoration: "none",
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: `${card.color}15`,
                    color: card.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {card.icon}
                </div>
                {card.count !== null && (
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "100px",
                      fontSize: "13px",
                      fontWeight: 600,
                      background: `${card.color}15`,
                      color: card.color,
                      border: `1px solid ${card.color}30`,
                    }}
                  >
                    {card.count}
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#e8e8f0", marginBottom: "6px" }}>
                {card.title}
              </h3>
              <p style={{ fontSize: "13px", color: "#9898b0", lineHeight: 1.5 }}>
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #2a2a40",
          padding: "16px 24px",
          textAlign: "center",
          fontSize: "12px",
          color: "#6b6b80",
          marginTop: "48px",
        }}
      >
        KMS &copy; 2026 IT Enterprise
      </footer>
    </div>
  );
}
