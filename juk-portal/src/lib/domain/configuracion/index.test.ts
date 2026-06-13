import { describe, expect, it } from "vitest";

import {
  MAIL_SETTINGS_DEFAULT,
  mailSettingsSchema,
  remitenteDe,
} from "./index";

describe("mailSettingsSchema", () => {
  it("acepta los defaults", () => {
    expect(mailSettingsSchema.safeParse(MAIL_SETTINGS_DEFAULT).success).toBe(true);
  });

  it("rechaza emails inválidos y nombre vacío", () => {
    expect(
      mailSettingsSchema.safeParse({
        ...MAIL_SETTINGS_DEFAULT,
        remitenteAutomaticos: "no-es-un-email",
      }).success
    ).toBe(false);
    expect(
      mailSettingsSchema.safeParse({ ...MAIL_SETTINGS_DEFAULT, nombreRemitente: "  " }).success
    ).toBe(false);
  });

  it("trimea los valores", () => {
    const r = mailSettingsSchema.parse({
      ...MAIL_SETTINGS_DEFAULT,
      replyTo: "  info@jovenesenuk.com  ",
    });
    expect(r.replyTo).toBe("info@jovenesenuk.com");
  });
});

describe("remitenteDe (MIN-09)", () => {
  it("automático sale del remitente noreply; comunicación del info", () => {
    expect(remitenteDe(MAIL_SETTINGS_DEFAULT, "automatico")).toBe(
      "Jóvenes en UK <noreply@jovenesenuk.com>"
    );
    expect(remitenteDe(MAIL_SETTINGS_DEFAULT, "comunicacion")).toBe(
      "Jóvenes en UK <info@jovenesenuk.com>"
    );
  });
});
