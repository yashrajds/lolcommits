#!/usr/bin/env node
/**
 * GitPulse Manual Pulse Runner
 * 
 * Triggers a pulse commit to GitHub repositories.
 * Can target all repos or specific ones.
 */

import { createReadStream, existsSync, writeFile, mkdir } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

const IST = "Asia/Kolkata";

function istDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(now);
}

// Simple GitHub API helper
async function githubApi(path, token, options = {}) {
  const url = `https://api.github.com${path}`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "GitPulse/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
    ...options.headers
  };
  
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    ...options.body ? { body: JSON.stringify(options.body) } : {}
  });
  
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `GitHub API Error: ${res.status}`);
  }
  return data;
}

// Get user's repositories
async function listRepositories(token, excludeForks = true, excludeArchived = true) {
  const repos = [];
  let page = 1;
  const perPage = 100;
  
  while (true) {
    const data = await githubApi(`/user/repos?per_page=${perPage}&page=${page}`, token);
    if (data.length === 0) break;
    
    for (const repo of data) {
      if (excludeArchived && repo.archived) continue;
      if (excludeForks && repo.fork) continue;
      repos.push({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner.login,
        private: repo.private
      });
    }
    
    if (data.length < perPage) break;
    page++;
  }
  
  return repos;
}

// Commit heartbeat to a repository
async function commitHeartbeat(token, owner, repo, filePath = ".github-pulse.md") {
  const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=main`;
  
  try {
    // Get current file SHA
    const fileData = await githubApi(contentUrl, token);
    const currentSha = fileData.sha;
    let existingContent = "";
    
    if (fileData.content) {
      try {
        const buf = Buffer.from(fileData.content, "base64");
        existingContent = buf.toString("utf8");
      } catch (e) {
        existingContent = "";
      }
    }
    
    // Build new heartbeat content
    const now = new Date();
    const readableTime = now.toUTCString();
    const quote = Math.random() < 0.5 
      ? "Simplicity is prerequisite for reliability."
      : "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.";
    
    const newEntry = `- ⚡ **Pulse Check**: \`${readableTime}\` | *"${quote}"*\n`;
    
    let updatedContent;
    if (existingContent.includes("## Heartbeat Log")) {
      const parts = existingContent.split("## Heartbeat Log\n");
      const header = parts[0] + "## Heartbeat Log\n";
      const oldEntries = parts[1] ? parts[1].trim().split("\n").slice(0, 29).join("\n") : "";
      updatedContent = `${header}${newEntry}${oldEntries ? oldEntries + "\n" : ""}`;
    } else {
      updatedContent = `# ⚡ GitPulse Activity Tracker\n\nAutomated repository pulse log managed by GitPulse.\n\n## Repository\n- **Target**: \`${owner}/${repo}\`\n- **Branch**: \`main\`\n- **Tracking Started**: \`${readableTime}\`\n\n## Heartbeat Log\n${newEntry}`;
    }
    
    // Upload updated content
    const base64Content = Buffer.from(updatedContent, "utf8").toString("base64");
    
    const putRes = await githubApi(contentUrl, token, {
      method: "PUT",
      body: {
        message: `chore(pulse): automated repository sync`,
        content: base64Content,
        sha: currentSha,
        branch: "main"
      }
    });
    
    return { success: true, repo: `${owner}/${repo}`, sha: putRes.content?.sha || putRes.commit?.sha, message: `chore(pulse): automated repository sync` };
    
  } catch (error) {
    return { success: false, repo: `${owner}/${repo}`, error: error.message };
  }
}

// Main function
async function runPulse() {
  // Get token
  const envToken = process.env.GITHUB_TOKEN;
  if (!envToken) {
    console.error("ERROR: Missing GITHUB_TOKEN environment variable.");
    console.error("Set it with: export GITHUB_TOKEN=ghp_yourTokenOr create .env.local");
    process.exit(1);
  }
  
  const token = envToken;
  
  // Parse arguments
  const args = process.argv.slice(2);
  let targetRepos = "all"; // "all" or comma-separated owner/repo
  let filePath = ".github-pulse.md";
  let concurrency = 4;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--repos" && i + 1 < args.length) {
      targetRepos = args[++i];
    } else if (args[i] === "--file" && i + 1 < args.length) {
      filePath = args[++i];
    } else if (args[i] === "--concurrency" && i + 1 < args.length) {
      concurrency = Math.max(1, Math.min(8, parseInt(args[++i])));
    }
  }
  
  // Determine repositories
  let repos;
  if (targetRepos === "all") {
    console.log("Fetching all repositories...");
    repos = await listRepositories(token);
    console.log(`Found ${repos.length} repositories.`);
  } else {
    targetRepos = targetRepos.split(",").map(r => r.trim()).filter(r => r);
    console.log(`Targeting specific repos: ${targetRepos.length} repos`);
    repos = targetRepos.map(r => {
      const [owner, repo] = r.split("/");
      if (!owner || !repo) {
        console.error(`Invalid repo format: ${r}. Use owner/repo format.`);
        process.exit(1);
      }
      return { id: 0, name: repo, full_name: r, owner, private: false };
    });
  }
  
  // Limit concurrency and execute
  const batch = repos.slice(0, concurrency);
  console.log(`Running pulse on ${batch.length} repositories with concurrency ${concurrency}...`);
  
  const results = await Promise.all(batch.map(repo => commitHeartbeat(token, repo.owner, repo.name, filePath)));
  
  // Summary
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`\n=== Pulse Complete ===`);
  console.log(`Succeeded: ${successCount}/${results.length}`);
  console.log(`Failed: ${failureCount}/${results.length}`);
  
  results.forEach(r => {
    if (r.success) {
      console.log(`✓ ${r.repo} - ${r.message} (${r.sha?.slice(0, 7)})`);
    } else {
      console.log(`✗ ${r.repo} - ERROR: ${r.error}`);
    }
  });
  
  if (failureCount > 0) {
    process.exit(1);
  }
}

runPulse().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});