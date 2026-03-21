import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get from profiles table (primary AI config)
    const profile = {
      ai_provider: user.ai_provider || "claude",
      ai_model: user.ai_model || "claude-sonnet",
    };

    // Get all configs from user_ai_config
    const configs = await query(
      "SELECT id, provider, model, is_default, settings, created_at FROM user_ai_config WHERE user_id = $1 ORDER BY created_at",
      [user.id]
    );

    return NextResponse.json({
      ok: true,
      default_provider: profile.ai_provider,
      default_model: profile.ai_model,
      configs: configs.rows,
    });
  } catch (error) {
    console.error("AI settings GET error:", error);
    return NextResponse.json({ error: "Interni chyba serveru" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, model, api_key } = await request.json();

    if (!provider || !model) {
      return NextResponse.json(
        { error: "Provider a model jsou povinne" },
        { status: 400 }
      );
    }

    // Update profiles table with default AI config
    await query(
      "UPDATE profiles SET ai_provider = $1, ai_model = $2, updated_at = now() WHERE id = $3",
      [provider, model, user.id]
    );

    // Upsert user_ai_config
    await query(
      `INSERT INTO user_ai_config (user_id, provider, model, api_key_encrypted, is_default)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (user_id, provider, model)
       DO UPDATE SET api_key_encrypted = COALESCE($4, user_ai_config.api_key_encrypted),
                     is_default = true`,
      [user.id, provider, model, api_key || null]
    );

    // Unset is_default on other configs
    await query(
      "UPDATE user_ai_config SET is_default = false WHERE user_id = $1 AND NOT (provider = $2 AND model = $3)",
      [user.id, provider, model]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("AI settings POST error:", error);
    return NextResponse.json({ error: "Interni chyba serveru" }, { status: 500 });
  }
}
