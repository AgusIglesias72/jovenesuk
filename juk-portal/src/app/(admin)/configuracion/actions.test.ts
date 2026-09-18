import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.fn();
const getMailSettings = vi.fn();
const setFormularioSettings = vi.fn();
const render = vi.fn();
const captureException = vi.fn();
const revalidatePath = vi.fn();
const safeAudit = vi.fn();

vi.mock("@/lib/auth/helpers", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/lib/db/queries/configuracion", () => ({
  getMailSettings: () => getMailSettings(),
  setMailSettings: vi.fn(),
  setFormularioSettings: (...args: unknown[]) => setFormularioSettings(...args),
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@react-email/render", () => ({
  render: (...args: unknown[]) => render(...args),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));
vi.mock("@/lib/actions/safe-audit", () => ({
  safeAudit: (...args: unknown[]) => safeAudit(...args),
}));

import {
  getEstadoServiciosAction,
  guardarFormularioSettingsAction,
  previewTemplateAction,
} from "./actions";

const MAILS = {
  nombreRemitente: "Jóvenes en UK",
  remitenteAutomaticos: "noreply@jovenesenuk.com",
  remitenteComunicaciones: "hola@jovenesenuk.com",
  replyTo: "hola@jovenesenuk.com",
};

const ENV_TOCADAS = [
  "DATABASE_URL",
  "RESEND_API_KEY",
  "LEADS_NOTIFY_TO",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "GOOGLE_FORM_WEBHOOK_SECRET",
  "TRIGGER_SECRET_KEY",
] as const;

const original = new Map<string, string | undefined>();

describe("actions de /configuracion", () => {
  beforeEach(() => {
    requireRole.mockReset().mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    getMailSettings.mockReset().mockResolvedValue(MAILS);
    render.mockReset().mockResolvedValue("<html>hola</html>");
    setFormularioSettings.mockReset().mockResolvedValue(undefined);
    captureException.mockReset();
    revalidatePath.mockReset();
    safeAudit.mockReset();
    for (const clave of ENV_TOCADAS) {
      original.set(clave, process.env[clave]);
      delete process.env[clave];
    }
  });

  afterEach(() => {
    for (const [clave, valor] of original) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
    original.clear();
  });

  describe("getEstadoServiciosAction", () => {
    it("exige rol super_admin", async () => {
      await getEstadoServiciosAction();
      expect(requireRole).toHaveBeenCalledWith("super_admin");
    });

    it("no devuelve datos si el rol no alcanza (requireRole corta el flujo)", async () => {
      requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
      await expect(getEstadoServiciosAction()).rejects.toThrow("NEXT_REDIRECT");
      expect(getMailSettings).not.toHaveBeenCalled();
    });

    it("marca cada servicio según las env vars presentes y expone solo el host de la DB", async () => {
      process.env.DATABASE_URL = "postgres://user:secreto@ep-juk.neon.tech:5432/juk";
      process.env.RESEND_API_KEY = "re_123";
      process.env.LEADS_NOTIFY_TO = "leads@jovenesenuk.com";

      const res = await getEstadoServiciosAction();

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.dbHost).toBe("ep-juk.neon.tech:5432");
      expect(JSON.stringify(res.data)).not.toContain("secreto");

      const porNombre = new Map(res.data.servicios.map((s) => [s.nombre, s]));
      expect(porNombre.get("Base de datos (Neon)")?.estado).toBe("ok");
      expect(porNombre.get("Base de datos (Neon)")?.detalle).toBe("ep-juk.neon.tech:5432");
      expect(porNombre.get("Resend (emails)")?.estado).toBe("ok");
      expect(porNombre.get("Cloudflare R2 (archivos)")?.estado).toBe("falta");
      expect(porNombre.get("Webhook Google Form")?.estado).toBe("falta");
      expect(porNombre.get("Trigger.dev (jobs)")?.estado).toBe("falta");
      expect(res.data.mails.automaticos).toBe(MAILS.remitenteAutomaticos);
    });

    it("un valor de ejemplo sin reemplazar no cuenta como configurado", async () => {
      process.env.DATABASE_URL = "postgres://juk:real@ep-juk.neon.tech:5432/juk";
      process.env.RESEND_API_KEY = "re_xxxxxxxxxxxx";

      const res = await getEstadoServiciosAction();

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const resend = res.data.servicios.find((s) => s.nombre === "Resend (emails)");
      expect(resend?.estado).toBe("placeholder");
      expect(resend?.detalle).toContain("RESEND_API_KEY");
    });

    it("una DATABASE_URL ilegible no rompe la card", async () => {
      process.env.DATABASE_URL = "no-es-una-url";

      const res = await getEstadoServiciosAction();

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.dbHost).toBe("(no parseable)");
    });

    it("si la lectura falla, devuelve error y reporta a Sentry", async () => {
      const fallo = new Error("db caída");
      getMailSettings.mockRejectedValue(fallo);

      const res = await getEstadoServiciosAction();

      expect(res).toEqual({ ok: false, error: "No pudimos leer el estado de los servicios." });
      expect(captureException).toHaveBeenCalledWith(fallo);
    });
  });

  describe("previewTemplateAction", () => {
    it("exige rol super_admin antes de renderizar", async () => {
      requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
      await expect(previewTemplateAction("welcome")).rejects.toThrow("NEXT_REDIRECT");
      expect(render).not.toHaveBeenCalled();
    });

    it("renderiza un template conocido", async () => {
      const res = await previewTemplateAction("recordatorio");

      expect(res).toEqual({ ok: true, data: { html: "<html>hola</html>" } });
      expect(render).toHaveBeenCalledTimes(1);
    });

    it("rechaza una key desconocida sin renderizar", async () => {
      const res = await previewTemplateAction("../../etc/passwd");

      expect(res).toEqual({ ok: false, error: "Template desconocido." });
      expect(render).not.toHaveBeenCalled();
    });

    it("si el render falla, devuelve error y reporta a Sentry", async () => {
      const fallo = new Error("render roto");
      render.mockRejectedValue(fallo);

      const res = await previewTemplateAction("welcome");

      expect(res).toEqual({ ok: false, error: "No pudimos renderizar el template." });
      expect(captureException).toHaveBeenCalledWith(fallo);
    });
  });

  describe("guardarFormularioSettingsAction", () => {
    it("sin super_admin no guarda nada", async () => {
      requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

      await expect(guardarFormularioSettingsAction({ varianteActiva: "b" })).rejects.toThrow(
        "NEXT_REDIRECT"
      );
      expect(requireRole).toHaveBeenCalledWith("super_admin");
      expect(setFormularioSettings).not.toHaveBeenCalled();
    });

    it("una variante que no existe devuelve fieldErrors y no toca la base", async () => {
      const res = await guardarFormularioSettingsAction({ varianteActiva: "z" });

      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error).toBe("Revisá la variante elegida.");
      expect(res.fieldErrors?.varianteActiva?.length).toBeGreaterThan(0);
      expect(setFormularioSettings).not.toHaveBeenCalled();
    });

    it("un input sin la clave tampoco guarda", async () => {
      const res = await guardarFormularioSettingsAction({});

      expect(res.ok).toBe(false);
      expect(setFormularioSettings).not.toHaveBeenCalled();
    });

    it("guarda la variante, audita y revalida", async () => {
      const res = await guardarFormularioSettingsAction({ varianteActiva: "c" });

      expect(res).toEqual({ ok: true, data: { guardado: true } });
      expect(setFormularioSettings).toHaveBeenCalledWith({ varianteActiva: "c" }, "u1");
      expect(safeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: "update",
          entidadTipo: "configuracion",
          usuarioId: "u1",
          metadata: { clave: "formulario", varianteActiva: "c" },
        })
      );
      expect(revalidatePath).toHaveBeenCalledWith("/configuracion");
      expect(revalidatePath).toHaveBeenCalledWith("/inscripcion");
    });

    it("descarta las claves de más en vez de guardarlas", async () => {
      await guardarFormularioSettingsAction({ varianteActiva: "b", varianteActivaPosta: "c" });

      expect(setFormularioSettings).toHaveBeenCalledWith({ varianteActiva: "b" }, "u1");
    });

    it("si la escritura falla, devuelve error y reporta a Sentry", async () => {
      const fallo = new Error("db caída");
      setFormularioSettings.mockRejectedValue(fallo);

      const res = await guardarFormularioSettingsAction({ varianteActiva: "a" });

      expect(res).toEqual({ ok: false, error: "No pudimos guardar la variante del formulario." });
      expect(captureException).toHaveBeenCalledWith(fallo);
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});
