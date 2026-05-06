import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  // Create a Supabase client that reads/writes cookies on every request
  // so expired auth tokens are refreshed server-side.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refresh the session — rotates expired JWTs and clears stale sessions.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Require a Bearer token on all API routes (except public catalog)
  if (
    req.nextUrl.pathname.startsWith("/api/") &&
    req.nextUrl.pathname !== "/api/catalog"
  ) {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // Server-side redirect: unauthenticated users → home (which shows login)
  const isPublicPath =
    req.nextUrl.pathname === "/" ||
    req.nextUrl.pathname === "/login" ||
    req.nextUrl.pathname === "/privacy" ||
    req.nextUrl.pathname === "/terms" ||
    req.nextUrl.pathname.startsWith("/auth/");

  if (!user && !isPublicPath && !req.nextUrl.pathname.startsWith("/api/")) {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  // Redirect /login → / (login lives on the home page now)
  if (req.nextUrl.pathname === "/login") {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets so auth session
     * refresh runs on every navigation.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
