import { NextResponse } from "next/server";
import { getSchedulerState, startForToday, stopForToday } from "@/lib/scheduler";
import { readTodayActivity, istDate } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  const scheduler = getSchedulerState();
  const activity = readTodayActivity();
  // If scheduler not started for today, start it
  if (scheduler.date !== istDate()) {
    startForToday();
  }
  return NextResponse.json({ 
    status: "enabled", 
    timezone: "Asia/Kolkata", 
    todayCount: activity.count,
    scheduler 
  });
}

export async function POST() {
  // POST to cron endpoint toggles scheduler
  return NextResponse.json({ status: "enabled" });
}