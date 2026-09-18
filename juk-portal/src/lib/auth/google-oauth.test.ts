import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { googleOAuthConfig, googleOAuthHabilitado, mensajeErrorOAuth } from "./google-oauth";

const ID = "1234.apps.googleusercontent.com";
const SECRET = "GOCSPX-un-secreto";

describe("googleOAuthConfig", () => {
  let original: NodeJS.ProcessEnv;

  beforeEach(() => {
    original = { ...process.env };
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  afterEach(() => {
    process.env = original;
  });

  it("sin ninguna de las dos variables no hay provider (el estado normal de local y los E2E)", () => {
    expect(googleOAuthConfig()).toBeNull();
    expect(googleOAuthHabilitado()).toBe(false);
  });

  it("con una sola de las dos tampoco: media configuración rompería el callback", () => {
    process.env.GOOGLE_CLIENT_ID = ID;
    expect(googleOAuthConfig()).toBeNull();

    delete process.env.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = SECRET;
    expect(googleOAuthConfig()).toBeNull();
    expect(googleOAuthHabilitado()).toBe(false);
  });

  it("con las dos devuelve las credenciales y habilita el botón", () => {
    process.env.GOOGLE_CLIENT_ID = ID;
    process.env.GOOGLE_CLIENT_SECRET = SECRET;

    expect(googleOAuthConfig()).toEqual({ clientId: ID, clientSecret: SECRET });
    expect(googleOAuthHabilitado()).toBe(true);
  });

  it("un valor que es solo espacios cuenta como ausente", () => {
    process.env.GOOGLE_CLIENT_ID = "   ";
    process.env.GOOGLE_CLIENT_SECRET = SECRET;
    expect(googleOAuthConfig()).toBeNull();
  });
});

describe("mensajeErrorOAuth", () => {
  it("sin código no muestra nada", () => {
    expect(mensajeErrorOAuth(undefined)).toBeNull();
    expect(mensajeErrorOAuth("")).toBeNull();
    expect(mensajeErrorOAuth("   ")).toBeNull();
  });

  it("explica que ese Google no abre una cuenta que no existe (disableSignUp)", () => {
    const m = mensajeErrorOAuth("signup_disabled");
    expect(m?.titulo).toBe("Ese Google no está habilitado");
    expect(m?.detalle).toContain("No tenemos ninguna cuenta con ese email");
  });

  it("distingue vinculación fallida, cuenta desactivada y cancelación", () => {
    const noLinkeada = mensajeErrorOAuth("account_not_linked");
    const desactivada = mensajeErrorOAuth("cuenta_desactivada");
    const cancelada = mensajeErrorOAuth("access_denied");

    expect(desactivada?.titulo).toBe("Cuenta desactivada");
    expect(cancelada?.titulo).toContain("Cancelaste");
    expect(
      new Set([noLinkeada?.titulo, desactivada?.titulo, cancelada?.titulo]).size
    ).toBe(3);
  });

  it("un código desconocido cae al genérico y NUNCA a null (nada muere en silencio)", () => {
    const m = mensajeErrorOAuth("unable_to_get_user_info");
    expect(m).not.toBeNull();
    expect(m?.titulo).toBe("No se pudo ingresar con Google");
    expect(mensajeErrorOAuth("un_codigo_que_no_existe")).toEqual(m);
  });

  it("no le importa el casing ni los espacios del query param", () => {
    expect(mensajeErrorOAuth(" SIGNUP_DISABLED ")).toEqual(mensajeErrorOAuth("signup_disabled"));
  });
});
