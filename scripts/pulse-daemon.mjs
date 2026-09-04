#!/usr/bin/env node

/** Background IST scheduler, independent of the browser. */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const stateFile = path.join(root, "stats", "scheduler-state.json");
const tz = "Asia/Kolkata";

function parts(now = new Date()) {
  const values = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).reduce((all, part) => ({ ...all, [part.type]: part.value }), {});
  return { date: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
}
function readState() { try { return JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { return null; } }
function writeState(state) { fs.writeFileSync(stateFile, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)); }
function minuteOf(iso) { const match = iso.match(/T(\d{2}):(\d{2})/); return match ? Number(match[1]) * 60 + Number(match[2]) : -1; }
function runPulse() { return new Promise((resolve) => { const child = spawn("node", [path.join(directory, "run-pulse.mjs")], { cwd: root, stdio: "inherit" }); child.on("close", (code) => resolve(code === 0)); }); }
function createDailyState(date) {
  const count = Math.max(1, Math.min(12, Number(process.env.DAILY_SCHEDULE_COUNT || 3)));
  const start = Number(process.env.SCHEDULE_START_HOUR_IST || 9) * 60;
  const end = Number(process.env.SCHEDULE_END_HOUR_IST || 21) * 60;
  const chosen = new Set(); while (chosen.size < Math.min(count, end - start)) chosen.add(start + Math.floor(Math.random() * (end - start)));
  const schedule = [...chosen].sort((a, b) => a - b).map((minute, index) => ({ id: `${date}-${index + 1}`, at: `${date}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00+05:30`, status: "upcoming" }));
  const state = { date, enabled: true, schedule, updatedAt: new Date().toISOString() }; writeState(state); return state;
}

async function tick() {
  const now = parts(); let state = readState();
  if (!state || state.date !== now.date) state = createDailyState(now.date);
  if (!state.enabled) return;
  const due = state.schedule.find((item) => item.status === "upcoming" && minuteOf(item.at) <= now.minutes);
  if (!due) return;
  console.log(`[${new Date().toLocaleString("en-IN", { timeZone: tz })}] Running ${due.id}`);
  const success = await runPulse(); const fresh = readState();
  if (!fresh || !fresh.enabled) return;
  fresh.schedule = fresh.schedule.map((item) => item.id === due.id ? { ...item, status: success ? "complete" : "upcoming" } : item);
  writeState(fresh);
}

console.log("GitPulse IST background scheduler started. It runs independently of the dashboard.");
tick(); setInterval(tick, 30_000);
