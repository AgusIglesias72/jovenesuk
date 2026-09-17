import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IDS,
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
  convertirAColegio: vi.fn(),
  crearProspectosMasivo: vi.fn(),
  createProspecto: vi.fn(),
  darDeBajaOutreach: vi.fn(),
  getProspectoById: vi.fn(),
  moverProspecto: vi.fn(),
  registrarComunicacion: vi.fn(),
  updateProspecto: vi.fn(),
  sendOutreachEmail: vi.fn(),
  putDocumento: vi.fn(),
  destinatariosDesdeProspectos: vi.fn(),
  crearLoteInvitaciones: vi.fn(),
  resumenLote: vi.fn(),
  revocarInvitacion: vi.fn(),
  enviarTandaDelLote: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", async () => (await import("@/lib/actions/__tests__/mocks")).authHelpers);
vi.mock("next/cache", async () => (await import("@/lib/actions/__tests__/mocks")).nextCache);
vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock("@/lib/actions/safe-audit", async () => (await import("@/lib/actions/__tests__/mocks")).auditoria);
vi.mock("@/lib/db/queries/prospectos", () => ({
  convertirAColegio: q.convertirAColegio,
  crearProspectosMasivo: q.crearProspectosMasivo,
  createProspecto: q.createProspecto,
  darDeBajaOutreach: q.darDeBajaOutreach,
  getProspectoById: q.getProspectoById,
  moverProspecto: q.moverProspecto,
  registrarComunicacion: q.registrarComunicacion,
  updateProspecto: q.updateProspecto,
}));
vi.mock("@/lib/db/queries/invitaciones", () => ({
  destinatariosDesdeProspectos: q.destinatariosDesdeProspectos,
  crearLoteInvitaciones: q.crearLoteInvitaciones,
  resumenLote: q.resumenLote,
  revocarInvitacion: q.revocarInvitacion,
}));
vi.mock("@/lib/jobs/enviar-lote-invitaciones", () => ({
  enviarTandaDelLote: q.enviarTandaDelLote,
}));
vi.mock("@/lib/email/send-outreach", () => ({ sendOutreachEmail: q.sendOutreachEmail }));
vi.mock("@/lib/storage", () => ({ putDocumento: q.putDocumento }));

import { ProspectoNotFoundError } from "@/lib/domain/prospectos";

import {
  continuarLoteAction,
  convertirAColegioAction,
  crearLoteInvitacionesAction,
  createProspectoAction,
  darDeBajaProspectoAction,
  enviarInvitacionIndividualAction,
  enviarOutreachAction,
  importarProspectosAction,
  moverProspectoAction,
  revocarInvitacionAction,
  subirImagenAction,
} from "./actions";

const PROSPECTO_ID = "cdcdcdcd-0000-4000-8000-000000000001";
const LOTE_ID = "efefefef-0000-4000-8000-000000000001";
const COMUNICACION_ID = "dfdfdfdf-0000-4000-8000-000000000001";
const VIAJE_ID = "bcbcbcbc-0000-4000-8000-000000000001";

const prospecto = {
  id: PROSPECTO_ID,
  nombre: "[INT] Colegio San Martín",
  estado: "contactado",
  emails: ["int+colegio@int.jovenesenuk.com"],
  contactoNombre: "[INT] Directora",
  suscritoOutreach: true,
  unsubscribeToken: "tok-123",
};

beforeEach(() => {
  resetearMocks("admin_juk");
  q.getProspectoById.mockResolvedValue(prospecto);
  q.moverProspecto.mockImplementation(async (id: string, estado: string) => ({ ...prospecto, id, estado }));
  q.registrarComunicacion.mockImplementation(async (data: Record<string, unknown>) => ({ id: "com-1", ...data }));
  q.createProspecto.mockImplementation(async (data: Record<string, unknown>) => ({ id: PROSPECTO_ID, ...data }));
  q.sendOutreachEmail.mockResolvedValue({ id: "resend-msg-1" });
  q.convertirAColegio.mockResolvedValue({ colegio: { id: "colegio-1" } });
  q.destinatariosDesdeProspectos.mockResolvedValue({
    incluidos: [
      {
        prospectoId: PROSPECTO_ID,
        prospectoNombre: prospecto.nombre,
        email: prospecto.emails[0],
      },
    ],
    excluidos: [],
  });
  q.crearLoteInvitaciones.mockResolvedValue({ loteId: LOTE_ID, invitaciones: [] });
  q.resumenLote.mockResolvedValue({ loteId: LOTE_ID, total: 20, pendientes: 20 });
  q.enviarTandaDelLote.mockResolvedValue({ enviados: 10, fallidos: 0, restantes: 10 });
  q.revocarInvitacion.mockResolvedValue(true);
});

/** N destinatarios válidos, para probar el tope de la campaña. */
function destinatarios(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    prospectoId: `cdcdcdcd-0000-4000-8000-${String(i).padStart(12, "0")}`,
    prospectoNombre: `[INT] Colegio ${i}`,
    email: `int+colegio${i}@int.jovenesenuk.com`,
  }));
}

describe("moverProspectoAction", () => {
  it("sin sesión redirige sin mover nada", async () => {
    sinSesion();

    expect(
      await urlDeRedirect(() => moverProspectoAction({ id: PROSPECTO_ID, estado: "interesado", posicion: 0 }))
    ).toBe("/login");
    expect(q.moverProspecto).not.toHaveBeenCalled();
  });

  it("una familia no accede al CRM", async () => {
    loguearComo("familia");

    expect(
      await urlDeRedirect(() => moverProspectoAction({ id: PROSPECTO_ID, estado: "interesado", posicion: 0 }))
    ).toBe("/familias");
    expect(q.moverProspecto).not.toHaveBeenCalled();
    expect(q.registrarComunicacion).not.toHaveBeenCalled();
  });

  it("rechaza una etapa fuera del pipeline o una posición negativa", async () => {
    expect(await moverProspectoAction({ id: PROSPECTO_ID, estado: "archivado", posicion: 0 })).toEqual({
      ok: false,
      error: "Movimiento inválido.",
    });
    expect(await moverProspectoAction({ id: PROSPECTO_ID, estado: "ganado", posicion: -1 })).toEqual({
      ok: false,
      error: "Movimiento inválido.",
    });
    expect(q.getProspectoById).not.toHaveBeenCalled();
    expect(q.moverProspecto).not.toHaveBeenCalled();
  });

  it("cambiar de etapa mueve la tarjeta y registra la comunicación con el estado anterior y el nuevo", async () => {
    const r = await moverProspectoAction({ id: PROSPECTO_ID, estado: "interesado", posicion: "2" });

    expect(r.ok).toBe(true);
    expect(q.moverProspecto).toHaveBeenCalledWith(PROSPECTO_ID, "interesado", 2);
    expect(q.registrarComunicacion).toHaveBeenCalledWith({
      prospectoId: PROSPECTO_ID,
      tipo: "cambio_estado",
      meta: { estadoAnterior: "contactado", estadoNuevo: "interesado" },
      creadoPor: IDS.admin,
    });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/prospectos");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith(`/prospectos/${PROSPECTO_ID}`);
  });

  it("reordenar dentro de la misma etapa no ensucia el historial", async () => {
    const r = await moverProspectoAction({ id: PROSPECTO_ID, estado: "contactado", posicion: 5 });

    expect(r.ok).toBe(true);
    expect(q.moverProspecto).toHaveBeenCalledWith(PROSPECTO_ID, "contactado", 5);
    expect(q.registrarComunicacion).not.toHaveBeenCalled();
  });

  it("un prospecto inexistente no se mueve", async () => {
    q.getProspectoById.mockResolvedValue(null);

    const r = await moverProspectoAction({ id: PROSPECTO_ID, estado: "interesado", posicion: 0 });

    expect(r).toEqual({ ok: false, error: "El prospecto no existe." });
    expect(q.moverProspecto).not.toHaveBeenCalled();
  });

  it("si mover falla, no registra un cambio de estado que no pasó", async () => {
    q.moverProspecto.mockRejectedValue(new Error("neon caído"));

    const r = await moverProspectoAction({ id: PROSPECTO_ID, estado: "interesado", posicion: 0 });

    expect(r).toEqual({ ok: false, error: "No pudimos mover el prospecto." });
    expect(q.registrarComunicacion).not.toHaveBeenCalled();
    expect(sentry.captureException).toHaveBeenCalledOnce();
  });
});

describe("createProspectoAction", () => {
  it("valida con fieldErrors y no crea", async () => {
    const r = await createProspectoAction({ nombre: " ", emails: ["no-es-email"] });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.nombre?.[0]).toBe("Ingresá el nombre del prospecto");
    expect(r.fieldErrors?.["emails.0"]).toBeDefined();
    expect(q.createProspecto).not.toHaveBeenCalled();
    sinEfectos();
  });

  it("crea a nombre del usuario logueado y audita", async () => {
    const r = await createProspectoAction({ nombre: "[INT] Colegio Nuevo", createdBy: IDS.superAdmin });

    expect(r.ok).toBe(true);
    expect(q.createProspecto).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "[INT] Colegio Nuevo", estado: "nuevo", createdBy: IDS.admin })
    );
    expect(auditoriasDe("create")).toEqual([
      expect.objectContaining({ entidadTipo: "prospecto", entidadId: PROSPECTO_ID }),
    ]);
  });
});

describe("enviarOutreachAction", () => {
  const envio = { prospectoId: PROSPECTO_ID, asunto: "Viajes 2027", mensaje: "Hola,\n\nLes escribimos por…" };

  it("no manda correos a un prospecto que se dio de baja", async () => {
    q.getProspectoById.mockResolvedValue({ ...prospecto, suscritoOutreach: false });

    const r = await enviarOutreachAction(envio);

    expect(r).toEqual({ ok: false, error: "El prospecto se dio de baja de los correos." });
    expect(q.sendOutreachEmail).not.toHaveBeenCalled();
    expect(q.registrarComunicacion).not.toHaveBeenCalled();
  });

  it("sin email cargado no intenta enviar", async () => {
    q.getProspectoById.mockResolvedValue({ ...prospecto, emails: [] });

    const r = await enviarOutreachAction(envio);

    expect(r.ok).toBe(false);
    expect(q.sendOutreachEmail).not.toHaveBeenCalled();
  });

  it("valida asunto y mensaje con fieldErrors", async () => {
    const r = await enviarOutreachAction({ prospectoId: PROSPECTO_ID, asunto: "Hi", mensaje: "corto" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.asunto).toBeDefined();
    expect(r.fieldErrors?.mensaje).toBeDefined();
    expect(q.getProspectoById).not.toHaveBeenCalled();
  });

  it("envía con link de baja, registra la comunicación enviada y audita", async () => {
    const r = await enviarOutreachAction(envio);

    expect(r.ok).toBe(true);
    expect(q.sendOutreachEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: prospecto.emails[0],
        asunto: "Viajes 2027",
        cuerpo: ["Hola,", "Les escribimos por…"],
        unsubscribeUrl: expect.stringContaining("/baja?token=tok-123"),
      })
    );
    expect(q.registrarComunicacion).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "email", estado: "enviado", resendMessageId: "resend-msg-1" })
    );
    expect(auditoriasDe("update")).toHaveLength(1);
  });

  it("si Resend falla, deja registrado el intento fallido", async () => {
    q.sendOutreachEmail.mockRejectedValue(new Error("Resend 500"));

    const r = await enviarOutreachAction(envio);

    expect(r.ok).toBe(false);
    expect(q.registrarComunicacion).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "email", estado: "fallido" })
    );
    expect(sentry.captureException).toHaveBeenCalledOnce();
  });
});

describe("importarProspectosAction", () => {
  it("un CSV vacío no llega a la base", async () => {
    const r = await importarProspectosAction({ texto: "" });

    expect(r.ok).toBe(false);
    expect(q.crearProspectosMasivo).not.toHaveBeenCalled();
  });

  it("una familia no puede importar", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => importarProspectosAction({ texto: "nombre\nX" }))).toBe("/familias");
    expect(q.crearProspectosMasivo).not.toHaveBeenCalled();
  });
});

describe("convertirAColegioAction", () => {
  it("valida el id", async () => {
    expect(await convertirAColegioAction("colegio-san-martin")).toEqual({
      ok: false,
      error: "Prospecto inválido.",
    });
    expect(q.convertirAColegio).not.toHaveBeenCalled();
  });

  it("convierte, audita el colegio creado y revalida ambos listados", async () => {
    const r = await convertirAColegioAction(PROSPECTO_ID);

    expect(r).toEqual({ ok: true, data: { colegioId: "colegio-1" } });
    expect(q.convertirAColegio).toHaveBeenCalledWith(PROSPECTO_ID, IDS.admin);
    expect(auditoriasDe("create")).toEqual([
      expect.objectContaining({ entidadTipo: "colegio", entidadId: "colegio-1" }),
    ]);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/colegios");
  });

  it("un prospecto inexistente devuelve error claro", async () => {
    q.convertirAColegio.mockRejectedValue(new ProspectoNotFoundError(PROSPECTO_ID));

    expect(await convertirAColegioAction(PROSPECTO_ID)).toEqual({
      ok: false,
      error: "El prospecto no existe.",
    });
  });
});

describe("subirImagenAction", () => {
  function conImagen(mime: string, bytes: number, prospectoId = PROSPECTO_ID) {
    const fd = new FormData();
    fd.set("prospectoId", prospectoId);
    fd.set("file", new File([new Uint8Array(bytes)], "logo", { type: mime }));
    return fd;
  }

  it.each([
    ["un SVG (puede llevar scripts)", conImagen("image/svg+xml", 100)],
    ["una imagen de más de 5 MB", conImagen("image/png", 5 * 1024 * 1024 + 1)],
    ["un prospectoId que no es uuid", conImagen("image/png", 100, "../../colegios")],
  ])("rechaza %s sin subir al storage", async (_caso, fd) => {
    const r = await subirImagenAction(fd);

    expect(r.ok).toBe(false);
    expect(q.putDocumento).not.toHaveBeenCalled();
    expect(q.updateProspecto).not.toHaveBeenCalled();
  });

  it("una familia no puede subir imágenes al CRM", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => subirImagenAction(conImagen("image/png", 100)))).toBe("/familias");
    expect(q.putDocumento).not.toHaveBeenCalled();
  });
});

describe("crearLoteInvitacionesAction", () => {
  const campana = { ids: [PROSPECTO_ID], viajeId: VIAJE_ID, variante: "b" };

  it("sin sesión no arma ninguna campaña", async () => {
    sinSesion();

    expect(await urlDeRedirect(() => crearLoteInvitacionesAction(campana))).toBe("/login");
    expect(q.destinatariosDesdeProspectos).not.toHaveBeenCalled();
    expect(q.crearLoteInvitaciones).not.toHaveBeenCalled();
  });

  it("una familia no manda invitaciones masivas", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => crearLoteInvitacionesAction(campana))).toBe("/familias");
    expect(q.crearLoteInvitaciones).not.toHaveBeenCalled();
  });

  it("más de 200 destinatarios no se arma: hay que partir la campaña", async () => {
    q.destinatariosDesdeProspectos.mockResolvedValue({
      incluidos: destinatarios(201),
      excluidos: [],
    });

    const r = await crearLoteInvitacionesAction({ viajeId: VIAJE_ID });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.error).toContain("201");
    expect(r.error).toContain("200");
    expect(q.crearLoteInvitaciones).not.toHaveBeenCalled();
  });

  it("justo 200 sí entra", async () => {
    q.destinatariosDesdeProspectos.mockResolvedValue({
      incluidos: destinatarios(200),
      excluidos: [],
    });

    const r = await crearLoteInvitacionesAction({ viajeId: VIAJE_ID });

    expect(r).toEqual({ ok: true, data: { loteId: LOTE_ID, total: 200, excluidos: 0 } });
  });

  it("el dado de baja queda afuera y no hay forma de forzarlo desde el cliente", async () => {
    q.destinatariosDesdeProspectos.mockResolvedValue({
      incluidos: [],
      excluidos: [
        { prospectoId: PROSPECTO_ID, prospectoNombre: prospecto.nombre, motivo: "dado_de_baja" },
      ],
    });

    const r = await crearLoteInvitacionesAction({
      ...campana,
      // Lo que podría mandar un cliente modificado: se descarta al parsear y
      // nunca llega a la query que decide a quién se le manda.
      forzar: true,
      incluirBajas: true,
      emails: ["int+cualquiera@int.jovenesenuk.com"],
    });

    expect(r.ok).toBe(false);
    expect(q.destinatariosDesdeProspectos).toHaveBeenCalledWith({ ids: [PROSPECTO_ID] });
    expect(q.crearLoteInvitaciones).not.toHaveBeenCalled();
  });

  it("el destinatario sale de la base, nunca del cliente", async () => {
    await crearLoteInvitacionesAction(campana);

    expect(q.crearLoteInvitaciones).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatarios: [{ prospectoId: PROSPECTO_ID, destinatario: prospecto.emails[0] }],
        viajeId: VIAJE_ID,
        variante: "b",
        creadoPor: IDS.admin,
      })
    );
    expect(auditoriasDe("create")).toEqual([
      expect.objectContaining({ entidadTipo: "invitacion_lote", entidadId: LOTE_ID }),
    ]);
  });

  it("el lote se crea aunque el envío falle: crear no manda un solo mail", async () => {
    q.enviarTandaDelLote.mockRejectedValue(new Error("Resend caído"));

    const creado = await crearLoteInvitacionesAction(campana);

    expect(creado).toEqual({ ok: true, data: { loteId: LOTE_ID, total: 1, excluidos: 0 } });
    expect(q.enviarTandaDelLote).not.toHaveBeenCalled();

    // Y si la primera tanda se cae, la campaña sigue en pie con su id.
    const avance = await continuarLoteAction({ loteId: LOTE_ID });

    expect(avance.ok).toBe(false);
    if (avance.ok) throw new Error("debería fallar");
    expect(avance.error).toContain("no se reenvía");
  });
});

describe("continuarLoteAction", () => {
  it("una familia no puede empujar una campaña", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => continuarLoteAction({ loteId: LOTE_ID }))).toBe("/familias");
    expect(q.enviarTandaDelLote).not.toHaveBeenCalled();
  });

  it("una campaña inexistente no dispara ningún envío", async () => {
    q.resumenLote.mockResolvedValue(null);

    expect(await continuarLoteAction({ loteId: LOTE_ID })).toEqual({
      ok: false,
      error: "Esa campaña no existe.",
    });
    expect(q.enviarTandaDelLote).not.toHaveBeenCalled();
  });

  it("es reanudable: cada llamada manda una tanda y devuelve lo que queda", async () => {
    q.enviarTandaDelLote
      .mockResolvedValueOnce({ enviados: 10, fallidos: 0, restantes: 10 })
      .mockResolvedValueOnce({ enviados: 9, fallidos: 1, restantes: 0 });

    const primera = await continuarLoteAction({ loteId: LOTE_ID });
    const segunda = await continuarLoteAction({ loteId: LOTE_ID });

    expect(primera).toEqual({ ok: true, data: { enviados: 10, fallidos: 0, restantes: 10 } });
    expect(segunda).toEqual({ ok: true, data: { enviados: 9, fallidos: 1, restantes: 0 } });
    expect(q.enviarTandaDelLote).toHaveBeenCalledTimes(2);
    expect(q.enviarTandaDelLote).toHaveBeenCalledWith(LOTE_ID);
  });

  it("una tanda que no movió nada no ensucia la auditoría", async () => {
    q.enviarTandaDelLote.mockResolvedValue({ enviados: 0, fallidos: 0, restantes: 0 });

    const r = await continuarLoteAction({ loteId: LOTE_ID });

    expect(r.ok).toBe(true);
    expect(auditoriasDe("update")).toHaveLength(0);
  });
});

describe("revocarInvitacionAction", () => {
  it("una familia no puede revocar", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => revocarInvitacionAction(COMUNICACION_ID))).toBe("/familias");
    expect(q.revocarInvitacion).not.toHaveBeenCalled();
  });

  it("corta el link y lo deja auditado", async () => {
    const r = await revocarInvitacionAction(COMUNICACION_ID);

    expect(r).toEqual({ ok: true, data: { comunicacionId: COMUNICACION_ID } });
    expect(q.revocarInvitacion).toHaveBeenCalledWith(COMUNICACION_ID);
    expect(auditoriasDe("update")).toEqual([
      expect.objectContaining({ entidadTipo: "invitacion", entidadId: COMUNICACION_ID }),
    ]);
  });

  it("una comunicación que no es invitación no se revoca", async () => {
    q.revocarInvitacion.mockResolvedValue(false);

    expect(await revocarInvitacionAction(COMUNICACION_ID)).toEqual({
      ok: false,
      error: "Esa invitación no existe.",
    });
    expect(auditoriasDe("update")).toHaveLength(0);
  });

  it("valida el id", async () => {
    expect(await revocarInvitacionAction("no-es-uuid")).toEqual({
      ok: false,
      error: "Invitación inválida.",
    });
    expect(q.revocarInvitacion).not.toHaveBeenCalled();
  });
});

describe("enviarInvitacionIndividualAction", () => {
  const envio = { prospectoId: PROSPECTO_ID, viajeId: VIAJE_ID };

  it("una familia no puede invitar desde la ficha", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => enviarInvitacionIndividualAction(envio))).toBe("/familias");
    expect(q.crearLoteInvitaciones).not.toHaveBeenCalled();
  });

  it("no le manda al que se dio de baja", async () => {
    q.destinatariosDesdeProspectos.mockResolvedValue({
      incluidos: [],
      excluidos: [
        { prospectoId: PROSPECTO_ID, prospectoNombre: prospecto.nombre, motivo: "dado_de_baja" },
      ],
    });

    expect(await enviarInvitacionIndividualAction(envio)).toEqual({
      ok: false,
      error: "El prospecto se dio de baja de los correos.",
    });
    expect(q.crearLoteInvitaciones).not.toHaveBeenCalled();
    expect(q.enviarTandaDelLote).not.toHaveBeenCalled();
  });

  it("manda un lote de uno y devuelve la casilla real", async () => {
    q.enviarTandaDelLote.mockResolvedValue({ enviados: 1, fallidos: 0, restantes: 0 });

    const r = await enviarInvitacionIndividualAction(envio);

    expect(r).toEqual({
      ok: true,
      data: { loteId: LOTE_ID, destinatario: prospecto.emails[0] },
    });
    expect(q.enviarTandaDelLote).toHaveBeenCalledWith(LOTE_ID, { tamanio: 1 });
  });

  it("si el mail no sale, lo dice en vez de festejar", async () => {
    q.enviarTandaDelLote.mockResolvedValue({ enviados: 0, fallidos: 1, restantes: 0 });

    const r = await enviarInvitacionIndividualAction(envio);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.error).toContain("historial");
  });
});

describe("darDeBajaProspectoAction", () => {
  it("una familia no puede dar de baja prospectos", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => darDeBajaProspectoAction(PROSPECTO_ID))).toBe("/familias");
    expect(q.darDeBajaOutreach).not.toHaveBeenCalled();
  });
});
