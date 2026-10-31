"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { RepoManager } from "@/components/RepoManager";
import { CommitConsole } from "@/components/CommitConsole";
import { AutomationGuide } from "@/components/AutomationGuide";
import { TokenConfigModal } from "@/components/TokenConfigModal";
import { EclipseDashboard } from "@/components/EclipseDashboard";
import type { GitHubUser, GitHubRepo, CommitResult } from "@/lib/github";
import {
  Database,
  FolderGit2,
  Key,
  LayoutDashboard,
  Rocket,
  Terminal,
} from "lucide-react";

type Tab = "dashboard" | "repos" | "console" | "guide";
type ManualPulse = { key: string; repository: string; time: string; date: string };

const indiaDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const indiaTime = (date: Date) => new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}).format(date);

const readManualPulses = (login: string): ManualPulse[] => {
  try {
    const stored = localStorage.getItem(`gitpulse_manual_pulses:${login}`);
    if (!stored) return [];
    const today = indiaDateKey(new Date());
    return (JSON.parse(stored) as ManualPulse[]).filter((pulse) => pulse.date === today);
  } catch {
    return [];
  }
};

const NAV_ITEMS: { tab: Tab; icon: React.ReactNode; label: string }[] = [
  { tab: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { tab: "console",   icon: <Terminal size={18} />,        label: "Console" },
  { tab: "repos",     icon: <FolderGit2 size={18} />,      label: "Repositories" },
  { tab: "guide",     icon: <Rocket size={18} />,           label: "Automation guide" },
];

export default function Home() {
  const [token,            setToken]            = useState<string>("");
  const [user,             setUser]             = useState<GitHubUser | null>(null);
  const [repos,            setRepos]            = useState<GitHubRepo[]>([]);
  const [selectedRepoIds,  setSelectedRepoIds]  = useState<Set<number>>(new Set());
  const [loading,          setLoading]          = useState<boolean>(false);
  const [isCommitting,     setIsCommitting]     = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [activeTab,        setActiveTab]        = useState<Tab>("dashboard");
  const [recentResults,    setRecentResults]    = useState<CommitResult[]>([]);
  const [sessionCommits,   setSessionCommits]   = useState<number>(0);
  const [automatedPulses, setAutomatedPulses] = useState<{ key: string; repository: string; time: string; timestamp: string; url: string }[]>([]);
  const [automationCheckError, setAutomationCheckError] = useState<string | null>(null);
  const [lastRunTime,      setLastRunTime]      = useState<string | null>(null);
  const [automatedRepos,   setAutomatedRepos]   = useState<Set<string>>(new Set());
  const [todaySchedule, setTodaySchedule] = useState<{ repository: string; time: string }[]>([]);
  const [manualPulses, setManualPulses] = useState<ManualPulse[]>([]);
  const [isInstallingAutomation, setIsInstallingAutomation] = useState(false);
  const [notice, setNotice]                     = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const dismissNotice = useCallback(() => setNotice(null), []);
  const recordManualPulses = useCallback((results: CommitResult[]) => {
    if (!user) return;
    const today = indiaDateKey(new Date());
    const entries = results
      .filter((result) => result.success && indiaDateKey(new Date(result.timestamp)) === today)
      .map((result, index) => ({
        key: result.sha ?? `${result.timestamp}-${result.owner}-${result.repo}-${index}`,
        repository: `${result.owner}/${result.repo}`,
        time: indiaTime(new Date(result.timestamp)),
        date: today,
      }));
    if (!entries.length) return;

    setManualPulses((previous) => {
      const merged = [...entries, ...previous.filter((pulse) => pulse.date === today)];
      const unique = [...new Map(merged.map((pulse) => [pulse.key, pulse])).values()];
      localStorage.setItem(`gitpulse_manual_pulses:${user.login}`, JSON.stringify(unique));
      return unique;
    });
  }, [user]);

  // ── Data fetchers ──────────────────────────────────────────────────────────

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
    const savedAutomation = typeof window !== "undefined" ? localStorage.getItem("gitpulse_automated_repos") : null;
    if (savedAutomation) {
      try { setAutomatedRepos(new Set(JSON.parse(savedAutomation))); } catch { localStorage.removeItem("gitpulse_automated_repos"); }
    }
    verifyAndLoadUser(saved || undefined).then((verifiedUser) => {
      if (verifiedUser) {
        setManualPulses(readManualPulses(verifiedUser.login));
        fetchRepositories(saved || undefined);
      } else if (!saved) {
        setManualPulses([]);
        setIsTokenModalOpen(true);
      }
    });

  }, [verifyAndLoadUser, fetchRepositories]);

  useEffect(() => {
    let cancelled = false;

    const buildTodaySchedule = async () => {
      const date = indiaDateKey(new Date());
      const enabledRepos = repos.filter((repo) =>
        automatedRepos.has(`${repo.owner.login}/${repo.name}`),
      );

      const schedule = await Promise.all(enabledRepos.map(async (repo) => {
        const fullName = `${repo.owner.login}/${repo.name}`;
        const input = new TextEncoder().encode(`${date}:${fullName}`);
        const digest = await crypto.subtle.digest("SHA-256", input);
        const firstEightHex = Array.from(new Uint8Array(digest).slice(0, 4))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
        const hour = 9 + (Number.parseInt(firstEightHex, 16) % 13);
        return {
          repository: fullName,
          time: `${String(hour).padStart(2, "0")}:00`,
        };
      }));

      schedule.sort((left, right) => left.time.localeCompare(right.time));
      if (!cancelled) setTodaySchedule(schedule);
    };

    buildTodaySchedule().catch(() => {
      if (!cancelled) setTodaySchedule([]);
    });
    return () => { cancelled = true; };
  }, [repos, automatedRepos]);

  useEffect(() => {
    let cancelled = false;
    const enabledRepos = repos.filter((repo) => automatedRepos.has(`${repo.owner.login}/${repo.name}`));
    if (!token || enabledRepos.length === 0) {
      setAutomatedPulses([]);
      setAutomationCheckError(null);
      return;
    }

    fetch("/api/automation/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        repos: enabledRepos.map((repo) => ({
          owner: repo.owner.login,
          repo: repo.name,
          branch: repo.default_branch || "main",
        })),
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not check GitHub commit history.");
        if (!cancelled) {
          setAutomatedPulses(data.pulses ?? []);
          setAutomationCheckError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setAutomationCheckError(error instanceof Error ? error.message : "Could not check GitHub commit history.");
      });

    return () => { cancelled = true; };
  }, [repos, automatedRepos, token]);

  // ── Token management ──────────────────────────────────────────────────────

  const handleSaveToken = async (newToken: string): Promise<boolean> => {
    const verifiedUser = await verifyAndLoadUser(newToken);
    if (verifiedUser) {
      setToken(newToken);
      setManualPulses(readManualPulses(verifiedUser.login));
      if (typeof window !== "undefined") localStorage.setItem("gitpulse_token", newToken);
      await fetchRepositories(newToken);
      return true;
    }
    return false;
  };

  const handleDisconnect = () => {
    localStorage.removeItem("gitpulse_token");
    setToken("");
    setUser(null);
    setRepos([]);
    setSelectedRepoIds(new Set());
    setIsTokenModalOpen(false);
  };

  const handleEnableAutomation = async () => {
    const targets = repos
      .filter((repo) => selectedRepoIds.has(repo.id))
      .map((repo) => ({ owner: repo.owner.login, repo: repo.name, branch: repo.default_branch || "main" }));
    if (!token || !targets.length) {
      setNotice({ tone: "info", text: "Connect GitHub and select at least one repository first." });
      return;
    }

    setIsInstallingAutomation(true);
    try {
      const response = await fetch("/api/automation/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, repos: targets }),
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.results)) {
        throw new Error(data.error || "Could not enable daily automation.");
      }

      const installed = new Set(automatedRepos);
      for (const result of data.results) {
        const fullName = `${result.owner}/${result.repo}`;
        if (result.success) installed.add(fullName);
      }
      setAutomatedRepos(installed);
      localStorage.setItem("gitpulse_automated_repos", JSON.stringify([...installed]));

      setNotice({
        tone: data.failureCount ? "error" : "success",
        text: data.failureCount
          ? `Automation enabled for ${data.successCount} of ${data.total} repositories. ${data.results.find((result: { success: boolean }) => !result.success)?.error || "Check token permissions."}`
          : `Daily GitHub Actions automation enabled for ${data.successCount} repositories.`,
      });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not enable daily automation." });
    } finally {
      setIsInstallingAutomation(false);
    }
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
        body: JSON.stringify({ token: token || undefined, repos: targets, filePath: filePath || ".gitpulse/pulse.log", commitMessage: customMessage, concurrency: 4 }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) {
        setRecentResults((prev) => [...data.results, ...prev]);
        recordManualPulses(data.results);
        setSessionCommits((prev) => prev + (data.successCount ?? 0));
        setLastRunTime(new Date().toISOString());
        setNotice({ tone: data.failureCount ? "error" : "success", text: `${data.successCount ?? 0} commit${data.successCount === 1 ? "" : "s"} completed; ${data.failureCount ?? 0} failed.` });
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
          filePath: ".gitpulse/pulse.log",
          concurrency: 1,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) {
        setRecentResults((prev) => [...data.results, ...prev]);
        recordManualPulses(data.results);
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
              todaySchedule={todaySchedule}
              manualPulses={manualPulses}
              automationCount={automatedRepos.size}
              isInstallingAutomation={isInstallingAutomation}
              onEnableAutomation={handleEnableAutomation}
              todayCommits={automatedPulses.length + manualPulses.length}
              automatedPulses={automatedPulses}
              automationCheckError={automationCheckError}
              sessionCommits={sessionCommits}
              selectedCount={selectedRepoIds.size}
              totalRepos={repos.length}
              onPulse={() => handleTriggerBatchCommit(".gitpulse/pulse.log", undefined, true)}
              onOpenRepositories={() => setActiveTab("repos")}
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

          {activeTab === "guide" && <AutomationGuide />}
        </div>
      </div>

      {/* ── Token Modal ── */}
      <TokenConfigModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onDisconnect={handleDisconnect}
        onSaveToken={handleSaveToken}
        currentToken={token}
      />
    </div>
  );
}
