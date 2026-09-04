"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, ArrowRight } from "lucide-react";

export default function UnlockPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function unlock(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (response.ok) window.location.assign("/"); else setError((await response.json()).error || "Unable to unlock.");
    setLoading(false);
  }
  return <main className="unlock-shell"><form className="unlock-card" onSubmit={unlock}><div className="unlock-mark"><LockKeyhole size={24} /></div><p className="eyebrow">PRIVATE AUTOMATION CONSOLE</p><h1>Enter the control room.</h1><p>GitPulse is protected. Enter the workspace password to continue.</p><label htmlFor="access-password">Workspace password</label><input id="access-password" type="password" autoFocus value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••" /><span className="unlock-error">{error}</span><button className="btn btn-primary unlock-button" disabled={loading}>{loading ? "Verifying…" : <>Unlock dashboard <ArrowRight size={16} /></>}</button></form></main>;
}
