import fs from "fs";
import path from "path";

export type ActivityEntry = { repo: string; sha?: string; time: string };
type Activity = { date: string; count: number; history: ActivityEntry[] };

const IST = "Asia/Kolkata";
const dataPath = () => path.join(process.cwd(), "stats", "daily-pulse.json");

export function istDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(now);
}

export function readTodayActivity(): Activity {
  const today = istDate();
  try {
    const saved = JSON.parse(fs.readFileSync(dataPath(), "utf8")) as Activity;
    if (saved.date === today) return { ...saved, history: saved.history || [] };
  } catch {}
  return { date: today, count: 0, history: [] };
}

export function recordActivity(entries: ActivityEntry[]) {
  if (!entries.length) return readTodayActivity();
  const current = readTodayActivity();
  const next = { ...current, count: current.count + entries.length, history: [...current.history, ...entries].slice(-100) };
  fs.mkdirSync(path.dirname(dataPath()), { recursive: true });
  fs.writeFileSync(dataPath(), JSON.stringify(next, null, 2));
  return next;
}
