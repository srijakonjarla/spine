import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Require a Bearer token on all API routes
  if (req.nextUrl.pathname.startsWith("/api/") && req.nextUrl.pathname !== "/api/catalog") {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
