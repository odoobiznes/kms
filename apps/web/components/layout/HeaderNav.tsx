"use client";

import { useState, useEffect, useRef } from "react";
import { NotificationBell } from "./NotificationBell";

interface UserInfo {
  id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
}

const NAV_LINKS = [
  { label: "Projekty", href: "/projekty" },
  { label: "Dokumenty", href: "/dokumenty" },
  { label: "AI Agenti", href: "/ai-agenti" },
  { label: "Integrace", href: "/workflows" },
];

export function HeaderNav({ activePath }: { activePath?: string }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.id ? data : null);
        }
      } catch {
        // not logged in
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
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
      {/* Left: Logo + Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
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
        </a>

        <nav style={{ display: "flex", gap: "4px", marginLeft: "24px" }}>
          {NAV_LINKS.map((link) => {
            const isActive = activePath === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: isActive ? "#e8e8f0" : "#9898b0",
                  background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                  transition: "all 0.2s",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      </div>

      {/* Right: Notifications + User */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {user ? (
          <>
            <NotificationBell />
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid #2a2a40",
                  background: "transparent",
                  color: "#e8e8f0",
                  cursor: "pointer",
                  fontSize: "13px",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#6366f1";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#2a2a40";
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #818cf8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: "12px",
                    color: "#fff",
                  }}
                >
                  {user.display_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.display_name}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "200px",
                    background: "#12121a",
                    border: "1px solid #2a2a40",
                    borderRadius: "10px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    zIndex: 100,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a2a40" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8e8f0" }}>
                      {user.display_name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#9898b0", marginTop: "2px" }}>
                      {user.email}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      fontSize: "13px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    Odhlasit se
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <a
            href="/login"
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              background: "#6366f1",
              color: "#fff",
              fontWeight: 500,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              border: "none",
              display: "inline-block",
              textDecoration: "none",
            }}
          >
            Prihlasit se
          </a>
        )}
      </div>
    </header>
  );
}
