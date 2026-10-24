import fs from "fs";
import path from "path";
import { istDate } from "@/lib/activity";

export type ScheduledCommit = { id: string; at: string; status: "upcoming" | "complete" | "skipped" };
export type SchedulerState = { date: string; enabled: boolean; stoppedDate?: string; schedule: ScheduledCommit[]; updatedAt: string };

const FILE = () => path.join(process.cwd(), "stats", "scheduler-state.json");
let memoryScheduler: SchedulerState | null = null;
const count = () => Math.floor(Math.random() * 13) + 1; // Random 1-13 commits per day
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
  if (memoryScheduler?.date === today) return memoryScheduler;
  try {
    const saved = JSON.parse(fs.readFileSync(FILE(), "utf8")) as SchedulerState;
    if (saved.date === today) return (memoryScheduler = saved);
  } catch {}
  const state: SchedulerState = { date: today, enabled: true, schedule: randomSchedule(today), updatedAt: new Date().toISOString() };
  saveSchedulerState(state);
  return state;
}

export function saveSchedulerState(state: SchedulerState) {
  memoryScheduler = { ...state, updatedAt: new Date().toISOString() };
  try {
    fs.mkdirSync(path.dirname(FILE()), { recursive: true });
    fs.writeFileSync(FILE(), JSON.stringify(memoryScheduler, null, 2));
  } catch {
    // A hosted serverless deployment cannot write inside /var/task. The
    // in-memory state keeps controls responsive until durable storage is set.
  }
}

export function stopForToday() {
  const state = getSchedulerState();
  const next = { ...state, enabled: false, stoppedDate: state.date, schedule: state.schedule.map((item) => item.status === "upcoming" ? { ...item, status: "skipped" as const } : item) };
  saveSchedulerState(next);
  return next;
}

export function startForToday() {
  const today = istDate();
  const state = getSchedulerState();
  const currentMinutes = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).replace(":", ""));
  const schedule = randomSchedule(today).map((item) => {
    const [hours, minutes] = item.at.slice(11, 16).split(":").map(Number);
    return hours * 100 + minutes <= currentMinutes ? { ...item, status: "skipped" as const } : item;
  });
  const next: SchedulerState = { ...state, date: today, enabled: true, stoppedDate: undefined, schedule };
  saveSchedulerState(next);
  return next;
}
