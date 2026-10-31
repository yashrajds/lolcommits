import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/github";
import { createWorkflow } from "@/lib/automation";

type Target = { owner: string; repo: string; branch?: string };

const NAME_RE = /^[A-Za-z0-9_.-]{1,100}$/;
const BRANCH_RE = /^[A-Za-z0-9_.\-/]{1,255}$/;
const FILE_PATH = ".github/workflows/gitpulse.yml";

async function githubRequest(token: string, url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "GitPulse",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
}

async function install(token: string, target: Target, authorName: string, authorEmail: string) {
  const { owner, repo, branch = "main" } = target;
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${FILE_PATH}`;
  const current = await githubRequest(token, `${base}?ref=${encodeURIComponent(branch)}`);
  let sha: string | undefined;

  if (current.ok) {
    const existing = await current.json();
    const contents = Buffer.from(existing.content || "", "base64").toString("utf-8");
    if (!contents.includes("# Managed by GitPulse")) {
      throw new Error(`${owner}/${repo} already has a different workflow at ${FILE_PATH}; it was left unchanged.`);
    }
    sha = existing.sha;
  } else if (current.status !== 404) {
    const error = await current.json().catch(() => ({}));
    if (current.status === 403) {
      throw new Error("GitHub denied repository access. Grant this token access to the repository with Contents: Read and write and Workflows: Read and write.");
    }
    throw new Error(error.message || `Cannot access ${owner}/${repo} (${current.status}).`);
  }

  const response = await githubRequest(token, base, {
    method: "PUT",
    body: JSON.stringify({
      message: "chore(gitpulse): enable daily automation",
      content: Buffer.from(createWorkflow(authorName, authorEmail, `${owner}/${repo}`)).toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 403) {
      throw new Error("GitHub denied workflow access. Grant this token Contents: Read and write and Workflows: Read and write for this repository.");
    }
    throw new Error(error.message || `Could not install workflow (${response.status}).`);
  }

  const result = await response.json();
  return { owner, repo, success: true, sha: result.commit?.sha, url: result.content?.html_url };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const repos: Target[] = body.repos;

    if (!token) return NextResponse.json({ error: "Connect your GitHub token first." }, { status: 400 });
    if (!Array.isArray(repos) || repos.length < 1 || repos.length > 20) {
      return NextResponse.json({ error: "Choose between 1 and 20 repositories." }, { status: 400 });
    }
    if (repos.some((item) => !item || !NAME_RE.test(item.owner || "") || !NAME_RE.test(item.repo || "") || (item.branch && !BRANCH_RE.test(item.branch)))) {
      return NextResponse.json({ error: "One or more repository details are invalid." }, { status: 400 });
    }

    const user = await getAuthenticatedUser(token);
    const authorName = user.name || user.login;
    const authorEmail = `${user.id}+${user.login}@users.noreply.github.com`;
    const results = await Promise.all(repos.map(async (target) => {
      try {
        return await install(token, target, authorName, authorEmail);
      } catch (error) {
        return {
          owner: target.owner,
          repo: target.repo,
          success: false,
          error: error instanceof Error ? error.message : "Workflow installation failed.",
        };
      }
    }));

    const successCount = results.filter((result) => result.success).length;
    return NextResponse.json({ success: successCount === results.length, total: results.length, successCount, failureCount: results.length - successCount, results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not set up GitHub automation." }, { status: 401 });
  }
}
