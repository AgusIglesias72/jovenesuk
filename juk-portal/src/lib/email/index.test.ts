import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// La config de mails vive en DB: mockeada para que importar el módulo no
// arrastre @/lib/db (que exige DATABASE_URL) en los unit tests.
const enviar = vi.fn();

vi.mock("@/lib/db/queries/configuracion", () => ({
  getMailSettings: vi.fn(async () => ({
    nombreRemitente: "Jóvenes en UK",
    remitenteAutomaticos: "noreply@jovenesenuk.com",
    remitenteComunicaciones: "info@jovenesenuk.com",
    remitenteMarketing: "hola@mkt.jovenesenuk.com",
    replyTo: "info@jovenesenuk.com",
  })),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: enviar };
  },
}));

import { emailsDryRun, limpiarEmailsDryRun, sendEmail, EmailConfigError } from "./index";

// El template real es JSX; acá solo importa que sendEmail no lo toque.
const plantilla = null as unknown as React.ReactElement;

beforeEach(() => {
  limpiarEmailsDryRun();
  enviar.mockReset();
  delete process.env.EMAIL_DRY_RUN;
  delete process.env.RESEND_API_KEY;
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete process.env.EMAIL_DRY_RUN;
  delete process.env.RESEND_API_KEY;
});

describe("sendEmail en dry-run", () => {
  it("no llama a Resend y registra el envío cuando falta la API key fuera de producción", async () => {
    const r = await sendEmail({ to: "ana@example.com", subject: "Hola", react: plantilla });

    expect(enviar).not.toHaveBeenCalled();
    expect(r?.id).toMatch(/^dry-run-/);
    expect(emailsDryRun()).toHaveLength(1);
    expect(emailsDryRun()[0]).toMatchObject({
      to: ["ana@example.com"],
      subject: "Hola",
      tipo: "comunicacion",
    });
  });

  it("respeta EMAIL_DRY_RUN=1 aunque haya API key", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_DRY_RUN = "1";

    await sendEmail({
      to: ["a@example.com", "b@example.com"],
      subject: "Aviso",
      tipo: "automatico",
      react: plantilla,
    });

    expect(enviar).not.toHaveBeenCalled();
    expect(emailsDryRun()[0]).toMatchObject({
      to: ["a@example.com", "b@example.com"],
      tipo: "automatico",
    });
  });

  it("limpiarEmailsDryRun vacía el registro", async () => {
    await sendEmail({ to: "ana@example.com", subject: "Hola", react: plantilla });
    limpiarEmailsDryRun();
    expect(emailsDryRun()).toHaveLength(0);
  });
});

describe("sendEmail con Resend configurado", () => {
  it("envía con el remitente que resuelve la configuración", async () => {
    process.env.RESEND_API_KEY = "re_test";
    enviar.mockResolvedValue({ data: { id: "msg_1" }, error: null });

    const r = await sendEmail({ to: "ana@example.com", subject: "Hola", react: plantilla });

    expect(r).toEqual({ id: "msg_1" });
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar.mock.calls[0]?.[0]).toMatchObject({
      from: "Jóvenes en UK <info@jovenesenuk.com>",
      to: ["ana@example.com"],
      replyTo: "info@jovenesenuk.com",
    });
    expect(emailsDryRun()).toHaveLength(0);
  });

  it("propaga el error de Resend como EmailEnvioError", async () => {
    process.env.RESEND_API_KEY = "re_test";
    enviar.mockResolvedValue({ data: null, error: { message: "domain not verified" } });

    await expect(
      sendEmail({ to: "ana@example.com", subject: "Hola", react: plantilla })
    ).rejects.toThrow(/domain not verified/);
  });
});

describe("sendEmail en producción sin API key", () => {
  it("lanza EmailConfigError en vez de fallar silenciosamente", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendEmail({ to: "ana@example.com", subject: "Hola", react: plantilla })
    ).rejects.toBeInstanceOf(EmailConfigError);

    errorSpy.mockRestore();
  });
});
