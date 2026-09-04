"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { StatsOverview } from "@/components/StatsOverview";
import { RepoManager } from "@/components/RepoManager";
import { CommitConsole } from "@/components/CommitConsole";
import { VercelDeployGuide } from "@/components/VercelDeployGuide";
import { TokenConfigModal } from "@/components/TokenConfigModal";
import { AutomationOverview } from "@/components/AutomationOverview";
import type { SchedulerState } from "@/lib/scheduler";
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
  const [todayCommits, setTodayCommits] = useState<number>(3);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerState | null>(null);
  const [stoppingSchedule, setStoppingSchedule] = useState(false);

  const fetchDailyStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (data.success && typeof data.todayCount === "number") {
        setTodayCommits(data.todayCount);
      }
    } catch {}
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      const response = await fetch("/api/schedule");
      const data = await response.json();
      if (data.success) { setScheduler(data.scheduler); setTodayCommits(data.todayCount); }
    } catch {}
  }, []);

  const stopForToday = async () => {
    setStoppingSchedule(true);
    try {
      const response = await fetch("/api/schedule", { method: "POST" });
      const data = await response.json();
      if (data.success) setScheduler(data.scheduler);
    } finally { setStoppingSchedule(false); }
  };

  const startForToday = async () => {
    setStoppingSchedule(true);
    try {
      const response = await fetch("/api/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
      const data = await response.json();
      if (data.success) setScheduler(data.scheduler);
    } finally { setStoppingSchedule(false); }
  };

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

    fetchDailyStats();
    fetchSchedule();
    verifyAndLoadUser(savedToken || undefined).then((verifiedUser) => {
      if (verifiedUser) {
        fetchRepositories(savedToken || undefined);
      } else if (!savedToken) {
        // Open modal to prompt connection on first visit
        setIsTokenModalOpen(true);
      }
    });
    const timer = window.setInterval(fetchSchedule, 30000);
    return () => window.clearInterval(timer);
  }, [verifyAndLoadUser, fetchRepositories, fetchDailyStats, fetchSchedule]);

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

  // Batch commit across all or random selected repositories
  const handleTriggerBatchCommit = async (filePath: string, customMessage?: string, randomize: boolean = false) => {
    if (selectedRepoIds.size === 0) return;

    let selectedRepos = repos
      .filter((r) => selectedRepoIds.has(r.id))
      .map((r) => ({
        owner: r.owner.login,
        repo: r.name,
        branch: r.default_branch || "main",
      }));

    if (randomize) {
      const min = 1;
      const max = Math.min(3, selectedRepos.length);
      const count = Math.floor(Math.random() * (max - min + 1)) + min;
      selectedRepos = [...selectedRepos].sort(() => 0.5 - Math.random()).slice(0, count);
    }

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
        setTodayCommits((prev) => prev + (data.successCount || 0));
        setLastRunTime(new Date().toISOString());
        fetchDailyStats();
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

      <header className="command-header">
        <div><div className="hero-pill"><Sparkles size={14} /><span>IST AUTOMATION CONTROL</span></div><h1>Commit operations,<br /><span>under control.</span></h1><p>Plan randomized activity windows, monitor today’s progress, and retain command even after you close the dashboard.</p></div>
        <div className="command-orb"><div className="orb-core"><span>{scheduler?.enabled ? "LIVE" : "PAUSED"}</span><small>scheduler</small></div><i /><i /><i /></div>
      </header>

      {/* Overview Stats & Heatmap */}
      <StatsOverview
        totalRepos={repos.length}
        selectedCount={selectedRepoIds.size}
        sessionCommits={sessionCommits}
        todayCommits={todayCommits}
        lastSyncTime={lastRunTime}
      />

      <AutomationOverview scheduler={scheduler} todayCommits={todayCommits} onStop={stopForToday} onStart={startForToday} stopping={stoppingSchedule} />

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
