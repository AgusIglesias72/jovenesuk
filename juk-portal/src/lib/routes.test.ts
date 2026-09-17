import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  HOME_BY_ROLE,
  PORTAL_PREFIXES,
  ROBOTS_DISALLOW,
  esPaginaPublica,
  esRutaAuth,
  esRutaPortal,
  esRutaStandalone,
} from "./routes";

describe("esRutaPortal", () => {
  it("acepta el prefijo exacto y sus subrutas", () => {
    expect(esRutaPortal("/alumnos")).toBe(true);
    expect(esRutaPortal("/alumnos/45102338")).toBe(true);
    expect(esRutaPortal("/viajes/UK-2026-JUL-LONDON")).toBe(true);
    expect(esRutaPortal("/familias/45102338/pagos")).toBe(true);
    expect(esRutaPortal("/consultas")).toBe(true);
    expect(esRutaPortal("/prospectos")).toBe(true);
  });

  it("no matchea por prefijo de string", () => {
    expect(esRutaPortal("/alumnos-x")).toBe(false);
    expect(esRutaPortal("/dashboardx")).toBe(false);
  });

  it("la bandeja /inscripciones pide sesión y el formulario público /inscripcion no", () => {
    // Los dos nombres se parecen y el error caro sería que el link de la
    // invitación (/inscripcion?t=…) terminara rebotando al login.
    expect(esRutaPortal("/inscripciones")).toBe(true);
    expect(esRutaPortal("/inscripciones/INS-000123")).toBe(true);
    expect(esRutaPortal("/inscripcion")).toBe(false);
    expect(esRutaStandalone("/inscripcion")).toBe(true);
  });

  it("deja afuera la landing, auth y api", () => {
    expect(esRutaPortal("/")).toBe(false);
    expect(esRutaPortal("/login")).toBe(false);
    expect(esRutaPortal("/api/auth/sign-in")).toBe(false);
  });
});

describe("esRutaAuth", () => {
  it("cubre login y reset-password con subrutas", () => {
    expect(esRutaAuth("/login")).toBe(true);
    expect(esRutaAuth("/login/")).toBe(true);
    expect(esRutaAuth("/reset-password")).toBe(true);
    expect(esRutaAuth("/reset-password/confirm")).toBe(true);
  });

  it("rechaza parecidos y rutas del portal", () => {
    expect(esRutaAuth("/loginx")).toBe(false);
    expect(esRutaAuth("/dashboard")).toBe(false);
  });
});

describe("esPaginaPublica", () => {
  it("acepta las páginas de marketing y las notas", () => {
    expect(esPaginaPublica("/")).toBe(true);
    expect(esPaginaPublica("/salidas")).toBe(true);
    expect(esPaginaPublica("/consulta")).toBe(true);
    expect(esPaginaPublica("/notas")).toBe(true);
    expect(esPaginaPublica("/notas/becas-2026")).toBe(true);
  });

  it("rechaza subrutas de páginas exactas y parecidos", () => {
    expect(esPaginaPublica("/salidas/algo")).toBe(false);
    expect(esPaginaPublica("/notasx")).toBe(false);
    expect(esPaginaPublica("/privacidadx")).toBe(false);
    expect(esPaginaPublica("/dashboard")).toBe(false);
    expect(esPaginaPublica("/consultas")).toBe(false);
  });

  it("la política de privacidad es pública, y también cada versión publicada", () => {
    expect(esPaginaPublica("/privacidad")).toBe(true);
    expect(esPaginaPublica("/privacidad/2026-09-16")).toBe(true);
  });

  it("el querystring no la saca de lo público (el proxy pasa solo el pathname)", () => {
    // `proxy.ts` llama con `request.nextUrl.pathname`: el `?…` viaja aparte en
    // `nextUrl.search`. Si alguien pasara la URL entera, `/privacidad?v=…` no
    // matchearía y la política terminaría rebotando al login.
    const url = new URL("https://jovenesenuk.com/privacidad?v=2026-09-16&ref=footer");
    expect(url.pathname).toBe("/privacidad");
    expect(esPaginaPublica(url.pathname)).toBe(true);
    expect(esPaginaPublica(url.pathname + url.search)).toBe(false);
  });
});

describe("esRutaStandalone", () => {
  it("solo las rutas utilitarias exactas", () => {
    expect(esRutaStandalone("/baja")).toBe(true);
    expect(esRutaStandalone("/offline")).toBe(true);
    expect(esRutaStandalone("/baja/otra")).toBe(false);
    expect(esRutaStandalone("/")).toBe(false);
  });

  it("el Application Form se sirve sin sesión (si no, el link del mail rebota al login)", () => {
    expect(esRutaStandalone("/inscripcion")).toBe(true);
    expect(esRutaStandalone("/inscripcionx")).toBe(false);
    expect(esRutaStandalone("/inscripcion/algo")).toBe(false);
    // No es marketing: no entra por `esPaginaPublica`, entra por acá.
    expect(esPaginaPublica("/inscripcion")).toBe(false);
  });

  it("el token del link no saca a /inscripcion de lo público", () => {
    // El proxy llama con `request.nextUrl.pathname`: el `?t=…` viaja aparte.
    // Si alguien pasara la URL entera, el link de la invitación terminaría
    // redirigido al login con el token pegado en `returnTo`.
    const url = new URL("https://jovenesenuk.com/inscripcion?t=abc123&v=b");
    expect(url.pathname).toBe("/inscripcion");
    expect(esRutaStandalone(url.pathname)).toBe(true);
    expect(esRutaStandalone(url.pathname + url.search)).toBe(false);
  });
});

describe("ROBOTS_DISALLOW", () => {
  it("incluye todo el portal, auth y api, sin el design lab", () => {
    for (const p of PORTAL_PREFIXES) expect(ROBOTS_DISALLOW).toContain(p);
    expect(ROBOTS_DISALLOW).toContain("/login");
    expect(ROBOTS_DISALLOW).toContain("/reset-password");
    expect(ROBOTS_DISALLOW).toContain("/api/");
    expect(ROBOTS_DISALLOW).not.toContain("/design");
  });
});

describe("HOME_BY_ROLE", () => {
  it("familia va a su portal y el resto al dashboard", () => {
    expect(HOME_BY_ROLE.familia).toBe("/familias");
    expect(HOME_BY_ROLE.admin_juk).toBe("/dashboard");
    expect(HOME_BY_ROLE.super_admin).toBe("/dashboard");
    expect(HOME_BY_ROLE.representante).toBe("/dashboard");
  });
});

describe("PORTAL_PREFIXES vs src/app/(admin)", () => {
  const NO_REGISTRADAS = new Set<string>();

  it("cada segmento de (admin) está registrado (si agregás un módulo, sumalo a routes.ts)", () => {
    const adminDir = path.resolve(__dirname, "../app/(admin)");
    const segmentos = readdirSync(adminDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !NO_REGISTRADAS.has(d.name))
      .map((d) => `/${d.name}`);

    expect(segmentos.length).toBeGreaterThan(0);
    for (const s of segmentos) expect(PORTAL_PREFIXES).toContain(s);
  });
});
