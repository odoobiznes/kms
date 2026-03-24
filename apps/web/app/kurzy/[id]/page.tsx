"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { AIAssistant } from "@/components/editor/AIAssistant";

interface CourseDetail {
  id: string;
  name: string;
  description: string;
  status: string;
  owner_name: string;
}

interface Lesson {
  id: string;
  title: string;
  status: string;
  stage_order: number;
  author_name: string;
  updated_at: string;
}

interface Member {
  id: string;
  display_name: string;
  email: string;
  role: string;
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

const courseStatusLabels: Record<string, string> = {
  draft: "Koncept",
  active: "Aktivni",
  paused: "Pozastaveno",
  completed: "Dokonceno",
  archived: "Archivovano",
};

const courseStatusColors: Record<string, string> = {
  draft: "#9898b0",
  active: "#22c55e",
  paused: "#f59e0b",
  completed: "#3b82f6",
  archived: "#6b7280",
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [courseRes, docsRes, membersRes] = await Promise.all([
        fetch(`/api/projects/${courseId}`),
        fetch(`/api/documents?project_id=${courseId}`),
        fetch(`/api/projects/${courseId}/members`),
      ]);

      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourse(courseData.project || courseData);
      } else {
        router.push("/kurzy");
        return;
      }

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setLessons(docsData.documents || []);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAddLesson() {
    if (!newLessonTitle.trim()) return;
    setAddingLesson(true);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newLessonTitle.trim(),
          project_id: courseId,
        }),
      });

      if (res.ok) {
        setNewLessonTitle("");
        fetchData();
      }
    } catch {
      // silent
    } finally {
      setAddingLesson(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
        <AppHeader activePath="/kurzy" />
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#9898b0" }}>Nacitani...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
        <AppHeader activePath="/kurzy" />
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#9898b0" }}>Kurz nebyl nalezen</div>
      </div>
    );
  }

  const approvedCount = lessons.filter((l) => l.status === "approved" || l.status === "closed").length;
  const progress = lessons.length > 0 ? Math.round((approvedCount / lessons.length) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <AppHeader activePath="/kurzy" />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 16px" }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "20px", fontSize: "13px", color: "#9898b0" }}>
          <Link href="/kurzy" style={{ color: "#6366f1", textDecoration: "none" }}>Kurzy</Link>
          <span style={{ margin: "0 8px", color: "#4a4a60" }}>/</span>
          <span>{course.name}</span>
        </div>

        {/* Course header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#e8e8f0" }}>{course.name}</h1>
              <span style={{
                padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 500,
                backgroundColor: `${courseStatusColors[course.status] || "#9898b0"}20`,
                color: courseStatusColors[course.status] || "#9898b0",
              }}>
                {courseStatusLabels[course.status] || course.status}
              </span>
            </div>
            {course.description && (
              <p style={{ fontSize: "14px", color: "#9898b0", lineHeight: 1.5 }}>{course.description}</p>
            )}
          </div>
        </div>

        {/* Progress */}
        {lessons.length > 0 && (
          <div style={{ background: "#12121a", border: "1px solid #2a2a40", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#9898b0", marginBottom: "8px" }}>
              <span>Postup kurzu: {approvedCount}/{lessons.length} lekci schvaleno</span>
              <span style={{ color: "#6366f1", fontWeight: 600 }}>{progress}%</span>
            </div>
            <div style={{ height: "6px", borderRadius: "3px", background: "#2a2a40" }}>
              <div style={{ height: "100%", borderRadius: "3px", background: "linear-gradient(135deg, #6366f1, #818cf8)", width: `${progress}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "24px" }}>
          {/* Lessons */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#e8e8f0" }}>
                Lekce ({lessons.length})
              </h2>
            </div>

            {/* Add lesson form */}
            <div style={{ background: "#12121a", border: "1px solid #2a2a40", borderRadius: "10px", padding: "12px 16px", marginBottom: "12px", display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="Nazev nove lekce..."
                onKeyDown={(e) => e.key === "Enter" && handleAddLesson()}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: "6px",
                  border: "1px solid #2a2a40", background: "#0a0a0f",
                  color: "#e8e8f0", fontSize: "13px", outline: "none",
                }}
              />
              <button
                onClick={handleAddLesson}
                disabled={addingLesson || !newLessonTitle.trim()}
                style={{
                  padding: "8px 16px", borderRadius: "6px",
                  background: newLessonTitle.trim() ? "#6366f1" : "#2a2a40",
                  color: "#fff", border: "none", fontSize: "13px",
                  fontWeight: 500, cursor: newLessonTitle.trim() ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap",
                }}
              >
                {addingLesson ? "..." : "Pridat lekci"}
              </button>
            </div>

            {lessons.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#9898b0", fontSize: "14px" }}>
                Zatim zadne lekce. Pridejte prvni lekci vyse.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {lessons.map((lesson, index) => (
                  <Link
                    key={lesson.id}
                    href={`/dokumenty/${lesson.id}`}
                    style={{
                      background: "#12121a",
                      border: "1px solid #2a2a40",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      textDecoration: "none",
                      transition: "border-color 0.2s",
                    }}
                  >
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "6px",
                      background: "#2a2a40", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "12px", fontWeight: 600, color: "#9898b0", flexShrink: 0,
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 500, color: "#e8e8f0", marginBottom: "2px" }}>
                        {lesson.title}
                      </div>
                      <div style={{ fontSize: "11px", color: "#9898b0" }}>
                        {lesson.author_name || "Neznamy"} &middot; {new Date(lesson.updated_at).toLocaleDateString("cs-CZ")}
                      </div>
                    </div>
                    <span style={{
                      padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 500,
                      background: `${statusColors[lesson.status] || "#9898b0"}15`,
                      color: statusColors[lesson.status] || "#9898b0",
                      border: `1px solid ${statusColors[lesson.status] || "#9898b0"}30`,
                      flexShrink: 0,
                    }}>
                      {statusLabels[lesson.status] || lesson.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Members sidebar */}
          <div className="course-sidebar">
            <div style={{ background: "#12121a", border: "1px solid #2a2a40", borderRadius: "12px", padding: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#e8e8f0", marginBottom: "12px" }}>
                Clenove ({members.length})
              </h3>
              {members.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#9898b0" }}>Zadni clenove</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {members.map((member) => (
                    <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{
                        width: "26px", height: "26px", borderRadius: "50%",
                        background: "linear-gradient(135deg, #6366f1, #818cf8)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: 600, color: "#fff",
                      }}>
                        {member.display_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", color: "#e8e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {member.display_name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#9898b0" }}>{member.role || "clen"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Context-aware AI Assistant */}
      <AIAssistant
        context={{
          type: "course",
          courseName: course.name,
          projectDescription: course.description,
          projectCategory: "course",
        }}
      />

      <style>{`
        @media (max-width: 768px) {
          .course-sidebar {
            grid-column: 1;
          }
        }
      `}</style>
    </div>
  );
}
