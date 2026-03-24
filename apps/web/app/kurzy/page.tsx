"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";

interface Course {
  id: string;
  name: string;
  description: string;
  status: string;
  lesson_count: string;
  member_count: string;
  approved_count: string;
  owner_name: string;
  updated_at: string;
}

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

export default function KurzyPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <AppHeader activePath="/kurzy" />

      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#e8e8f0" }}>Kurzy</h1>
            <p style={{ color: "#9898b0", fontSize: "13px", marginTop: "4px" }}>
              {courses.length} {courses.length === 1 ? "kurz" : courses.length < 5 ? "kurzy" : "kurzu"}
            </p>
          </div>
          <Link
            href="/kurzy/novy"
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
            Novy kurz
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9898b0" }}>
            Nacitani...
          </div>
        ) : courses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9898b0" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4a4a60" strokeWidth="1.5" style={{ margin: "0 auto 16px" }}>
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
            </svg>
            <p style={{ fontSize: "15px", marginBottom: "8px" }}>Zatim zadne kurzy</p>
            <p style={{ fontSize: "13px" }}>Vytvorte svuj prvni kurz kliknutim na tlacitko vyse</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {courses.map((course) => {
              const lessons = Number(course.lesson_count);
              const approved = Number(course.approved_count);
              const members = Number(course.member_count);
              const progress = lessons > 0 ? Math.round((approved / lessons) * 100) : 0;

              return (
                <Link
                  key={course.id}
                  href={`/kurzy/${course.id}`}
                  style={{
                    background: "#12121a",
                    border: "1px solid #2a2a40",
                    borderRadius: "12px",
                    padding: "20px",
                    display: "block",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#e8e8f0" }}>
                      {course.name}
                    </h3>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "100px",
                        fontSize: "11px",
                        fontWeight: 500,
                        backgroundColor: `${statusColors[course.status] || "#9898b0"}20`,
                        color: statusColors[course.status] || "#9898b0",
                        flexShrink: 0,
                        marginLeft: "8px",
                      }}
                    >
                      {statusLabels[course.status] || course.status}
                    </span>
                  </div>

                  {course.description && (
                    <p style={{ fontSize: "13px", color: "#9898b0", lineHeight: 1.5, marginBottom: "14px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {course.description}
                    </p>
                  )}

                  {/* Progress bar */}
                  {lessons > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9898b0", marginBottom: "4px" }}>
                        <span>{approved}/{lessons} lekci schvaleno</span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{ height: "4px", borderRadius: "2px", background: "#2a2a40" }}>
                        <div style={{ height: "100%", borderRadius: "2px", background: "#6366f1", width: `${progress}%`, transition: "width 0.3s" }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#9898b0" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      {lessons} {lessons === 1 ? "lekce" : lessons < 5 ? "lekce" : "lekci"}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="7" r="4" />
                        <path d="M5.8 21a7 7 0 0 1 12.4 0" />
                      </svg>
                      {members} {members === 1 ? "clen" : members < 5 ? "clenove" : "clenu"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
