import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/api/access", "/unlock", "/icon.png", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  if (PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) return NextResponse.next();
  const configured = process.env.SITE_PASSWORD;
  if (!configured) {
    // Fail closed in production so a missing env var never leaves the site public.
    if (process.env.NODE_ENV === "production") {
      if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Site lock not configured." }, { status: 503 });
      return NextResponse.rewrite(new URL("/unlock", request.url));
    }
    return NextResponse.next();
  }
  if (request.cookies.get("gitpulse_access")?.value === configured) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Locked" }, { status: 401 });
  return NextResponse.rewrite(new URL("/unlock", request.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
