import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IDS,
  auditoria,
  auditoriasDe,
  loguearComo,
  nextCache,
  resetearMocks,
  sentry,
  sinEfectos,
  sinSesion,
  urlDeRedirect,
} from "@/lib/actions/__tests__/mocks";

const q = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  finalizarAltaUsuario: vi.fn(),
  getUsuarioById: vi.fn(),
  setUsuarioActivo: vi.fn(),
  setUsuarioRole: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", async () => (await import("@/lib/actions/__tests__/mocks")).authHelpers);
vi.mock("next/cache", async () => (await import("@/lib/actions/__tests__/mocks")).nextCache);
vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock("@/lib/actions/safe-audit", async () => (await import("@/lib/actions/__tests__/mocks")).auditoria);
vi.mock("@/lib/auth", () => ({
  auth: { api: { signUpEmail: q.signUpEmail, requestPasswordReset: q.requestPasswordReset } },
}));
vi.mock("@/lib/db/queries/usuarios", () => ({
  finalizarAltaUsuario: q.finalizarAltaUsuario,
  getUsuarioById: q.getUsuarioById,
  setUsuarioActivo: q.setUsuarioActivo,
  setUsuarioRole: q.setUsuarioRole,
}));

import { UsuarioNotFoundError } from "@/lib/domain/usuarios";

import {
  cambiarRolUsuarioAction,
  createUsuarioAction,
  reenviarAccesoUsuarioAction,
  setActivoUsuarioAction,
} from "./actions";

const OTRO_ID = "22222222-2222-4222-8222-222222222222";

const alta = { name: "[INT] Tomás Méndez", email: "int+tomas@int.jovenesenuk.com", role: "admin_juk" };

function sinEscrituras() {
  expect(q.signUpEmail).not.toHaveBeenCalled();
  expect(q.finalizarAltaUsuario).not.toHaveBeenCalled();
  expect(q.setUsuarioActivo).not.toHaveBeenCalled();
  expect(q.setUsuarioRole).not.toHaveBeenCalled();
  expect(q.requestPasswordReset).not.toHaveBeenCalled();
  sinEfectos();
}

beforeEach(() => {
  resetearMocks("super_admin");
  q.signUpEmail.mockResolvedValue({ user: { id: OTRO_ID } });
  q.requestPasswordReset.mockResolvedValue({ status: true });
  q.finalizarAltaUsuario.mockResolvedValue(undefined);
  q.setUsuarioActivo.mockResolvedValue(undefined);
  q.setUsuarioRole.mockResolvedValue(undefined);
});

describe("Gestión de usuarios: solo super_admin", () => {
  const acciones: Array<[string, () => Promise<unknown>]> = [
    ["createUsuarioAction", () => createUsuarioAction(alta)],
    ["reenviarAccesoUsuarioAction", () => reenviarAccesoUsuarioAction(OTRO_ID)],
    ["cambiarRolUsuarioAction", () => cambiarRolUsuarioAction(OTRO_ID, "super_admin")],
    ["setActivoUsuarioAction", () => setActivoUsuarioAction(OTRO_ID, false)],
  ];

  it.each(acciones)("%s: un admin_juk es rebotado a su home sin escribir nada", async (_nombre, accion) => {
    loguearComo("admin_juk");

    expect(await urlDeRedirect(accion)).toBe("/dashboard");
    expect(q.getUsuarioById).not.toHaveBeenCalled();
    sinEscrituras();
  });

  it.each(acciones)("%s: una familia es rebotada a su portal", async (_nombre, accion) => {
    loguearComo("familia");

    expect(await urlDeRedirect(accion)).toBe("/familias");
    sinEscrituras();
  });

  it.each(acciones)("%s: sin sesión, a /login", async (_nombre, accion) => {
    sinSesion();

    expect(await urlDeRedirect(accion)).toBe("/login");
    sinEscrituras();
  });
});

describe("createUsuarioAction", () => {
  it("rechaza el input inválido con fieldErrors y sin crear al usuario", async () => {
    const r = await createUsuarioAction({ name: "", email: "no-es-email", role: "admin_juk" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.email?.[0]).toBeTruthy();
    expect(r.fieldErrors?.name?.[0]).toBeTruthy();
    sinEscrituras();
  });

  it("no da de alta cuentas de familia desde la gestión del equipo", async () => {
    const r = await createUsuarioAction({ ...alta, role: "familia" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.role).toBeDefined();
    sinEscrituras();
  });

  it("crea el usuario con una password que nadie ve y manda el link de acceso", async () => {
    const r = await createUsuarioAction(alta);

    expect(r).toEqual({
      ok: true,
      data: { email: alta.email, name: alta.name, emailEnviado: true },
    });

    const body = q.signUpEmail.mock.calls[0]?.[0]?.body as { password: string };
    expect(body.password.length).toBeGreaterThanOrEqual(24);
    expect(JSON.stringify(r)).not.toContain(body.password);
    expect(JSON.stringify(auditoria.safeAudit.mock.calls)).not.toContain(body.password);

    expect(q.requestPasswordReset).toHaveBeenCalledWith({
      body: { email: alta.email, redirectTo: "/reset-password?alta=equipo" },
    });
    expect(q.finalizarAltaUsuario).toHaveBeenCalledWith(alta.email, "admin_juk");
    expect(auditoriasDe("create")).toEqual([
      expect.objectContaining({
        entidadTipo: "usuario",
        entidadId: OTRO_ID,
        usuarioId: IDS.superAdmin,
        metadata: { role: "admin_juk", emailEnviado: true },
      }),
    ]);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/usuarios");
  });

  it("dos altas no comparten la password placeholder", async () => {
    await createUsuarioAction(alta);
    await createUsuarioAction({ ...alta, email: "int+otra@int.jovenesenuk.com" });

    const [primera, segunda] = q.signUpEmail.mock.calls.map(
      (c) => (c[0] as { body: { password: string } }).body.password
    );
    expect(primera).not.toBe(segunda);
  });

  it("si el email falla, el alta sigue en pie con emailEnviado:false", async () => {
    q.requestPasswordReset.mockRejectedValue(new Error("Resend caído"));

    const r = await createUsuarioAction(alta);

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("debería crear igual");
    expect(r.data.emailEnviado).toBe(false);
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it("si signUpEmail explota (email repetido) devuelve ok:false con fieldErrors y no fija el rol", async () => {
    q.signUpEmail.mockRejectedValue(new Error("duplicate"));

    const r = await createUsuarioAction(alta);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.email?.[0]).toBeTruthy();
    expect(q.finalizarAltaUsuario).not.toHaveBeenCalled();
  });
});

describe("reenviarAccesoUsuarioAction", () => {
  it("valida el id", async () => {
    const r = await reenviarAccesoUsuarioAction("no-es-uuid");
    expect(r).toEqual({ ok: false, error: "Usuario inválido." });
    expect(q.getUsuarioById).not.toHaveBeenCalled();
  });

  it("no manda accesos de familia por esta vía", async () => {
    q.getUsuarioById.mockResolvedValue({ id: OTRO_ID, email: "int+mama@int.jovenesenuk.com", role: "familia" });

    const r = await reenviarAccesoUsuarioAction(OTRO_ID);

    expect(r.ok).toBe(false);
    expect(q.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("manda el link y audita", async () => {
    q.getUsuarioById.mockResolvedValue({ id: OTRO_ID, email: alta.email, role: "admin_juk" });

    const r = await reenviarAccesoUsuarioAction(OTRO_ID);

    expect(r).toEqual({ ok: true, data: { email: alta.email } });
    expect(q.requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(auditoriasDe("update")).toEqual([
      expect.objectContaining({ entidadTipo: "usuario", entidadId: OTRO_ID }),
    ]);
  });

  it("si el envío falla devuelve ok:false y no audita", async () => {
    q.getUsuarioById.mockResolvedValue({ id: OTRO_ID, email: alta.email, role: "admin_juk" });
    q.requestPasswordReset.mockRejectedValue(new Error("Resend caído"));

    const r = await reenviarAccesoUsuarioAction(OTRO_ID);

    expect(r.ok).toBe(false);
    expect(auditoria.safeAudit).not.toHaveBeenCalled();
  });
});

describe("cambiarRolUsuarioAction", () => {
  it("no deja cambiarse el rol a uno mismo (evita quedarse sin super_admin)", async () => {
    const r = await cambiarRolUsuarioAction(IDS.superAdmin, "admin_juk");

    expect(r).toEqual({ ok: false, error: "No podés cambiar tu propio rol." });
    sinEscrituras();
  });

  it.each(["familia", "representante", "root"])("no asigna el rol %s desde esta pantalla", async (rol) => {
    const r = await cambiarRolUsuarioAction(OTRO_ID, rol);

    expect(r).toEqual({ ok: false, error: "Datos inválidos." });
    sinEscrituras();
  });

  it("cambia el rol, audita y revalida", async () => {
    const r = await cambiarRolUsuarioAction(OTRO_ID, "super_admin");

    expect(r).toEqual({ ok: true, data: { id: OTRO_ID } });
    expect(q.setUsuarioRole).toHaveBeenCalledWith(OTRO_ID, "super_admin");
    expect(auditoriasDe("update")[0]).toEqual(
      expect.objectContaining({ entidadId: OTRO_ID, usuarioId: IDS.superAdmin, metadata: { role: "super_admin" } })
    );
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/usuarios");
  });

  it("un usuario inexistente devuelve error claro sin ir a Sentry", async () => {
    q.setUsuarioRole.mockRejectedValue(new UsuarioNotFoundError(OTRO_ID));

    const r = await cambiarRolUsuarioAction(OTRO_ID, "admin_juk");

    expect(r).toEqual({ ok: false, error: "El usuario no existe." });
    expect(sentry.captureException).not.toHaveBeenCalled();
    sinEfectos();
  });
});

describe("setActivoUsuarioAction", () => {
  it("no deja desactivarse a uno mismo", async () => {
    const r = await setActivoUsuarioAction(IDS.superAdmin, false);

    expect(r).toEqual({ ok: false, error: "No podés desactivar tu propia cuenta." });
    sinEscrituras();
  });

  it("valida el id", async () => {
    expect(await setActivoUsuarioAction("x", false)).toEqual({ ok: false, error: "Usuario inválido." });
    sinEscrituras();
  });

  it("desactiva a otro usuario, audita el nuevo estado y revalida", async () => {
    const r = await setActivoUsuarioAction(OTRO_ID, false);

    expect(r).toEqual({ ok: true, data: { id: OTRO_ID } });
    expect(q.setUsuarioActivo).toHaveBeenCalledWith(OTRO_ID, false);
    expect(auditoriasDe("update")[0]?.metadata).toEqual({ isActive: false });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/usuarios");
  });

  it("un error inesperado va a Sentry", async () => {
    q.setUsuarioActivo.mockRejectedValue(new Error("neon caído"));

    const r = await setActivoUsuarioAction(OTRO_ID, true);

    expect(r).toEqual({ ok: false, error: "No pudimos cambiar el estado del usuario." });
    expect(sentry.captureException).toHaveBeenCalledOnce();
  });
});
