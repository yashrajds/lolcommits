"use client";

import React, { useEffect, useRef } from "react";
import {
  ArrowUpRight,
  CirclePlay,
  CircleStop,
  GitCommitHorizontal,
  Orbit,
  Radio,
  Sparkles,
  CalendarClock,
  Zap,
  FolderGit2,
  Clock,
} from "lucide-react";
import type { SchedulerState } from "@/lib/scheduler";

type Props = {
  scheduler: SchedulerState | null;
  todayCommits: number;
  sessionCommits: number;
  selectedCount: number;
  totalRepos: number;
  dailyGoal?: number;
  onStop: () => void;
  onStart: () => void;
  onPulse: () => void;
  onOpenConsole: () => void;
  onOpenRepositories: () => void;
  stopping: boolean;
  isCommitting: boolean;
  notice: { tone: "success" | "error" | "info"; text: string } | null;
  onDismissNotice: () => void;
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));

export function EclipseDashboard({
  scheduler,
  todayCommits,
  sessionCommits,
  selectedCount,
  totalRepos,
  dailyGoal = 10,
  onStop,
  onStart,
  onPulse,
  onOpenConsole,
  onOpenRepositories,
  stopping,
  isCommitting,
  notice,
  onDismissNotice,
}: Props) {
  const upcoming = scheduler?.schedule.filter((i) => i.status === "upcoming") ?? [];
  const progressPct = Math.min(100, Math.round((todayCommits / dailyGoal) * 100));
  const isActive = scheduler?.enabled ?? false;

  // Auto-dismiss notice after 4 seconds
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (notice) {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(onDismissNotice, 4000);
    }
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [notice, onDismissNotice]);

  return (
    <div className="dashboard">
      {/* ── Notice Banner ── */}
      {notice && (
        <div
          className={`notice notice-${notice.tone}`}
          role="status"
          style={{ marginBottom: 0, cursor: "pointer" }}
          onClick={onDismissNotice}
          title="Click to dismiss"
        >
          <Sparkles size={14} />
          <span style={{ flex: 1 }}>{notice.text}</span>
          <span style={{ fontSize: "0.68rem", opacity: 0.7 }}>Dismiss</span>
        </div>
      )}

      {/* ── Hero Card ── */}
      <div className="hero-card">
        <div>
          <div className="hero-eyebrow">
            <Radio size={11} />
            GITPULSE · AUTOMATION ENGINE
          </div>
          <h1 className="hero-title">
            <em>Solar</em> Pulse
          </h1>
          <p className="hero-desc">
            Give your codebase a living rhythm. Schedule deliberate, intelligent
            activity across every selected repository — automatically.
          </p>
          <div className="hero-actions">
            <button
              className="btn btn-primary"
              onClick={onPulse}
              disabled={isCommitting || selectedCount === 0}
              id="hero-pulse-btn"
            >
              <GitCommitHorizontal size={16} />
              {isCommitting ? "Creating pulse…" : "Create a Pulse"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={onOpenConsole}
              id="hero-console-btn"
            >
              Open Mission Log <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <div className="hero-orb">
            <div className="orb-core">
              <span className="orb-icon">
                <Radio size={22} />
              </span>
              <span
                className="orb-status"
                style={{ color: isActive ? "var(--emerald)" : "var(--rose)" }}
              >
                {isActive ? "ACTIVE" : "RESTING"}
              </span>
              <span className="orb-label">IST · BACKGROUND</span>
            </div>
          </div>
          <span className="orbital-tag">AUTOMATION</span>
        </div>
      </div>

      {/* ── Metrics Strip ── */}
      <div className="metrics-row">
        {/* Today commits */}
        <div className="metric-tile em">
          <span className="metric-label">Commits Today</span>
          <span className="metric-value" id="stat-today-commits">
            {todayCommits}
          </span>
          <span className="metric-sub">/ {dailyGoal} daily goal</span>
          <div className="metric-icon">
            <Zap size={22} color="var(--emerald)" />
          </div>
          <div className="prog-bar" style={{ marginTop: 8 }}>
            <div className="prog-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Upcoming windows */}
        <div className="metric-tile cy">
          <span className="metric-label">Windows Ahead</span>
          <span className="metric-value">{upcoming.length}</span>
          <span className="metric-sub">
            {upcoming.length === 0 ? "All done for today" : "Scheduled today"}
          </span>
          <div className="metric-icon">
            <CalendarClock size={22} color="var(--cyan)" />
          </div>
        </div>

        {/* Repos in orbit */}
        <div className="metric-tile vi">
          <span className="metric-label">Repos in Orbit</span>
          <span className="metric-value" id="stat-selected-repos">
            {selectedCount}
          </span>
          <span className="metric-sub">of {totalRepos} available</span>
          <div className="metric-icon">
            <FolderGit2 size={22} color="var(--violet)" />
          </div>
        </div>

        {/* Session commits */}
        <div className="metric-tile am">
          <span className="metric-label">Session Commits</span>
          <span className="metric-value" id="stat-session-commits">
            {sessionCommits}
          </span>
          <span className="metric-sub">
            {isActive ? "Automation active" : "Automation paused"}
          </span>
          <div className="metric-icon">
            <Clock size={22} color="var(--amber)" />
          </div>
        </div>
      </div>

      {/* ── Schedule + Control ── */}
      <div className="dashboard-grid">
        {/* Schedule panel */}
        <div className="card">
          <div className="schedule-header">
            <div className="card-title">
              <Orbit size={16} color="var(--cyan)" />
              The Day Ahead
            </div>
            <span
              className={`badge-live ${isActive ? "badge-live-on" : "badge-live-off"}`}
            >
              <span className="live-dot" />
              {isActive ? "Live" : "Paused"}
            </span>
          </div>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-3)",
              marginBottom: 14,
            }}
          >
            Randomized windows plotted in Indian Standard Time.
          </p>

          {upcoming.length > 0 ? (
            <div>
              {upcoming.slice(0, 5).map((item, i) => (
                <div className="orbit-item" key={item.id}>
                  <span className="orbit-num">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="orbit-time">{formatTime(item.at)}</div>
                    <div className="orbit-tag">Commit window · IST</div>
                  </div>
                  <span className="orbit-status-icon">
                    <CalendarClock size={14} />
                  </span>
                </div>
              ))}
              {upcoming.length > 5 && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-3)",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  +{upcoming.length - 5} more windows scheduled
                </p>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <CalendarClock size={32} />
              </div>
              <div className="empty-title">No active windows today</div>
              <div className="empty-desc">
                {isActive
                  ? "All scheduled windows have completed."
                  : "Restart automation to generate new windows."}
              </div>
            </div>
          )}
        </div>

        {/* Control panel */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>
            <Radio size={16} color="var(--emerald)" />
            Live Control
          </div>
          <h2 className="control-title">
            {isActive ? "The pulse is on." : "Take it from zero."}
          </h2>
          <p className="control-desc">
            {isActive
              ? "Stop immediately to cancel the rest of today's planned activity. The automation will not commit until restarted."
              : "Start again to generate a fresh set of future windows for today."}
          </p>
          <div className="control-actions">
            <button
              id="stop-scheduler-btn"
              className="btn btn-danger"
              onClick={onStop}
              disabled={!isActive || stopping}
            >
              <CircleStop size={16} />
              {stopping ? "Stopping…" : "Stop for Today"}
            </button>
            <button
              id="start-scheduler-btn"
              className="btn btn-cyan"
              onClick={onStart}
              disabled={isActive || stopping}
            >
              <CirclePlay size={16} />
              {stopping ? "Starting…" : "Start Again"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Repository Constellation ── */}
      <button
        className="repo-glass"
        onClick={onOpenRepositories}
        id="open-repos-btn"
      >
        <div className="repo-glass-left">
          <div className="repo-glass-title">Repository Constellation</div>
          <div className="repo-glass-sub">
            View and manage all repositories targeted for automation
          </div>
        </div>
        <div className="repo-glass-count">
          {selectedCount} selected <ArrowUpRight size={15} />
        </div>
      </button>
    </div>
  );
}
