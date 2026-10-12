import { NextResponse } from "next/server";

// GitPulse automated heartbeat has been retired.
// This endpoint is intentionally disabled so tracker files are not recreated.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { status: "disabled", message: "GitPulse automated pulse has been retired." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { status: "disabled", message: "GitPulse automated pulse has been retired." },
    { status: 410 }
  );
}
