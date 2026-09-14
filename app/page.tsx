"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { RepoManager } from "@/components/RepoManager";
import { CommitConsole } from "@/components/CommitConsole";
import { VercelDeployGuide } from "@/components/VercelDeployGuide";
import { TokenConfigModal } from "@/components/TokenConfigModal";
import { EclipseDashboard } from "@/components/EclipseDashboard";
import type { SchedulerState } from "@/lib/scheduler";
import type { GitHubUser, GitHubRepo, CommitResult } from "@/lib/github";
import {
  Database,
  FolderGit2,
  Key,
  LayoutDashboard,
  Rocket,
  Terminal,
} from "lucide-react";

type Tab = "dashboard" | "repos" | "console" | "deploy";

const NAV_ITEMS: { tab: Tab; icon: React.ReactNode; label: string }[] = [
  { tab: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { tab: "console",   icon: <Terminal size={18} />,        label: "Console" },
  { tab: "repos",     icon: <FolderGit2 size={18} />,      label: "Repositories" },
  { tab: "deploy",    icon: <Rocket size={18} />,           label: "Deployment guide" },
];

export default function Home() {
  const [token,            setToken]            = useState<string>("");
  const [hasEnvToken,      setHasEnvToken]      = useState<boolean>(false);
  const [user,             setUser]             = useState<GitHubUser | null>(null);
  const [repos,            setRepos]            = useState<GitHubRepo[]>([]);
  const [selectedRepoIds,  setSelectedRepoIds]  = useState<Set<number>>(new Set());
  const [loading,          setLoading]          = useState<boolean>(false);
  const [isCommitting,     setIsCommitting]     = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [activeTab,        setActiveTab]        = useState<Tab>("dashboard");
  const [recentResults,    setRecentResults]    = useState<CommitResult[]>([]);
  const [sessionCommits,   setSessionCommits]   = useState<number>(0);
  const [todayCommits,     setTodayCommits]     = useState<number>(0);
  const [lastRunTime,      setLastRunTime]      = useState<string | null>(null);
  const [scheduler,        setScheduler]        = useState<SchedulerState | null>(null);
  const [stopping,         setStopping]         = useState<boolean>(false);
  const [notice, setNotice]                     = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const dismissNotice = useCallback(() => setNotice(null), []);

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchDailyStats = useCallback(async () => {
    try {
      const res  = await fetch("/api/stats");
      const data = await res.json();
      if (data.success && typeof data.todayCount === "number") {
        setTodayCommits(data.todayCount);
      }
    } catch { /* silently ignore */ }
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      const res  = await fetch("/api/schedule");
      const data = await res.json();
      if (data.success) {
        setScheduler(data.scheduler);
        setTodayCommits(data.todayCount);
      }
    } catch { /* silently ignore */ }
  }, []);

  const verifyAndLoadUser = useCallback(async (tok?: string): Promise<GitHubUser | null> => {
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tok || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.valid && data.user) {
        setUser(data.user);
        setHasEnvToken(Boolean(data.hasEnvToken));
        return data.user;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRepositories = useCallback(async (tok?: string) => {
    setLoading(true);
    try {
      const res  = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tok || undefined, excludeForks: false, excludeArchived: true }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.repos)) {
        setRepos(data.repos);
        const initial = new Set<number>();
        data.repos.forEach((r: GitHubRepo) => { if (!r.fork) initial.add(r.id); });
        setSelectedRepoIds(initial);
      }
    } catch (err) {
      console.error("Failed to load repositories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Bootstrap on mount ────────────────────────────────────────────────────

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("gitpulse_token") ?? "" : "";
    if (saved) setToken(saved);

    fetchDailyStats();
    fetchSchedule();

    verifyAndLoadUser(saved || undefined).then((verifiedUser) => {
      if (verifiedUser) {
        fetchRepositories(saved || undefined);
      } else if (!saved) {
        setIsTokenModalOpen(true);
      }
    });

    const intervalId = window.setInterval(fetchSchedule, 30_000);
    return () => window.clearInterval(intervalId);
  }, [verifyAndLoadUser, fetchRepositories, fetchDailyStats, fetchSchedule]);

  // ── Scheduler controls ────────────────────────────────────────────────────

  const stopForToday = async () => {
    setStopping(true);
    try {
      const res  = await fetch("/api/schedule", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setScheduler(data.scheduler);
        setNotice({ tone: "info", text: "Remaining commit windows have been cancelled for today." });
      } else {
        setNotice({ tone: "error", text: data.error ?? "Unable to update the scheduler." });
      }
    } catch {
      setNotice({ tone: "error", text: "The scheduler could not be reached. Please try again." });
    } finally {
      setStopping(false);
    }
  };

  const startForToday = async () => {
    setStopping(true);
    try {
      const res  = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (data.success) {
        setScheduler(data.scheduler);
        setNotice({ tone: "success", text: "Automation restarted with new future IST windows." });
      } else {
        setNotice({ tone: "error", text: data.error ?? "Unable to restart the scheduler." });
      }
    } catch {
      setNotice({ tone: "error", text: "The scheduler could not be reached. Please try again." });
    } finally {
      setStopping(false);
    }
  };

  // ── Token management ──────────────────────────────────────────────────────

  const handleSaveToken = async (newToken: string): Promise<boolean> => {
    const verifiedUser = await verifyAndLoadUser(newToken);
    if (verifiedUser) {
      setToken(newToken);
      if (typeof window !== "undefined") localStorage.setItem("gitpulse_token", newToken);
      await fetchRepositories(newToken);
      return true;
    }
    return false;
  };

  // ── Repository selection ──────────────────────────────────────────────────

  const handleToggleSelect  = (id: number) =>
    setSelectedRepoIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSelectAll   = () => setSelectedRepoIds(new Set(repos.map((r) => r.id)));
  const handleDeselectAll = () => setSelectedRepoIds(new Set());

  // ── Commit actions ────────────────────────────────────────────────────────

  const handleTriggerBatchCommit = async (
    filePath: string,
    customMessage?: string,
    randomize = false
  ) => {
    if (selectedRepoIds.size === 0) {
      setNotice({ tone: "info", text: "Select at least one repository before running a pulse." });
      return;
    }

    let targets = repos
      .filter((r) => selectedRepoIds.has(r.id))
      .map((r) => ({ owner: r.owner.login, repo: r.name, branch: r.default_branch || "main" }));

    if (randomize) {
      const count = Math.floor(Math.random() * Math.min(3, targets.length)) + 1;
      targets = [...targets].sort(() => 0.5 - Math.random()).slice(0, count);
    }

    setIsCommitting(true);
    try {
      const res  = await fetch("/api/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token || undefined, repos: targets, filePath, commitMessage: customMessage, concurrency: 4 }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) {
        setRecentResults((prev) => [...data.results, ...prev]);
        setSessionCommits((prev) => prev + (data.successCount ?? 0));
        setTodayCommits((prev) => prev + (data.successCount ?? 0));
        setLastRunTime(new Date().toISOString());
        fetchDailyStats();
        setNotice({ tone: "success", text: `${data.successCount ?? 0} commit${data.successCount === 1 ? "" : "s"} completed successfully.` });
      } else {
        setNotice({ tone: "error", text: data.error ?? "Batch commit failed." });
      }
    } catch (err: any) {
      setNotice({ tone: "error", text: "Network error: " + (err.message ?? String(err)) });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleSingleCommit = async (targetRepo: GitHubRepo) => {
    setIsCommitting(true);
    try {
      const res  = await fetch("/api/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          repos: [{ owner: targetRepo.owner.login, repo: targetRepo.name, branch: targetRepo.default_branch || "main" }],
          filePath: ".github-pulse.md",
          concurrency: 1,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) {
        setRecentResults((prev) => [...data.results, ...prev]);
        setSessionCommits((prev) => prev + (data.successCount ?? 0));
        setLastRunTime(new Date().toISOString());
        setNotice({ tone: "success", text: `Test pulse sent to ${targetRepo.name}.` });
      }
    } catch (err: any) {
      setNotice({ tone: "error", text: "Failed to commit: " + (err.message ?? String(err)) });
    } finally {
      setIsCommitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="workspace">
      {/* ── Sidebar rail ── */}
      <aside className="rail">
        <button
          className="rail-logo"
          onClick={() => setActiveTab("dashboard")}
          title="GitPulse control plane"
        >
          <Database size={18} />
        </button>

        <nav className="rail-nav" aria-label="Workspace navigation">
          {NAV_ITEMS.map(({ tab, icon, label }) => (
            <button
              key={tab}
              className={`rail-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              title={label}
              aria-label={label}
            >
              {icon}
            </button>
          ))}
        </nav>

        <div className="rail-bottom">
          <button
            className="rail-btn"
            onClick={() => setIsTokenModalOpen(true)}
            title="GitHub token settings"
            aria-label="Open token settings"
          >
            <Key size={18} />
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="main">
        <Navbar
          user={user}
          loading={loading}
          onOpenTokenModal={() => setIsTokenModalOpen(true)}
          onRefresh={() => fetchRepositories(token || undefined)}
        />

        <div className="page-content">
          {activeTab === "dashboard" && (
            <EclipseDashboard
              scheduler={scheduler}
              todayCommits={todayCommits}
              sessionCommits={sessionCommits}
              selectedCount={selectedRepoIds.size}
              totalRepos={repos.length}
              onStop={stopForToday}
              onStart={startForToday}
              onPulse={() => handleTriggerBatchCommit(".github-pulse.md", undefined, true)}
              onOpenConsole={() => setActiveTab("console")}
              onOpenRepositories={() => setActiveTab("repos")}
              stopping={stopping}
              isCommitting={isCommitting}
              notice={notice}
              onDismissNotice={dismissNotice}
            />
          )}

          {activeTab === "console" && (
            <CommitConsole
              onTriggerBatchCommit={handleTriggerBatchCommit}
              isCommitting={isCommitting}
              selectedCount={selectedRepoIds.size}
              recentResults={recentResults}
              lastRunTime={lastRunTime}
            />
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
        </div>
      </div>

      {/* ── Token Modal ── */}
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
