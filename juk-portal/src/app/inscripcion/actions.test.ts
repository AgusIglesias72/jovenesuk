import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetearMocks, sentry } from "@/lib/actions/__tests__/mocks";

const q = vi.hoisted(() => ({
  crearInscripcion: vi.fn(),
  getInvitacionByTokenHash: vi.fn(),
  marcarInvitacionRespondida: vi.fn(),
  dentroDelLimite: vi.fn(),
  sendInscripcionRecibidaEmail: vi.fn(),
  sendInscripcionNuevaEmail: vi.fn(),
}));

vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock("@/lib/db/queries/inscripciones-publicas", () => ({
  crearInscripcion: q.crearInscripcion,
  getInvitacionByTokenHash: q.getInvitacionByTokenHash,
  marcarInvitacionRespondida: q.marcarInvitacionRespondida,
}));
vi.mock("@/lib/actions/anti-abuso-request", () => ({ dentroDelLimite: q.dentroDelLimite }));
vi.mock("@/lib/email/send-inscripcion-recibida", () => ({
  sendInscripcionRecibidaEmail: q.sendInscripcionRecibidaEmail,
}));
vi.mock("@/lib/email/send-inscripcion-nueva", () => ({
  sendInscripcionNuevaEmail: q.sendInscripcionNuevaEmail,
}));

import {
  TEXTO_CONSENTIMIENTO,
  VERSION_CONSENTIMIENTO,
} from "@/lib/domain/privacidad/politica";
import { hashTexto } from "@/lib/utils/hash-texto";
import { hashToken } from "@/lib/utils/token-opaco";

import { enviarInscripcion } from "./actions";

const TOKEN = "test-invitation-token-123";
const COMUNICACION_ID = "dddddddd-0000-4000-8000-000000000001";
const VIAJE_DE_LA_CAMPANA = "eeeeeeee-0000-4000-8000-000000000001";
const VIAJE_INYECTADO = "ffffffff-0000-4000-8000-000000000009";

const DIA_MS = 86_400_000;

/** Una invitación que todavía abre el formulario (vigente, sin revocar ni responder). */
function invitacionVigente(extra: Record<string, unknown> = {}) {
  return {
    comunicacionId: COMUNICACION_ID,
    variante: "b",
    expiraEl: new Date(Date.now() + 30 * DIA_MS),
    revocadaEl: null,
    respondidaEl: null,
    reservadoEl: null,
    viajeId: VIAJE_DE_LA_CAMPANA,
    viajeCodigo: "UK-2026-JUL-LONDON",
    viajeNombre: "[INT] Londres julio 2026",
    prospectoId: "cccccccc-0000-4000-8000-000000000001",
    prospectoNombre: "[INT] Colegio San Martín",
    destinatario: "int+tutor@int.jovenesenuk.com",
    ...extra,
  };
}

const FICHA_VALIDA: Record<string, string> = {
  nombre: "[INT] Malena",
  apellido: "[INT] Iglesias",
  fechaNacimiento: "2009-04-12",
  dni: "45102338",
  numeroPasaporte: "AAB123456",
  fechaVencimientoPasaporte: "2031-08-30",
  tutor1Nombre: "[INT] Carolina Iglesias",
  tutor1Celular: "+54 9 11 5555 5555",
  tutor1Email: "int+tutor@int.jovenesenuk.com",
  acepta: "on",
};

function formulario(extra: Record<string, string> = {}): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...FICHA_VALIDA, ...extra })) fd.set(k, v);
  return fd;
}

/** El único argumento con el que se llamó a `crearInscripcion`. */
function datosPersistidos() {
  expect(q.crearInscripcion).toHaveBeenCalledTimes(1);
  return q.crearInscripcion.mock.calls[0]?.[0] as {
    ficha: Record<string, unknown>;
    estado: string;
    variante: string;
    origen: { comunicacionId: string; tokenHash: string; viajeId: string | null } | null;
    consentimiento: { version: string; textoHash: string; el: Date };
  };
}

beforeEach(() => {
  resetearMocks();
  q.dentroDelLimite.mockResolvedValue(true);
  q.getInvitacionByTokenHash.mockResolvedValue(invitacionVigente());
  q.marcarInvitacionRespondida.mockResolvedValue(true);
  q.sendInscripcionRecibidaEmail.mockResolvedValue(undefined);
  q.sendInscripcionNuevaEmail.mockResolvedValue(undefined);
  q.crearInscripcion.mockImplementation(
    async (datos: { ficha: Record<string, unknown>; estado: string }) => ({
      ok: true,
      inscripcion: { id: "ins-1", numero: 123, estado: datos.estado, ...datos.ficha },
    })
  );
});

describe("enviarInscripcion — validación y anti-abuso", () => {
  it("un campo faltante vuelve con fieldErrors y no persiste nada", async () => {
    const fd = formulario();
    fd.delete("numeroPasaporte");

    const res = await enviarInscripcion(null, fd);

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("debía fallar");
    expect(res.fieldErrors?.numeroPasaporte).toBeDefined();
    expect(q.crearInscripcion).not.toHaveBeenCalled();
  });

  it("sin el consentimiento marcado no hay inscripción", async () => {
    const fd = formulario();
    fd.delete("acepta");

    const res = await enviarInscripcion(null, fd);

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("debía fallar");
    expect(res.fieldErrors?.acepta).toBeDefined();
    expect(q.crearInscripcion).not.toHaveBeenCalled();
  });

  it("el honeypot relleno responde ok SIN persistir ni mandar mails", async () => {
    const res = await enviarInscripcion(null, formulario({ website: "https://spam.example" }));

    expect(res.ok).toBe(true);
    expect(q.crearInscripcion).not.toHaveBeenCalled();
    expect(q.dentroDelLimite).not.toHaveBeenCalled();
    expect(q.sendInscripcionRecibidaEmail).not.toHaveBeenCalled();
  });

  it("aplica el rate limit por email y por token, y frena sin persistir", async () => {
    q.dentroDelLimite.mockResolvedValue(false);

    const res = await enviarInscripcion(null, formulario({ token: TOKEN }));

    expect(res.ok).toBe(false);
    expect(q.dentroDelLimite).toHaveBeenCalledWith("inscripcion", {
      email: FICHA_VALIDA.tutor1Email,
      tokenHash: hashToken(TOKEN),
    });
    expect(q.crearInscripcion).not.toHaveBeenCalled();
  });
});

describe("enviarInscripcion — contexto de campaña", () => {
  it("con un token vigente guarda como recibida, con el viaje y la variante de la campaña", async () => {
    const res = await enviarInscripcion(null, formulario({ token: TOKEN }));

    expect(res.ok).toBe(true);
    expect(q.getInvitacionByTokenHash).toHaveBeenCalledWith(hashToken(TOKEN));

    const datos = datosPersistidos();
    expect(datos.estado).toBe("recibida");
    expect(datos.variante).toBe("b");
    expect(datos.origen).toEqual({
      comunicacionId: COMUNICACION_ID,
      tokenHash: hashToken(TOKEN),
      viajeId: VIAJE_DE_LA_CAMPANA,
    });
    expect(q.marcarInvitacionRespondida).toHaveBeenCalledWith(COMUNICACION_ID);
  });

  it("un token vencido guarda igual, sin contexto y en requiere_revision", async () => {
    q.getInvitacionByTokenHash.mockResolvedValue(
      invitacionVigente({ expiraEl: new Date(Date.now() - DIA_MS) })
    );

    const res = await enviarInscripcion(null, formulario({ token: TOKEN }));

    expect(res.ok).toBe(true);
    const datos = datosPersistidos();
    expect(datos.estado).toBe("requiere_revision");
    expect(datos.origen).toBeNull();
    expect(q.marcarInvitacionRespondida).not.toHaveBeenCalled();
  });

  it("un token revocado guarda igual, sin contexto y en requiere_revision", async () => {
    q.getInvitacionByTokenHash.mockResolvedValue(
      invitacionVigente({ revocadaEl: new Date(Date.now() - 1000) })
    );

    const res = await enviarInscripcion(null, formulario({ token: TOKEN }));

    expect(res.ok).toBe(true);
    const datos = datosPersistidos();
    expect(datos.estado).toBe("requiere_revision");
    expect(datos.origen).toBeNull();
  });

  it("una invitación ya respondida no vuelve a dar contexto", async () => {
    q.getInvitacionByTokenHash.mockResolvedValue(
      invitacionVigente({ respondidaEl: new Date(Date.now() - 1000) })
    );

    await enviarInscripcion(null, formulario({ token: TOKEN }));

    expect(datosPersistidos().origen).toBeNull();
  });

  it("sin token no se busca invitación y la ficha queda para revisar", async () => {
    const res = await enviarInscripcion(null, formulario());

    expect(res.ok).toBe(true);
    expect(q.getInvitacionByTokenHash).not.toHaveBeenCalled();
    const datos = datosPersistidos();
    expect(datos.estado).toBe("requiere_revision");
    expect(datos.origen).toBeNull();
    expect(datos.variante).toBe("a");
  });

  it("si la lectura de la invitación se cae, la ficha NO se pierde", async () => {
    q.getInvitacionByTokenHash.mockRejectedValue(new Error("neon caído"));

    const res = await enviarInscripcion(null, formulario({ token: TOKEN }));

    expect(res.ok).toBe(true);
    expect(datosPersistidos().estado).toBe("requiere_revision");
    expect(sentry.captureException).toHaveBeenCalled();
  });
});

describe("enviarInscripcion — lo que NO se confía del cliente", () => {
  it("un viajeId inyectado en el FormData se ignora: manda el del token", async () => {
    await enviarInscripcion(
      null,
      formulario({ token: TOKEN, viajeId: VIAJE_INYECTADO, estado: "procesada" })
    );

    const datos = datosPersistidos();
    expect(datos.origen?.viajeId).toBe(VIAJE_DE_LA_CAMPANA);
    expect(datos.estado).toBe("recibida");
    expect(datos.ficha).not.toHaveProperty("viajeId");
    expect(datos.ficha).not.toHaveProperty("estado");
  });

  it("sin token, un viajeId inyectado tampoco inscribe en ningún viaje", async () => {
    await enviarInscripcion(
      null,
      formulario({ viajeId: VIAJE_INYECTADO, comunicacionId: COMUNICACION_ID })
    );

    const datos = datosPersistidos();
    expect(datos.origen).toBeNull();
    expect(datos.ficha).not.toHaveProperty("comunicacionId");
  });

  it("el DNI llega normalizado a dígitos (TEC-12)", async () => {
    await enviarInscripcion(null, formulario({ dni: " 45.102.338 " }));

    expect(datosPersistidos().ficha.dni).toBe("45102338");
  });
});

describe("enviarInscripcion — consentimiento", () => {
  it("queda sellado con la versión y el hash del texto aceptado", async () => {
    const antes = Date.now();

    await enviarInscripcion(null, formulario({ token: TOKEN }));

    const { consentimiento } = datosPersistidos();
    expect(consentimiento.version).toBe(VERSION_CONSENTIMIENTO);
    expect(consentimiento.textoHash).toBe(hashTexto(TEXTO_CONSENTIMIENTO));
    expect(consentimiento.el.getTime()).toBeGreaterThanOrEqual(antes);
  });
});

describe("enviarInscripcion — desenlaces", () => {
  it("devuelve el código INS-000123 de la ficha guardada", async () => {
    const res = await enviarInscripcion(null, formulario({ token: TOKEN }));

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("debía guardar");
    expect(res.data.codigo).toBe("INS-000123");
  });

  it("la colisión de unique responde 'ya recibimos tu ficha' y no un error", async () => {
    q.crearInscripcion.mockResolvedValue({ ok: false, motivo: "dni_ya_cargado" });

    const res = await enviarInscripcion(null, formulario({ token: TOKEN }));

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("debía responder ok");
    expect(res.data.mensaje).toContain("Ya recibimos tu ficha");
    expect(res.data.codigo).toBeNull();
    expect(q.sendInscripcionRecibidaEmail).not.toHaveBeenCalled();
    expect(q.sendInscripcionNuevaEmail).not.toHaveBeenCalled();
  });

  it("un fallo inesperado al persistir sí es un error y va a Sentry", async () => {
    q.crearInscripcion.mockRejectedValue(new Error("neon caído"));

    const res = await enviarInscripcion(null, formulario({ token: TOKEN }));

    expect(res.ok).toBe(false);
    expect(sentry.captureException).toHaveBeenCalled();
  });

  it("un fallo de mail NO cambia el ActionResult: la ficha ya está guardada", async () => {
    q.sendInscripcionRecibidaEmail.mockRejectedValue(new Error("resend caído"));
    q.sendInscripcionNuevaEmail.mockRejectedValue(new Error("resend caído"));
    q.marcarInvitacionRespondida.mockRejectedValue(new Error("neon caído"));

    const res = await enviarInscripcion(null, formulario({ token: TOKEN }));

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("debía guardar");
    expect(res.data.codigo).toBe("INS-000123");
    expect(sentry.captureException).toHaveBeenCalledTimes(3);
  });
});
