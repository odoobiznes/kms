import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get("project_id");
    if (!projectId) {
      return NextResponse.json({ error: "project_id je povinny" }, { status: 400 });
    }

    // Get contribution stats for the project
    const statsRes = await query(`
      SELECT
        COUNT(*) AS total_contributions,
        COUNT(*) FILTER (WHERE c.is_ai_generated = true) AS ai_contributions,
        COUNT(*) FILTER (WHERE c.is_ai_generated = false OR c.is_ai_generated IS NULL) AS human_contributions
      FROM contributions c
      JOIN documents d ON d.id = c.document_id
      WHERE d.project_id = $1
    `, [projectId]);

    const row = statsRes.rows[0];
    const total = parseInt(row.total_contributions) || 0;
    const ai = parseInt(row.ai_contributions) || 0;
    const human = parseInt(row.human_contributions) || 0;
    const aiPct = total > 0 ? Math.round((ai / total) * 100) : 0;

    // Get models used
    const modelsRes = await query(`
      SELECT c.ai_model AS model, COUNT(*) AS count
      FROM contributions c
      JOIN documents d ON d.id = c.document_id
      WHERE d.project_id = $1 AND c.is_ai_generated = true AND c.ai_model IS NOT NULL
      GROUP BY c.ai_model
      ORDER BY count DESC
    `, [projectId]);

    return NextResponse.json({
      ok: true,
      stats: {
        total_contributions: total,
        ai_contributions: ai,
        human_contributions: human,
        ai_percentage: aiPct,
        models_used: modelsRes.rows.map((r: Record<string, unknown>) => ({
          model: r.model,
          count: parseInt(r.count as string),
        })),
      },
    });
  } catch (error) {
    console.error("AI stats error:", error);
    return NextResponse.json({ error: "Interni chyba serveru" }, { status: 500 });
  }
}
