import { describe, expect, it } from "vitest";

import {
  esPlaceholder,
  evaluarEntorno,
  evaluarVariable,
  resumenPorServicio,
  SERVICIOS_ENV,
  SERVICIO_LABELS,
  VARIABLES_ENV,
  type VariableEnv,
} from "./env";

const variable = (over: Partial<VariableEnv> = {}): VariableEnv => ({
  nombre: "UNA_VAR",
  servicio: "app",
  nivel: "requerida",
  habilita: "algo",
  siFalta: "se rompe algo",
  ejemplo: "valor-de-ejemplo",
  ...over,
});

/**
 * Entorno completo para partir de "todo ok". Deja afuera las prohibidas en
 * producción: setearlas es justamente el error que se prueba más abajo.
 */
function entornoCompleto(): Record<string, string> {
  return Object.fromEntries(
    VARIABLES_ENV.filter((v) => !v.prohibidaEnProduccion).map((v) => [
      v.nombre,
      `real-${v.nombre.toLowerCase()}`,
    ])
  );
}

describe("esPlaceholder", () => {
  it("reconoce los moldes de la plantilla, con o sin comillas", () => {
    expect(esPlaceholder("re_xxxxxxxxxxxx")).toBe(true);
    expect(esPlaceholder('"re_xxxxxxxxxxxx"')).toBe(true);
    expect(esPlaceholder("G-XXXXXXXXXX")).toBe(true);
    expect(esPlaceholder("<generate-random-secret>")).toBe(true);
    expect(esPlaceholder("postgres://user:password@ep-1.neon.tech/juk")).toBe(true);
  });

  it("no marca un valor real", () => {
    expect(esPlaceholder("re_8Kj2mQ4pL9")).toBe(false);
    expect(esPlaceholder("postgres://juk:s3cr3t@ep-1.neon.tech/juk")).toBe(false);
    expect(esPlaceholder("juk-documentos-prod")).toBe(false);
  });

  it("un ejemplo que también es un valor usable no se marca (falso positivo caro)", () => {
    expect(esPlaceholder("juk-documents")).toBe(false);
    expect(esPlaceholder("juk")).toBe(false);
    expect(esPlaceholder("info@jovenesenuk.com")).toBe(false);
  });

  it("un valor vacío no es placeholder (falta, que es otra cosa)", () => {
    expect(esPlaceholder("")).toBe(false);
    expect(esPlaceholder("   ")).toBe(false);
  });
});

describe("evaluarVariable", () => {
  it("distingue ok, falta y placeholder", () => {
    const v = variable();
    expect(evaluarVariable(v, "un-valor-real", "local").estado).toBe("ok");
    expect(evaluarVariable(v, undefined, "local").estado).toBe("falta");
    expect(evaluarVariable(v, "", "local").estado).toBe("falta");
    expect(evaluarVariable(v, "re_xxxxxxxxxxxx", "local").estado).toBe("placeholder");
  });

  it("una requerida que falta es error en cualquier perfil", () => {
    expect(evaluarVariable(variable(), undefined, "local").severidad).toBe("error");
    expect(evaluarVariable(variable(), undefined, "produccion").severidad).toBe("error");
  });

  it("una de producción que falta avisa en local y es error en producción", () => {
    const v = variable({ nivel: "produccion" });
    expect(evaluarVariable(v, undefined, "local").severidad).toBe("aviso");
    expect(evaluarVariable(v, undefined, "produccion").severidad).toBe("error");
  });

  it("una opcional que falta no molesta, pero con placeholder avisa", () => {
    const v = variable({ nivel: "opcional" });
    expect(evaluarVariable(v, undefined, "local").severidad).toBe("info");
    expect(evaluarVariable(v, "re_xxxxxxxxxxxx", "local").severidad).toBe("aviso");
  });

  it("una variable prohibida en producción es error solo si está seteada en producción", () => {
    const v = variable({ nivel: "opcional", prohibidaEnProduccion: true });
    expect(evaluarVariable(v, "1", "produccion")).toMatchObject({
      prohibida: true,
      severidad: "error",
    });
    expect(evaluarVariable(v, "1", "local").prohibida).toBe(false);
    expect(evaluarVariable(v, undefined, "produccion").prohibida).toBe(false);
  });
});

describe("evaluarEntorno", () => {
  it("con todas las variables seteadas queda en verde", () => {
    const r = evaluarEntorno(entornoCompleto(), "produccion");
    expect(r.errores).toBe(0);
    expect(r.ok).toBe(true);
    expect(r.variables).toHaveLength(VARIABLES_ENV.length);
  });

  it("un entorno vacío no pasa ni el perfil local (faltan las requeridas)", () => {
    const r = evaluarEntorno({}, "local");
    expect(r.ok).toBe(false);
    expect(r.errores).toBe(VARIABLES_ENV.filter((v) => v.nivel === "requerida").length);
  });

  it("lo que en local es aviso, en producción es error", () => {
    const soloRequeridas = Object.fromEntries(
      VARIABLES_ENV.filter((v) => v.nivel === "requerida").map((v) => [v.nombre, "real"])
    );
    expect(evaluarEntorno(soloRequeridas, "local").ok).toBe(true);
    expect(evaluarEntorno(soloRequeridas, "produccion").ok).toBe(false);
  });

  it("EMAIL_DRY_RUN prendido en producción es un error (apagaría los envíos reales)", () => {
    const env = { ...entornoCompleto(), EMAIL_DRY_RUN: "1" };
    const r = evaluarEntorno(env, "produccion");
    expect(r.ok).toBe(false);
    expect(r.variables.find((v) => v.nombre === "EMAIL_DRY_RUN")?.prohibida).toBe(true);
  });
});

describe("resumenPorServicio", () => {
  it("devuelve una línea por servicio, con su etiqueta", () => {
    const filas = resumenPorServicio(evaluarEntorno(entornoCompleto(), "local"));
    expect(filas.map((f) => f.servicio)).toEqual([...SERVICIOS_ENV]);
    expect(filas.every((f) => f.estado === "ok")).toBe(true);
    expect(filas[0]?.nombre).toBe(SERVICIO_LABELS.app);
  });

  it("el placeholder pesa más que la falta: un re_xxxx no es 'configurado'", () => {
    const env = { ...entornoCompleto(), RESEND_API_KEY: "re_xxxxxxxxxxxx" };
    const resend = resumenPorServicio(evaluarEntorno(env, "local")).find(
      (f) => f.servicio === "resend"
    );
    expect(resend?.estado).toBe("placeholder");
    expect(resend?.detalle).toContain("RESEND_API_KEY");
  });

  it("nombra las variables que faltan", () => {
    const env = entornoCompleto();
    delete env.R2_BUCKET_NAME;
    const r2 = resumenPorServicio(evaluarEntorno(env, "local")).find((f) => f.servicio === "r2");
    expect(r2?.estado).toBe("falta");
    expect(r2?.detalle).toContain("R2_BUCKET_NAME");
  });
});

describe("catálogo", () => {
  it("no tiene nombres repetidos", () => {
    const nombres = VARIABLES_ENV.map((v) => v.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("cada variable declara servicio conocido, ejemplo y consecuencia", () => {
    for (const v of VARIABLES_ENV) {
      expect(SERVICIOS_ENV).toContain(v.servicio);
      expect(v.ejemplo.trim()).not.toBe("");
      expect(v.habilita.trim()).not.toBe("");
      expect(v.siFalta.trim()).not.toBe("");
    }
  });

  it("todo servicio del catálogo tiene al menos una variable", () => {
    for (const servicio of SERVICIOS_ENV) {
      expect(VARIABLES_ENV.some((v) => v.servicio === servicio)).toBe(true);
    }
  });

  it("las requeridas son las que no tienen fallback: app, base y auth", () => {
    const requeridas = VARIABLES_ENV.filter((v) => v.nivel === "requerida").map((v) => v.nombre);
    expect(requeridas).toEqual([
      "NEXT_PUBLIC_APP_URL",
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
    ]);
  });
});
