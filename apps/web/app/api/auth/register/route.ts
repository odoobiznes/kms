import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, createSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { display_name, email, password } = await request.json();

    if (!display_name || !email || !password) {
      return NextResponse.json(
        { error: "Vsechna pole jsou povinna" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Heslo musi mit alespon 6 znaku" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await query("SELECT id FROM profiles WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Uzivatel s timto emailem jiz existuje" },
        { status: 409 }
      );
    }

    const password_hash = await hashPassword(password);

    const res = await query(
      `INSERT INTO profiles (display_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, email, display_name, role`,
      [display_name.trim(), email.trim().toLowerCase(), password_hash, "member"]
    );

    const user = res.rows[0];
    const token = createSessionToken(user.id);

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
      },
    }, { status: 201 });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Interni chyba serveru" },
      { status: 500 }
    );
  }
}
