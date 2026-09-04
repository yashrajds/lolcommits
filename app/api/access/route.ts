import { NextRequest, NextResponse } from "next/server";

const COOKIE = "gitpulse_access";

export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({}));
  const configured = process.env.SITE_PASSWORD;
  if (!configured) return NextResponse.json({ error: "SITE_PASSWORD is not configured." }, { status: 503 });
  if (typeof password !== "string" || password !== configured) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE, configured, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 12, path: "/" });
  return response;
}
