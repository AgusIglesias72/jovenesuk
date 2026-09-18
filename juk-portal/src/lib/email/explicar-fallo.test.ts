import { describe, expect, it } from "vitest";

import { EmailConfigError, EmailEnvioError } from "./errors";
import { explicarFalloDeEnvio } from "./explicar-fallo";

describe("explicarFalloDeEnvio", () => {
  it("nombra la variable que falta cuando el deploy no está configurado", () => {
    const motivo = explicarFalloDeEnvio(new EmailConfigError("RESEND_API_KEY"));

    expect(motivo).toContain("RESEND_API_KEY");
    expect(motivo).toContain("no puede enviar");
  });

  it("muestra el motivo que dio Resend, que es el dato con el que se arregla", () => {
    // Los dos rechazos que se ven en la práctica: el dominio sin verificar y el
    // límite de una cuenta que todavía no tiene dominio propio.
    expect(
      explicarFalloDeEnvio(new EmailEnvioError("The jovenesenuk.com domain is not verified."))
    ).toBe("Resend rechazó el envío: The jovenesenuk.com domain is not verified.");

    expect(
      explicarFalloDeEnvio(
        new EmailEnvioError("You can only send testing emails to your own email address.")
      )
    ).toContain("your own email address");
  });

  it("no repite el prefijo 'Resend error:' que ya trae el mensaje de la clase", () => {
    const motivo = explicarFalloDeEnvio(new EmailEnvioError("algo"));

    expect(motivo.match(/Resend/g)).toHaveLength(1);
  });

  it("ante un error que no sabe nombrar, manda a Sentry en vez de inventar una causa", () => {
    const motivo = explicarFalloDeEnvio(new Error("socket hang up"));

    expect(motivo).toContain("Sentry");
    // Lo que NO tiene que volver: la lista de sospechosos que había antes y que
    // hizo que nadie mirara la causa real durante meses.
    expect(motivo).not.toContain("API key");
    expect(motivo).not.toContain("dominio");
  });

  it("tolera que lo que se tiró no sea un Error", () => {
    expect(explicarFalloDeEnvio("un string suelto")).toContain("Sentry");
    expect(explicarFalloDeEnvio(undefined)).toContain("Sentry");
  });
});
