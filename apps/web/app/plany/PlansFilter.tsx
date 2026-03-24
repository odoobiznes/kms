"use client";

import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
}

interface PlansFilterProps {
  currentStatus: string;
  currentProject: string;
  projects: Project[];
}

const STATUS_TABS = [
  { value: "active", label: "Aktivni" },
  { value: "completed", label: "Dokonceno" },
  { value: "draft", label: "Koncepty" },
  { value: "all", label: "Vse" },
];

export function PlansFilter({ currentStatus, currentProject, projects }: PlansFilterProps) {
  const router = useRouter();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams();
    if (key === "status") {
      if (value) params.set("status", value);
      if (currentProject) params.set("project_id", currentProject);
    } else {
      if (currentStatus) params.set("status", currentStatus);
      if (value) params.set("project_id", value);
    }
    router.push(`/plany?${params.toString()}`);
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        marginBottom: "24px",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {/* Status tabs */}
      <div
        style={{
          display: "flex",
          gap: "2px",
          background: "#12121a",
          borderRadius: "8px",
          padding: "3px",
          border: "1px solid #2a2a40",
        }}
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateFilter("status", tab.value)}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              background: currentStatus === tab.value ? "#6366f1" : "transparent",
              color: currentStatus === tab.value ? "#fff" : "#9898b0",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Project filter */}
      <select
        value={currentProject}
        onChange={(e) => updateFilter("project_id", e.target.value)}
        style={{
          padding: "7px 12px",
          background: "#12121a",
          border: "1px solid #2a2a40",
          borderRadius: "8px",
          color: "#e8e8f0",
          fontSize: "13px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="">Vse projekty</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
