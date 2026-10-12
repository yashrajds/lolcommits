export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
  html_url: string;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  default_branch: string;
  pushed_at: string;
  updated_at: string;
  stargazers_count: number;
  open_issues_count: number;
}

export interface CommitResult {
  repo: string;
  owner: string;
  success: boolean;
  sha?: string;
  url?: string;
  message?: string;
  error?: string;
  timestamp: string;
  durationMs: number;
}

const QUOTES = [
  "Code never lies, comments sometimes do.",
  "Simplicity is prerequisite for reliability.",
  "Make it work, make it right, make it fast.",
  "First, solve the problem. Then, write the code.",
  "Clean code always looks like it was written by someone who cares.",
  "Small daily improvements over time lead to stunning results.",
  "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
  "Optimism is an occupational hazard of programming: testing is the treatment.",
  "Consistent action creates consistent momentum.",
  "Focus on progress, not perfection."
];

function getRandomQuote(): string {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

const COMMIT_MESSAGES = [
  "chore(pulse): automated repository sync",
  "chore: update activity tracker heartbeat",
  "docs(sync): refresh repo pulse timestamp",
  "chore(maintenance): automated health ping",
  "docs: update maintenance log",
  "chore: keep repository pulse active"
];

export function getRandomCommitMessage(): string {
  return COMMIT_MESSAGES[Math.floor(Math.random() * COMMIT_MESSAGES.length)];
}

/**
 * Shuffles an array and picks a random subset between minCount and maxCount.
 */
export function pickRandomSubset<T>(items: T[], minCount: number = 1, maxCount: number = 3): T[] {
  if (!items || items.length === 0) return [];
  const count = Math.min(items.length, Math.max(minCount, Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount));
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Validates token and returns authenticated GitHub user info.
 */
export async function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "GitPulse-AutoCommit/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub Auth Failed: ${res.statusText} (${res.status})`);
  }

  const user = await res.json();

  // If email is private/null, try to fetch verified primary email
  if (!user.email) {
    try {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "GitPulse-AutoCommit/1.0",
        },
        cache: "no-store",
      });
      if (emailRes.ok) {
        const emails = await emailRes.json();
        const primary = emails.find((e: any) => e.primary && e.verified);
        if (primary) {
          user.email = primary.email;
        } else if (emails[0]?.email) {
          user.email = emails[0].email;
        }
      }
    } catch {
      // Fallback to github no-reply email
      user.email = `${user.id}+${user.login}@users.noreply.github.com`;
    }
  }

  if (!user.email) {
    user.email = `${user.id}+${user.login}@users.noreply.github.com`;
  }

  return user;
}

/**
 * Fetches all repositories owned or accessible by the user.
 */
export async function listUserRepositories(
  token: string,
  options: { excludeForks?: boolean; excludeArchived?: boolean; affiliation?: string } = {}
): Promise<GitHubRepo[]> {
  const { excludeForks = false, excludeArchived = true, affiliation = "owner,collaborator" } = options;
  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc&affiliation=${affiliation}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "GitPulse-AutoCommit/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch repos: ${res.statusText}`);
    }

    const data: GitHubRepo[] = await res.json();
    if (data.length === 0) break;

    for (const repo of data) {
      if (excludeArchived && repo.archived) continue;
      if (excludeForks && repo.fork) continue;
      repos.push(repo);
    }

    if (data.length < perPage || repos.length >= 200) {
      // Limit to 200 repos maximum to avoid execution timeout
      break;
    }
    page++;
  }

  return repos;
}

/**
 * Commits a safe heartbeat entry to a repository's default branch.
 */
export async function commitHeartbeat(
  token: string,
  owner: string,
  repo: string,
  options: {
    branch?: string;
    filePath?: string;
    commitMessage?: string;
    authorName?: string;
    authorEmail?: string;
  } = {}
): Promise<CommitResult> {
  const startTime = Date.now();
  const filePath = options.filePath || ".github-pulse.md";
  const branch = options.branch || "main";
  const commitMessage = options.commitMessage || getRandomCommitMessage();
  const now = new Date();
  const isoTime = now.toISOString();
  const readableTime = now.toUTCString();

  try {
    // 1. Check if the file already exists to obtain its SHA
    const contentUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`;
    const getRes = await fetch(contentUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "GitPulse-AutoCommit/1.0",
      },
      cache: "no-store",
    });

    let currentSha: string | undefined = undefined;
    let existingContent = "";

    if (getRes.ok) {
      const fileData = await getRes.json();
      currentSha = fileData.sha;
      if (fileData.content) {
        try {
          existingContent = Buffer.from(fileData.content, "base64").toString("utf-8");
        } catch {
          existingContent = "";
        }
      }
    } else if (getRes.status !== 404) {
      const err = await getRes.json().catch(() => ({}));
      throw new Error(err.message || `Could not inspect repository branch or file (${getRes.status})`);
    }

    // 2. Prepare new heartbeat content
    const quote = getRandomQuote();
    const newEntry = `- ⚡ **Pulse Check**: \`${readableTime}\` | *"${quote}"*\n`;
    
    let updatedContent: string;
    if (existingContent && existingContent.includes("## Heartbeat Log")) {
      // Prepend entry under Heartbeat Log header (keep last 30 entries)
      const parts = existingContent.split("## Heartbeat Log\n");
      const header = parts[0] + "## Heartbeat Log\n";
      const oldEntries = parts[1] ? parts[1].trim().split("\n").slice(0, 29).join("\n") : "";
      updatedContent = `${header}${newEntry}${oldEntries ? oldEntries + "\n" : ""}`;
    } else {
      updatedContent = `# ⚡ GitPulse Activity Tracker\n\nAutomated repository pulse log managed by [GitPulse](https://github.com).\n\n## Repository\n- **Target**: \`${owner}/${repo}\`\n- **Branch**: \`${branch}\`\n- **Tracking Started**: \`${readableTime}\`\n\n## Heartbeat Log\n${newEntry}`;
    }

    const base64Content = Buffer.from(updatedContent, "utf-8").toString("base64");

    // 3. Commit the updated content via GitHub Contents API
    const putBody: Record<string, any> = {
      message: commitMessage,
      content: base64Content,
      branch: branch,
    };

    if (currentSha) {
      putBody.sha = currentSha;
    }

    if (options.authorName && options.authorEmail) {
      putBody.author = {
        name: options.authorName,
        email: options.authorEmail,
      };
      putBody.committer = {
        name: options.authorName,
        email: options.authorEmail,
      };
    }

    const putRes = await fetch(contentUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "GitPulse-AutoCommit/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `Commit failed with status ${putRes.status}`);
    }

    const commitData = await putRes.json();
    const durationMs = Date.now() - startTime;

    return {
      repo,
      owner,
      success: true,
      sha: commitData.commit?.sha || commitData.content?.sha,
      url: commitData.commit?.html_url || `https://github.com/${owner}/${repo}/commits/${branch}`,
      message: commitMessage,
      timestamp: isoTime,
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    return {
      repo,
      owner,
      success: false,
      error: error.message || String(error),
      timestamp: isoTime,
      durationMs,
    };
  }
}

/**
 * Batches commits across multiple repositories with bounded concurrency.
 */
export async function batchCommitPulse(
  token: string,
  repos: Array<{ owner: string; repo: string; branch?: string }>,
  options: {
    concurrency?: number;
    filePath?: string;
    commitMessage?: string;
    authorName?: string;
    authorEmail?: string;
  } = {}
): Promise<CommitResult[]> {
  const concurrency = Math.max(1, Math.min(options.concurrency || 4, 8));
  const results: CommitResult[] = [];
  const queue = [...repos];

  // Concurrency worker pool
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const res = await commitHeartbeat(token, item.owner, item.repo, {
        branch: item.branch,
        filePath: options.filePath,
        commitMessage: options.commitMessage,
        authorName: options.authorName,
        authorEmail: options.authorEmail,
      });
      results.push(res);
    }
  });

  await Promise.all(workers);
  return results;
}
