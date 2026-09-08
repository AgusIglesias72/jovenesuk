import { describe, expect, it } from "vitest";

import { CuotaNotFoundError, PlanConPagosError } from "./errors";

describe("errores de cuotas", () => {
  it("CuotaNotFoundError conserva el id y el name", () => {
    const err = new CuotaNotFoundError("abc");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("CuotaNotFoundError");
    expect(err.id).toBe("abc");
    expect(err.message).toContain("abc");
  });

  it("PlanConPagosError tiene mensaje apto para mostrar al usuario", () => {
    const err = new PlanConPagosError();
    expect(err.name).toBe("PlanConPagosError");
    expect(err.message).toMatch(/pagos registrados/);
  });
});
