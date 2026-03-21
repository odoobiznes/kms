import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stage_id, document_id } = await request.json();

    if (!stage_id || !document_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Close the stage
    await query(
      "UPDATE stages SET status = $1, approved_at = NOW(), closed_at = NOW() WHERE id = $2 AND document_id = $3",
      ["approved", stage_id, document_id]
    );

    // Get stage order to advance the document
    const stageRes = await query("SELECT stage_order FROM stages WHERE id = $1", [stage_id]);
    const stageOrder = stageRes.rows[0]?.stage_order;

    if (stageOrder) {
      // Check if there is a next stage
      const nextStageRes = await query(
        "SELECT id FROM stages WHERE document_id = $1 AND stage_order = $2",
        [document_id, stageOrder + 1]
      );

      if (nextStageRes.rows.length > 0) {
        // Advance document to next stage
        await query(
          "UPDATE documents SET stage_order = $1, updated_at = NOW() WHERE id = $2",
          [stageOrder + 1, document_id]
        );
      } else {
        // All stages done, mark document as approved
        await query(
          "UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2",
          ["approved", document_id]
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Close stage error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
