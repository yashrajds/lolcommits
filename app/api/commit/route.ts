import { NextRequest, NextResponse } from "next/server";
import { batchCommitPulse, getAuthenticatedUser } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || process.env.GITHUB_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "Missing GitHub Personal Access Token." },
        { status: 400 }
      );
    }

    const repos: Array<{ owner: string; repo: string; branch?: string }> = body.repos;
    if (!Array.isArray(repos) || repos.length === 0) {
      return NextResponse.json(
        { error: "No target repositories specified." },
        { status: 400 }
      );
    }

    // Get author details so the commit counts towards contribution graph
    let authorName: string | undefined = body.authorName;
    let authorEmail: string | undefined = body.authorEmail;

    if (!authorName || !authorEmail) {
      try {
        const user = await getAuthenticatedUser(token);
        authorName = user.name || user.login;
        authorEmail = user.email || `${user.id}+${user.login}@users.noreply.github.com`;
      } catch {
        // Fallback gracefully
      }
    }

    const results = await batchCommitPulse(token, repos, {
      concurrency: body.concurrency || 4,
      filePath: body.filePath || ".github-pulse.md",
      commitMessage: body.commitMessage,
      authorName,
      authorEmail,
    });

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      total: results.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Commit batch failed." },
      { status: 500 }
    );
  }
}
