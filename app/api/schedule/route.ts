import { NextResponse } from "next/server";
import { getSchedulerState, startForToday, stopForToday } from "@/lib/scheduler";
import { readTodayActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  const scheduler = getSchedulerState();
  const activity = readTodayActivity();
  return NextResponse.json({ success: true, timezone: "Asia/Kolkata", todayCount: activity.count, scheduler });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ success: true, scheduler: body.action === "start" ? startForToday() : stopForToday() });
}
