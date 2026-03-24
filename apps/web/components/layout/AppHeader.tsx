"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { NotificationBell } from "./NotificationBell";

interface UserInfo {
  id: string;
  display_name: string;
  email: string;
  role?: string;
}

const NAV_LINKS = [
  { label: "Plany", href: "/plany" },
  { label: "Projekty", href: "/projekty" },
  { label: "Dokumenty", href: "/dokumenty" },
  { label: "Kurzy", href: "/kurzy" },
  { label: "AI", href: "/ai-agenti" },
  { label: "Integrace", href: "/workflows" },
];

export function AppHeader({ activePath }: { activePath?: string }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

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

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentScrollY;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }, []);

  return (
    <>
      <header
        style={{
          borderBottom: "1px solid #2a2a40",
          padding: "0 24px",
          height: "48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(10, 10, 15, 0.92)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          transition: "transform 0.3s ease",
          transform: visible ? "translateY(0)" : "translateY(-100%)",
        }}
      >
        {/* Left: Logo + Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Hamburger - mobile only */}
          <button
            className="mobile-menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: "none",
              background: "transparent",
              border: "none",
              color: "#e8e8f0",
              cursor: "pointer",
              padding: "4px",
              marginRight: "4px",
            }}
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>

          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "7px",
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "13px",
                color: "#fff",
              }}
            >
              K
            </div>
            <span style={{ fontWeight: 600, fontSize: "16px", color: "#e8e8f0" }}>KMS</span>
          </Link>

          {/* Desktop nav */}
          <nav className="desktop-only" style={{ display: "flex", gap: "2px", marginLeft: "16px" }}>
            {NAV_LINKS.map((link) => {
              const isActive = activePath === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: isActive ? "#e8e8f0" : "#9898b0",
                    background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                    transition: "all 0.2s",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Notifications + User */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {user ? (
            <>
              <NotificationBell />
              <div ref={menuRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 10px",
                    borderRadius: "7px",
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
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #6366f1, #818cf8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "11px",
                      color: "#fff",
                    }}
                  >
                    {user.display_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <span className="desktop-only" style={{ maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px" }}>
                    {user.display_name}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {menuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
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
                    <a
                      href="/download"
                      style={{
                        display: "block",
                        padding: "10px 16px",
                        color: "#e8e8f0",
                        fontSize: "13px",
                        textDecoration: "none",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.1)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      Instalovat aplikaci
                    </a>
                    <div style={{ borderTop: "1px solid #2a2a40" }} />
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
            <Link
              href="/login"
              style={{
                padding: "6px 16px",
                borderRadius: "7px",
                background: "#6366f1",
                color: "#fff",
                fontWeight: 500,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              Prihlasit se
            </Link>
          )}
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            display: "none",
            position: "fixed",
            top: "48px",
            left: 0,
            right: 0,
            background: "rgba(10, 10, 15, 0.98)",
            borderBottom: "1px solid #2a2a40",
            zIndex: 49,
            padding: "8px 0",
            backdropFilter: "blur(12px)",
          }}
        >
          {NAV_LINKS.map((link) => {
            const isActive = activePath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: 500,
                  color: isActive ? "#e8e8f0" : "#9898b0",
                  background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
