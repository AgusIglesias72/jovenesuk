import { describe, expect, it } from "vitest";

import { USUARIO_ROLES, usuarioCreateSchema } from "./schema";

const base = { name: "Martina Ruiz", email: "martina@jovenesenuk.com", role: "admin_juk" };

describe("usuarioCreateSchema", () => {
  it("acepta un admin y recorta nombre y email", () => {
    expect(
      usuarioCreateSchema.parse({ ...base, name: "  Martina Ruiz ", email: " martina@jovenesenuk.com " })
    ).toEqual(base);
  });

  it("desde el back-office solo se crean roles internos (nunca familia ni representante)", () => {
    expect(USUARIO_ROLES).toEqual(["admin_juk", "super_admin"]);
    expect(usuarioCreateSchema.safeParse({ ...base, role: "super_admin" }).success).toBe(true);
    for (const role of ["familia", "representante", "", undefined]) {
      expect(usuarioCreateSchema.safeParse({ ...base, role }).success).toBe(false);
    }
  });

  it("exige nombre y email válido", () => {
    const sinNombre = usuarioCreateSchema.safeParse({ ...base, name: "   " });
    expect(sinNombre.success).toBe(false);
    if (!sinNombre.success) expect(sinNombre.error.issues[0]?.message).toBe("Ingresá el nombre");

    const mailMalo = usuarioCreateSchema.safeParse({ ...base, email: "martina.jovenesenuk.com" });
    expect(mailMalo.success).toBe(false);
    if (!mailMalo.success) expect(mailMalo.error.issues[0]?.path).toEqual(["email"]);
  });

  it("limita el nombre a 120 caracteres", () => {
    expect(usuarioCreateSchema.safeParse({ ...base, name: "x".repeat(120) }).success).toBe(true);
    expect(usuarioCreateSchema.safeParse({ ...base, name: "x".repeat(121) }).success).toBe(false);
  });
});
