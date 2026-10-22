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
  }, []);

  const remove = async (login: string) => {
    if (!confirm(`Remove ${login} from the vault?`)) return;
    const res = await fetch(`/api/tokens/${encodeURIComponent(login)}`, {
      method: "DELETE",
    });
    if (res.ok) setRows((prev) => prev.filter((r) => r.login !== login));
    else setError("Delete failed.");
  };

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px" }}>
      <p className="eyebrow">ADMIN ONLY</p>
      <h1>Saved logins ({rows.length})</h1>
      <p style={{ color: "var(--text-2)" }}>
        Every successful dashboard login is saved here. Full tokens are only
        fetched when you press Reveal, and only with the admin password.
      </p>
      <div style={{ display: "flex", gap: 10, margin: "16px 0" }}>
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
          onClick={() => load(revealed)}
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
