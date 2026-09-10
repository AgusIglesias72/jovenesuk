import { describe, expect, it } from "vitest";

import {
  OBSERVACIONES_PAGO_MAX,
  confirmarPagoPresencialSchema,
  esFechaPagoFutura,
  formatMonto,
  planCuotasSchema,
  registrarPagoSchema,
} from "./schema";

const CUOTA_ID = "4f7c2b1e-9a3d-4c5e-8f6a-1b2c3d4e5f60";

function isoDiaUTC(d: Date, offsetDias = 0): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetDias));
  return x.toISOString().slice(0, 10);
}

describe("esFechaPagoFutura", () => {
  const hoy = new Date("2026-09-10T15:30:00Z");

  it("hoy no es futuro, a cualquier hora del día", () => {
    expect(esFechaPagoFutura(new Date("2026-09-10T00:00:00Z"), hoy)).toBe(false);
    expect(esFechaPagoFutura(new Date("2026-09-10T23:59:59Z"), hoy)).toBe(false);
  });

  it("una fecha retroactiva es válida", () => {
    expect(esFechaPagoFutura(new Date("2026-08-01T00:00:00Z"), hoy)).toBe(false);
  });

  it("mañana es futuro", () => {
    expect(esFechaPagoFutura(new Date("2026-09-11T00:00:00Z"), hoy)).toBe(true);
  });
});

describe("registrarPagoSchema", () => {
  it("sin fecha ni observaciones es válido (la query usa hoy)", () => {
    const r = registrarPagoSchema.safeParse({ cuotaId: CUOTA_ID });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.fechaPago).toBeUndefined();
      expect(r.data.observaciones).toBeUndefined();
    }
  });

  it("strings vacíos del form cuentan como ausentes", () => {
    const r = registrarPagoSchema.safeParse({ cuotaId: CUOTA_ID, fechaPago: "", observaciones: "   " });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.fechaPago).toBeUndefined();
      expect(r.data.observaciones).toBeUndefined();
    }
  });

  it("acepta una fecha retroactiva en formato ISO del DateInput", () => {
    const r = registrarPagoSchema.safeParse({ cuotaId: CUOTA_ID, fechaPago: "2026-01-15" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.fechaPago?.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("acepta la fecha de hoy", () => {
    const r = registrarPagoSchema.safeParse({ cuotaId: CUOTA_ID, fechaPago: isoDiaUTC(new Date()) });
    expect(r.success).toBe(true);
  });

  it("rechaza una fecha futura con un mensaje claro en el campo", () => {
    const r = registrarPagoSchema.safeParse({
      cuotaId: CUOTA_ID,
      fechaPago: isoDiaUTC(new Date(), 1),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === "fechaPago");
      expect(issue?.message).toBe("La fecha del pago no puede ser futura");
    }
  });

  it("rechaza una fecha inválida", () => {
    expect(registrarPagoSchema.safeParse({ cuotaId: CUOTA_ID, fechaPago: "no-es-fecha" }).success).toBe(
      false
    );
  });

  it("recorta las observaciones y respeta el máximo", () => {
    const ok = registrarPagoSchema.safeParse({ cuotaId: CUOTA_ID, observaciones: "  Transferencia #123  " });
    expect(ok.success && ok.data.observaciones).toBe("Transferencia #123");

    const largo = registrarPagoSchema.safeParse({
      cuotaId: CUOTA_ID,
      observaciones: "x".repeat(OBSERVACIONES_PAGO_MAX + 1),
    });
    expect(largo.success).toBe(false);
  });

  it("exige un cuotaId uuid", () => {
    expect(registrarPagoSchema.safeParse({ cuotaId: "123" }).success).toBe(false);
  });
});

describe("confirmarPagoPresencialSchema", () => {
  it("usa las mismas reglas de fecha que un pago común", () => {
    expect(
      confirmarPagoPresencialSchema.safeParse({ asignacionId: CUOTA_ID, fechaPago: "2026-02-01" }).success
    ).toBe(true);
    expect(
      confirmarPagoPresencialSchema.safeParse({
        asignacionId: CUOTA_ID,
        fechaPago: isoDiaUTC(new Date(), 2),
      }).success
    ).toBe(false);
  });
});

describe("planCuotasSchema", () => {
  const plan = {
    asignacionId: CUOTA_ID,
    cantidadCuotas: "3",
    montoPorCuota: "500",
    primerVencimiento: "2026-12-01",
  };

  function paths(input: unknown): string[] {
    const r = planCuotasSchema.safeParse(input);
    return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
  }

  it("la moneda defaultea a USD (CRIT-05)", () => {
    const r = planCuotasSchema.parse(plan);
    expect(r.moneda).toBe("USD");
  });

  it("coerciona los números del form y deja el vencimiento en medianoche UTC", () => {
    const r = planCuotasSchema.parse({ ...plan, moneda: "GBP" });
    expect(r.cantidadCuotas).toBe(3);
    expect(r.montoPorCuota).toBe(500);
    expect(r.moneda).toBe("GBP");
    expect(r.primerVencimiento.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("cantidad de cuotas entre 1 y 24, entera", () => {
    expect(paths({ ...plan, cantidadCuotas: "1" })).toEqual([]);
    expect(paths({ ...plan, cantidadCuotas: "24" })).toEqual([]);
    expect(paths({ ...plan, cantidadCuotas: "0" })).toEqual(["cantidadCuotas"]);
    expect(paths({ ...plan, cantidadCuotas: "25" })).toEqual(["cantidadCuotas"]);
    expect(paths({ ...plan, cantidadCuotas: "2.5" })).toEqual(["cantidadCuotas"]);
  });

  it("el monto por cuota tiene que ser positivo y acotado", () => {
    expect(paths({ ...plan, montoPorCuota: "0" })).toEqual(["montoPorCuota"]);
    expect(paths({ ...plan, montoPorCuota: "-10" })).toEqual(["montoPorCuota"]);
    expect(paths({ ...plan, montoPorCuota: "1000001" })).toEqual(["montoPorCuota"]);
    expect(paths({ ...plan, montoPorCuota: "abc" })).toEqual(["montoPorCuota"]);
    expect(planCuotasSchema.parse({ ...plan, montoPorCuota: "450.75" }).montoPorCuota).toBe(450.75);
  });

  it("rechaza monedas fuera de USD/GBP/ARS", () => {
    expect(paths({ ...plan, moneda: "EUR" })).toEqual(["moneda"]);
  });

  it("el primer vencimiento es obligatorio", () => {
    const r = planCuotasSchema.safeParse({ ...plan, primerVencimiento: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(["primerVencimiento"]);
      expect(r.error.issues[0]?.message).toBe("Ingresá la fecha");
    }
  });

  it("exige una asignación uuid", () => {
    expect(paths({ ...plan, asignacionId: "asig-1" })).toEqual(["asignacionId"]);
  });
});

describe("formatMonto", () => {
  it("formatea con el símbolo de la moneda y dos decimales es-AR", () => {
    expect(formatMonto(1250, "GBP")).toBe("£ 1.250,00");
    expect(formatMonto("500", "USD")).toBe("US$ 500,00");
  });

  it("separa miles con punto y decimales con coma, redondeando a dos", () => {
    expect(formatMonto(1234.5, "USD")).toBe("US$ 1.234,50");
    expect(formatMonto("1500000.456", "ARS")).toBe("$ 1.500.000,46");
    expect(formatMonto(0, "ARS")).toBe("$ 0,00");
  });
});
