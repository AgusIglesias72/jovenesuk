import { describe, expect, it } from "vitest";

import { unirIds } from "./aria";

describe("unirIds", () => {
  it("une los ids presentes separados por espacio", () => {
    expect(unirIds("a-label", "a-desc")).toBe("a-label a-desc");
  });

  it("descarta vacíos, nulos y espacios en blanco", () => {
    expect(unirIds(undefined, "solo", null, "", false, "   ")).toBe("solo");
  });

  it("devuelve undefined cuando no queda ningún id", () => {
    expect(unirIds(undefined, null, "")).toBeUndefined();
  });
});
