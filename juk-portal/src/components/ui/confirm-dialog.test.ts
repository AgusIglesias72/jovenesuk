import { describe, expect, it } from "vitest";

import { indiceFocoTrap } from "./confirm-dialog";

describe("indiceFocoTrap", () => {
  it("deja pasar el Tab en el medio de la lista", () => {
    expect(indiceFocoTrap(3, 1, false)).toBeNull();
    expect(indiceFocoTrap(3, 1, true)).toBeNull();
  });

  it("cicla del último al primero con Tab", () => {
    expect(indiceFocoTrap(3, 2, false)).toBe(0);
  });

  it("cicla del primero al último con Shift+Tab", () => {
    expect(indiceFocoTrap(3, 0, true)).toBe(2);
  });

  it("mete el foco adentro cuando está afuera del diálogo", () => {
    expect(indiceFocoTrap(3, -1, false)).toBe(0);
    expect(indiceFocoTrap(3, -1, true)).toBe(2);
  });

  it("con un solo focusable se queda en él", () => {
    expect(indiceFocoTrap(1, 0, false)).toBe(0);
    expect(indiceFocoTrap(1, 0, true)).toBe(0);
  });

  it("no hace nada si no hay nada focuseable", () => {
    expect(indiceFocoTrap(0, -1, false)).toBeNull();
  });
});
