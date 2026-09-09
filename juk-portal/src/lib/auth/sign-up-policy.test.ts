import { describe, expect, it } from "vitest";

import { debeBloquearAlta, SIGN_UP_PATHS } from "./sign-up-policy";

describe("debeBloquearAlta", () => {
  it("bloquea el sign-up cuando llega por HTTP", () => {
    expect(debeBloquearAlta("/sign-up/email", true)).toBe(true);
    expect(debeBloquearAlta("/sign-up", true)).toBe(true);
    expect(debeBloquearAlta("/sign-up/social", true)).toBe(true);
  });

  it("deja pasar el sign-up server-side (seed, alta de usuarios, alta de familias)", () => {
    expect(debeBloquearAlta("/sign-up/email", false)).toBe(false);
  });

  it("no toca el resto de los endpoints", () => {
    expect(debeBloquearAlta("/sign-in/email", true)).toBe(false);
    expect(debeBloquearAlta("/get-session", true)).toBe(false);
    expect(debeBloquearAlta("/reset-password", true)).toBe(false);
  });

  it("no confunde un path que solo empieza parecido", () => {
    expect(debeBloquearAlta("/sign-upgrade", true)).toBe(false);
  });

  it("expone el path que el router apaga con disabledPaths", () => {
    expect(SIGN_UP_PATHS).toContain("/sign-up/email");
  });
});
