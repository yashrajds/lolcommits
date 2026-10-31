"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  GitCommitHorizontal,
  Orbit,
  Radio,
  Sparkles,
  Zap,
  FolderGit2,
  Clock,
} from "lucide-react";

type Props = {
  todaySchedule: { repository: string; time: string }[];
  manualPulses: { key: string; repository: string; time: string }[];
  automatedPulses: { key: string; repository: string; time: string; timestamp: string; url: string }[];
  automationCheckError: string | null;
  automationCount: number;
  isInstallingAutomation: boolean;
  onEnableAutomation: () => void;
  todayCommits: number;
  sessionCommits: number;
  selectedCount: number;
  totalRepos: number;
  dailyGoal?: number;
  onPulse: () => void;
  onOpenRepositories: () => void;
  isCommitting: boolean;
  notice: { tone: "success" | "error" | "info"; text: string } | null;
  onDismissNotice: () => void;
};

export function EclipseDashboard({
  todaySchedule,
  manualPulses,
  automatedPulses,
  automationCheckError,
  automationCount,
  isInstallingAutomation,
  onEnableAutomation,
  todayCommits,
  sessionCommits,
  selectedCount,
  totalRepos,
  dailyGoal = 10,
  onPulse,
  onOpenRepositories,
  isCommitting,
  notice,
  onDismissNotice,
}: Props) {
  const progressPct = Math.min(100, Math.round((todayCommits / dailyGoal) * 100));
  const automationEnabled = automationCount > 0 && totalRepos > 0;
  const committedRepos = new Set(automatedPulses.map((pulse) => pulse.repository));
  const todayPulses = [
    ...automatedPulses.map((pulse) => ({ ...pulse, source: "AutoPulse" as const, state: "Committed" })),
    ...todaySchedule
      .filter((pulse) => !committedRepos.has(pulse.repository))
      .map((pulse) => ({ ...pulse, source: "AutoPulse" as const, state: "Scheduled", key: `auto-${pulse.repository}` })),
    ...manualPulses.map((pulse) => ({ ...pulse, source: "Manual" as const, state: "Committed" })),
  ].sort((left, right) => left.time.localeCompare(right.time));

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
            DON’T<br /><em>BLINK</em>
          </h1>
          <p className="hero-desc">
            One pulse a day. At a different hour, every day.
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
                style={{ color: automationEnabled ? "var(--emerald)" : "var(--rose)" }}
              >
                {automationEnabled ? "READY" : "SETUP NEEDED"}
              </span>
              <span className="orb-label">GITHUB ACTIONS</span>
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

        {/* Daily cadence */}
        <div className="metric-tile cy">
          <span className="metric-label">Random commit hour</span>
          <span className="metric-value">09–21</span>
          <span className="metric-sub">IST · changes daily</span>
          <div className="metric-icon">
            <Clock size={22} color="var(--cyan)" />
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
            {automationEnabled ? `${automationCount} workflows enabled` : "Not enabled yet"}
          </span>
          <div className="metric-icon">
            <Clock size={22} color="var(--amber)" />
          </div>
        </div>
      </div>

      {/* ── Daily run + manual control ── */}
      <div className="dashboard-grid dashboard-grid-single">
        <div className="card automation-schedule">
          <div className="schedule-header">
            <div className="card-title">
              <Orbit size={16} color="var(--cyan)" />
              Daily automation
            </div>
            <span
              className={`badge-live ${automationEnabled ? "badge-live-on" : "badge-live-off"}`}
            >
              <span className="live-dot" />
              {automationEnabled ? `Enabled · ${automationCount} repos` : "Needs setup"}
            </span>
          </div>
          <div className="automation-time">09:00–21:00 <span>IST</span></div>
          <p className="control-desc">
            One commit per enabled repository, at a different random hour each day. Repositories get independent times.
          </p>
          <div className="automation-setup">
            <p className="automation-help">
              {automationEnabled
                ? "GitHub runs the schedule inside each repository. Your connected token is not needed for daily runs."
                : "Enable daily commits for selected repositories. No Vercel secrets are needed."}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onEnableAutomation}
              disabled={isInstallingAutomation || selectedCount === 0}
            >
              <GitCommitHorizontal size={15} />
              {isInstallingAutomation
                ? "Applying schedule…"
                : automationEnabled
                  ? `Update schedule for ${selectedCount} repos`
                  : `Enable for ${selectedCount} repos`}
            </button>
          </div>
        </div>
      </div>

      <section className="card today-pulses" aria-labelledby="today-pulses-title">
        <div className="today-pulses-header">
          <div className="card-title" id="today-pulses-title">
            <Clock size={16} color="var(--cyan)" />
            Today’s pulses
          </div>
          <span className="today-pulses-zone">
            {automationCheckError
              ? "GitHub status check failed"
              : `IST · ${automatedPulses.length} AutoPulse commits today`}
          </span>
        </div>
        {automationCheckError && <p className="today-pulses-empty">Could not verify automated commits: {automationCheckError}</p>}
        {todayPulses.length ? (
          <ol className="today-pulses-list">
            {todayPulses.map((pulse) => (
              <li key={pulse.key} className="today-pulse-row">
                <span className={`today-pulse-source ${pulse.source === "Manual" ? "manual" : "autopulse"}`}>
                  {pulse.source}
                </span>
                <time className="today-pulse-time">{pulse.time}</time>
                <span className="today-pulse-repo">{pulse.repository}</span>
                <span className="today-pulse-state">{pulse.state}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="today-pulses-empty">
            {automationEnabled
              ? "No AutoPulse commits found in GitHub for today. Future scheduled times will appear here when available."
              : "Enable daily automation to see each repository’s pulse time here."}
          </p>
        )}
      </section>

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
