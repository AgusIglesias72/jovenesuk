import { describe, expect, it } from "vitest";

import {
  DIST_DIR_E2E,
  envDeCorrida,
  envDelPaso,
  formatearDuracion,
  nombreBranch,
  parsearArgs,
  parsearEnv,
  planDePasos,
  PUERTO_E2E,
} from "./ci-local.mjs";

describe("parsearArgs", () => {
  it("sin flags corre todo", () => {
    expect(parsearArgs([])).toMatchObject({
      rapido: false,
      sinE2e: false,
      saltearRapidos: false,
      mantenerBranch: false,
      desconocidos: [],
    });
  });

  it("rechaza una opción desconocida en vez de ignorarla", () => {
    expect(parsearArgs(["--rapdio"]).error).toContain("--rapdio");
  });

  it("--rapido y --saltear-rapidos juntos no dejan nada para correr", () => {
    expect(parsearArgs(["--rapido", "--saltear-rapidos"]).error).toBeDefined();
  });
});

describe("planDePasos", () => {
  const nombres = (op) => planDePasos(parsearArgs(op)).map((p) => p.script);

  it("completo sigue el orden del CI", () => {
    expect(nombres([])).toEqual([
      "typecheck",
      "lint",
      "test:coverage",
      "check:tests",
      "db:migrate",
      "db:seed",
      "db:seed:demo",
      "test:integration",
      "test:e2e",
    ]);
  });

  it("--rapido no toca ninguna base", () => {
    const pasos = planDePasos(parsearArgs(["--rapido"]));
    expect(pasos.some((p) => p.base)).toBe(false);
    expect(pasos).toHaveLength(4);
  });

  it("--sin-e2e deja la integración pero no Playwright", () => {
    expect(nombres(["--sin-e2e"])).toContain("test:integration");
    expect(nombres(["--sin-e2e"])).not.toContain("test:e2e");
  });

  it("--saltear-rapidos arranca por las migraciones", () => {
    expect(nombres(["--saltear-rapidos"])[0]).toBe("db:migrate");
  });

  it("solo Playwright está marcado como e2e", () => {
    const e2e = planDePasos(parsearArgs([])).filter((p) => p.e2e);
    expect(e2e.map((p) => p.script)).toEqual(["test:e2e"]);
  });
});

describe("envDeCorrida", () => {
  const DEV = "postgres://dueno:real@ep-dev.neon.tech/neondb";
  const urls = {
    pooled: "postgres://ci:x@ep-efimera-pooler.neon.tech/neondb",
    directa: "postgres://ci:x@ep-efimera.neon.tech/neondb",
  };

  it("ninguna variable de base queda apuntando a dev", () => {
    const base = {
      DATABASE_URL: DEV,
      DATABASE_URL_UNPOOLED: DEV,
      INTEGRATION_DATABASE_URL: DEV,
      E2E_DATABASE_URL: DEV,
    };
    const env = envDeCorrida(base, urls);
    expect(Object.values(env)).not.toContain(DEV);
    expect(env.DATABASE_URL).toBe(urls.pooled);
    expect(env.DATABASE_URL_UNPOOLED).toBe(urls.directa);
    expect(env.INTEGRATION_DATABASE_URL).toBe(urls.pooled);
    expect(env.E2E_DATABASE_URL).toBe(urls.pooled);
  });

  it("aísla el server de tests del dev del dueño y no manda mails", () => {
    const env = envDeCorrida({ BETTER_AUTH_URL: "http://localhost:3000" }, urls);
    expect(env.NEXT_DIST_DIR).toBe(DIST_DIR_E2E);
    expect(env.PW_PORT).toBe(String(PUERTO_E2E));
    expect(env.BETTER_AUTH_URL).toBe(`http://localhost:${PUERTO_E2E}`);
    expect(env.EMAIL_DRY_RUN).toBe("1");
  });

  it("sin las URLs de la branch no arranca (nunca cae a la de dev)", () => {
    expect(() => envDeCorrida({ DATABASE_URL: DEV }, { pooled: null, directa: urls.directa })).toThrow();
  });

  it("solo el paso de Playwright corre con CI=1", () => {
    const env = envDeCorrida({}, urls);
    expect(envDelPaso({ e2e: true }, env).CI).toBe("1");
    expect(envDelPaso({ script: "test:integration" }, env).CI).toBeUndefined();
  });
});

describe("parsearEnv", () => {
  it("lee NOMBRE=valor con o sin comillas e ignora comentarios", () => {
    expect(parsearEnv('# nota\nA="1"\r\nB=dos\n  C = \'tres\'\nno es var')).toEqual({
      A: "1",
      B: "dos",
      C: "tres",
    });
  });
});

describe("nombreBranch y formatearDuracion", () => {
  it("el nombre es ordenable y distinto de las branches del CI", () => {
    expect(nombreBranch(new Date(2026, 8, 15, 7, 5, 9))).toBe("local-20260915-070509");
  });

  it("formatea segundos y minutos", () => {
    expect(formatearDuracion(42_000)).toBe("42s");
    expect(formatearDuracion(125_000)).toBe("2m05s");
  });
});
