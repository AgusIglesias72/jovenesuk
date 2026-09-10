import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { config, proxy } from "./proxy";

const ORIGIN = "http://localhost:3000";

type Opciones = { cookie?: boolean; host?: string; method?: string };

function pedir(pathConQuery: string, { cookie = false, host, method = "GET" }: Opciones = {}) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", "juk.session_token=abc");
  if (host) headers.set("host", host);
  return proxy(new NextRequest(new URL(pathConQuery, ORIGIN), { headers, method }));
}

const locationDe = (res: Response) => res.headers.get("location") ?? "";
const pasa = (res: Response) => res.headers.get("x-middleware-next") === "1";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy: sesión", () => {
  it("sin cookie en ruta protegida → /login con returnTo", () => {
    const res = pedir("/dashboard");
    expect(res.status).toBe(307);
    expect(locationDe(res)).toBe(`${ORIGIN}/login?returnTo=%2Fdashboard`);
  });

  it("sin cookie en subruta con slug → returnTo conserva el path", () => {
    const res = pedir("/viajes/UK-2026-JUL-LONDON");
    expect(locationDe(res)).toBe(`${ORIGIN}/login?returnTo=%2Fviajes%2FUK-2026-JUL-LONDON`);
  });

  it("con cookie en /login → pasa: la página valida la sesión (evita el loop con cookies vencidas)", () => {
    expect(pasa(pedir("/login", { cookie: true }))).toBe(true);
  });

  it("acepta la cookie __Secure- de producción", () => {
    const headers = new Headers({ cookie: "__Secure-juk.session_token=abc" });
    const res = proxy(new NextRequest(new URL("/alumnos", ORIGIN), { headers }));
    expect(pasa(res)).toBe(true);
  });

  it("con cookie en ruta protegida → pasa", () => {
    expect(pasa(pedir("/alumnos/45102338", { cookie: true }))).toBe(true);
  });

  it("sin cookie en /login o /reset-password → pasa", () => {
    expect(pasa(pedir("/login"))).toBe(true);
    expect(pasa(pedir("/reset-password"))).toBe(true);
  });

  it("/api/uploads exige sesión (documentos sensibles)", () => {
    const res = pedir("/api/uploads/alumnos/1/pasaporte.jpg");
    expect(res.status).toBe(307);
    expect(locationDe(res)).toContain("/login?returnTo=");
  });
});

describe("proxy: rutas siempre abiertas", () => {
  it("/api/auth/sign-up → 404 (registro cerrado)", async () => {
    const res = pedir("/api/auth/sign-up/email", { method: "POST" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Registro deshabilitado" });
  });

  it("el resto de /api/auth y los webhooks pasan sin sesión", () => {
    expect(pasa(pedir("/api/auth/sign-in/email", { method: "POST" }))).toBe(true);
    expect(pasa(pedir("/api/webhooks/resend", { method: "POST" }))).toBe(true);
  });

  it("landing pública y notas pasan sin sesión", () => {
    expect(pasa(pedir("/"))).toBe(true);
    expect(pasa(pedir("/salidas"))).toBe(true);
    expect(pasa(pedir("/notas/becas-2026"))).toBe(true);
  });

  it("/offline, /baja y /_next pasan sin sesión", () => {
    expect(pasa(pedir("/offline"))).toBe(true);
    expect(pasa(pedir("/baja?token=abc"))).toBe(true);
    expect(pasa(pedir("/_next/webpack-hmr"))).toBe(true);
  });

  it("/design ya no es público", () => {
    expect(pedir("/design/studio").status).toBe(307);
  });
});

describe("proxy: subdominio", () => {
  it("host portal.* + / → /dashboard", () => {
    const res = pedir("/", { host: "portal.jovenesenuk.com" });
    expect(res.status).toBe(307);
    expect(locationDe(res)).toBe(`${ORIGIN}/dashboard`);
  });

  it("host portal.* + landing → sitio público (con SITE_URL)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://jovenesenuk.com");
    const res = pedir("/salidas?utm=x", { host: "portal.jovenesenuk.com" });
    expect(locationDe(res)).toBe("https://jovenesenuk.com/salidas?utm=x");
  });

  it("host público + ruta de gestión o auth → portal (con PORTAL_URL)", () => {
    vi.stubEnv("NEXT_PUBLIC_PORTAL_URL", "https://portal.jovenesenuk.com");
    expect(locationDe(pedir("/consultas?p=2", { host: "jovenesenuk.com" }))).toBe(
      "https://portal.jovenesenuk.com/consultas?p=2"
    );
    expect(locationDe(pedir("/login", { host: "jovenesenuk.com" }))).toBe(
      "https://portal.jovenesenuk.com/login"
    );
  });

  it("host público + prefijo parecido NO va al portal", () => {
    vi.stubEnv("NEXT_PUBLIC_PORTAL_URL", "https://portal.jovenesenuk.com");
    const res = pedir("/alumnos-x", { host: "jovenesenuk.com" });
    expect(locationDe(res).startsWith("https://portal.jovenesenuk.com")).toBe(false);
  });

  it("localhost nunca redirige al portal aunque PORTAL_URL esté seteada", () => {
    vi.stubEnv("NEXT_PUBLIC_PORTAL_URL", "https://portal.jovenesenuk.com");
    expect(pasa(pedir("/dashboard", { cookie: true, host: "localhost:3000" }))).toBe(true);
  });
});

describe("proxy: matcher", () => {
  // Misma forma que compila Next para un matcher "/(<patrón>)".
  const matcher = config.matcher[0]!;
  const regex = new RegExp(`^/(${matcher.slice(2, -1)})[/#?]?$`);
  const corre = (p: string) => regex.test(p);

  it("tiene la forma /(…)", () => {
    expect(matcher.startsWith("/(")).toBe(true);
    expect(matcher.endsWith(")")).toBe(true);
  });

  it("assets estáticos quedan fuera del middleware", () => {
    for (const p of [
      "/landing/logo-juk.png",
      "/landing/flags/gb.png",
      "/icons/icon-192.png",
      "/fonts/montserrat-500.ttf",
      "/sw.js",
      "/manifest.webmanifest",
      "/robots.txt",
      "/sitemap.xml",
      "/globe-loader.html",
      "/icon.png",
      "/favicon.ico",
      "/_next/static/chunks/a.js",
      "/_next/image",
    ]) {
      expect(corre(p), p).toBe(false);
    }
  });

  it("páginas, rutas sin extensión y /api/* sí pasan por el middleware", () => {
    for (const p of [
      "/",
      "/dashboard",
      "/alumnos/45102338",
      "/viajes/UK-2026-JUL-LONDON",
      "/login",
      "/offline",
      "/baja",
      "/api/auth/sign-up",
      "/api/uploads/alumnos/1/pasaporte.jpg",
      "/api/uploads/colegios/x/convenio.pdf",
    ]) {
      expect(corre(p), p).toBe(true);
    }
  });
});
