import { NextRequest, NextResponse } from "next/server";
import { batchCommitPulse, getAuthenticatedUser } from "@/lib/github";
import { recordActivity } from "@/lib/activity";

const NAME_RE = /^[A-Za-z0-9_.-]{1,100}$/;
const BRANCH_RE = /^[A-Za-z0-9_.\-/]{1,255}$/;

function isSafePath(p: string): boolean {
  return (
    typeof p === "string" &&
    p.length >= 1 &&
    p.length <= 255 &&
    !p.startsWith("/") &&
    !p.includes("\\") &&
    !p.split("/").includes("..") &&
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f]/.test(p)
  );
}

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
    if (!Array.isArray(repos) || repos.length === 0 || repos.length > 20) {
      return NextResponse.json(
        { error: "Provide between 1 and 20 target repositories." },
        { status: 400 }
      );
    }
    for (const r of repos) {
      if (!r || !NAME_RE.test(r.owner || "") || !NAME_RE.test(r.repo || "")) {
        return NextResponse.json(
          { error: "Invalid owner/repo in request." },
          { status: 400 }
        );
      }
      if (r.branch !== undefined && !BRANCH_RE.test(r.branch)) {
        return NextResponse.json(
          { error: "Invalid branch in request." },
          { status: 400 }
        );
      }
    }

    const filePath =
      typeof body.filePath === "string" && isSafePath(body.filePath.trim())
        ? body.filePath.trim()
        : ".github-pulse.md";
    const commitMessage =
      typeof body.commitMessage === "string" && body.commitMessage.trim()
        ? body.commitMessage.trim().slice(0, 200)
        : undefined;
    const concurrency =
      typeof body.concurrency === "number"
        ? Math.max(1, Math.min(5, Math.floor(body.concurrency)))
        : 4;

    // Author is always derived from the token owner — never trust caller input.
    let authorName: string | undefined;
    let authorEmail: string | undefined;
    try {
      const user = await getAuthenticatedUser(token);
      authorName = user.name || user.login;
      authorEmail = user.email || `${user.id}+${user.login}@users.noreply.github.com`;
    } catch {
      // Fallback gracefully
    }

    const results = await batchCommitPulse(token, repos, {
      concurrency,
      filePath,
      commitMessage,
      authorName,
      authorEmail,
    });

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    recordActivity(results.filter((r) => r.success).map((r) => ({ repo: r.repo, sha: r.sha, time: new Date().toISOString() })));

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
