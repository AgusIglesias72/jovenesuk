import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { emailsDryRun, limpiarEmailsDryRun } from "./index";
import { asuntoReporteDato, fichaEdicionUrl, sendReporteDatoEmail } from "./send-reporte-dato";

const reporte = {
  alumnoNombre: "Lola",
  alumnoApellido: "Demo Quince",
  alumnoDni: "DEMO-1",
  campo: "Pasaporte",
  comentario: "El correcto es AB1234567",
  reportadoPor: "tutor@demo.jovenesenuk.com",
};

beforeEach(() => {
  limpiarEmailsDryRun();
  admins.mockReset();
  vi.stubEnv("EMAIL_DRY_RUN", "1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("asuntoReporteDato", () => {
  it("identifica al alumno con nombre, apellido y DNI", () => {
    expect(asuntoReporteDato(reporte)).toBe("Dato incorrecto reportado · Lola Demo Quince (DEMO-1)");
  });
});

describe("fichaEdicionUrl", () => {
  it("apunta a la edición del alumno por DNI (slug), sin barras dobles", () => {
    expect(fichaEdicionUrl("45102338", "https://portal.jovenesenuk.com/")).toBe(
      "https://portal.jovenesenuk.com/alumnos/45102338/editar"
    );
  });

  it("codifica el DNI", () => {
    expect(fichaEdicionUrl("DEMO 1", "http://localhost:3000")).toBe(
      "http://localhost:3000/alumnos/DEMO%201/editar"
    );
  });
});

describe("sendReporteDatoEmail", () => {
  it("le avisa a todos los admins activos, como aviso automático", async () => {
    admins.mockResolvedValue(["ana@jovenesenuk.com", "maria@jovenesenuk.com"]);
    await sendReporteDatoEmail(reporte);

    const enviados = emailsDryRun();
    expect(enviados).toHaveLength(1);
    expect(enviados[0]?.to).toEqual(["ana@jovenesenuk.com", "maria@jovenesenuk.com"]);
    expect(enviados[0]?.tipo).toBe("automatico");
    expect(enviados[0]?.subject).toBe(asuntoReporteDato(reporte));
  });

  it("sin admins cae al reply-to configurado para no perder el aviso", async () => {
    admins.mockResolvedValue([]);
    vi.stubEnv("LEADS_NOTIFY_TO", undefined);
    await sendReporteDatoEmail({ ...reporte, comentario: null });

    expect(emailsDryRun()[0]?.to).toEqual(["info@jovenesenuk.com"]);
  });
});
