import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.fn();
const signUpEmail = vi.fn();
const requestPasswordReset = vi.fn();
const finalizarAltaUsuario = vi.fn();
const getUsuarioById = vi.fn();
const setUsuarioActivo = vi.fn();
const setUsuarioRole = vi.fn();
const safeAudit = vi.fn();
const captureException = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signUpEmail: (...args: unknown[]) => signUpEmail(...args),
      requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args),
    },
  },
}));
vi.mock("@/lib/auth/helpers", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/lib/db/queries/usuarios", () => ({
  finalizarAltaUsuario: (...args: unknown[]) => finalizarAltaUsuario(...args),
  getUsuarioById: (...args: unknown[]) => getUsuarioById(...args),
  setUsuarioActivo: (...args: unknown[]) => setUsuarioActivo(...args),
  setUsuarioRole: (...args: unknown[]) => setUsuarioRole(...args),
}));
vi.mock("@/lib/actions/safe-audit", () => ({
  safeAudit: (...args: unknown[]) => safeAudit(...args),
}));

import {
  createUsuarioAction,
  reenviarAccesoUsuarioAction,
  setActivoUsuarioAction,
} from "./actions";

const SESSION = { user: { id: "11111111-1111-1111-1111-111111111111", name: "Ana" } };
const OTRO_ID = "22222222-2222-2222-2222-222222222222";

const alta = { name: "Tomás Méndez", email: "tomas@jovenesenuk.com", role: "admin_juk" };

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue(SESSION);
  signUpEmail.mockResolvedValue({ user: { id: OTRO_ID } });
  requestPasswordReset.mockResolvedValue({ status: true });
  finalizarAltaUsuario.mockResolvedValue(undefined);
  safeAudit.mockResolvedValue(undefined);
});

describe("createUsuarioAction", () => {
  it("exige super_admin antes de tocar nada", async () => {
    await createUsuarioAction(alta);
    expect(requireRole).toHaveBeenCalledWith("super_admin");
  });

  it("rechaza el input inválido con fieldErrors y sin crear al usuario", async () => {
    const r = await createUsuarioAction({ name: "", email: "no-es-email", role: "admin_juk" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.email?.[0]).toBeTruthy();
    expect(r.fieldErrors?.name?.[0]).toBeTruthy();
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("crea el usuario con una password que no se devuelve y manda el link de acceso", async () => {
    const r = await createUsuarioAction(alta);

    expect(r).toEqual({
      ok: true,
      data: { email: alta.email, name: alta.name, emailEnviado: true },
    });
    expect(JSON.stringify(r)).not.toContain("password");

    const body = signUpEmail.mock.calls[0]?.[0]?.body as { password: string };
    expect(body.password.length).toBeGreaterThanOrEqual(24);
    expect(requestPasswordReset).toHaveBeenCalledWith({
      body: { email: alta.email, redirectTo: "/reset-password?alta=equipo" },
    });
    expect(finalizarAltaUsuario).toHaveBeenCalledWith(alta.email, "admin_juk");
  });

  it("si el email falla, el alta sigue en pie con emailEnviado:false", async () => {
    requestPasswordReset.mockRejectedValue(new Error("Resend caído"));

    const r = await createUsuarioAction(alta);

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("debería crear igual");
    expect(r.data.emailEnviado).toBe(false);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("si signUpEmail explota (email repetido) devuelve ok:false con fieldErrors", async () => {
    signUpEmail.mockRejectedValue(new Error("duplicate"));

    const r = await createUsuarioAction(alta);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.email?.[0]).toBeTruthy();
  });
});

describe("reenviarAccesoUsuarioAction", () => {
  it("valida el id", async () => {
    const r = await reenviarAccesoUsuarioAction("no-es-uuid");
    expect(r).toEqual({ ok: false, error: "Usuario inválido." });
    expect(getUsuarioById).not.toHaveBeenCalled();
  });

  it("no manda accesos de familia por esta vía", async () => {
    getUsuarioById.mockResolvedValue({ id: OTRO_ID, email: "mama@example.com", role: "familia" });

    const r = await reenviarAccesoUsuarioAction(OTRO_ID);

    expect(r.ok).toBe(false);
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("manda el link y audita", async () => {
    getUsuarioById.mockResolvedValue({ id: OTRO_ID, email: alta.email, role: "admin_juk" });

    const r = await reenviarAccesoUsuarioAction(OTRO_ID);

    expect(r).toEqual({ ok: true, data: { email: alta.email } });
    expect(requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(safeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entidadTipo: "usuario", entidadId: OTRO_ID })
    );
  });

  it("si el envío falla devuelve ok:false y no audita", async () => {
    getUsuarioById.mockResolvedValue({ id: OTRO_ID, email: alta.email, role: "admin_juk" });
    requestPasswordReset.mockRejectedValue(new Error("Resend caído"));

    const r = await reenviarAccesoUsuarioAction(OTRO_ID);

    expect(r.ok).toBe(false);
    expect(safeAudit).not.toHaveBeenCalled();
  });
});

describe("setActivoUsuarioAction", () => {
  it("no deja desactivarse a uno mismo", async () => {
    const r = await setActivoUsuarioAction(SESSION.user.id, false);

    expect(r).toEqual({ ok: false, error: "No podés desactivar tu propia cuenta." });
    expect(setUsuarioActivo).not.toHaveBeenCalled();
  });
});
