import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { esPaginaPublica, esRutaAuth, esRutaPortal, esRutaStandalone } from "@/lib/routes";

/**
 * Route protection at the edge.
 * Cheaper than checking the session inside every (admin)/ layout.
 *
 * Better-Auth cookies live at `juk.session_token`.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const host = request.headers.get("host") ?? "";
  // En producción Better-Auth usa cookies seguras con prefijo __Secure-
  // (advanced.useSecureCookies). Hay que mirar ambos nombres o el proxy nunca
  // ve la sesión en prod y rebota al login en loop.
  const sessionToken =
    request.cookies.get("juk.session_token") ??
    request.cookies.get("__Secure-juk.session_token");

  const isLandingPath = esPaginaPublica(path);

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
    if (esRutaPortal(path) || esRutaAuth(path)) {
      return NextResponse.redirect(new URL(path + search, PORTAL_URL));
    }
  }

  const isAuthPath = esRutaAuth(path);
  const isApiAuthPath = path.startsWith("/api/auth");

  // El registro público de Better-Auth queda CERRADO: las cuentas se crean
  // solo server-side (seed, /usuarios, cuentas de familia). auth.api.* interno
  // no pasa por este proxy, así que esto no afecta esos flujos.
  if (path.startsWith("/api/auth/sign-up")) {
    return NextResponse.json({ error: "Registro deshabilitado" }, { status: 404 });
  }
  const isWebhookPath = path.startsWith("/api/webhooks");
  // Los assets con extensión (/landing/*, /icons/*, /fonts/*, sw.js,
  // manifest.webmanifest, robots.txt, sitemap.xml, globe-loader.html) no
  // llegan acá: los excluye el matcher. Solo quedan las rutas sin extensión
  // que igual deben servirse sin sesión.
  const isPublicAsset = path.startsWith("/_next") || esRutaStandalone(path);

  if (isLandingPath || isApiAuthPath || isWebhookPath || isPublicAsset) {
    return NextResponse.next();
  }

  if (!sessionToken && !isAuthPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", path);
    return NextResponse.redirect(loginUrl);
  }

  // Al usuario ya logueado que entra a /login lo redirige la propia página,
  // que valida la sesión real. Acá solo se sabe si la cookie existe: con una
  // cookie vencida o de una cuenta desactivada, rebotar a /dashboard armaba el
  // loop /login → /dashboard → /login.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Todo salvo _next/static, _next/image y los assets estáticos (por
     * extensión). `/api/*` queda SIEMPRE dentro aunque termine en extensión:
     * /api/uploads/<key>.jpg|pdf sirve documentación sensible y tiene que
     * pasar por el chequeo de sesión (el route handler además exige admin).
     */
    "/((?!_next/static|_next/image|(?!api/).*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|ttf|otf|woff2?|js|css|txt|xml|webmanifest|html)$).*)",
  ],
};
