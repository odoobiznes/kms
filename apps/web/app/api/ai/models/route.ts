import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const litellmUrl = process.env.LITELLM_URL || "http://127.0.0.1:4100";
    const litellmKey = process.env.LITELLM_MASTER_KEY || "";

    const res = await fetch(`${litellmUrl}/v1/models`, {
      headers: {
        Authorization: `Bearer ${litellmKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Nelze nacist modely z AI gateway" },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Models fetch error:", error);
    return NextResponse.json(
      { error: "Chyba pripojeni k AI gateway" },
      { status: 500 }
    );
  }
}
