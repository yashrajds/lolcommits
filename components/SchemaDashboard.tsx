"use client";

import React from "react";
import { Activity, CirclePlay, CircleStop, Database, GitBranch, Play, Radio, Rows3, TableProperties } from "lucide-react";
import type { SchedulerState } from "@/lib/scheduler";

type Props = {
  scheduler: SchedulerState | null;
  todayCommits: number;
  selectedCount: number;
  totalRepos: number;
  onStop: () => void;
  onStart: () => void;
  onPulse: () => void;
  onOpenConsole: () => void;
  onOpenRepositories: () => void;
  stopping: boolean;
  isCommitting: boolean;
};

const time = (value: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));

export function SchemaDashboard({ scheduler, todayCommits, selectedCount, totalRepos, onStop, onStart, onPulse, onOpenConsole, onOpenRepositories, stopping, isCommitting }: Props) {
  const schedule = scheduler?.schedule.filter((item) => item.status === "upcoming") || [];
  return <section className="schema-canvas">
    <div className="canvas-toolbar">
      <div><span className="canvas-caption">AUTOMATION DIAGRAM</span><h1>GitPulse <em>Control Plane</em></h1></div>
      <div className="toolbar-actions"><span className={scheduler?.enabled ? "state-chip online" : "state-chip offline"}><Radio size={13} /> {scheduler?.enabled ? "Scheduler online" : "Scheduler paused"}</span><button className="schema-button" onClick={onOpenConsole}><Rows3 size={15} /> Console</button><button className="schema-button primary" onClick={onPulse} disabled={isCommitting || selectedCount === 0}><Play size={15} /> {isCommitting ? "Running…" : "Run pulse"}</button></div>
    </div>

    <div className="schema-board">
      <svg className="relation-lines" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true"><path d="M255 145H406V280H521"/><path d="M250 455H395V370H521"/><path d="M662 280H800V145"/><path d="M660 370H802V470"/><circle cx="406" cy="280" r="3"/><circle cx="395" cy="370" r="3"/><circle cx="800" cy="145" r="3"/><circle cx="802" cy="470" r="3"/></svg>

      <article className="schema-node node-automation"><NodeHead icon={<Activity size={15} />} title="automation.schedule" tone="mint" /><Row name="timezone" value="Asia/Kolkata" type="IST" /><Row name="state" value={scheduler?.enabled ? "active" : "stopped"} type="ENUM" /><Row name="dailyWindows" value={String(scheduler?.schedule.length || 0)} type="INT" /><NodeFoot>Background worker</NodeFoot></article>
      <article className="schema-node node-activity"><NodeHead icon={<GitBranch size={15} />} title="activity.today" tone="cyan" /><Row name="commitCount" value={String(todayCommits)} type="INT" /><Row name="targetRepos" value={`${selectedCount}/${totalRepos}`} type="REF" /><Row name="lastStatus" value={scheduler?.enabled ? "ready" : "on hold"} type="TEXT" /><NodeFoot>Live operating data</NodeFoot></article>
      <article className="schema-node node-queue"><NodeHead icon={<TableProperties size={15} />} title="queue.upcoming" tone="violet" />{schedule.length ? schedule.slice(0, 4).map((item, index) => <Row key={item.id} name={`window_${String(index + 1).padStart(2, "0")}`} value={`${time(item.at)} IST`} type="QUEUED" />) : <div className="empty-node">No future windows today</div>}<NodeFoot>{schedule.length} pending task{schedule.length === 1 ? "" : "s"}</NodeFoot></article>
      <article className="schema-node node-targets"><NodeHead icon={<Database size={15} />} title="repository.targets" tone="orange" /><Row name="selected" value={String(selectedCount)} type="INT" /><Row name="available" value={String(totalRepos)} type="INT" /><Row name="selection" value="managed" type="MODE" /><button className="node-link" onClick={onOpenRepositories}>Open repository map →</button></article>

      <section className="schema-control"><div><span className="canvas-caption">DAILY CONTROL</span><strong>{scheduler?.enabled ? "Automation is operating" : "Automation is paused"}</strong><p>{scheduler?.enabled ? "Scheduled commit windows remain active in the background." : "Restart to generate new future windows for today."}</p></div><div className="control-actions"><button className="schema-button danger" onClick={onStop} disabled={!scheduler?.enabled || stopping}><CircleStop size={16} /> Stop for today</button><button className="schema-button success" onClick={onStart} disabled={scheduler?.enabled || stopping}><CirclePlay size={16} /> Start again</button></div></section>
    </div>
  </section>;
}

function NodeHead({ icon, title, tone }: { icon: React.ReactNode; title: string; tone: string }) { return <header className={`node-head ${tone}`}><span>{icon}</span><strong>{title}</strong><small>•••</small></header>; }
function Row({ name, value, type }: { name: string; value: string; type: string }) { return <div className="node-row"><span>{name}</span><b>{value}</b><i>{type}</i></div>; }
function NodeFoot({ children }: { children: React.ReactNode }) { return <footer className="node-foot">{children}</footer>; }
