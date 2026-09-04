import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/api/access", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  if (PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) return NextResponse.next();
  const configured = process.env.SITE_PASSWORD;
  if (!configured || request.cookies.get("gitpulse_access")?.value === configured) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Locked" }, { status: 401 });
  return NextResponse.rewrite(new URL("/unlock", request.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
