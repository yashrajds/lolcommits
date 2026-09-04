import { NextResponse } from "next/server";
import { readTodayActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = readTodayActivity();

  return NextResponse.json({
    success: true,
    today: stats.date,
    todayCount: stats.count,
    history: stats.history.slice(-20),
  });
}
