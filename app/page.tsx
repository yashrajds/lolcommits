"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { StatsOverview } from "@/components/StatsOverview";
import { RepoManager } from "@/components/RepoManager";
import { CommitConsole } from "@/components/CommitConsole";
import { VercelDeployGuide } from "@/components/VercelDeployGuide";
import { TokenConfigModal } from "@/components/TokenConfigModal";
import { GitHubUser, GitHubRepo, CommitResult } from "@/lib/github";
import { Sparkles, Terminal, FolderGit2, Rocket, Key } from "lucide-react";

export default function Home() {
  const [token, setToken] = useState<string>("");
  const [hasEnvToken, setHasEnvToken] = useState<boolean>(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "repos" | "deploy">("dashboard");
  const [recentResults, setRecentResults] = useState<CommitResult[]>([]);
  const [sessionCommits, setSessionCommits] = useState<number>(0);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  // Authenticate user & check token
  const verifyAndLoadUser = useCallback(async (tokenToVerify?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToVerify || undefined }),
      });

      const data = await res.json();
      if (res.ok && data.valid && data.user) {
        setUser(data.user);
        setHasEnvToken(Boolean(data.hasEnvToken));
        return data.user;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch repositories
  const fetchRepositories = useCallback(async (activeToken?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken || undefined,
          excludeForks: false,
          excludeArchived: true,
        }),
      });

      const data = await res.json();
      if (res.ok && Array.isArray(data.repos)) {
        setRepos(data.repos);
        // Default: select all non-fork repositories
        const initialSelected = new Set<number>();
        data.repos.forEach((r: GitHubRepo) => {
          if (!r.fork) initialSelected.add(r.id);
        });
        setSelectedRepoIds(initialSelected);
      }
    } catch (err) {
      console.error("Failed to load repositories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize from localStorage or server environment token
  useEffect(() => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("gitpulse_token") || "" : "";
    if (savedToken) {
      setToken(savedToken);
    }

    verifyAndLoadUser(savedToken || undefined).then((verifiedUser) => {
      if (verifiedUser) {
        fetchRepositories(savedToken || undefined);
      } else if (!savedToken) {
        // Open modal to prompt connection on first visit
        setIsTokenModalOpen(true);
      }
    });
  }, [verifyAndLoadUser, fetchRepositories]);

  // Handle Token Save
  const handleSaveToken = async (newToken: string): Promise<boolean> => {
    const verifiedUser = await verifyAndLoadUser(newToken);
    if (verifiedUser) {
      setToken(newToken);
      if (typeof window !== "undefined") {
        localStorage.setItem("gitpulse_token", newToken);
      }
      await fetchRepositories(newToken);
      return true;
    }
    return false;
  };

  // Toggle selection for a single repository
  const handleToggleSelect = (repoId: number) => {
    setSelectedRepoIds((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  // Select all repositories
  const handleSelectAll = () => {
    const all = new Set<number>();
    repos.forEach((r) => all.add(r.id));
    setSelectedRepoIds(all);
  };

  // Deselect all repositories
  const handleDeselectAll = () => {
    setSelectedRepoIds(new Set());
  };

  // Batch commit across all selected repositories
  const handleTriggerBatchCommit = async (filePath: string, customMessage?: string) => {
    if (selectedRepoIds.size === 0) return;

    const selectedRepos = repos
      .filter((r) => selectedRepoIds.has(r.id))
      .map((r) => ({
        owner: r.owner.login,
        repo: r.name,
        branch: r.default_branch || "main",
      }));

    setIsCommitting(true);
    try {
      const res = await fetch("/api/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          repos: selectedRepos,
          filePath,
          commitMessage: customMessage,
          concurrency: 4,
        }),
      });

      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) {
        setRecentResults((prev) => [...data.results, ...prev]);
        setSessionCommits((prev) => prev + (data.successCount || 0));
        setLastRunTime(new Date().toISOString());
      } else {
        alert(data.error || "Batch commit failed.");
      }
    } catch (err: any) {
      alert("Network error executing batch commit: " + (err.message || String(err)));
    } finally {
      setIsCommitting(false);
    }
  };

  // Single test commit to a specific repository
  const handleSingleCommit = async (targetRepo: GitHubRepo) => {
    setIsCommitting(true);
    try {
      const res = await fetch("/api/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          repos: [
            {
              owner: targetRepo.owner.login,
              repo: targetRepo.name,
              branch: targetRepo.default_branch || "main",
            },
          ],
          filePath: ".github-pulse.md",
          concurrency: 1,
        }),
      });

      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) {
        setRecentResults((prev) => [...data.results, ...prev]);
        setSessionCommits((prev) => prev + (data.successCount || 0));
        setLastRunTime(new Date().toISOString());
      }
    } catch (err: any) {
      alert("Failed to commit: " + (err.message || String(err)));
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="container">
      <Navbar
        user={user}
        loading={loading}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        onRefresh={() => fetchRepositories(token || undefined)}
      />

      {/* Hero Header */}
      <header className="hero-banner">
        <div className="hero-pill">
          <Sparkles size={14} />
          <span>Vercel Cron Automation Ready</span>
        </div>
        <h1 className="hero-title">
          Keep Your GitHub Repositories <span className="gradient-text">Alive & Active</span>
        </h1>
        <p className="hero-subtitle">
          Automated, non-destructive heartbeat commits scheduled via Vercel Crons.
          Safe updates to your default branches that keep your activity streak moving forward.
        </p>
      </header>

      {/* Overview Stats & Heatmap */}
      <StatsOverview
        totalRepos={repos.length}
        selectedCount={selectedRepoIds.size}
        sessionCommits={sessionCommits}
        lastSyncTime={lastRunTime}
      />

      {/* Tabs */}
      <div className="tabs-container">
        <button
          id="tab-dashboard-btn"
          className={`tab-button ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <Terminal size={16} /> Console & Terminal
        </button>
        <button
          id="tab-repos-btn"
          className={`tab-button ${activeTab === "repos" ? "active" : ""}`}
          onClick={() => setActiveTab("repos")}
        >
          <FolderGit2 size={16} /> Repositories ({repos.length})
        </button>
        <button
          id="tab-deploy-btn"
          className={`tab-button ${activeTab === "deploy" ? "active" : ""}`}
          onClick={() => setActiveTab("deploy")}
        >
          <Rocket size={16} /> Vercel Deploy Guide
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "dashboard" && (
        <>
          <CommitConsole
            onTriggerBatchCommit={handleTriggerBatchCommit}
            isCommitting={isCommitting}
            selectedCount={selectedRepoIds.size}
            recentResults={recentResults}
            lastRunTime={lastRunTime}
          />
          <RepoManager
            repos={repos}
            selectedRepoIds={selectedRepoIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onSingleCommit={handleSingleCommit}
            isCommitting={isCommitting}
          />
        </>
      )}

      {activeTab === "repos" && (
        <RepoManager
          repos={repos}
          selectedRepoIds={selectedRepoIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onSingleCommit={handleSingleCommit}
          isCommitting={isCommitting}
        />
      )}

      {activeTab === "deploy" && <VercelDeployGuide />}

      {/* Modal */}
      <TokenConfigModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onSaveToken={handleSaveToken}
        currentToken={token}
        hasEnvToken={hasEnvToken}
      />
    </div>
  );
}
