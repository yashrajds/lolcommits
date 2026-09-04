"use client";

import React from "react";
import { FolderGit2, CheckCircle2, Clock, Zap } from "lucide-react";

interface StatsOverviewProps {
  totalRepos: number;
  selectedCount: number;
  sessionCommits: number;
  todayCommits: number;
  dailyGoal?: number;
  lastSyncTime: string | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalRepos,
  selectedCount,
  sessionCommits,
  todayCommits,
  dailyGoal = 10,
  lastSyncTime,
}) => {
  const progressPercent = Math.min(100, Math.round((todayCommits / dailyGoal) * 100));

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-tile" style={{ borderColor: "rgba(16, 185, 129, 0.4)", background: "rgba(16, 185, 129, 0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label" style={{ color: "var(--accent-emerald)" }}>Completed Today</span>
            <CheckCircle2 size={18} color="var(--accent-emerald)" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span className="stat-value" id="stat-today-commits" style={{ color: "#10b981" }}>
              {todayCommits}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              / {dailyGoal} goal
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "6px",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "var(--radius-full)",
              overflow: "hidden",
              marginTop: "4px",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #10b981, #06b6d4)",
                borderRadius: "var(--radius-full)",
                transition: "width 0.4s ease-out",
              }}
            />
          </div>
          <span className="stat-subtext" style={{ fontSize: "0.72rem" }}>
            {progressPercent >= 100 ? "🎉 Daily commit target reached!" : `${dailyGoal - todayCommits > 0 ? dailyGoal - todayCommits : 0} more to hit daily goal`}
          </span>
        </div>

        <div className="stat-tile cyan">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label">Active Targets</span>
            <Zap size={18} color="var(--accent-cyan)" />
          </div>
          <span className="stat-value" id="stat-selected-repos">{selectedCount}</span>
          <span className="stat-subtext">Selected out of {totalRepos} repositories</span>
        </div>

        <div className="stat-tile purple">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label">Session Commits</span>
            <FolderGit2 size={18} color="var(--accent-purple)" />
          </div>
          <span className="stat-value" id="stat-session-commits">{sessionCommits}</span>
          <span className="stat-subtext">Verified commits in this session</span>
        </div>

        <div className="stat-tile amber">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label">Schedule Mode</span>
            <Clock size={18} color="var(--accent-amber)" />
          </div>
          <span className="stat-value" style={{ fontSize: "1.2rem", paddingTop: "6px" }}>
            Randomized
          </span>
          <span className="stat-subtext">
            {lastSyncTime ? `Last pulse: ${new Date(lastSyncTime).toLocaleTimeString()}` : "1-3 random repos on schedule"}
          </span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>GitHub Activity Simulation</span>
            <span className="brand-badge" style={{ fontSize: "0.65rem" }}>Live Pulse Activity</span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Non-destructive heartbeat keeps your contribution streaks alive
          </span>
        </div>
        <div className="heatmap-preview" id="heatmap-preview">
          {Array.from({ length: 48 }).map((_, i) => {
            // Give varied realistic activity levels
            const level = ((i * 7 + 3) % 5 === 0) ? 4 : ((i * 3 + 1) % 4 === 0) ? 3 : (i % 3 === 0) ? 2 : 1;
            return (
              <div
                key={i}
                className={`heatmap-cell level-${level}`}
                title={`Simulated commit active block`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
