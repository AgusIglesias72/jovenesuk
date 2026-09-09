import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class RedirectError extends Error {
    readonly url: string;
    constructor(url: string) {
      super(`REDIRECT ${url}`);
      this.url = url;
    }
  }
  return { RedirectError, getSession: vi.fn(), signOut: vi.fn() };
});

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new mocks.RedirectError(url);
  },
}));

vi.mock("./index", () => ({
  auth: { api: { getSession: mocks.getSession, signOut: mocks.signOut } },
}));

import { requireAdminJuk, requireFamilia, requireRole, requireSession } from "./helpers";

type Rol = "super_admin" | "admin_juk" | "representante" | "familia";

function conSesion(role: Rol, isActive = true) {
  mocks.getSession.mockResolvedValue({
    user: { id: "u1", email: "x@jovenesenuk.com", role, isActive },
    session: { id: "s1" },
  });
}

/** Corre `fn` y devuelve la URL a la que redirigió, o null si no redirigió. */
async function urlDelRedirect(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    if (err instanceof mocks.RedirectError) return err.url;
    throw err;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireSession", () => {
  it("sin sesión manda a /login", async () => {
    mocks.getSession.mockResolvedValue(null);
    expect(await urlDelRedirect(requireSession)).toBe("/login");
  });

  it("con la cuenta desactivada cierra la sesión y manda a /login?inactivo=1", async () => {
    conSesion("admin_juk", false);
    expect(await urlDelRedirect(requireSession)).toBe("/login?inactivo=1");
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("con sesión activa devuelve la sesión", async () => {
    conSesion("admin_juk");
    const session = await requireSession();
    expect(session.user.role).toBe("admin_juk");
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});

describe("requireRole", () => {
  it("manda a la familia a su portal cuando pide una ruta de admin", async () => {
    conSesion("familia");
    expect(await urlDelRedirect(() => requireAdminJuk())).toBe("/familias");
  });

  it("manda al admin al dashboard cuando pide una ruta de familias", async () => {
    conSesion("admin_juk");
    expect(await urlDelRedirect(() => requireFamilia())).toBe("/dashboard");
  });

  it("usa el home del rol real (representante → /dashboard)", async () => {
    conSesion("representante");
    expect(await urlDelRedirect(() => requireRole("super_admin"))).toBe("/dashboard");
  });

  it("deja pasar cuando el rol está en la lista permitida", async () => {
    conSesion("super_admin");
    const session = await requireAdminJuk();
    expect(session.user.role).toBe("super_admin");
  });

  it("no redirige a un rol desconocido fuera del mapa de homes", async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: "u1", email: "x@jovenesenuk.com", role: "rol_futuro", isActive: true },
      session: { id: "s1" },
    });
    expect(await urlDelRedirect(() => requireAdminJuk())).toBe("/dashboard");
  });
});
