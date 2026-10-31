import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { error: "No GitHub Personal Access Token provided or found in environment." },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(token);
    return NextResponse.json({
      valid: true,
      user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error.message || "Failed to verify GitHub token." },
      { status: 401 }
    );
  }
}
