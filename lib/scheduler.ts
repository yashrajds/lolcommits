import fs from "fs";
import path from "path";
import { istDate } from "@/lib/activity";

export type ScheduledCommit = { id: string; at: string; status: "upcoming" | "complete" | "skipped" };
export type SchedulerState = { date: string; enabled: boolean; stoppedDate?: string; schedule: ScheduledCommit[]; updatedAt: string };

const FILE = () => path.join(process.cwd(), "stats", "scheduler-state.json");
const count = () => Math.max(1, Math.min(12, Number(process.env.DAILY_SCHEDULE_COUNT || 3)));
const windowStart = () => Number(process.env.SCHEDULE_START_HOUR_IST || 9);
const windowEnd = () => Number(process.env.SCHEDULE_END_HOUR_IST || 21);

function randomSchedule(date: string): ScheduledCommit[] {
  const start = windowStart() * 60;
  const end = windowEnd() * 60;
  const selected = new Set<number>();
  while (selected.size < Math.min(count(), end - start)) selected.add(start + Math.floor(Math.random() * (end - start)));
  return [...selected].sort((a, b) => a - b).map((minute, index) => {
    const hours = String(Math.floor(minute / 60)).padStart(2, "0");
    const mins = String(minute % 60).padStart(2, "0");
    return { id: `${date}-${index + 1}`, at: `${date}T${hours}:${mins}:00+05:30`, status: "upcoming" };
  });
}

export function getSchedulerState(): SchedulerState {
  const today = istDate();
  try {
    const saved = JSON.parse(fs.readFileSync(FILE(), "utf8")) as SchedulerState;
    if (saved.date === today) return saved;
  } catch {}
  const state: SchedulerState = { date: today, enabled: true, schedule: randomSchedule(today), updatedAt: new Date().toISOString() };
  saveSchedulerState(state);
  return state;
}

export function saveSchedulerState(state: SchedulerState) {
  fs.mkdirSync(path.dirname(FILE()), { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2));
}

export function stopForToday() {
  const state = getSchedulerState();
  const next = { ...state, enabled: false, stoppedDate: state.date, schedule: state.schedule.map((item) => item.status === "upcoming" ? { ...item, status: "skipped" as const } : item) };
  saveSchedulerState(next);
  return next;
}
