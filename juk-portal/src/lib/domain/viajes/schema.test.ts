import { describe, expect, it } from "vitest";

import { capacidadMaxima } from "./schema";

describe("capacidadMaxima", () => {
  it("es Group Leaders × 12 (PRD §4)", () => {
    expect(capacidadMaxima(1)).toBe(12);
    expect(capacidadMaxima(3)).toBe(36);
    expect(capacidadMaxima(0)).toBe(0);
  });
});
