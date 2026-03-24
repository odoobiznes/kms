import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { NewPlanForm } from "./NewPlanForm";

export const dynamic = "force-dynamic";

export default async function NovyPlanPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const projectsRes = await query(
    "SELECT id, name FROM projects WHERE status != 'archived' ORDER BY name"
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      <AppHeader activePath="/plany" />

      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "32px 24px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#e8e8f0",
            marginBottom: "32px",
          }}
        >
          Novy plan
        </h1>

        <NewPlanForm projects={projectsRes.rows} />
      </main>
    </div>
  );
}
