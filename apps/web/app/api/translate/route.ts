import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const LANG_NAMES: Record<string, string> = {
  ces: "cestiny",
  eng: "anglictiny",
  rus: "rustiny",
  ukr: "ukrajinstiny",
  heb: "hebrejstiny",
};

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
    }

    const { text, target_language, model } = await request.json();

    if (!text || !target_language) {
      return NextResponse.json(
        { error: "Text a cilovy jazyk jsou povinne" },
        { status: 400 }
      );
    }

    const litellmUrl = process.env.LITELLM_URL || "http://127.0.0.1:4100";
    const litellmKey = process.env.LITELLM_MASTER_KEY || "";
    const selectedModel = model || user.ai_model || "claude-sonnet";

    const langName = LANG_NAMES[target_language] || target_language;

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
            content: `Jsi profesionalni prekladatel. Preloz nasledujici text do ${langName}. Zachovej formatovani. Vystup POUZE preklad, bez komentaru.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("LiteLLM translate error:", errText);
      return NextResponse.json(
        { error: "Preklad selhal" },
        { status: 502 }
      );
    }

    // Stream the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = res.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Translate error:", error);
    return NextResponse.json(
      { error: "Interni chyba serveru" },
      { status: 500 }
    );
  }
}
