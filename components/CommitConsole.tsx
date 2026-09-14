"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Terminal,
  ExternalLink,
  RefreshCw,
  FileText,
  MessageSquare,
  Shuffle,
} from "lucide-react";
import type { CommitResult } from "@/lib/github";

interface CommitConsoleProps {
  onTriggerBatchCommit: (
    filePath: string,
    customMessage?: string,
    randomize?: boolean
  ) => Promise<void>;
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
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new results arrive
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [recentResults]);

  const handleRun = (randomize: boolean = false) => {
    if (selectedCount === 0) return;
    onTriggerBatchCommit(
      filePath.trim() || ".github-pulse.md",
      customMessage.trim() || undefined,
      randomize
    );
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="console-layout">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Terminal size={17} color="var(--cyan)" />
              Commit Terminal
            </div>
            <p className="card-desc">
              Trigger automated pulse commits across all or randomized subsets
              of your selected repositories.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              id="trigger-random-pulse-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => handleRun(true)}
              disabled={isCommitting || selectedCount === 0}
              title={
                selectedCount === 0
                  ? "Select at least 1 repository first"
                  : "Commit to 1–3 random repos from your selection"
              }
            >
              <Shuffle size={13} />
              Random 1–3
            </button>
            <button
              id="trigger-batch-pulse-btn"
              className="btn btn-primary btn-sm"
              onClick={() => handleRun(false)}
              disabled={isCommitting || selectedCount === 0}
              title={
                selectedCount === 0
                  ? "Select at least 1 repository first"
                  : `Commit to all ${selectedCount} selected repositories`
              }
            >
              {isCommitting ? (
                <>
                  <RefreshCw size={13} className="spin" />
                  Executing…
                </>
              ) : (
                <>
                  <Play size={13} />
                  Pulse All ({selectedCount})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Input Controls */}
        <div className="console-controls">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="pulse-target-file">
              <FileText size={12} style={{ display: "inline", marginRight: 4 }} />
              Target Heartbeat File
            </label>
            <input
              id="pulse-target-file"
              type="text"
              className="input input-mono"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder=".github-pulse.md"
            />
            <span className="input-hint">
              Safe, non-destructive file updated on each repo&apos;s default branch.
            </span>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="custom-commit-msg">
              <MessageSquare size={12} style={{ display: "inline", marginRight: 4 }} />
              Commit Message{" "}
              <span style={{ fontWeight: 400, color: "var(--text-4)" }}>
                (leave blank for auto-generated)
              </span>
            </label>
            <input
              id="custom-commit-msg"
              type="text"
              className="input"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g., chore(pulse): automated repository sync"
            />
            <span className="input-hint">
              Defaults to realistic conventional commit patterns (chore, docs, sync).
            </span>
          </div>
        </div>

        {/* Empty state when no repos selected */}
        {selectedCount === 0 && (
          <div
            className="notice notice-info"
            style={{ marginTop: 14, marginBottom: 0 }}
          >
            Select at least one repository in the{" "}
            <strong>Repositories</strong> tab before triggering a pulse.
          </div>
        )}
      </div>

      {/* Terminal Output */}
      <div className="terminal">
        <div className="terminal-bar">
          <div className="t-dots">
            <div className="t-dot t-dot-r" />
            <div className="t-dot t-dot-y" />
            <div className="t-dot t-dot-g" />
          </div>
          <span className="t-title">gitpulse-agent ~ activity.log</span>
          <span className="t-meta">
            {lastRunTime
              ? `Last batch: ${formatTime(lastRunTime)}`
              : "Idle — ready"}
          </span>
        </div>

        <div className="terminal-body" id="terminal-log-output" ref={terminalRef}>
          {recentResults.length === 0 ? (
            <div className="t-empty">
              Terminal idle. Click &quot;Pulse All&quot; to execute or wait for the Vercel Cron.
            </div>
          ) : (
            [...recentResults].map((res, idx) => (
              <div key={idx} className="t-line">
                <span className="t-prompt">&gt;</span>
                <span className="t-time">[{formatTime(res.timestamp)}]</span>
                <span className="t-repo">
                  {res.owner}/{res.repo}
                </span>
                {res.success ? (
                  <span className="t-ok">
                    ✓ committed in {res.durationMs}ms
                    {res.sha && res.url && (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="t-sha"
                        style={{ marginLeft: 6 }}
                      >
                        sha:{res.sha.slice(0, 7)}{" "}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </span>
                ) : (
                  <span className="t-err">✗ {res.error}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
