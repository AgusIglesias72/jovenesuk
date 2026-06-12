import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection at the edge.
 * Cheaper than checking the session inside every (admin)/ layout.
 *
 * Better-Auth cookies live at `juk.session_token`.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const sessionToken = request.cookies.get("juk.session_token");

  const isAuthPath = path.startsWith("/login") || path.startsWith("/reset-password");
  const isApiAuthPath = path.startsWith("/api/auth");
  const isWebhookPath = path.startsWith("/api/webhooks");
  // Design Lab: concepts estáticos de UI (sin datos reales ni DB). Público para
  // poder iterar el diseño sin login. NO exponer en prod tal cual si se deploya.
  const isDesignPath = path.startsWith("/design");
  const isPublicAsset =
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path === "/manifest.webmanifest" ||
    path === "/manifest.json" ||
    path === "/globe-loader.html";

  // Always allow these
  if (isApiAuthPath || isWebhookPath || isPublicAsset || isDesignPath) {
    return NextResponse.next();
  }

  // Not logged in + trying to access protected route → redirect to login
  if (!sessionToken && !isAuthPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", path);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in + on login page → redirect to dashboard
  if (sessionToken && isAuthPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes that should bypass (auth, webhooks)
     * - _next static files
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
