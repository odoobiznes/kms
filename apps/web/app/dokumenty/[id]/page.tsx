import { getDocument, getStages, getProjectMembers, getProject } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { DocumentEditor } from "./DocumentEditor";

export const dynamic = "force-dynamic";

const stageLabels: Record<string, string> = {
  draft: "Koncept",
  review: "Revize",
  approved: "Schvaleno",
  closed: "Uzavreno",
};

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const stages = await getStages(id);
  let members: { id: string; display_name: string }[] = [];
  let project: { name: string; description: string; category: string } | null = null;

  if (doc.project_id) {
    const [pm, proj] = await Promise.all([
      getProjectMembers(doc.project_id),
      getProject(doc.project_id),
    ]);
    members = pm.map((m: Record<string, unknown>) => ({
      id: m.user_id as string,
      display_name: m.display_name as string,
    }));
    if (proj) {
      project = {
        name: proj.name,
        description: proj.description || "",
        category: proj.category || "document",
      };
    }
  }

  return (
    <DocumentEditor
      doc={{
        id: doc.id,
        title: doc.title,
        status: doc.status,
        stage_order: doc.stage_order,
        project_id: doc.project_id,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }}
      stages={stages.map((s: Record<string, unknown>) => ({
        id: s.id as string,
        name: s.name as string,
        stage_order: s.stage_order as number,
        status: s.status as string,
        vote_count: Number(s.vote_count),
        approve_count: Number(s.approve_count),
        reject_count: Number(s.reject_count),
      }))}
      user={{ id: user.id, display_name: user.display_name }}
      memberCount={members.length || 1}
      project={project}
    />
  );
}
