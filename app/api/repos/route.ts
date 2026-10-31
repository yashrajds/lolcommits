import { NextRequest, NextResponse } from "next/server";
import { listUserRepositories } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing GitHub Personal Access Token." },
        { status: 400 }
      );
    }

    const excludeForks = body.excludeForks ?? false;
    const excludeArchived = body.excludeArchived ?? true;

    const repos = await listUserRepositories(token, {
      excludeForks,
      excludeArchived,
    });

    return NextResponse.json({
      success: true,
      count: repos.length,
      repos,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch repositories." },
      { status: 500 }
    );
  }
}
