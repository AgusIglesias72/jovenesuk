import { describe, expect, it } from "vitest";

import { estilosBloqueo, scrollDesdeTop } from "./use-scroll-lock";

describe("estilosBloqueo", () => {
  it("fija el body desplazado hacia arriba el scroll actual", () => {
    expect(estilosBloqueo(320)).toEqual({
      position: "fixed",
      top: "-320px",
      left: "0px",
      right: "0px",
      width: "100%",
      overflowY: "scroll",
    });
  });

  it("no genera un top positivo cuando hay overscroll (scrollY negativo en iOS)", () => {
    expect(estilosBloqueo(-40).top).toBe("-0px");
  });

  it("redondea los scrolls fraccionarios del zoom del navegador", () => {
    expect(estilosBloqueo(120.6).top).toBe("-121px");
  });

  it("cae en 0 con valores no finitos", () => {
    expect(estilosBloqueo(Number.NaN).top).toBe("-0px");
  });
});

describe("scrollDesdeTop", () => {
  it("recupera el scroll guardado en el top negativo", () => {
    expect(scrollDesdeTop("-320px")).toBe(320);
  });

  it("devuelve 0 si el body no estaba bloqueado", () => {
    expect(scrollDesdeTop("")).toBe(0);
    expect(scrollDesdeTop("auto")).toBe(0);
  });

  it("es la inversa de estilosBloqueo", () => {
    expect(scrollDesdeTop(estilosBloqueo(1440).top)).toBe(1440);
  });
});
