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
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const headers = useCallback(
    (extra: Record<string, string> = {}) => ({
      ...extra,
      "x-admin-password": password,
    }),
    [password]
  );

  const load = useCallback(
    async (reveal: boolean, pw: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/tokens${reveal ? "?reveal=1" : ""}`, {
          headers: { "x-admin-password": pw },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Locked.");
        setRows(data.tokens || []);
        setRevealed(reveal);
        setUnlocked(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load.");
        setUnlocked(false);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // If the site cookie is already set, try loading masked list silently
    // only when a password was typed before — never auto-reveal.
  }, []);

  const remove = async (login: string) => {
    if (!confirm(`Remove ${login} from the vault?`)) return;
    const res = await fetch(`/api/tokens/${encodeURIComponent(login)}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (res.ok) setRows((prev) => prev.filter((r) => r.login !== login));
    else setError("Delete failed.");
  };

  if (!unlocked) {
    return (
      <main className="unlock-shell">
        <form
          className="unlock-card"
          onSubmit={(e) => {
            e.preventDefault();
            load(false, password);
          }}
        >
          <p className="eyebrow">ADMIN ONLY</p>
          <h1>Token vault.</h1>
          <p>Enter the admin password to view saved logins. Tokens stay masked until you reveal them.</p>
          <label htmlFor="admin-password">Admin password</label>
          <input
            id="admin-password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
          />
          <span className="unlock-error">{error}</span>
          <button className="btn btn-primary unlock-button" disabled={loading || !password}>
            {loading ? "Verifying…" : "Unlock vault"}
          </button>
        </form>
      </main>
    );
  }

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
          onClick={() => load(!revealed, password)}
        >
          {revealed ? "Mask tokens" : "Reveal tokens"}
        </button>
        <button
          className="btn btn-secondary"
          disabled={loading}
          onClick={() => load(revealed, password)}
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
