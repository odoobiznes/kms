import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, context, model } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt je povinny" },
        { status: 400 }
      );
    }

    const litellmUrl = process.env.LITELLM_URL || "http://127.0.0.1:4100";
    const litellmKey = process.env.LITELLM_MASTER_KEY || "";
    const selectedModel = model || user.ai_model || "claude-sonnet";

    const messages = [
      {
        role: "system",
        content: "Jsi uzitecny AI asistent v systemu pro spravu znalosti (KMS). Odpovidas ve stejnem jazyce, v jakem je zadan prompt. Pises profesionalne a strucne.",
      },
    ];

    if (context) {
      messages.push({
        role: "system",
        content: `Kontext dokumentu:\n${context}`,
      });
    }

    messages.push({
      role: "user",
      content: prompt,
    });

    // Try streaming first
    const res = await fetch(`${litellmUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${litellmKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("LiteLLM error:", errText);
      return NextResponse.json(
        { error: "AI model odpoved selhala", details: errText },
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
    console.error("AI generate error:", error);
    return NextResponse.json(
      { error: "Interni chyba serveru" },
      { status: 500 }
    );
  }
}
