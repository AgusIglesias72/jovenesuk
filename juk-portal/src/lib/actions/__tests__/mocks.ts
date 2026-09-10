import { expect, vi } from "vitest";

/**
 * Mocks compartidos de los tests de server actions.
 *
 * `vi.mock` se hoistea al tope de cada archivo de test, así que no puede vivir
 * acá: cada test lo declara con una factory que importa este módulo, y como el
 * registro de módulos es uno solo por archivo, los `vi.fn()` que devuelve la
 * factory son los mismos que el test inspecciona:
 *
 *   vi.mock("@/lib/auth/helpers", async () => (await import("@/lib/actions/__tests__/mocks")).authHelpers);
 *   vi.mock("next/cache", async () => (await import("@/lib/actions/__tests__/mocks")).nextCache);
 *   vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
 *   vi.mock("@/lib/actions/safe-audit", async () => (await import("@/lib/actions/__tests__/mocks")).auditoria);
 *
 * Los `require*` no se reemplazan por un "resolve siempre": replican la regla
 * real de roles de src/lib/auth/helpers.ts (que tiene su propio test), así un
 * test puede llamar a una action de admin con una sesión de familia y verificar
 * que corta con el redirect ANTES de tocar una query.
 */

export type RolFake = "super_admin" | "admin_juk" | "representante" | "familia";

export const IDS = {
  superAdmin: "aaaaaaaa-0000-4000-8000-000000000001",
  admin: "aaaaaaaa-0000-4000-8000-000000000002",
  familia: "aaaaaaaa-0000-4000-8000-000000000003",
  otraFamilia: "aaaaaaaa-0000-4000-8000-000000000004",
} as const;

export type SesionFake = {
  user: { id: string; email: string; name: string; role: RolFake; isActive: boolean };
  session: { id: string };
};

/** Lo que tira `redirect()` de next/navigation: la action no devuelve, corta. */
export class RedirectFake extends Error {
  readonly digest: string;
  constructor(readonly url: string) {
    super("NEXT_REDIRECT");
    this.name = "RedirectFake";
    this.digest = `NEXT_REDIRECT;replace;${url};307;`;
  }
}

const HOME_POR_ROL: Record<RolFake, string> = {
  super_admin: "/dashboard",
  admin_juk: "/dashboard",
  representante: "/dashboard",
  familia: "/familias",
};

export const authHelpers = {
  getSession: vi.fn(),
  requireSession: vi.fn(),
  requireRole: vi.fn(),
  requireAdminJuk: vi.fn(),
  requireFamilia: vi.fn(),
};

export const nextCache = {
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
};

export const nextNavigation = {
  redirect: vi.fn((url: string) => {
    throw new RedirectFake(url);
  }),
  notFound: vi.fn(() => {
    throw new RedirectFake("/404");
  }),
};

export const sentry = {
  captureException: vi.fn(),
};

export const auditoria = {
  safeAudit: vi.fn(),
};

export function sesionFake(role: RolFake, id?: string): SesionFake {
  const userId =
    id ??
    (role === "super_admin" ? IDS.superAdmin : role === "familia" ? IDS.familia : IDS.admin);
  return {
    user: {
      id: userId,
      email: `int+${role}@int.jovenesenuk.com`,
      name: `[INT] ${role}`,
      role,
      isActive: true,
    },
    session: { id: `sesion-${userId}` },
  };
}

function exigirRol(sesion: SesionFake, roles: RolFake | RolFake[]): SesionFake {
  const permitidos = Array.isArray(roles) ? roles : [roles];
  if (!permitidos.includes(sesion.user.role)) {
    throw new RedirectFake(HOME_POR_ROL[sesion.user.role]);
  }
  return sesion;
}

/** Deja logueado a un usuario con ese rol; los `require*` aplican la regla real. */
export function loguearComo(role: RolFake, id?: string): SesionFake {
  const sesion = sesionFake(role, id);
  authHelpers.getSession.mockImplementation(async () => sesion);
  authHelpers.requireSession.mockImplementation(async () => sesion);
  authHelpers.requireRole.mockImplementation(async (roles: RolFake | RolFake[]) =>
    exigirRol(sesion, roles)
  );
  authHelpers.requireAdminJuk.mockImplementation(async () =>
    exigirRol(sesion, ["admin_juk", "super_admin"])
  );
  authHelpers.requireFamilia.mockImplementation(async () => exigirRol(sesion, "familia"));
  return sesion;
}

/** Sin sesión: todos los `require*` redirigen a /login. */
export function sinSesion(): void {
  const aLogin = async () => {
    throw new RedirectFake("/login");
  };
  authHelpers.getSession.mockImplementation(async () => null);
  authHelpers.requireSession.mockImplementation(aLogin);
  authHelpers.requireRole.mockImplementation(aLogin);
  authHelpers.requireAdminJuk.mockImplementation(aLogin);
  authHelpers.requireFamilia.mockImplementation(aLogin);
}

/**
 * Limpia llamadas e implementaciones de TODOS los mocks (compartidos y los del
 * test) y restituye los defaults compartidos. Va en el `beforeEach` de cada
 * archivo, antes de configurar las queries propias.
 */
export function resetearMocks(role: RolFake = "admin_juk"): SesionFake {
  vi.resetAllMocks();
  nextNavigation.redirect.mockImplementation((url: string) => {
    throw new RedirectFake(url);
  });
  nextNavigation.notFound.mockImplementation(() => {
    throw new RedirectFake("/404");
  });
  auditoria.safeAudit.mockResolvedValue(undefined);
  return loguearComo(role);
}

/** Corre la action y devuelve la URL a la que redirigió; falla el test si no redirigió. */
export async function urlDeRedirect(accion: () => Promise<unknown>): Promise<string> {
  try {
    await accion();
  } catch (err) {
    if (err instanceof RedirectFake) return err.url;
    throw err;
  }
  throw new Error("La action debía redirigir y terminó normalmente.");
}

/** Ningún efecto observable: ni auditoría ni revalidación. */
export function sinEfectos(): void {
  expect(auditoria.safeAudit).not.toHaveBeenCalled();
  expect(nextCache.revalidatePath).not.toHaveBeenCalled();
}

/** Todas las auditorías con esa acción (para asserts sobre metadata). */
export function auditoriasDe(accion: string): Array<Record<string, unknown>> {
  return auditoria.safeAudit.mock.calls
    .map((c) => c[0] as Record<string, unknown>)
    .filter((entry) => entry.accion === accion);
}

/** FormData con un archivo del tipo y tamaño pedidos (contenido de relleno). */
export function formDataConArchivo(
  campos: Record<string, string>,
  archivo?: { nombre: string; mime: string; bytes: number }
): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  if (archivo) {
    fd.set(
      "archivo",
      new File([new Uint8Array(archivo.bytes)], archivo.nombre, { type: archivo.mime })
    );
  }
  return fd;
}
