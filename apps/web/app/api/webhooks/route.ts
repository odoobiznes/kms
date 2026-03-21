import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "kms-webhook-secret-change-me";

const VALID_EVENT_TYPES = [
  "project.created",
  "document.approved",
  "document.closed",
  "stage.advanced",
  "vote.cast",
] as const;

type EventType = (typeof VALID_EVENT_TYPES)[number];

interface WebhookPayload {
  event_type: EventType;
  source: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
) {
  await query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, body, JSON.stringify(data)]
  );
}

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

async function processEvent(payload: WebhookPayload) {
  const { event_type, source, data } = payload;

  switch (event_type) {
    case "project.created": {
      const projectName = (data.name as string) || "Novy projekt";
      const ownerId = data.owner_id as string;
      if (ownerId) {
        await createNotification(
          ownerId,
          "project_invitation",
          "Novy projekt vytvoren",
          `Projekt "${projectName}" byl uspesne vytvoren.`,
          { project_id: data.project_id }
        );
      }
      break;
    }
    case "document.approved": {
      const docTitle = (data.title as string) || "Dokument";
      const authorId = data.author_id as string;
      if (authorId) {
        await createNotification(
          authorId,
          "stage_advanced",
          "Dokument schvalen",
          `Dokument "${docTitle}" byl schvalen a je pripraven k exportu.`,
          { document_id: data.document_id }
        );
      }
      // Trigger WikiSys export for approved documents
      if (data.document_id && data.auto_export) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3100";
          await fetch(`${baseUrl}/api/integrations/wikisys`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Secret": WEBHOOK_SECRET,
            },
            body: JSON.stringify({ document_id: data.document_id }),
          });
        } catch (err) {
          console.error("WikiSys export trigger failed:", err);
        }
      }
      break;
    }
    case "document.closed": {
      const closedTitle = (data.title as string) || "Dokument";
      const closedAuthorId = data.author_id as string;
      if (closedAuthorId) {
        await createNotification(
          closedAuthorId,
          "document_closed",
          "Dokument uzavren",
          `Dokument "${closedTitle}" byl uzavren.`,
          { document_id: data.document_id }
        );
      }
      break;
    }
    case "stage.advanced": {
      const stageName = (data.stage_name as string) || "Dalsi faze";
      const memberIds = (data.member_ids as string[]) || [];
      for (const memberId of memberIds) {
        await createNotification(
          memberId,
          "stage_advanced",
          "Faze posunuta",
          `Dokument postoupil do faze "${stageName}". Zkontrolujte a hlasujte.`,
          { document_id: data.document_id, stage_id: data.stage_id }
        );
      }
      break;
    }
    case "vote.cast": {
      const voterName = (data.voter_name as string) || "Uzivatel";
      const docOwnerId = data.document_owner_id as string;
      if (docOwnerId) {
        await createNotification(
          docOwnerId,
          "vote_requested",
          "Novy hlas",
          `${voterName} hlasoval o vasem dokumentu.`,
          {
            document_id: data.document_id,
            stage_id: data.stage_id,
            approved: data.approved,
          }
        );
      }
      break;
    }
  }

  await logIntegrationEvent(
    event_type,
    source,
    "success",
    `Zpracovano: ${event_type} z ${source}`,
    data
  );
}

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("X-Webhook-Secret");
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Neplatny webhook secret" }, { status: 401 });
    }

    const payload: WebhookPayload = await request.json();

    if (!payload.event_type || !payload.source) {
      return NextResponse.json(
        { error: "Chybi event_type nebo source" },
        { status: 400 }
      );
    }

    if (!VALID_EVENT_TYPES.includes(payload.event_type as EventType)) {
      return NextResponse.json(
        { error: `Neplatny event_type: ${payload.event_type}` },
        { status: 400 }
      );
    }

    await processEvent(payload);

    return NextResponse.json({
      ok: true,
      message: `Event ${payload.event_type} zpracovan`,
    });
  } catch (error) {
    console.error("Webhook error:", error);

    try {
      await logIntegrationEvent(
        "webhook.error",
        "unknown",
        "error",
        String(error),
        {}
      );
    } catch {
      // ignore logging errors
    }

    return NextResponse.json(
      { error: "Interni chyba serveru" },
      { status: 500 }
    );
  }
}
