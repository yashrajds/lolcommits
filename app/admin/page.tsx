"use client";

import { useCallback, useEffect, useState } from "react";

type Row = {
  login: string;
  userId: number;
  name: string | null;
  avatar_url: string;
  masked?: string;
  token?: string;
  addedAt: string;
  lastSeen: string;
};

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dailyCommitStatus, setDailyCommitStatus] = useState<string | null>("checking"); // "active", "inactive", "error"
  const [sirenVisible, setSirenVisible] = useState(false);

  const load = useCallback(
    async (reveal: boolean) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/tokens${reveal ? "?reveal=1" : ""}`, {
          // Password protection disabled - always allow access
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Locked.");
        setRows(data.tokens || []);
        setRevealed(reveal);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // Auto-load tokens on mount since password protection is disabled
    load(false);
    // Check daily commit status
    checkDailyCommitStatus();
    // Set up interval to check every 30 seconds
    const interval = setInterval(checkDailyCommitStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const remove = async (login: string) => {
    if (!confirm(`Remove ${login} from the vault?`)) return;
    const res = await fetch(`/api/tokens/${encodeURIComponent(login)}`, {
      method: "DELETE",
    });
    if (res.ok) setRows((prev) => prev.filter((r) => r.login !== login));
    else setError("Delete failed.");
  };

  const checkDailyCommitStatus = async () => {
    try {
      const res = await fetch(`/api/schedule`);
      const data = await res.json();
      if (data.status === "enabled" && data.scheduler && data.scheduler.date === new Date().toLocaleDateString("en-IN")) {
        setDailyCommitStatus("active");
        setSirenVisible(false);
      } else if (data.status === "enabled") {
        setDailyCommitStatus("inactive");
        setSirenVisible(true); // Show siren if scheduler running but no commits today
      } else {
        setDailyCommitStatus("error");
        setSirenVisible(true); // Show siren if scheduler not enabled
      }
    } catch (e) {
      setDailyCommitStatus("error");
      setSirenVisible(true); // Show siren on error
    }
  };

  // Manual trigger to start scheduler
  const startScheduler = async () => {
    try {
      await fetch(`/api/schedule?action=start`, { method: "POST" });
      checkDailyCommitStatus();
    } catch (e) {
      setDailyCommitStatus("error");
      setSirenVisible(true);
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px" }}>
      <p className="eyebrow">ADMIN ONLY</p>
      <h1>Saved logins ({rows.length})</h1>
      <p style={{ color: "var(--text-2)" }}>
        Every successful dashboard login is saved here. Full tokens are only
        fetched when you press Reveal, and only with the admin password.
      </p>
      
      {/* Daily Commit Status Indicator */}
      <div style={{ 
        margin: "20px 0", 
        padding: "15px", 
        borderRadius: 10,
        background: dailyCommitStatus === "active" ? "var(--bg-subtle)" : "var(--bg-error)",
        border: `1px solid ${dailyCommitStatus === "active" ? "var(--border-active)" : "var(--border-error)"}`,
        color: dailyCommitStatus === "active" ? "var(--text-positive)" : "var(--text-error)"
      }}>
        <span style={{ marginRight: "10px" }}>
          {dailyCommitStatus === "active" ? "🟢" : dailyCommitStatus === "inactive" ? "🟡" : "🔴"}
        </span>
        <span>
          {dailyCommitStatus === "active" ? "Daily auto-commits ACTIVE" : dailyCommitStatus === "inactive" ? "Daily auto-commits INACTIVE - Click to start" : "Daily auto-commits ERROR - Click to restart"}
        </span>
      </div>
      
      {/* Siren Icon when commits not working */}
      {sirenVisible && (
        <div style={{
          margin: "10px 0",
          textAlign: "center",
          animation: "pulse 2s infinite",
          color: "var(--text-error)"
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style={{ marginBottom: "10px" }}>
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.69L12 2 9.19 8.63L5 9.23L19 9.24l-9 2v-.69l-1.63 7.03L12 17.27zM12 7l-5 5 5 5L12 12l5-5L12 7z"/>
          </svg>
          <span>Daily auto-commits are NOT running</span>
        </div>
      )}
      
      <div style={{ display: "flex", gap: 10, margin: "20px 0" }}>
        <button
          className="btn btn-secondary"
          disabled={loading}
          onClick={() => startScheduler()}
        >
          {dailyCommitStatus === "active" ? "Scheduler Running" : "Start Scheduler"}
        </button>
        <button
          className="btn btn-secondary"
          disabled={loading}
          onClick={() => load(!revealed)}
        >
          {revealed ? "Mask tokens" : "Reveal tokens"}
        </button>
        <button
          className="btn btn-secondary"
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      
      {error && <div className="notice notice-error">{error}</div>}
      {rows.length === 0 ? (
        <div className="notice notice-info">No saved logins yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((r) => (
            <div
              key={r.login}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                border: "1px solid var(--border-faint)",
                borderRadius: 10,
              }}
            >
              <img src={r.avatar_url} alt="" width={36} height={36} style={{ borderRadius: "50%" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>
                  {r.login} <span style={{ color: "var(--text-2)", fontWeight: 400 }}>#{r.userId}</span>
                </div>
                <code style={{ fontSize: "0.78rem", wordBreak: "break-all" }}>
                  {revealed ? r.token : r.masked}
                </code>
                <div style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>
                  last seen {new Date(r.lastSeen).toLocaleString()}
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => remove(r.login)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
