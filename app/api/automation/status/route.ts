import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/github";

type Target = { owner: string; repo: string; branch?: string };
const NAME_RE = /^[A-Za-z0-9_.-]{1,100}$/;
const BRANCH_RE = /^[A-Za-z0-9_.\/-]{1,255}$/;

function indiaDayStartUtc(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00+05:30`).toISOString();
}

function indiaTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const repos: Target[] = body.repos;
    if (!token) return NextResponse.json({ error: "Connect your GitHub token first." }, { status: 400 });
    if (!Array.isArray(repos) || repos.length > 20 || repos.some((item) =>
      !item || !NAME_RE.test(item.owner || "") || !NAME_RE.test(item.repo || "") ||
      (item.branch !== undefined && !BRANCH_RE.test(item.branch)))) {
      return NextResponse.json({ error: "Invalid repository list." }, { status: 400 });
    }

    await getAuthenticatedUser(token);
    const since = indiaDayStartUtc(new Date());
    const pulses = await Promise.all(repos.map(async ({ owner, repo, branch = "main" }) => {
      const url = new URL(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`);
      url.searchParams.set("sha", branch);
      url.searchParams.set("since", since);
      url.searchParams.set("per_page", "100");
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "GitPulse",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Could not inspect ${owner}/${repo} (${response.status}).`);
      const commits = await response.json();
      return commits
        .filter((commit: { commit?: { message?: string }; committer?: { date?: string } }) =>
          commit.commit?.message?.split("\n", 1)[0] === "chore(pulse): automated repository sync")
        .map((commit: { sha: string; html_url: string; commit: { committer?: { date?: string }; author?: { date?: string } } }) => {
          const timestamp = commit.commit.committer?.date ?? commit.commit.author?.date;
          return timestamp ? {
            key: commit.sha,
            repository: `${owner}/${repo}`,
            time: indiaTime(timestamp),
            timestamp,
            url: commit.html_url,
          } : null;
        })
        .filter(Boolean);
    }));

    return NextResponse.json({ pulses: pulses.flat().sort((a, b) => a.timestamp.localeCompare(b.timestamp)) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not check today's automated commits." },
      { status: 502 },
    );
  }
}
