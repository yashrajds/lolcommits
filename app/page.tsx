"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { StatsOverview } from "@/components/StatsOverview";
import { RepoManager } from "@/components/RepoManager";
import { CommitConsole } from "@/components/CommitConsole";
import { VercelDeployGuide } from "@/components/VercelDeployGuide";
import { TokenConfigModal } from "@/components/TokenConfigModal";
import { SchemaDashboard } from "@/components/SchemaDashboard";
import type { SchedulerState } from "@/lib/scheduler";
import { GitHubUser, GitHubRepo, CommitResult } from "@/lib/github";
import { Database, FolderGit2, Key, LayoutDashboard, Rocket, Rows3 } from "lucide-react";

export default function Home() {
  const [token, setToken] = useState<string>("");
  const [hasEnvToken, setHasEnvToken] = useState<boolean>(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "repos" | "console" | "deploy">("dashboard");
  const [recentResults, setRecentResults] = useState<CommitResult[]>([]);
  const [sessionCommits, setSessionCommits] = useState<number>(0);
  const [todayCommits, setTodayCommits] = useState<number>(3);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerState | null>(null);
  const [stoppingSchedule, setStoppingSchedule] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

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
      if (data.success) { setScheduler(data.scheduler); setActionNotice({ tone: "info", text: "Remaining commit windows have been cancelled for today." }); }
      else setActionNotice({ tone: "error", text: data.error || "Unable to update the scheduler." });
    } catch {
      setActionNotice({ tone: "error", text: "The scheduler could not be reached. Please try again." });
    } finally { setStoppingSchedule(false); }
  };

  const startForToday = async () => {
    setStoppingSchedule(true);
    try {
      const response = await fetch("/api/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
      const data = await response.json();
      if (data.success) { setScheduler(data.scheduler); setActionNotice({ tone: "success", text: "Automation restarted with new future IST windows." }); }
      else setActionNotice({ tone: "error", text: data.error || "Unable to restart the scheduler." });
    } catch {
      setActionNotice({ tone: "error", text: "The scheduler could not be reached. Please try again." });
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
    if (selectedRepoIds.size === 0) { setActionNotice({ tone: "info", text: "Select at least one repository before running a pulse." }); return; }

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
        setActionNotice({ tone: "success", text: `${data.successCount || 0} commit${data.successCount === 1 ? "" : "s"} completed successfully.` });
      } else {
        setActionNotice({ tone: "error", text: data.error || "Batch commit failed." });
      }
    } catch (err: any) {
      setActionNotice({ tone: "error", text: "Network error executing batch commit: " + (err.message || String(err)) });
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
      setActionNotice({ tone: "error", text: "Failed to commit: " + (err.message || String(err)) });
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="workspace-shell">
      <aside className="workspace-rail">
        <button className="rail-logo" onClick={() => setActiveTab("dashboard")} title="GitPulse control plane"><Database size={19} /></button>
        <nav className="rail-nav" aria-label="Workspace navigation">
          <button className={activeTab === "dashboard" ? "rail-button active" : "rail-button"} onClick={() => setActiveTab("dashboard")} title="Control plane"><LayoutDashboard size={18} /></button>
          <button className={activeTab === "console" ? "rail-button active" : "rail-button"} onClick={() => setActiveTab("console")} title="Commit console"><Rows3 size={18} /></button>
          <button className={activeTab === "repos" ? "rail-button active" : "rail-button"} onClick={() => setActiveTab("repos")} title="Repositories"><FolderGit2 size={18} /></button>
          <button className={activeTab === "deploy" ? "rail-button active" : "rail-button"} onClick={() => setActiveTab("deploy")} title="Deployment guide"><Rocket size={18} /></button>
        </nav>
        <button className="rail-button rail-config" onClick={() => setIsTokenModalOpen(true)} title="GitHub token settings"><Key size={18} /></button>
      </aside>
      <main className="workspace-main">
      <Navbar
        user={user}
        loading={loading}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        onRefresh={() => fetchRepositories(token || undefined)}
      />

      {activeTab === "dashboard" && (
        <SchemaDashboard scheduler={scheduler} todayCommits={todayCommits} selectedCount={selectedRepoIds.size} totalRepos={repos.length} onStop={stopForToday} onStart={startForToday} onPulse={() => handleTriggerBatchCommit(".github-pulse.md", undefined, true)} onOpenConsole={() => setActiveTab("console")} onOpenRepositories={() => setActiveTab("repos")} stopping={stoppingSchedule} isCommitting={isCommitting} notice={actionNotice} />
      )}

      {activeTab === "console" && <CommitConsole onTriggerBatchCommit={handleTriggerBatchCommit} isCommitting={isCommitting} selectedCount={selectedRepoIds.size} recentResults={recentResults} lastRunTime={lastRunTime} />}

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
      </main>
    </div>
  );
}
