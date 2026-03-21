"use client";

import { useRouter } from "next/navigation";

interface FiltersProps {
  projects: Array<{ id: string; name: string }>;
  currentProject: string;
}

export function DocumentFilters({ projects, currentProject }: FiltersProps) {
  const router = useRouter();

  return (
    <div style={{ marginBottom: "24px", display: "flex", gap: "12px", alignItems: "center" }}>
      <span style={{ fontSize: "13px", color: "#9898b0" }}>Filtr:</span>
      <select
        value={currentProject}
        onChange={(e) => {
          const val = e.target.value;
          if (val) {
            router.push(`/dokumenty?project=${val}`);
          } else {
            router.push("/dokumenty");
          }
        }}
        style={{
          padding: "8px 32px 8px 12px",
          borderRadius: "8px",
          border: "1px solid #2a2a40",
          background: "#12121a",
          color: "#e8e8f0",
          fontSize: "13px",
          cursor: "pointer",
          outline: "none",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg width=12 height=12 viewBox=0 0 24 24 fill=none stroke=%239898b0 stroke-width=2%3E%3Cpolyline points=6 9 12 15 18 9/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
        }}
      >
        <option value="">Vsechny projekty</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
