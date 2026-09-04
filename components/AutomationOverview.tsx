"use client";

import React from "react";
import { CalendarClock, CirclePlay, CircleStop, Radio, ShieldCheck } from "lucide-react";
import type { SchedulerState } from "@/lib/scheduler";

export function AutomationOverview({ scheduler, todayCommits, onStop, onStart, stopping }: { scheduler: SchedulerState | null; todayCommits: number; onStop: () => void; onStart: () => void; stopping: boolean }) {
  const upcoming = scheduler?.schedule.filter((item) => item.status === "upcoming") || [];
  const formatTime = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(iso));
  return <section className="automation-panel">
    <div className="automation-intro">
      <div className="panel-kicker"><Radio size={14} /> SCHEDULER / IST</div>
      <h2>Today’s activity plan</h2>
      <p>The background worker chooses fresh, randomized windows each day. It keeps running after you close this dashboard.</p>
      <div className="automation-metrics"><div><span>{todayCommits}</span><small>commits today</small></div><div><span>{upcoming.length}</span><small>still queued</small></div><div><span>{scheduler?.enabled ? "Live" : "Stopped"}</span><small>automation status</small></div></div>
      <div className="scheduler-actions"><button className="stop-today" onClick={onStop} disabled={!scheduler?.enabled || stopping}><CircleStop size={17} />{stopping ? "Updating…" : "Stop for Today"}</button><button className="start-today" onClick={onStart} disabled={scheduler?.enabled || stopping}><CirclePlay size={17} />Start Again</button></div>
      <span className="stop-note">This immediately cancels every remaining window for today.</span>
    </div>
    <div className="schedule-stream"><div className="stream-header"><span><CalendarClock size={16} /> Upcoming commits</span><span className={scheduler?.enabled ? "live-indicator" : "paused-indicator"}>{scheduler?.enabled ? "Running" : "Paused"}</span></div>{upcoming.length ? <ol>{upcoming.map((item, index) => <li key={item.id}><span className="timeline-dot">{String(index + 1).padStart(2, "0")}</span><div><strong>{formatTime(item.at)}</strong><small>Randomized IST window</small></div><ShieldCheck size={16} /></li>)}</ol> : <div className="empty-schedule">{scheduler?.enabled ? "No more commit windows remain today." : "Automation has been stopped for today."}</div>}</div>
  </section>;
}
