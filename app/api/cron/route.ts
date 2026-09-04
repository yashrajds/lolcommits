import { NextRequest, NextResponse } from "next/server";
import {
  batchCommitPulse,
  getAuthenticatedUser,
  listUserRepositories,
  getRandomCommitMessage,
} from "@/lib/github";
import { recordActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Max execution timeout for Vercel functions

async function handleCronTrigger(req: NextRequest) {
  const startTime = Date.now();

  // 1. Authorization check
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");

  if (cronSecret) {
    const isAuthorizedHeader = authHeader === `Bearer ${cronSecret}`;
    const isAuthorizedQuery = querySecret === cronSecret;

    if (!isAuthorizedHeader && !isAuthorizedQuery) {
      return NextResponse.json(
        { error: "Unauthorized. Missing or invalid CRON_SECRET." },
        { status: 401 }
      );
    }
  }

  // 2. Validate GitHub Token
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error: "GITHUB_TOKEN environment variable is not configured in Vercel settings.",
        hint: "Add GITHUB_TOKEN to your Vercel Project Settings > Environment Variables.",
      },
      { status: 500 }
    );
  }

  try {
    // 3. Authenticate User
    const user = await getAuthenticatedUser(token);
    const authorName = user.name || user.login;
    const authorEmail = user.email || `${user.id}+${user.login}@users.noreply.github.com`;

    // 4. Fetch repositories
    const excludeForks = process.env.EXCLUDE_FORKS !== "false";
    const excludeArchived = true;
    const allRepos = await listUserRepositories(token, {
      excludeForks,
      excludeArchived,
      affiliation: "owner",
    });

    if (allRepos.length === 0) {
      return NextResponse.json({
        message: "No eligible repositories found for authenticated user.",
        user: user.login,
      });
    }

    // 5. Apply filters: INCLUDE_REPOS / EXCLUDE_REPOS
    let targetRepos = allRepos;

    const includeList = process.env.INCLUDE_REPOS
      ? process.env.INCLUDE_REPOS.split(",").map((s) => s.trim().toLowerCase())
      : null;
    const excludeList = process.env.EXCLUDE_REPOS
      ? process.env.EXCLUDE_REPOS.split(",").map((s) => s.trim().toLowerCase())
      : [];

    if (includeList && includeList.length > 0) {
      targetRepos = targetRepos.filter((r) =>
        includeList.includes(r.name.toLowerCase()) || includeList.includes(r.full_name.toLowerCase())
      );
    }

    if (excludeList.length > 0) {
      targetRepos = targetRepos.filter(
        (r) =>
          !excludeList.includes(r.name.toLowerCase()) && !excludeList.includes(r.full_name.toLowerCase())
      );
    }

    // 6. Handle random repository selection or batch sizing
    const isRandomMode = process.env.RANDOMIZE_REPOS !== "false" || url.searchParams.get("random") === "true";
    const minRepos = parseInt(process.env.MIN_RANDOM_REPOS || "1", 10);
    const maxRepos = parseInt(process.env.MAX_RANDOM_REPOS || "3", 10);

    const batchSizeEnv = process.env.COMMIT_BATCH_SIZE;
    if (isRandomMode) {
      // Pick a randomized subset of repos (e.g. 1-3 random repositories)
      const count = Math.min(targetRepos.length, Math.max(minRepos, Math.floor(Math.random() * (maxRepos - minRepos + 1)) + minRepos));
      const shuffled = [...targetRepos].sort(() => 0.5 - Math.random());
      targetRepos = shuffled.slice(0, count);
    } else if (batchSizeEnv && batchSizeEnv.toLowerCase() !== "all") {
      const batchSize = parseInt(batchSizeEnv, 10);
      if (!isNaN(batchSize) && batchSize > 0 && batchSize < targetRepos.length) {
        const shuffled = [...targetRepos].sort(() => 0.5 - Math.random());
        targetRepos = shuffled.slice(0, batchSize);
      }
    }

    const repoPayload = targetRepos.map((r) => ({
      owner: r.owner.login,
      repo: r.name,
      branch: r.default_branch || "main",
    }));

    const filePath = process.env.TARGET_FILE || ".github-pulse.md";
    const commitMessage = getRandomCommitMessage();

    // 7. Execute batch commits
    const results = await batchCommitPulse(token, repoPayload, {
      concurrency: 5,
      filePath,
      commitMessage,
      authorName,
      authorEmail,
    });

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    recordActivity(results.filter((r) => r.success).map((r) => ({ repo: r.repo, sha: r.sha, time: new Date().toISOString() })));
    const totalDurationMs = Date.now() - startTime;

    return NextResponse.json({
      status: "success",
      triggeredAt: new Date().toISOString(),
      user: user.login,
      totalReposConsidered: allRepos.length,
      reposTargeted: targetRepos.length,
      successCount,
      failureCount,
      durationMs: totalDurationMs,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        error: error.message || "Cron execution encountered an error.",
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleCronTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleCronTrigger(req);
}
