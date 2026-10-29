#!/usr/bin/env node
/**
 * GitPulse Background Scheduler Daemon
 * 
 * Keeps the scheduler state alive and manages daily pulse commits.
 * In Vercel, cron triggers the API routes directly (/api/cron, /api/schedule).
 * On local development, run this daemon to manage scheduler state.
 */

import { createReadStream, writeFile, mkdir } from "fs";
import { join, existSync } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

const IST = "Asia/Kolkata";

function istDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(now);
}

const SCHEDULER_FILE = join(__dirname, "stats", "scheduler-state.json");
const DATA_FILE = join(__dirname, "stats", "daily-pulse.json");

// Ensure stats directory exists
if (!existSync(join(__dirname, "stats"))) {
  mkdir({ recursive: true, path: join(__dirname, "stats") });
}

// Simple scheduler state management
let memoryScheduler = null;

function getSchedulerState() {
  const today = istDate();
  if (memoryScheduler?.date === today) return memoryScheduler;
  
  try {
    const raw = createReadStream(SCHEDULER_FILE);
    // Read and parse would happen here in production
    // For now, return default state
  } catch {
    // File doesn't exist yet
  }
  
  const state = { date: today, enabled: true, schedule: [], updatedAt: new Date().toISOString() };
  memoryScheduler = state;
  return state;
}

function saveSchedulerState(state) {
  memoryScheduler = state;
  try {
    writeFile(SCHEDULER_FILE, JSON.stringify(state, null, 2), (err) => {
      if (err) console.error("Failed to save scheduler state:", err);
    });
  } catch (e) {
    console.error("Failed to save scheduler state:", e);
  }
}

function randomSchedule(date) {
  const startHour = Number(process.env.SCHEDULE_START_HOUR_IST || 9);
  const endHour = Number(process.env.SCHEDULE_END_HOUR_IST || 21);
  const count = Math.floor(Math.random() * 13) + 1; // 1-13 commits
  const schedule = [];
  const startMinute = startHour * 60;
  const endMinute = endHour * 60;
  
  for (let i = 0; i < count; i++) {
    const randomMinute = startMinute + Math.floor(Math.random() * (endMinute - startMinute));
    const hours = String(Math.floor(randomMinute / 60)).padStart(2, "0");
    const mins = String(randomMinute % 60).padStart(2, "0");
    schedule.push({
      id: `${date}-${i + 1}`,
      at: `${date}T${hours}:${mins}:00+05:30`,
      status: "upcoming"
    });
  }
  return schedule;
}

export function startForToday() {
  const today = istDate();
  const state = getSchedulerState();
  const currentMinutes = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date()).replace(":", ""));
  
  const schedule = randomSchedule(today).map((item) => {
    const [hours, minutes] = item.at.slice(11, 16).split(":").map(Number);
    const timeValue = hours * 100 + minutes;
    const skipped = timeValue <= currentMinutes;
    return { ...item, status: skipped ? "skipped" : "upcoming" };
  });
  
  const next = { ...state, date: today, enabled: true, stoppedDate: undefined, schedule };
  saveSchedulerState(next);
  console.log(`GitPulse scheduler started for ${today}: ${schedule.length} commits scheduled`);
  return next;
}

// Main - start scheduler and keep alive
console.log("GitPulse scheduler daemon starting...");
const today = istDate();
console.log(`IST Time: ${today}`);

try {
  const state = startForToday();
  console.log(`Scheduler enabled: ${state.enabled}`);
  console.log(`Commits scheduled: ${state.schedule.length}`);
  
  // Keep the process alive - pulse daemon waits for cron triggers or manual intervention
  // In production (Vercel), the cron triggers the API routes directly
  // In local dev, we keep the process alive
  console.log("GitPulse daemon running. Press Ctrl+C to stop.");
  
  // Loop every minute to check status
  const intervalId = setInterval(() => {
    const s = getSchedulerState();
    const upcoming = s.schedule.filter(x => x.status === "upcoming").length;
    process.stdout.write(`\r[${new Date().toLocaleTimeString()}] GitPulse | Enabled: ${s.enabled} | Upcoming: ${upcoming} |`);
  }, 60000);
  
  // Don't exit
  await new Promise(() => {});
  
} catch (error) {
  console.error("GitPulse scheduler error:", error);
  process.exit(1);
}