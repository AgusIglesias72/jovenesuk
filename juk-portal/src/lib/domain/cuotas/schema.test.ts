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
  it("la moneda defaultea a USD (CRIT-05)", () => {
    const r = planCuotasSchema.parse({
      asignacionId: CUOTA_ID,
      cantidadCuotas: "3",
      montoPorCuota: "500",
      primerVencimiento: "2026-12-01",
    });
    expect(r.moneda).toBe("USD");
  });
});

describe("formatMonto", () => {
  it("formatea con el símbolo de la moneda y dos decimales es-AR", () => {
    expect(formatMonto(1250, "GBP")).toBe("£ 1.250,00");
    expect(formatMonto("500", "USD")).toBe("US$ 500,00");
  });
});
