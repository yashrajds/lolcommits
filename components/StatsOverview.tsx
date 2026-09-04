"use client";

import React from "react";
import { FolderGit2, CheckCircle2, Clock, Zap } from "lucide-react";

interface StatsOverviewProps {
  totalRepos: number;
  selectedCount: number;
  sessionCommits: number;
  lastSyncTime: string | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalRepos,
  selectedCount,
  sessionCommits,
  lastSyncTime,
}) => {
  return (
    <div>
      <div className="stats-grid">
        <div className="stat-tile">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label">Total Repositories</span>
            <FolderGit2 size={18} color="var(--accent-emerald)" />
          </div>
          <span className="stat-value" id="stat-total-repos">{totalRepos}</span>
          <span className="stat-subtext">Discovered from your GitHub account</span>
        </div>

        <div className="stat-tile cyan">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label">Active Targets</span>
            <Zap size={18} color="var(--accent-cyan)" />
          </div>
          <span className="stat-value" id="stat-selected-repos">{selectedCount}</span>
          <span className="stat-subtext">Selected for automated commits</span>
        </div>

        <div className="stat-tile purple">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label">Session Commits</span>
            <CheckCircle2 size={18} color="var(--accent-purple)" />
          </div>
          <span className="stat-value" id="stat-session-commits">{sessionCommits}</span>
          <span className="stat-subtext">Verified commits delivered</span>
        </div>

        <div className="stat-tile amber">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label">Vercel Cron Schedule</span>
            <Clock size={18} color="var(--accent-amber)" />
          </div>
          <span className="stat-value" style={{ fontSize: "1.25rem", paddingTop: "6px" }}>
            0 9 * * *
          </span>
          <span className="stat-subtext">
            {lastSyncTime ? `Last run: ${new Date(lastSyncTime).toLocaleTimeString()}` : "Daily automated pulse (09:00 UTC)"}
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
