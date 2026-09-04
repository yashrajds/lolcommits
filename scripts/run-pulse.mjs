#!/usr/bin/env node

/**
 * GitPulse - 24/7 Automated Random Commit Runner
 * Can be run via GitHub Actions or locally as a background daemon.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read token from environment or .env.local
let token = process.env.AUTO_COMMIT_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      if (line.startsWith("GITHUB_TOKEN=")) {
        token = line.replace("GITHUB_TOKEN=", "").trim();
      }
    }
  }
}

if (!token) {
  console.error("❌ No GitHub Token found. Please set AUTO_COMMIT_TOKEN or GITHUB_TOKEN.");
  process.exit(1);
}

const QUOTES = [
  "Small daily improvements over time lead to stunning results.",
  "Simplicity is prerequisite for reliability.",
  "Make it work, make it right, make it fast.",
  "First, solve the problem. Then, write the code.",
  "Clean code always looks like it was written by someone who cares.",
  "Consistent action creates consistent momentum.",
  "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
  "Focus on progress, not perfection.",
  "Code never lies, comments sometimes do."
];

const COMMIT_MESSAGES = [
  "chore(pulse): automated repository sync",
  "chore: update activity tracker heartbeat",
  "docs(sync): refresh repo pulse timestamp",
  "chore(maintenance): automated health ping",
  "docs: update maintenance log",
  "chore: keep repository pulse active"
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "GitPulse-24-7/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log("⚡ [GitPulse] 24/7 Auto-Commit Runner Starting...");
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const readableTime = now.toUTCString();

  // 1. Get Authenticated User
  console.log("🔍 Authenticating with GitHub...");
  const user = await fetchJSON("https://api.github.com/user");
  console.log(`👤 Connected as: @${user.login} (${user.name || "Yashraj"})`);

  // Attempt to fetch email
  let email = user.email;
  if (!email) {
    try {
      const emails = await fetchJSON("https://api.github.com/user/emails");
      const primary = emails.find((e) => e.primary && e.verified);
      email = primary ? primary.email : emails[0]?.email;
    } catch {
      email = `${user.id}+${user.login}@users.noreply.github.com`;
    }
  }
  if (!email) email = `${user.id}+${user.login}@users.noreply.github.com`;
  console.log(`📧 Commit Author Email: ${email}`);

  // 2. Fetch Repositories
  console.log("📂 Fetching owned repositories...");
  const allRepos = await fetchJSON("https://api.github.com/user/repos?per_page=100&affiliation=owner&sort=updated");
  const eligibleRepos = allRepos.filter((r) => !r.archived);
  console.log(`✓ Found ${eligibleRepos.length} eligible repositories (public & private).`);

  if (eligibleRepos.length === 0) {
    console.log("⚠️ No repositories found to commit to.");
    return;
  }

  // 3. Pick random number of repos (1 to 3)
  const minCount = 1;
  const maxCount = Math.min(3, eligibleRepos.length);
  const targetCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

  const shuffled = [...eligibleRepos].sort(() => 0.5 - Math.random());
  const selectedRepos = shuffled.slice(0, targetCount);

  console.log(`🎲 Selected ${selectedRepos.length} random target repository(ies):`);
  selectedRepos.forEach((r, idx) => console.log(`   ${idx + 1}. ${r.full_name} [${r.default_branch}]`));

  // 4. Update Stats file (daily counter)
  const statsDir = path.join(__dirname, "..", "stats");
  if (!fs.existsSync(statsDir)) fs.mkdirSync(statsDir, { recursive: true });
  const statsFile = path.join(statsDir, "daily-pulse.json");

  let stats = { date: todayStr, count: 0, history: [] };
  if (fs.existsSync(statsFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(statsFile, "utf-8"));
      if (raw.date === todayStr) {
        stats = raw;
      }
    } catch {}
  }

  // 5. Commit to each selected repository
  const filePath = process.env.TARGET_FILE || ".github-pulse.md";
  let successCount = 0;

  for (const repo of selectedRepos) {
    const owner = repo.owner.login;
    const repoName = repo.name;
    const branch = repo.default_branch || "main";
    const commitMsg = getRandomItem(COMMIT_MESSAGES);
    const quote = getRandomItem(QUOTES);

    console.log(`\n⚡ Committing to ${owner}/${repoName}...`);

    try {
      // Check existing file
      const contentUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}?ref=${branch}`;
      let currentSha = undefined;
      let existingContent = "";

      try {
        const fileData = await fetchJSON(contentUrl);
        currentSha = fileData.sha;
        if (fileData.content) {
          existingContent = Buffer.from(fileData.content, "base64").toString("utf-8");
        }
      } catch (err) {
        // 404 is expected if file doesn't exist yet
      }

      // Build updated content
      const newEntry = `- ⚡ **Pulse Check**: \`${readableTime}\` | *"${quote}"*\n`;
      let updatedContent = "";

      if (existingContent && existingContent.includes("## Heartbeat Log")) {
        const parts = existingContent.split("## Heartbeat Log\n");
        const header = parts[0] + "## Heartbeat Log\n";
        const oldEntries = parts[1] ? parts[1].trim().split("\n").slice(0, 29).join("\n") : "";
        updatedContent = `${header}${newEntry}${oldEntries ? oldEntries + "\n" : ""}`;
      } else {
        updatedContent = `# ⚡ GitPulse Activity Tracker\n\nAutomated 24/7 pulse log managed by [GitPulse](https://github.com/yashrajds/gitpulse-autocommit).\n\n## Repository\n- **Target**: \`${owner}/${repoName}\`\n- **Branch**: \`${branch}\`\n- **Status**: Active\n\n## Heartbeat Log\n${newEntry}`;
      }

      const base64Content = Buffer.from(updatedContent, "utf-8").toString("base64");

      const body = {
        message: commitMsg,
        content: base64Content,
        branch: branch,
        author: {
          name: user.name || user.login,
          email: email,
        },
        committer: {
          name: user.name || user.login,
          email: email,
        },
      };

      if (currentSha) body.sha = currentSha;

      const commitRes = await fetchJSON(contentUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const commitSha = commitRes.commit?.sha?.slice(0, 7) || "done";
      console.log(`   ✓ Successfully committed! SHA: ${commitSha} [${commitMsg}]`);
      successCount++;
      stats.count++;
      stats.history.push({
        repo: `${owner}/${repoName}`,
        sha: commitSha,
        time: now.toISOString(),
      });
    } catch (err) {
      console.error(`   ✗ Error committing to ${owner}/${repoName}: ${err.message}`);
    }
  }

  // Save updated daily stats
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), "utf-8");

  console.log(`\n========================================`);
  console.log(`📊 GitPulse Daily Summary (${todayStr}):`);
  console.log(`   • Total Commits Completed Today: ${stats.count}`);
  console.log(`   • Commits Made This Run: ${successCount}`);
  console.log(`========================================\n`);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
