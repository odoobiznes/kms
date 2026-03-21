import { NextRequest, NextResponse } from "next/server";
import { query, getDocument } from "@/lib/db";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "kms-webhook-secret-change-me";
const WIKISYS_API_URL = process.env.WIKISYS_API_URL || "https://wiki.it-enterprise.cloud/api/pages";

async function logIntegrationEvent(
  eventType: string,
  source: string,
  status: string,
  details: string,
  data: Record<string, unknown> = {}
) {
  await query(
    `INSERT INTO integration_events (event_type, source_system, status, details, data)
     VALUES ($1, $2, $3, $4, $5)`,
    [eventType, source, status, details, JSON.stringify(data)]
  );
}

export async function POST(request: NextRequest) {
  try {
    // Allow both session auth and webhook secret
    const secret = request.headers.get("X-Webhook-Secret");
    if (secret !== WEBHOOK_SECRET) {
      // Could also check session here if needed
      return NextResponse.json({ error: "Neplatna autorizace" }, { status: 401 });
    }

    const { document_id } = await request.json();

    if (!document_id) {
      return NextResponse.json(
        { error: "Chybi document_id" },
        { status: 400 }
      );
    }

    const doc = await getDocument(document_id);
    if (!doc) {
      return NextResponse.json(
        { error: "Dokument nenalezen" },
        { status: 404 }
      );
    }

    if (doc.status !== "approved" && doc.status !== "closed") {
      return NextResponse.json(
        { error: "Dokument musi byt schvalen nebo uzavren pro export" },
        { status: 400 }
      );
    }

    // Format content for WikiSys
    const wikiPayload = {
      title: doc.title,
      content: doc.content,
      metadata: {
        kms_document_id: doc.id,
        kms_project_id: doc.project_id,
        version: doc.current_version,
        status: doc.status,
        exported_at: new Date().toISOString(),
      },
    };

    let exportStatus = "success";
    let exportDetails = "";

    try {
      const response = await fetch(WIKISYS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.WIKISYS_API_TOKEN || ""}`,
        },
        body: JSON.stringify(wikiPayload),
      });

      if (!response.ok) {
        exportStatus = "error";
        exportDetails = `WikiSys API odpoved: ${response.status} ${response.statusText}`;
      } else {
        exportDetails = `Dokument "${doc.title}" uspesne exportovan do WikiSys`;
      }
    } catch (fetchError) {
      exportStatus = "error";
      exportDetails = `WikiSys API nedostupne: ${String(fetchError)}`;
    }

    // Log the integration event
    await logIntegrationEvent(
      "wikisys.export",
      "KMS",
      exportStatus,
      exportDetails,
      { document_id, title: doc.title }
    );

    // Create notification for the document author
    if (doc.created_by) {
      await query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          doc.created_by,
          "document_closed",
          exportStatus === "success" ? "Export do WikiSys" : "Chyba exportu WikiSys",
          exportStatus === "success"
            ? `Dokument "${doc.title}" byl exportovan do WikiSys.`
            : `Export dokumentu "${doc.title}" do WikiSys selhal: ${exportDetails}`,
          JSON.stringify({ document_id, export_status: exportStatus }),
        ]
      );
    }

    return NextResponse.json({
      ok: true,
      status: exportStatus,
      message: exportDetails,
    });
  } catch (error) {
    console.error("WikiSys export error:", error);

    try {
      await logIntegrationEvent(
        "wikisys.export",
        "KMS",
        "error",
        String(error),
        {}
      );
    } catch {
      // ignore
    }

    return NextResponse.json(
      { error: "Interni chyba serveru" },
      { status: 500 }
    );
  }
}
