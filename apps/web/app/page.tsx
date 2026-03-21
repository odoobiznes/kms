"use client";

import { HeaderNav } from "@/components/layout/HeaderNav";

const sections = [
  {
    title: "Projekty",
    description: "Sprava projektu, ukolu a tymu na jednom miste",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
    href: "/projekty",
    color: "#6366f1",
  },
  {
    title: "Dokumenty",
    description: "Kolaborativni editace dokumentu v realnem case",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    href: "/dokumenty",
    color: "#22c55e",
  },
  {
    title: "AI Agenti",
    description: "Inteligentni asistenti pro automatizaci a analyzu",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="12" cy="16" r="1" />
      </svg>
    ),
    href: "/ai-agenti",
    color: "#f59e0b",
  },
  {
    title: "Integrace",
    description: "Automatizovane pracovni postupy a integrace systemu",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
        <line x1="12" y1="2" x2="12" y2="22" />
      </svg>
    ),
    href: "/workflows",
    color: "#ec4899",
  },
];

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <HeaderNav />

      {/* Hero */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px 60px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: "100px",
            border: "1px solid var(--border)",
            fontSize: "13px",
            color: "var(--text-secondary)",
            marginBottom: "24px",
            backgroundColor: "var(--bg-secondary)",
          }}
        >
          v0.1.0 &mdash; Early Access
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: "20px",
            maxWidth: "700px",
          }}
        >
          Knowledge
          <br />
          Management
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8, #a5b4fc)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            System
          </span>
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: "var(--text-secondary)",
            maxWidth: "520px",
            lineHeight: 1.6,
            marginBottom: "48px",
          }}
        >
          Kolaborativni platforma pro tymy + AI agenty.
          <br />
          Projekty, dokumenty, automatizace &mdash; vse na jednom miste.
        </p>

        {/* Section Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            maxWidth: "960px",
            width: "100%",
          }}
        >
          {sections.map((section) => (
            <a
              key={section.title}
              href={section.href}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "28px 24px",
                textAlign: "left",
                transition: "all 0.2s ease",
                cursor: "pointer",
                display: "block",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = section.color;
                el.style.boxShadow = `0 0 24px ${section.color}20`;
                el.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border)";
                el.style.boxShadow = "none";
                el.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  color: section.color,
                  marginBottom: "16px",
                }}
              >
                {section.icon}
              </div>
              <h3
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                {section.title}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {section.description}
              </p>
            </a>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "20px 32px",
          textAlign: "center",
          fontSize: "13px",
          color: "var(--text-secondary)",
        }}
      >
        KMS &copy; 2026 IT Enterprise
      </footer>
    </div>
  );
}
