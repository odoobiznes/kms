import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await query(
      `SELECT id, type, title, body, data, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id]
    );

    const unreadCount = await query(
      `SELECT COUNT(*) AS count FROM notifications
       WHERE user_id = $1 AND read = false`,
      [user.id]
    );

    return NextResponse.json({
      notifications: result.rows,
      unread_count: parseInt(unreadCount.rows[0]?.count || "0", 10),
    });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Interni chyba serveru" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notification_ids, mark_all } = await request.json();

    if (mark_all) {
      await query(
        `UPDATE notifications SET read = true
         WHERE user_id = $1 AND read = false`,
        [user.id]
      );
    } else if (notification_ids && Array.isArray(notification_ids) && notification_ids.length > 0) {
      await query(
        `UPDATE notifications SET read = true
         WHERE user_id = $1 AND id = ANY($2::uuid[])`,
        [user.id, notification_ids]
      );
    } else {
      return NextResponse.json(
        { error: "Zadejte notification_ids nebo mark_all: true" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json({ error: "Interni chyba serveru" }, { status: 500 });
  }
}
