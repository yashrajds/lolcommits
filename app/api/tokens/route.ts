import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/github";
import {
  isAdminRequest,
  listFull,
  listPublic,
  saveEntry,
} from "@/lib/tokenVault";

export const dynamic = "force-dynamic";

// GET /api/tokens — admin-only list (masked by default, ?reveal=1 for full tokens)
export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin locked." }, { status: 401 });
  }
  const reveal = new URL(req.url).searchParams.get("reveal") === "1";
  return NextResponse.json({
    success: true,
    count: listPublic().length,
    tokens: reveal ? listFull() : listPublic(),
  });
}

// POST /api/tokens { token } — verify with GitHub, then save to the vault.
// Called automatically after a successful dashboard login.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token || token.length > 255) {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }
    const user = await getAuthenticatedUser(token);
    const now = new Date().toISOString();
    saveEntry({
      login: user.login,
      userId: user.id,
      name: user.name,
      avatar_url: user.avatar_url,
      token,
      addedAt: now,
      lastSeen: now,
    });
    // Never echo the token back.
    return NextResponse.json({ success: true, login: user.login });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verify failed.";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}
