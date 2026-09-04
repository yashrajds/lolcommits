import { NextResponse } from "next/server";
import { getSchedulerState, stopForToday } from "@/lib/scheduler";
import { readTodayActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  const scheduler = getSchedulerState();
  const activity = readTodayActivity();
  return NextResponse.json({ success: true, timezone: "Asia/Kolkata", todayCount: activity.count, scheduler });
}

export async function POST() {
  return NextResponse.json({ success: true, scheduler: stopForToday() });
}
