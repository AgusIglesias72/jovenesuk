import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection at the edge.
 * Cheaper than checking the session inside every (admin)/ layout.
 *
 * Better-Auth cookies live at `juk.session_token`.
 */
// Rutas de gestión (back-office) que viven en el subdominio del portal.
const PORTAL_PREFIXES = [
  "/dashboard",
  "/alumnos",
  "/viajes",
  "/colegios",
  "/group-leaders",
  "/usuarios",
  "/pagos",
  "/configuracion",
  "/familias",
  "/login",
  "/reset-password",
];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const host = request.headers.get("host") ?? "";
  const sessionToken = request.cookies.get("juk.session_token");

  // Sitio público de jovenesenuk.com (sin auth): landing, páginas
  // institucionales y notas de contenido (SEO).
  const PUBLIC_PAGES = ["/", "/quienes-somos", "/salidas", "/programas", "/contacto", "/consulta"];
  const isLandingPath = PUBLIC_PAGES.includes(path) || path.startsWith("/notas");

  // ── Separación por subdominio ──────────────────────────────────────────
  // Gestión en portal.<dominio>; marketing en la raíz. Gateado por env vars:
  // sin configurar (dev / deploy de un solo dominio) el comportamiento es el
  // de siempre. Se activa al setear NEXT_PUBLIC_PORTAL_URL / NEXT_PUBLIC_SITE_URL
  // y apuntar ambos dominios al mismo deployment.
  const isPortalHost = host.startsWith("portal.");
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
  const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL;

  if (isPortalHost) {
    // En el portal, la raíz es el back-office (no la landing pública).
    if (path === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // El contenido de marketing no va en el portal → al sitio público.
    if (isLandingPath && SITE_URL) {
      return NextResponse.redirect(new URL(path + search, SITE_URL));
    }
  } else if (!isLocalhost && PORTAL_URL) {
    // En el dominio público, las rutas de gestión van al subdominio del portal.
    if (PORTAL_PREFIXES.some((p) => path.startsWith(p))) {
      return NextResponse.redirect(new URL(path + search, PORTAL_URL));
    }
  }

  const isAuthPath = path.startsWith("/login") || path.startsWith("/reset-password");
  const isApiAuthPath = path.startsWith("/api/auth");

  // El registro público de Better-Auth queda CERRADO: las cuentas se crean
  // solo server-side (seed, /usuarios, cuentas de familia). auth.api.* interno
  // no pasa por este proxy, así que esto no afecta esos flujos.
  if (path.startsWith("/api/auth/sign-up")) {
    return NextResponse.json({ error: "Registro deshabilitado" }, { status: 404 });
  }
  const isWebhookPath = path.startsWith("/api/webhooks");
  // Design Lab: concepts estáticos de UI (sin datos reales ni DB). Público para
  // poder iterar el diseño sin login. NO exponer en prod tal cual si se deploya.
  const isDesignPath = path.startsWith("/design");
  const isPublicAsset =
    path.startsWith("/_next") ||
    path.startsWith("/landing/") ||
    path.startsWith("/icon") ||
    path === "/favicon.ico" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path === "/manifest.webmanifest" ||
    path === "/manifest.json" ||
    path === "/globe-loader.html";

  // Always allow these
  if (isLandingPath || isApiAuthPath || isWebhookPath || isPublicAsset || isDesignPath) {
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
