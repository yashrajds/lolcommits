import fs from "fs";
import path from "path";

export type ActivityEntry = { repo: string; sha?: string; time: string };
type Activity = { date: string; count: number; history: ActivityEntry[] };

const IST = "Asia/Kolkata";
const dataPath = () => path.join(process.cwd(), "stats", "daily-pulse.json");
let memoryActivity: Activity | null = null;

export function istDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(now);
}

export function readTodayActivity(): Activity {
  const today = istDate();
  if (memoryActivity?.date === today) return memoryActivity;
  try {
    const saved = JSON.parse(fs.readFileSync(dataPath(), "utf8")) as Activity;
    if (saved.date === today) return (memoryActivity = { ...saved, history: saved.history || [] });
  } catch {}
  return (memoryActivity = { date: today, count: 0, history: [] });
}

export function recordActivity(entries: ActivityEntry[]) {
  if (!entries.length) return readTodayActivity();
  const current = readTodayActivity();
  const next = { ...current, count: current.count + entries.length, history: [...current.history, ...entries].slice(-100) };
  memoryActivity = next;
  try {
    fs.mkdirSync(path.dirname(dataPath()), { recursive: true });
    fs.writeFileSync(dataPath(), JSON.stringify(next, null, 2));
  } catch {
    // Vercel functions use a read-only deployment filesystem. Keep the
    // request alive and retain the latest state for this warm worker instead.
  }
  return next;
}
