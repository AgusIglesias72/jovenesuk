import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VIGENCIA_DIAS } from "@/lib/domain/inscripciones/invitacion";
import { CAMPOS_NIVEL_2 } from "@/lib/domain/inscripciones/niveles";

import { filaInscripcion, valoresNivel2De } from "./__tests__/inscripcion-fixture";

// Las queries arrastran @/lib/db (que exige DATABASE_URL): mockeadas.
vi.mock("@/lib/db/queries/configuracion", () => ({
  getMailSettings: vi.fn(async () => ({
    nombreRemitente: "Jóvenes en UK",
    remitenteAutomaticos: "noreply@jovenesenuk.com",
    remitenteComunicaciones: "info@jovenesenuk.com",
    remitenteMarketing: "hola@mkt.jovenesenuk.com",
    replyTo: "info@jovenesenuk.com",
  })),
}));

/**
 * Si el dry-run fallara, `sendEmail` construiría un cliente de Resend: con este
 * mock eso revienta el test en vez de mandar un mail de verdad con un token
 * vivo adentro.
 */
vi.mock("resend", () => ({
  Resend: class {
    constructor() {
      throw new Error("no se puede instanciar Resend en dry-run");
    }
  },
}));

type EnvioCapturado = {
  to: string | string[];
  subject: string;
  tipo?: string;
  headers?: Record<string, string>;
  react: ReactElement;
};

const capturados = vi.hoisted(() => [] as EnvioCapturado[]);

// El envío real sigue corriendo (para ejercitar el dry-run de verdad); el spy
// solo guarda las opciones, que es lo único que el registro de dry-run no
// conserva: el `react` y los `headers`.
vi.mock("./index", async (importOriginal) => {
  const real = await importOriginal<typeof import("./index")>();
  return {
    ...real,
    sendEmail: vi.fn(async (opts: EnvioCapturado) => {
      capturados.push(opts);
      return real.sendEmail(opts as Parameters<typeof real.sendEmail>[0]);
    }),
  };
});

import { emailsDryRun, limpiarEmailsDryRun } from "./index";
import {
  asuntoInvitacion,
  sendInvitacionInscripcionEmail,
  urlInscripcion,
  type InvitacionParaEnviar,
} from "./send-invitacion-inscripcion";

const APP_URL = "https://portal.jovenesenuk.com";
const TOKEN = "test-invitation-token-123";
const BAJA_URL = `${APP_URL}/baja?token=tok-123`;

function invitacion(overrides: Partial<InvitacionParaEnviar> = {}): InvitacionParaEnviar {
  return {
    to: "contacto@colegio-ejemplo.edu.ar",
    token: TOKEN,
    variante: "b",
    contactoNombre: "Prof. Laura",
    prospectoNombre: "Colegio Ejemplo",
    viajeNombre: "Londres en Julio",
    unsubscribeUrl: BAJA_URL,
    ...overrides,
  };
}

beforeEach(() => {
  limpiarEmailsDryRun();
  capturados.length = 0;
  vi.stubEnv("EMAIL_DRY_RUN", "1");
  vi.stubEnv("RESEND_API_KEY", undefined);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", APP_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("urlInscripcion", () => {
  it("manda el token en `t` y la variante en `v`, que es lo que lee el formulario", () => {
    const url = new URL(urlInscripcion(TOKEN, "b"));

    expect(url.pathname).toBe("/inscripcion");
    expect(url.searchParams.get("t")).toBe(TOKEN);
    expect(url.searchParams.get("v")).toBe("b");
  });

  it("sin variante no emite `v`: la decide la campaña o el default del formulario", () => {
    const url = new URL(urlInscripcion(TOKEN));

    expect(url.searchParams.get("t")).toBe(TOKEN);
    expect(url.searchParams.has("v")).toBe(false);
  });

  it("encodea el token en vez de pegarlo crudo al querystring", () => {
    // Un token con `+`, `/` o `=` (lo que emitiría base64 común en vez de
    // base64url) tiene que sobrevivir el viaje de ida y vuelta.
    const raro = "a+b/c=d&t=otro";
    const url = new URL(urlInscripcion(raro));

    expect(url.searchParams.get("t")).toBe(raro);
    expect(url.searchParams.getAll("t")).toHaveLength(1);
  });

  it("no duplica la barra si la variable de entorno termina en una", () => {
    expect(urlInscripcion(TOKEN, null, `${APP_URL}/`)).toContain(`${APP_URL}/inscripcion?`);
  });

  it("lee el entorno en cada llamada, no al importar el módulo", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.jovenesenuk.com");

    expect(urlInscripcion(TOKEN)).toContain("https://staging.jovenesenuk.com/inscripcion?t=");
  });
});

describe("asuntoInvitacion", () => {
  it("nombra el viaje cuando la campaña lo tiene", () => {
    expect(asuntoInvitacion("Londres en Julio")).toBe("Completá la inscripción · Londres en Julio");
  });

  it("sin viaje cae en un asunto genérico, nunca en uno a medio armar", () => {
    expect(asuntoInvitacion(null)).toBe("Completá la inscripción al viaje");
    expect(asuntoInvitacion("   ")).toBe("Completá la inscripción al viaje");
  });
});

describe("sendInvitacionInscripcionEmail", () => {
  it("sale como comunicación desde info@: la familia tiene que poder responder", async () => {
    await sendInvitacionInscripcionEmail(invitacion());

    const enviados = emailsDryRun();
    expect(enviados).toHaveLength(1);
    expect(enviados[0]?.to).toEqual(["contacto@colegio-ejemplo.edu.ar"]);
    expect(enviados[0]?.tipo).toBe("comunicacion");
    expect(enviados[0]?.subject).toBe("Completá la inscripción · Londres en Julio");
  });

  it("respeta el asunto de la campaña cuando lo trae", async () => {
    await sendInvitacionInscripcionEmail(invitacion({ asunto: "Inscripción abierta, Colegio X" }));

    expect(emailsDryRun()[0]?.subject).toBe("Inscripción abierta, Colegio X");
  });

  it("un asunto en blanco no deja el mail sin asunto: cae en el default", async () => {
    await sendInvitacionInscripcionEmail(invitacion({ asunto: "   " }));

    expect(emailsDryRun()[0]?.subject).toBe("Completá la inscripción · Londres en Julio");
  });

  it("lleva SIEMPRE los headers de baja, con y sin asunto propio", async () => {
    await sendInvitacionInscripcionEmail(invitacion());
    await sendInvitacionInscripcionEmail(invitacion({ asunto: "Otro asunto", variante: null }));

    expect(capturados).toHaveLength(2);
    for (const envio of capturados) {
      expect(envio.headers?.["List-Unsubscribe"]).toBe(`<${BAJA_URL}>`);
      expect(envio.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    }
  });

  it("sin link de baja cae en el mailto, y ahí NO promete la baja de un click", async () => {
    // Un One-Click sobre `/baja` sin token le diría al cliente de correo "listo"
    // sin dar de baja a nadie: peor que no ofrecerlo.
    await sendInvitacionInscripcionEmail(invitacion({ unsubscribeUrl: null }));

    const headers = capturados[0]!.headers;
    expect(headers?.["List-Unsubscribe"]).toBe("<mailto:info@jovenesenuk.com?subject=Baja%20de%20comunicaciones>");
    expect(headers?.["List-Unsubscribe-Post"]).toBeUndefined();

    const html = await render(capturados[0]!.react);
    expect(html).toContain("mailto:info@jovenesenuk.com");
  });

  it("anuncia la fecha exacta de vencimiento cuando la invitación la trae", async () => {
    await sendInvitacionInscripcionEmail(
      invitacion({ expiraEl: new Date("2026-12-15T10:30:00.000Z") })
    );

    const html = await render(capturados[0]!.react);
    expect(html).toContain("vence el 15/12/2026");
    expect(html).not.toContain(`vence en ${VIGENCIA_DIAS} días`);
  });

  it("el cuerpo lleva el link con token y variante, y el plazo real de la invitación", async () => {
    await sendInvitacionInscripcionEmail(invitacion());

    const html = await render(capturados[0]!.react);

    expect(html).toContain(TOKEN);
    expect(html).toContain("/inscripcion?t=");
    // El `&` de la URL se escapa en el atributo HTML: se compara por partes.
    expect(html).toContain("v=b");
    expect(html).toContain(`vence en ${VIGENCIA_DIAS} días`);
    expect(html).toContain(BAJA_URL);
    expect(html).toContain("Prof. Laura");
  });

  it("con EMAIL_DRY_RUN=1 renderiza sin instanciar Resend, y devuelve el id para sellar la fila", async () => {
    const { id } = await sendInvitacionInscripcionEmail(invitacion());

    expect(id).toBeTruthy();
    expect(emailsDryRun()).toHaveLength(1);
    await expect(render(capturados[0]!.react)).resolves.toContain("Completar la inscripción");
  });

  it("el mail no puede llevar un dato de Nivel 2: va a una casilla que no controlamos", async () => {
    await sendInvitacionInscripcionEmail(invitacion());

    const html = await render(capturados[0]!.react);

    // 1. Nada del catálogo sensible aparece en el HTML.
    const fila = filaInscripcion();
    for (const valor of valoresNivel2De(fila)) {
      expect(html, `filtró un dato de Nivel 2: ${valor}`).not.toContain(valor);
    }
    expect(valoresNivel2De(fila).length).toBeGreaterThanOrEqual(CAMPOS_NIVEL_2.length - 2);

    // 2. Y el template NI SIQUIERA puede recibirlo: el assert de arriba solo
    // prueba los valores de este fixture, así que se chequea también la
    // superficie. Precargar un DNI "para agilizar" rompe este test.
    const props = capturados[0]!.react.props as Record<string, unknown>;
    const sensibles = Object.keys(props).filter((k) =>
      (CAMPOS_NIVEL_2 as readonly string[]).includes(k)
    );
    expect(sensibles).toEqual([]);
  });

  it("sin contacto ni viaje el saludo sigue siendo humano", async () => {
    await sendInvitacionInscripcionEmail(
      invitacion({ contactoNombre: null, prospectoNombre: null, viajeNombre: null })
    );

    const html = await render(capturados[0]!.react);
    expect(html).toContain("¡Hola!");
    expect(html).not.toContain("Hola null");
    expect(html).not.toContain("equipo de null");
  });
});
