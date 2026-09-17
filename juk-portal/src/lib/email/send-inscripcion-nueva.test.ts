import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { filaInscripcion, valoresNivel2De } from "./__tests__/inscripcion-fixture";

// Las queries arrastran @/lib/db (que exige DATABASE_URL): mockeadas.
const admins = vi.fn<() => Promise<string[]>>();

vi.mock("@/lib/db/queries/usuarios", () => ({
  listEmailsAdmins: () => admins(),
}));

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
 * mock eso revienta el test en vez de pasar desapercibido.
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
  asuntoInscripcionNueva,
  fichaInscripcionUrl,
  sendInscripcionNuevaEmail,
} from "./send-inscripcion-nueva";

const fila = filaInscripcion();
const viaje = { nombre: "Londres en Julio", codigo: "UK-2026-JUL-LONDON" };

beforeEach(() => {
  limpiarEmailsDryRun();
  capturados.length = 0;
  admins.mockReset();
  admins.mockResolvedValue(["ana@jovenesenuk.com"]);
  vi.stubEnv("EMAIL_DRY_RUN", "1");
  vi.stubEnv("RESEND_API_KEY", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("asuntoInscripcionNueva", () => {
  it("distingue la ficha que necesita revisión de la que entró sola", () => {
    expect(asuntoInscripcionNueva(fila)).toBe("Nueva inscripción · INS-000123 · Ana Pérez");
    expect(asuntoInscripcionNueva(filaInscripcion({ estado: "requiere_revision" }))).toBe(
      "Inscripción para revisar · INS-000123 · Ana Pérez"
    );
  });
});

describe("fichaInscripcionUrl", () => {
  it("apunta a la ficha por el código público, sin barras dobles", () => {
    expect(fichaInscripcionUrl(123, "https://portal.jovenesenuk.com/")).toBe(
      "https://portal.jovenesenuk.com/inscripciones/INS-000123"
    );
  });
});

describe("sendInscripcionNuevaEmail · destinatarios", () => {
  it("le avisa a todos los admins activos, en orden, como aviso automático", async () => {
    admins.mockResolvedValue(["ana@jovenesenuk.com", "maria@jovenesenuk.com"]);
    await sendInscripcionNuevaEmail(fila, viaje);

    const enviados = emailsDryRun();
    expect(enviados).toHaveLength(1);
    expect(enviados[0]?.to).toEqual(["ana@jovenesenuk.com", "maria@jovenesenuk.com"]);
    expect(enviados[0]?.tipo).toBe("automatico");
    expect(enviados[0]?.subject).toBe("Nueva inscripción · INS-000123 · Ana Pérez");
  });

  it("sin admins cae a LEADS_NOTIFY_TO", async () => {
    admins.mockResolvedValue([]);
    vi.stubEnv("LEADS_NOTIFY_TO", "avisos@jovenesenuk.com");
    await sendInscripcionNuevaEmail(fila, viaje);

    expect(emailsDryRun()[0]?.to).toEqual(["avisos@jovenesenuk.com"]);
  });

  it("sin admins ni LEADS_NOTIFY_TO cae al reply-to configurado", async () => {
    admins.mockResolvedValue([]);
    vi.stubEnv("LEADS_NOTIFY_TO", undefined);
    await sendInscripcionNuevaEmail(fila, viaje);

    expect(emailsDryRun()[0]?.to).toEqual(["info@jovenesenuk.com"]);
  });

  it("responde al tutor: el equipo le contesta sin abrir el portal", async () => {
    await sendInscripcionNuevaEmail(fila, viaje);

    expect(capturados[0]?.replyTo).toBe("marina@ejemplo.com");
  });
});

describe("sendInscripcionNuevaEmail · contenido", () => {
  it("con EMAIL_DRY_RUN=1 renderiza sin instanciar Resend", async () => {
    await expect(sendInscripcionNuevaEmail(fila, viaje)).resolves.toBeUndefined();

    expect(emailsDryRun()).toHaveLength(1);
    await expect(render(capturados[0]!.react)).resolves.toContain("INS-000123");
  });

  it("el HTML no contiene ningún dato de Nivel 2", async () => {
    await sendInscripcionNuevaEmail(fila, viaje);

    const html = await render(capturados[0]!.react);

    expect(html).not.toContain("45102338");
    expect(html).not.toContain("AAX9931725");
    for (const valor of valoresNivel2De(fila)) {
      expect(html, `filtró un dato de Nivel 2: ${valor}`).not.toContain(valor);
    }
  });

  it("lleva el link directo a la ficha y el contexto de Nivel 1", async () => {
    await sendInscripcionNuevaEmail(fila, viaje);

    const html = await render(capturados[0]!.react);
    expect(html).toContain("/inscripciones/INS-000123");
    expect(html).toContain("marina@ejemplo.com");
    expect(html).toContain("UK-2026-JUL-LONDON");
  });

  it("cuando quedó para revisar, dice el motivo", async () => {
    await sendInscripcionNuevaEmail(
      filaInscripcion({
        estado: "requiere_revision",
        motivo: "La carga llegó sin invitación válida.",
      }),
      viaje
    );

    const html = await render(capturados[0]!.react);
    expect(html).toContain("La carga llegó sin invitación válida.");
    expect(html).toContain("Necesita revisión");
    expect(emailsDryRun()[0]?.subject).toBe("Inscripción para revisar · INS-000123 · Ana Pérez");
  });
});
