import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { document_id, stage_id } = await request.json();

    if (!document_id) {
      return NextResponse.json(
        { error: "document_id je povinny" },
        { status: 400 }
      );
    }

    // Fetch contributions for this document (and optionally stage)
    let contribQuery = `
      SELECT c.*, pr.display_name as author_name
      FROM contributions c
      LEFT JOIN profiles pr ON pr.id = c.user_id
      WHERE c.document_id = $1
    `;
    const params: unknown[] = [document_id];

    if (stage_id) {
      contribQuery += " AND c.stage_order = (SELECT stage_order FROM stages WHERE id = $2)";
      params.push(stage_id);
    }

    contribQuery += " ORDER BY c.created_at";

    const contribs = await query(contribQuery, params);

    if (contribs.rows.length === 0) {
      return NextResponse.json(
        { error: "Zadne prispevky k slouceni" },
        { status: 400 }
      );
    }

    // Build contribution text for AI
    const contribTexts = contribs.rows.map((c: Record<string, unknown>, i: number) => {
      const content = typeof c.content === "string" ? c.content : JSON.stringify(c.content);
      const source = c.is_ai_generated ? `AI (${c.ai_model})` : (c.author_name as string) || "Anonymni";
      return `--- Prispevek ${i + 1} (${source}) ---\n${content}`;
    }).join("\n\n");

    const litellmUrl = process.env.LITELLM_URL || "http://127.0.0.1:4100";
    const litellmKey = process.env.LITELLM_MASTER_KEY || "";
    const selectedModel = user.ai_model || "claude-sonnet";

    const res = await fetch(`${litellmUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${litellmKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: "Slouci nasledujici prispevky do jednoho koherentniho dokumentu. Zachovej nejlepsi napady z kazdeho prispevku. Vystup ve stejnem jazyce jako vstupy. Nevynechavej dulezite informace.",
          },
          {
            role: "user",
            content: contribTexts,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("LiteLLM merge error:", errText);
      return NextResponse.json(
        { error: "AI slouceni selhalo" },
        { status: 502 }
      );
    }

    const aiResponse = await res.json();
    const mergedContent = aiResponse.choices?.[0]?.message?.content || "";

    // Get next version number
    const versionRes = await query(
      "SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM doc_versions WHERE document_id = $1",
      [document_id]
    );
    const nextVersion = versionRes.rows[0].next_version;

    // Create new doc_version with merged content
    const newVersion = await query(
      `INSERT INTO doc_versions (document_id, version_number, content, summary, created_by, is_ai_generated, ai_model)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING *`,
      [
        document_id,
        nextVersion,
        JSON.stringify({ text: mergedContent }),
        `AI slouceni ${contribs.rows.length} prispevku`,
        user.id,
        selectedModel,
      ]
    );

    // Update document current_version
    await query(
      "UPDATE documents SET current_version = $1, updated_at = now() WHERE id = $2",
      [nextVersion, document_id]
    );

    // Mark merged contributions
    const contribIds = contribs.rows.map((c: Record<string, unknown>) => c.id);
    if (contribIds.length > 0) {
      await query(
        `UPDATE contributions SET status = merged WHERE id = ANY($1::uuid[])`,
        [contribIds]
      );
    }

    return NextResponse.json({
      ok: true,
      version: newVersion.rows[0],
      merged_count: contribs.rows.length,
      model_used: selectedModel,
    });
  } catch (error) {
    console.error("AI merge error:", error);
    return NextResponse.json(
      { error: "Interni chyba serveru" },
      { status: 500 }
    );
  }
}
