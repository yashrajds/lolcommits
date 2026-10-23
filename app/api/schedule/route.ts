import { NextResponse } from "next/server";
import { getSchedulerState, startForToday, stopForToday } from "@/lib/scheduler";
import { readTodayActivity, recordActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  const scheduler = getSchedulerState();
  const activity = readTodayActivity();
  return NextResponse.json({ success: true, timezone: "Asia/Kolkata", todayCount: activity.count, scheduler });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = body.action;
  
  if (action === "start") {
    // Start scheduler and execute commits for today
    const state = startForToday();
    // Execute all upcoming commits - record activity
    const commitsToExecute = state.schedule.filter((s) => s.status === "upcoming");
    if (commitsToExecute.length > 0) {
      // Record each commit as activity
      const activityEntries = commitsToExecute.map((commit) => ({
        repo: `gitpulse-autocommit-${commit.id}`,
        sha: `commit-${commit.id}`,
        time: commit.at
      }));
      const updatedActivity = recordActivity(activityEntries);
      return NextResponse.json({ 
        success: true, 
        timezone: "Asia/Kolkata", 
        todayCount: updatedActivity.count,
        scheduled: commitsToExecute.length,
        recorded: updatedActivity.count,
        details: commitsToExecute.map((c) => ({
          id: c.id,
          time: c.at,
          status: "recorded"
        }))
      });
    }
    return NextResponse.json({ success: true, timezone: "Asia/Kolkata", todayCount: activity.count, scheduled: 0, recorded: 0 });
  }
  
  if (action === "stop") {
    stopForToday();
    return NextResponse.json({ success: true, message: "Scheduler stopped for today" });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
