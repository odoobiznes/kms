import { NextRequest, NextResponse } from "next/server";
import { query, getDocument } from "@/lib/db";
import { getSession } from "@/lib/auth";

const WIKISYS_URL = process.env.WIKISYS_URL || "http://10.0.0.3:5001";
const WIKISYS_TOKEN = process.env.WIKISYS_TOKEN || "";

// ---------------------------------------------------------------------------
// Helper: call WikiSys API v1
// ---------------------------------------------------------------------------
async function wikiApi(
  path: string,
  options: { method?: string; body?: unknown } = {}
) {
  const { method = "GET", body } = options;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${WIKISYS_TOKEN}`,
    "Content-Type": "application/json",
  };
  const res = await fetch(`${WIKISYS_URL}/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `WikiSys API ${res.status}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Helper: log integration event
// ---------------------------------------------------------------------------
async function logEvent(
  eventType: string,
  status: string,
  details: string,
  data: Record<string, unknown> = {}
) {
  try {
    await query(
      `INSERT INTO integration_events (event_type, source_system, status, details, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventType, "WikiSys", status, details, JSON.stringify(data)]
    );
  } catch {
    // non-critical
  }
}

// ---------------------------------------------------------------------------
// GET — proxy read endpoints
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // ---- search ----
    if (action === "search") {
      const q = searchParams.get("q") || "";
      if (!q.trim()) {
        return NextResponse.json({ results: [], count: 0 });
      }
      const data = await wikiApi(`/wiki/search?q=${encodeURIComponent(q)}`);
      return NextResponse.json(data);
    }

    // ---- categories ----
    if (action === "categories") {
      const data = await wikiApi("/wiki/categories");
      return NextResponse.json(data);
    }

    // ---- get article by slug ----
    if (action === "article") {
      const slug = searchParams.get("slug") || "";
      if (!slug) {
        return NextResponse.json(
          { error: "Chybi parametr slug" },
          { status: 400 }
        );
      }
      const data = await wikiApi(`/wiki/articles/${encodeURIComponent(slug)}`);
      return NextResponse.json(data);
    }

    // ---- health / status ----
    if (action === "status") {
      try {
        const data = await wikiApi("/health");
        // Count exported articles
        const eventsRes = await query(
          `SELECT COUNT(*) AS cnt FROM integration_events
           WHERE event_type = 'wikisys.export' AND status = 'success'`
        );
        const lastRes = await query(
          `SELECT created_at FROM integration_events
           WHERE event_type LIKE 'wikisys.%' AND status = 'success'
           ORDER BY created_at DESC LIMIT 1`
        );
        return NextResponse.json({
          connected: true,
          version: data.version || "1.0",
          exported_count: Number(eventsRes.rows[0]?.cnt || 0),
          last_export: lastRes.rows[0]?.created_at || null,
        });
      } catch {
        return NextResponse.json({ connected: false });
      }
    }

    return NextResponse.json({ error: "Neznama akce" }, { status: 400 });
  } catch (error) {
    console.error("Wiki GET error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — export / import / search actions
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action as string;

    // ==================== EXPORT DOCUMENT ====================
    if (action === "export_document") {
      const { document_id, category_id, tags, status: artStatus } = body;
      if (!document_id) {
        return NextResponse.json({ error: "Chybi document_id" }, { status: 400 });
      }

      const doc = await getDocument(document_id);
      if (!doc) {
        return NextResponse.json({ error: "Dokument nenalezen" }, { status: 404 });
      }

      // Get document content from Y.js or raw
      let content = doc.content || "";
      // If there's a Hocuspocus stored content, try to get it
      if (!content && doc.id) {
        const yRes = await query(
          "SELECT content FROM documents WHERE id = $1",
          [doc.id]
        );
        content = yRes.rows[0]?.content || "";
      }

      const wikiPayload = {
        title: doc.title,
        content: content,
        category_id: category_id || 1,
        tags: tags || [],
        status: artStatus || "draft",
      };

      const result = await wikiApi("/wiki/articles", {
        method: "POST",
        body: wikiPayload,
      });

      await logEvent("wikisys.export", "success", `Dokument "${doc.title}" exportovan do WikiSys`, {
        document_id,
        wiki_article_id: result.id,
        wiki_slug: result.slug,
      });

      // Notify author
      if (doc.created_by) {
        await query(
          `INSERT INTO notifications (user_id, type, title, body, data)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            doc.created_by,
            "document_closed",
            "Export do WikiSys",
            `Dokument "${doc.title}" byl exportovan do WikiSys.`,
            JSON.stringify({ document_id, wiki_slug: result.slug }),
          ]
        );
      }

      return NextResponse.json({
        ok: true,
        wiki_id: result.id,
        wiki_slug: result.slug,
        message: `Dokument "${doc.title}" uspesne exportovan`,
      });
    }

    // ==================== EXPORT COURSE ====================
    if (action === "export_course") {
      const { project_id, category_id, status: artStatus } = body;
      if (!project_id) {
        return NextResponse.json({ error: "Chybi project_id" }, { status: 400 });
      }

      // Get course project
      const projRes = await query("SELECT * FROM projects WHERE id = $1", [project_id]);
      const project = projRes.rows[0];
      if (!project) {
        return NextResponse.json({ error: "Projekt nenalezen" }, { status: 404 });
      }

      // Get all course lessons (documents)
      const docsRes = await query(
        `SELECT * FROM documents WHERE project_id = $1 ORDER BY stage_order, created_at`,
        [project_id]
      );

      const exported: Array<{ title: string; wiki_id: number; slug: string }> = [];
      const errors: string[] = [];

      for (const doc of docsRes.rows) {
        try {
          const result = await wikiApi("/wiki/articles", {
            method: "POST",
            body: {
              title: `${project.name}: ${doc.title}`,
              content: doc.content || "",
              category_id: category_id || 1,
              tags: ["kurz", project.name.toLowerCase()],
              status: artStatus || "draft",
            },
          });
          exported.push({ title: doc.title, wiki_id: result.id, slug: result.slug });
        } catch (err) {
          errors.push(`${doc.title}: ${String(err)}`);
        }
      }

      await logEvent("wikisys.export_course", "success",
        `Kurz "${project.name}": ${exported.length} lekci exportovano`, {
          project_id,
          exported_count: exported.length,
          error_count: errors.length,
        });

      return NextResponse.json({
        ok: true,
        exported,
        errors,
        message: `Exportovano ${exported.length} lekci z kurzu "${project.name}"`,
      });
    }

    // ==================== EXPORT PLAN ====================
    if (action === "export_plan") {
      const { plan_id, category_id, status: artStatus } = body;
      if (!plan_id) {
        return NextResponse.json({ error: "Chybi plan_id" }, { status: 400 });
      }

      const planRes = await query(
        `SELECT p.*, pr.display_name AS creator_name,
                proj.name AS project_name
         FROM plans p
         LEFT JOIN profiles pr ON pr.id = p.created_by
         LEFT JOIN projects proj ON proj.id = p.project_id
         WHERE p.id = $1`,
        [plan_id]
      );
      const plan = planRes.rows[0];
      if (!plan) {
        return NextResponse.json({ error: "Plan nenalezen" }, { status: 404 });
      }

      // Get plan tasks
      const tasksRes = await query(
        `SELECT t.*, pr.display_name AS assignee_name
         FROM tasks t
         LEFT JOIN profiles pr ON pr.id = t.assignee_id
         WHERE t.plan_id = $1
         ORDER BY t.position`,
        [plan_id]
      );

      // Build markdown content
      let md = `# ${plan.title}\n\n`;
      if (plan.description) md += `${plan.description}\n\n`;
      md += `**Projekt:** ${plan.project_name || "Bez projektu"}\n`;
      md += `**Autor:** ${plan.creator_name || "Neznamy"}\n`;
      md += `**Priorita:** ${plan.priority || "-"}\n`;
      if (plan.due_date) md += `**Termin:** ${new Date(plan.due_date).toLocaleDateString("cs-CZ")}\n`;
      md += `**Status:** ${plan.status || "active"}\n\n`;
      md += `## Ukoly (${tasksRes.rows.length})\n\n`;

      for (const task of tasksRes.rows) {
        const check = task.status === "done" ? "[x]" : "[ ]";
        md += `- ${check} **${task.title}**`;
        if (task.assignee_name) md += ` (${task.assignee_name})`;
        if (task.description) md += `\n  ${task.description}`;
        md += "\n";
      }

      const result = await wikiApi("/wiki/articles", {
        method: "POST",
        body: {
          title: `Plan: ${plan.title}`,
          content: md,
          category_id: category_id || 2,
          tags: ["plan", plan.status || "active"],
          status: artStatus || "draft",
        },
      });

      await logEvent("wikisys.export_plan", "success",
        `Plan "${plan.title}" exportovan do WikiSys`, {
          plan_id,
          wiki_article_id: result.id,
          wiki_slug: result.slug,
        });

      return NextResponse.json({
        ok: true,
        wiki_id: result.id,
        wiki_slug: result.slug,
        message: `Plan "${plan.title}" uspesne exportovan`,
      });
    }

    // ==================== IMPORT ARTICLE ====================
    if (action === "import_article") {
      const { slug, project_id } = body;
      if (!slug) {
        return NextResponse.json({ error: "Chybi slug" }, { status: 400 });
      }

      const article = await wikiApi(`/wiki/articles/${encodeURIComponent(slug)}`);
      if (!article.article) {
        return NextResponse.json({ error: "Clanek nenalezen" }, { status: 404 });
      }

      const art = article.article;

      // Create KMS document from wiki article
      const docRes = await query(
        `INSERT INTO documents (title, content, project_id, created_by, status)
         VALUES ($1, $2, $3, $4, 'draft') RETURNING *`,
        [
          art.title,
          art.content || "",
          project_id || null,
          user.id,
        ]
      );
      const newDoc = docRes.rows[0];

      // Create default stages
      const defaultStages = [
        { name: "Koncept", stage_order: 1 },
        { name: "Revize", stage_order: 2 },
        { name: "Schvaleni", stage_order: 3 },
        { name: "Uzavreno", stage_order: 4 },
      ];
      for (const stage of defaultStages) {
        await query(
          "INSERT INTO stages (document_id, name, stage_order, opened_by) VALUES ($1, $2, $3, $4)",
          [newDoc.id, stage.name, stage.stage_order, user.id]
        );
      }

      await logEvent("wikisys.import", "success",
        `Clanek "${art.title}" importovan z WikiSys`, {
          wiki_slug: slug,
          document_id: newDoc.id,
        });

      return NextResponse.json({
        ok: true,
        document_id: newDoc.id,
        title: art.title,
        message: `Clanek "${art.title}" importovan jako dokument`,
      });
    }

    // ==================== SEARCH (POST variant) ====================
    if (action === "search") {
      const q = (body.q || "").trim();
      if (!q) {
        return NextResponse.json({ results: [], count: 0 });
      }
      const data = await wikiApi(`/wiki/search?q=${encodeURIComponent(q)}`);
      return NextResponse.json(data);
    }

    // ==================== SYNC ALL CLOSED ====================
    if (action === "sync_closed") {
      // Find all closed/approved docs not yet exported
      const docsRes = await query(
        `SELECT d.* FROM documents d
         WHERE d.status IN ('approved', 'closed')
         AND d.id NOT IN (
           SELECT (data->>'document_id')::uuid
           FROM integration_events
           WHERE event_type = 'wikisys.export' AND status = 'success'
           AND data->>'document_id' IS NOT NULL
         )
         ORDER BY d.updated_at DESC`
      );

      const { category_id, status: artStatus } = body;
      const exported: Array<{ title: string; wiki_id: number }> = [];
      const errors: string[] = [];

      for (const doc of docsRes.rows) {
        try {
          const result = await wikiApi("/wiki/articles", {
            method: "POST",
            body: {
              title: doc.title,
              content: doc.content || "",
              category_id: category_id || 1,
              tags: ["kms", "auto-sync"],
              status: artStatus || "published",
            },
          });
          exported.push({ title: doc.title, wiki_id: result.id });

          await logEvent("wikisys.export", "success",
            `Auto-sync: "${doc.title}" exportovan`, {
              document_id: doc.id,
              wiki_article_id: result.id,
            });
        } catch (err) {
          errors.push(`${doc.title}: ${String(err)}`);
        }
      }

      return NextResponse.json({
        ok: true,
        exported_count: exported.length,
        error_count: errors.length,
        exported,
        errors,
        message: `Synchronizovano ${exported.length} dokumentu`,
      });
    }

    return NextResponse.json({ error: "Neznama akce" }, { status: 400 });
  } catch (error) {
    console.error("Wiki POST error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    await logEvent("wikisys.error", "error", msg, {});
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
