import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const res = await query(
      `SELECT c.*, pr.display_name, pr.avatar_url
       FROM task_comments c
       JOIN profiles pr ON pr.id = c.user_id
       WHERE c.task_id = $1
       ORDER BY c.created_at`,
      [id]
    );

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("List comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Obsah komentare je povinny" }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO task_comments (task_id, user_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [id, user.id, content]
    );

    // Fetch with user info
    const commentRes = await query(
      `SELECT c.*, pr.display_name, pr.avatar_url
       FROM task_comments c
       JOIN profiles pr ON pr.id = c.user_id
       WHERE c.id = $1`,
      [res.rows[0].id]
    );

    return NextResponse.json({ ok: true, comment: commentRes.rows[0] });
  } catch (error) {
    console.error("Add comment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
