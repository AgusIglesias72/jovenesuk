import { describe, expect, it } from "vitest";

import { diaCalendarioUTC, diasEntre, formatFecha, toDateInput } from "./date";

// Zona horaria del usuario real: si algún helper usara getters locales en vez
// de los UTC, estos casos se corren un día y fallan.
process.env.TZ = "America/Argentina/Buenos_Aires";

describe("entorno", () => {
  it("la zona horaria negativa está activa (si no, los casos de abajo no prueban nada)", () => {
    const columnaDate = new Date(Date.UTC(2026, 6, 10));
    expect(columnaDate.getDate()).toBe(9);
    expect(columnaDate.toLocaleDateString("es-AR")).toBe("9/7/2026");
  });
});

describe("formatFecha / toDateInput", () => {
  it("usa los componentes UTC (no corre el día en ART)", () => {
    const d = new Date(Date.UTC(2026, 5, 13, 0, 0, 0));
    expect(formatFecha(d)).toBe("13/06/2026");
    expect(toDateInput(d)).toBe("2026-06-13");
  });

  it("una columna date de Drizzle ('YYYY-MM-DD' → medianoche UTC) conserva su día", () => {
    const d = new Date("2026-07-10");
    expect(formatFecha(d)).toBe("10/07/2026");
    expect(toDateInput(d)).toBe("2026-07-10");
  });

  it("fin y comienzo de año no se corren de año", () => {
    expect(formatFecha(new Date(Date.UTC(2025, 11, 31)))).toBe("31/12/2025");
    expect(formatFecha(new Date(Date.UTC(2026, 0, 1)))).toBe("01/01/2026");
    expect(toDateInput(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01-01");
  });

  it("rellena con cero día y mes de un dígito (DD/MM/YYYY)", () => {
    expect(formatFecha(new Date(Date.UTC(2026, 2, 5)))).toBe("05/03/2026");
  });

  it("ida y vuelta con el input: lo que se muestra es lo que se cargó", () => {
    const cargado = "2027-02-28";
    expect(toDateInput(new Date(cargado))).toBe(cargado);
  });
});

describe("diaCalendarioUTC", () => {
  it("normaliza a la medianoche UTC del día", () => {
    expect(diaCalendarioUTC(new Date("2026-06-13T18:45:00Z"))).toBe(Date.UTC(2026, 5, 13));
  });

  it("no cae al día anterior cuando en ART todavía es ayer", () => {
    // 02:00 UTC del 13 = 23:00 ART del 12.
    expect(diaCalendarioUTC(new Date("2026-06-13T02:00:00Z"))).toBe(Date.UTC(2026, 5, 13));
  });

  it("es idempotente sobre una columna `date` (medianoche UTC)", () => {
    const columna = new Date(Date.UTC(2026, 5, 12));
    expect(diaCalendarioUTC(columna)).toBe(columna.getTime());
  });
});

describe("diasEntre", () => {
  it("cuenta días calendario, no ventanas de 24 h", () => {
    expect(
      diasEntre(new Date("2026-06-12T23:00:00Z"), new Date("2026-06-13T01:00:00Z"))
    ).toBe(1);
    expect(diasEntre(new Date("2026-06-13T00:00:00Z"), new Date("2026-06-13T23:59:00Z"))).toBe(0);
  });

  it("es negativo hacia atrás y cruza fin de mes", () => {
    expect(diasEntre(new Date("2026-07-01T00:00:00Z"), new Date("2026-06-29T00:00:00Z"))).toBe(-2);
  });

  it("cruza fin de año y respeta el 29 de febrero", () => {
    expect(diasEntre(new Date("2025-12-31"), new Date("2026-01-01"))).toBe(1);
    expect(diasEntre(new Date("2028-02-28"), new Date("2028-03-01"))).toBe(2);
    expect(diasEntre(new Date("2027-02-28"), new Date("2027-03-01"))).toBe(1);
  });
});
