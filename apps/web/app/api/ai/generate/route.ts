import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

interface AIContext {
  type?: string;
  projectName?: string;
  projectDescription?: string;
  projectCategory?: string;
  documentTitle?: string;
  courseName?: string;
  planName?: string;
  goals?: string;
}

function buildSystemPrompt(aiContext?: AIContext, role?: string, docContent?: string): string {
  // Base system prompt
  if (!aiContext || !aiContext.type || aiContext.type === "general") {
    let base = "Jsi uzitecny AI asistent v systemu pro spravu znalosti (KMS). Odpovidas ve stejnem jazyce, v jakem je zadan prompt. Pises profesionalne a strucne.";
    if (role) base += `\nTvoje role: ${role}`;
    return base;
  }

  const parts = [
    "Jsi AI asistent v systemu KMS (Knowledge Management System).",
    `Pracujes v kontextu: ${aiContext.type}`,
  ];

  if (aiContext.projectName) {
    parts.push(`Projekt: ${aiContext.projectName}${aiContext.projectDescription ? " - " + aiContext.projectDescription : ""}`);
  }
  if (aiContext.projectCategory) parts.push(`Kategorie: ${aiContext.projectCategory}`);
  if (aiContext.documentTitle) parts.push(`Dokument: ${aiContext.documentTitle}`);
  if (aiContext.courseName) parts.push(`Kurz: ${aiContext.courseName}`);
  if (aiContext.planName) parts.push(`Plan: ${aiContext.planName}`);
  if (aiContext.goals) parts.push(`Cil: ${aiContext.goals}`);
  if (role) parts.push(`Tvoje role: ${role}`);

  parts.push("");
  parts.push("Odpovidas profesionalne, strucne, ve stejnem jazyce jako uzivatel.");

  const taskMap: Record<string, string> = {
    project: "planovanim, analyzou a strukturou projektu",
    document: "psanim, editaci a analyzou dokumentu",
    course: "tvorbou osnov, testu a lekci",
    plan: "planovanim, rozdelenim ukolu a prioritizaci",
    general: "obecnymi dotazy",
  };
  parts.push(`Znas kontext a pomahes s ${taskMap[aiContext.type] || taskMap.general}.`);

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, context, model, aiContext, role } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt je povinny" },
        { status: 400 }
      );
    }

    const litellmUrl = process.env.LITELLM_URL || "http://127.0.0.1:4100";
    const litellmKey = process.env.LITELLM_MASTER_KEY || "";
    const selectedModel = model || user.ai_model || "groq-llama";

    const systemPrompt = buildSystemPrompt(aiContext as AIContext | undefined, role, context);

    const messages = [
      {
        role: "system",
        content: systemPrompt,
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
