import { describe, expect, it } from "vitest";

import { diaCalendarioUTC, diasEntre, formatFecha, toDateInput } from "./date";

// Zona horaria del usuario real: si algún helper usara getters locales en vez
// de los UTC, estos casos se corren un día y fallan.
process.env.TZ = "America/Argentina/Buenos_Aires";

describe("formatFecha / toDateInput", () => {
  it("usa los componentes UTC (no corre el día en ART)", () => {
    const d = new Date(Date.UTC(2026, 5, 13, 0, 0, 0));
    expect(formatFecha(d)).toBe("13/06/2026");
    expect(toDateInput(d)).toBe("2026-06-13");
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
});
