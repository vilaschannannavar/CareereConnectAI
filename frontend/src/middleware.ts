import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js Edge Middleware for server-side route protection.
 * Prevents unauthenticated flashes and ensures logged-in users reach the dashboard.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("careerconnect_session");
  const isAuthenticated = !!sessionCookie?.value;

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isProtectedRoute =
    pathname.startsWith("/overview") ||
    pathname.startsWith("/connections") ||
    pathname.startsWith("/shortlist") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/tracker") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/openings") ||
    pathname.startsWith("/onboarding");

  // 1. Unauthenticated users hitting protected routes get redirected to login with next param
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated users hitting login/register get redirected to overview dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, og-image.png
     * - api routes (FastAPI proxy handles API authentication)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|og-image.png|api/).*)",
  ],
};
