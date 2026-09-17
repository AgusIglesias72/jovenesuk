import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
 * mock eso revienta el test en vez de pasar desapercibido. Es la única forma de
 * probar "se renderiza sin enviar" y no solo "quedó registrado".
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
  replyTo?: string;
  react: ReactElement;
};

const capturados = vi.hoisted(() => [] as EnvioCapturado[]);

// El envío real sigue corriendo (para ejercitar el dry-run de verdad); el spy
// solo guarda las opciones, que es lo único que el registro de dry-run no
// conserva: el `react` y el `replyTo`.
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
import { asuntoInscripcionRecibida, sendInscripcionRecibidaEmail } from "./send-inscripcion-recibida";

const fila = filaInscripcion();
const viaje = { nombre: "Londres en Julio", codigo: "UK-2026-JUL-LONDON" };

beforeEach(() => {
  limpiarEmailsDryRun();
  capturados.length = 0;
  vi.stubEnv("EMAIL_DRY_RUN", "1");
  vi.stubEnv("RESEND_API_KEY", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("asuntoInscripcionRecibida", () => {
  it("nombra al alumno y lleva el código público", () => {
    expect(asuntoInscripcionRecibida(fila)).toBe("Recibimos la ficha de Ana Pérez · INS-000123");
  });
});

describe("sendInscripcionRecibidaEmail", () => {
  it("le acusa recibo al tutor como comunicación, para que pueda responder", async () => {
    await sendInscripcionRecibidaEmail(fila, viaje);

    const enviados = emailsDryRun();
    expect(enviados).toHaveLength(1);
    expect(enviados[0]?.to).toEqual(["marina@ejemplo.com"]);
    expect(enviados[0]?.tipo).toBe("comunicacion");
    expect(enviados[0]?.subject).toBe("Recibimos la ficha de Ana Pérez · INS-000123");
  });

  it("con EMAIL_DRY_RUN=1 renderiza sin instanciar Resend", async () => {
    await expect(sendInscripcionRecibidaEmail(fila)).resolves.toBeUndefined();

    expect(emailsDryRun()).toHaveLength(1);
    await expect(render(capturados[0]!.react)).resolves.toContain("INS-000123");
  });

  it("el HTML no contiene ningún dato de Nivel 2", async () => {
    await sendInscripcionRecibidaEmail(fila, viaje);

    const html = await render(capturados[0]!.react);

    expect(html).not.toContain("45102338");
    expect(html).not.toContain("AAX9931725");
    for (const valor of valoresNivel2De(fila)) {
      expect(html, `filtró un dato de Nivel 2: ${valor}`).not.toContain(valor);
    }
    // El fixture tiene que ejercitar el catálogo entero: si mañana se suma un
    // campo sensible sin valor de ejemplo, el assert de arriba no probaría nada.
    expect(valoresNivel2De(fila).length).toBeGreaterThanOrEqual(CAMPOS_NIVEL_2.length - 2);
  });

  it("muestra el código, el alumno y el viaje, que sí pueden salir", async () => {
    await sendInscripcionRecibidaEmail({ ...fila, numero: 7 }, viaje);

    const html = await render(capturados[0]!.react);
    expect(html).toContain("INS-000007");
    expect(html).toContain("Ana");
    expect(html).toContain("Londres en Julio");
  });

  it("sin email del tutor no manda nada: la ficha ya quedó guardada igual", async () => {
    await sendInscripcionRecibidaEmail({ ...fila, tutor1Email: "" });

    expect(emailsDryRun()).toHaveLength(0);
    expect(capturados).toHaveLength(0);
  });
});
