"use client";

import React, { useState } from "react";
import { Play, Terminal, ExternalLink, ShieldCheck, RefreshCw, FileText } from "lucide-react";
import { CommitResult } from "@/lib/github";

interface CommitConsoleProps {
  onTriggerBatchCommit: (filePath: string, customMessage?: string, randomize?: boolean) => Promise<void>;
  isCommitting: boolean;
  selectedCount: number;
  recentResults: CommitResult[];
  lastRunTime: string | null;
}

export const CommitConsole: React.FC<CommitConsoleProps> = ({
  onTriggerBatchCommit,
  isCommitting,
  selectedCount,
  recentResults,
  lastRunTime,
}) => {
  const [filePath, setFilePath] = useState(".github-pulse.md");
  const [customMessage, setCustomMessage] = useState("");

  const handleRun = (randomize: boolean = false) => {
    onTriggerBatchCommit(filePath.trim() || ".github-pulse.md", customMessage.trim() || undefined, randomize);
  };

  return (
    <div className="card" style={{ marginBottom: "24px" }}>
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Terminal size={20} color="var(--accent-cyan)" />
            <span>Live Commit Terminal & Controls</span>
          </h2>
          <p className="card-description">
            Trigger automated pulse commits across all or randomized subsets of your repositories.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            id="trigger-random-pulse-btn"
            className="btn btn-secondary"
            onClick={() => handleRun(true)}
            disabled={isCommitting || selectedCount === 0}
            title="Pick 1-3 random repositories from your active selection"
          >
            🎲 Random 1-3 Repos
          </button>
          <button
            id="trigger-batch-pulse-btn"
            className="btn btn-primary"
            onClick={() => handleRun(false)}
            disabled={isCommitting || selectedCount === 0}
            title={selectedCount === 0 ? "Select at least 1 repository first" : "Commit to all selected repositories"}
          >
            {isCommitting ? (
              <>
                <RefreshCw size={16} className="spin" />
                Executing Pulse...
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                Pulse All ({selectedCount})
              </>
            )}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label" htmlFor="pulse-target-file">
            <FileText size={14} style={{ display: "inline", marginRight: "4px" }} />
            Target Heartbeat File
          </label>
          <input
            id="pulse-target-file"
            type="text"
            className="text-input mono"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder=".github-pulse.md"
          />
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>
            Safe non-destructive file updated on each repository&apos;s default branch.
          </span>
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label" htmlFor="custom-commit-msg">
            <ShieldCheck size={14} style={{ display: "inline", marginRight: "4px" }} />
            Commit Message (Leave blank for randomized realistic messages)
          </label>
          <input
            id="custom-commit-msg"
            type="text"
            className="text-input"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="e.g., chore(pulse): automated repository sync"
          />
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>
            Defaults to conventional commit patterns (e.g. chore, docs, sync).
          </span>
        </div>
      </div>

      <div className="terminal-window">
        <div className="terminal-header">
          <div className="terminal-dots">
            <div className="terminal-dot dot-red" />
            <div className="terminal-dot dot-yellow" />
            <div className="terminal-dot dot-green" />
          </div>
          <div className="terminal-title">gitpulse-agent ~ activity.log</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {lastRunTime ? `Last batch: ${new Date(lastRunTime).toLocaleTimeString()}` : "Ready"}
          </div>
        </div>

        <div className="terminal-body" id="terminal-log-output">
          {recentResults.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontStyle: "italic", paddingTop: "20px", textAlign: "center" }}>
              Terminal idle. Click &quot;Trigger Pulse&quot; to execute changes or wait for Vercel Cron.
            </div>
          ) : (
            recentResults.map((res, idx) => (
              <div key={idx} className="terminal-line">
                <span className="terminal-prompt">&gt;</span>
                <span className="terminal-time">[{new Date(res.timestamp).toLocaleTimeString()}]</span>
                <span style={{ color: "#ffffff", fontWeight: 600 }}>{res.owner}/{res.repo}</span>
                {res.success ? (
                  <span className="terminal-success">
                    ✓ Committed in {res.durationMs}ms
                    {res.sha && (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--accent-cyan)",
                          marginLeft: "8px",
                          textDecoration: "underline",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        sha:{res.sha.slice(0, 7)} <ExternalLink size={10} />
                      </a>
                    )}
                  </span>
                ) : (
                  <span className="terminal-error">
                    ✗ Failed: {res.error}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
