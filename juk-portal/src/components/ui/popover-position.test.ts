import { describe, expect, it } from "vitest";

import { clasesPopover, posicionarPopover, varsPopover } from "./popover-position";

const TELEFONO = { width: 360, height: 640 };
const ESCRITORIO = { width: 1280, height: 800 };

describe("posicionarPopover", () => {
  it("abre hacia abajo cuando hay lugar y copia el ancho del disparador", () => {
    const pos = posicionarPopover(
      { top: 100, bottom: 144, left: 40, width: 280 },
      ESCRITORIO,
      { altoDeseado: 320 }
    );

    expect(pos.vertical).toBe("abajo");
    expect(pos.desplazamientoY).toBe(152);
    expect(pos.left).toBe(40);
    expect(pos.ancho).toBe(280);
  });

  it("abre hacia arriba cuando abajo no entra y arriba sobra lugar", () => {
    const pos = posicionarPopover(
      { top: 520, bottom: 564, left: 40, width: 280 },
      TELEFONO,
      { altoDeseado: 320 }
    );

    expect(pos.vertical).toBe("arriba");
    // Anclado al borde inferior del viewport: 640 - 520 + 8
    expect(pos.desplazamientoY).toBe(128);
  });

  it("elige el lado con más espacio cuando no entra en ninguno", () => {
    const arriba = posicionarPopover(
      { top: 400, bottom: 444, left: 0, width: 200 },
      TELEFONO,
      { altoDeseado: 600 }
    );
    const abajo = posicionarPopover(
      { top: 120, bottom: 164, left: 0, width: 200 },
      TELEFONO,
      { altoDeseado: 600 }
    );

    expect(arriba.vertical).toBe("arriba");
    expect(abajo.vertical).toBe("abajo");
  });

  it("nunca deja el panel por fuera del viewport (ancla a la derecha)", () => {
    const pos = posicionarPopover(
      { top: 100, bottom: 144, left: 300, width: 60 },
      TELEFONO,
      { ancho: 296 }
    );

    expect(pos.horizontal).toBe("derecha");
    expect(pos.left).toBe(360 - 16 - 296);
    expect(pos.left + pos.ancho).toBeLessThanOrEqual(TELEFONO.width - 16);
  });

  it("achica el ancho fijo del calendario en pantallas angostas", () => {
    const pos = posicionarPopover({ top: 80, bottom: 124, left: 8, width: 300 }, { width: 320, height: 640 }, {
      ancho: 296,
    });

    expect(pos.ancho).toBe(288);
    expect(pos.left).toBe(16);
  });

  it("respeta el margen mínimo cuando el disparador toca el borde izquierdo", () => {
    const pos = posicionarPopover({ top: 80, bottom: 124, left: 0, width: 120 }, TELEFONO);

    expect(pos.left).toBe(16);
    expect(pos.horizontal).toBe("izquierda");
  });

  it("garantiza un alto mínimo usable aunque el espacio sea ínfimo", () => {
    const pos = posicionarPopover({ top: 600, bottom: 630, left: 20, width: 200 }, TELEFONO);

    expect(pos.maxAlto).toBeGreaterThanOrEqual(160);
  });
});

describe("clasesPopover", () => {
  it("ancla arriba o abajo según la posición calculada", () => {
    const abajo = posicionarPopover({ top: 10, bottom: 54, left: 20, width: 200 }, ESCRITORIO);
    const arriba = posicionarPopover({ top: 700, bottom: 744, left: 20, width: 200 }, ESCRITORIO);

    expect(clasesPopover(abajo)).toContain("top-[var(--pop-y)]");
    expect(clasesPopover(abajo)).not.toContain("bottom-[var(--pop-y)]");
    expect(clasesPopover(arriba)).toContain("bottom-[var(--pop-y)]");
    expect(clasesPopover(arriba)).toContain("max-w-[calc(100vw-2rem)]");
  });
});

describe("varsPopover", () => {
  it("expone la geometría medida como custom properties en px", () => {
    const pos = posicionarPopover({ top: 100, bottom: 144, left: 40, width: 280 }, ESCRITORIO);

    expect(varsPopover(pos)).toMatchObject({
      "--pop-x": "40px",
      "--pop-y": "152px",
      "--pop-w": "280px",
    });
  });
});
