/**
 * Deletion-only cleanup for legacy GitPulse tracker files.
 * Never creates or updates files. Only deletes when content
 * positively matches GitPulse markers, so unrelated Markdown is safe.
 */

export const TRACKER_FILES = [
  ".github-pulse.md",
  "gitpulse.md",
  "GitPulse.md",
  ".gitpulse.md",
];

export function isTrackerContent(text: string): boolean {
  if (!text) return false;
  return (
    text.includes("GitPulse Activity Tracker") ||
    (text.includes("Pulse Check") && text.includes("GitPulse")) ||
    (text.includes("## Heartbeat Log") && text.includes("GitPulse"))
  );
}

type DeleteResult =
  | { status: "deleted"; sha?: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "GitPulse-Cleanup/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function deleteTrackerFile(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  author: { authorName: string; authorEmail: string }
): Promise<DeleteResult> {
  try {
    const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
      filePath
    )}?ref=${encodeURIComponent(branch)}`;
    const getRes = await fetch(getUrl, {
      headers: headers(token),
      cache: "no-store",
    });

    if (getRes.status === 404) {
      return { status: "skipped", reason: "not-found" };
    }
    if (!getRes.ok) {
      const err = await getRes.json().catch(() => ({}));
      return {
        status: "failed",
        error: err.message || `inspect failed (${getRes.status})`,
      };
    }

    const fileData = await getRes.json();
    let text = "";
    try {
      text = Buffer.from(fileData.content || "", "base64").toString("utf-8");
    } catch {
      return { status: "skipped", reason: "undecodable" };
    }

    if (!isTrackerContent(text)) {
      return { status: "skipped", reason: "marker-mismatch" };
    }

    const delRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
        filePath
      )}`,
      {
        method: "DELETE",
        headers: { ...headers(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "chore: remove GitPulse tracker [nightly cleanup]",
          sha: fileData.sha,
          branch,
          author: { name: author.authorName, email: author.authorEmail },
          committer: { name: author.authorName, email: author.authorEmail },
        }),
      }
    );

    if (!delRes.ok) {
      const err = await delRes.json().catch(() => ({}));
      return {
        status: "failed",
        error: err.message || `delete failed (${delRes.status})`,
      };
    }
    const data = await delRes.json().catch(() => ({}));
    return { status: "deleted", sha: data.commit?.sha?.slice(0, 7) };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
