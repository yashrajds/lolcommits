import { getAuthenticatedUser, listUserRepositories } from "@/lib/github";
import { deleteTrackerFile, TRACKER_FILES } from "@/lib/cleanup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleCleanup(req: Request) {
  const startTime = Date.now();
  const url = new URL(req.url);

  // Same guard pattern as the old /api/cron route
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const querySecret = url.searchParams.get("secret");
  if (cronSecret) {
    const ok =
      authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
    if (!ok) {
      return Response.json(
        { error: "Unauthorized. Missing or invalid CRON_SECRET." },
        { status: 401 }
      );
    }
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return Response.json(
      { error: "GITHUB_TOKEN is not configured." },
      { status: 500 }
    );
  }

  try {
    const user = await getAuthenticatedUser(token);
    const authorName = user.name || user.login;
    const authorEmail =
      user.email || `${user.id}+${user.login}@users.noreply.github.com`;

    const excludeForks = process.env.EXCLUDE_FORKS !== "false";
    let repos = await listUserRepositories(token, {
      excludeForks,
      excludeArchived: true,
      affiliation: "owner",
    });

    const includeList = process.env.INCLUDE_REPOS
      ? process.env.INCLUDE_REPOS.split(",").map((s) => s.trim().toLowerCase())
      : null;
    const excludeList = process.env.EXCLUDE_REPOS
      ? process.env.EXCLUDE_REPOS.split(",").map((s) => s.trim().toLowerCase())
      : [];

    if (includeList?.length) {
      repos = repos.filter(
        (r) =>
          includeList.includes(r.name.toLowerCase()) ||
          includeList.includes(r.full_name.toLowerCase())
      );
    }
    if (excludeList.length) {
      repos = repos.filter(
        (r) =>
          !excludeList.includes(r.name.toLowerCase()) &&
          !excludeList.includes(r.full_name.toLowerCase())
      );
    }

    // Deletion-only: no file is ever created or updated here.
    const results = [];
    for (const r of repos) {
      const owner = r.owner.login;
      const repo = r.name;
      const branch = r.default_branch || "main";
      for (const file of TRACKER_FILES) {
        const res = await deleteTrackerFile(token, owner, repo, branch, file, {
          authorName,
          authorEmail,
        });
        results.push({ repo: `${owner}/${repo}`, file, ...res });
      }
    }

    const deleted = results.filter((x) => x.status === "deleted");
    const skipped = results.filter((x) => x.status === "skipped");
    const failed = results.filter((x) => x.status === "failed");

    return Response.json({
      status: "success",
      triggeredAt: new Date().toISOString(),
      user: user.login,
      reposScanned: repos.length,
      filesChecked: results.length,
      deletedCount: deleted.length,
      skippedCount: skipped.length,
      failedCount: failed.length,
      deleted,
      failed,
      durationMs: Date.now() - startTime,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Cleanup failed.";
    return Response.json(
      { status: "error", error: message, durationMs: Date.now() - startTime },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleCleanup(req);
}

export async function POST(req: Request) {
  return handleCleanup(req);
}
