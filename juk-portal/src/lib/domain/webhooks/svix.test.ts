import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { TOLERANCIA_TIMESTAMP_SEGUNDOS, verificarFirma } from "./svix";

const CLAVE = Buffer.from("clave-de-prueba-del-webhook-resend");
const SECRET = `whsec_${CLAVE.toString("base64")}`;
const ID = "msg_2Lh9xQx3bT0";
const AHORA = new Date("2026-09-10T15:00:00Z");
const TS = String(Math.floor(AHORA.getTime() / 1000));
const BODY = JSON.stringify({ type: "email.opened", data: { email_id: "re_123" } });

function firmar(clave: Buffer, id: string, ts: string, body: string): string {
  return `v1,${createHmac("sha256", clave).update(`${id}.${ts}.${body}`).digest("base64")}`;
}

const FIRMA = firmar(CLAVE, ID, TS, BODY);

describe("verificarFirma (Svix)", () => {
  it("coincide con el vector de ejemplo de la documentación de Svix", () => {
    expect(
      verificarFirma(
        "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
        "msg_p5jXN8AQM9LWM0D4loKWxJek",
        "1614265330",
        '{"test": 2432232314}',
        "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
        new Date(1614265330 * 1000)
      )
    ).toBe(true);
  });

  it("acepta una firma válida", () => {
    expect(verificarFirma(SECRET, ID, TS, BODY, FIRMA, AHORA)).toBe(true);
  });

  it("acepta el secret sin prefijo whsec_ (como la librería oficial)", () => {
    expect(verificarFirma(CLAVE.toString("base64"), ID, TS, BODY, FIRMA, AHORA)).toBe(true);
  });

  it("con varias firmas (rotación de secret) alcanza con que una sea válida", () => {
    const vieja = firmar(Buffer.from("secret-anterior"), ID, TS, BODY);
    expect(verificarFirma(SECRET, ID, TS, BODY, `${vieja} ${FIRMA}`, AHORA)).toBe(true);
    expect(verificarFirma(SECRET, ID, TS, BODY, `${FIRMA} ${vieja}`, AHORA)).toBe(true);
  });

  it("rechaza si ninguna de las firmas es válida", () => {
    const otra = firmar(Buffer.from("otro-secret"), ID, TS, BODY);
    const otraMas = firmar(Buffer.from("tercer-secret"), ID, TS, BODY);
    expect(verificarFirma(SECRET, ID, TS, BODY, `${otra} ${otraMas}`, AHORA)).toBe(false);
  });

  it("rechaza el body alterado (un caracter cambia la firma)", () => {
    const alterado = BODY.replace("email.opened", "email.clicked");
    expect(verificarFirma(SECRET, ID, TS, alterado, FIRMA, AHORA)).toBe(false);
  });

  it("rechaza el svix-id alterado", () => {
    expect(verificarFirma(SECRET, "msg_otro", TS, BODY, FIRMA, AHORA)).toBe(false);
  });

  it("rechaza el timestamp alterado aunque siga dentro de la tolerancia", () => {
    const tsAlterado = String(Number(TS) + 1);
    expect(verificarFirma(SECRET, ID, tsAlterado, BODY, FIRMA, AHORA)).toBe(false);
  });

  it("rechaza un evento viejo con firma válida (replay)", () => {
    const tsViejo = String(Number(TS) - TOLERANCIA_TIMESTAMP_SEGUNDOS - 1);
    const firma = firmar(CLAVE, ID, tsViejo, BODY);
    expect(verificarFirma(SECRET, ID, tsViejo, BODY, firma, AHORA)).toBe(false);
  });

  it("rechaza un timestamp demasiado en el futuro", () => {
    const tsFuturo = String(Number(TS) + TOLERANCIA_TIMESTAMP_SEGUNDOS + 1);
    const firma = firmar(CLAVE, ID, tsFuturo, BODY);
    expect(verificarFirma(SECRET, ID, tsFuturo, BODY, firma, AHORA)).toBe(false);
  });

  it("acepta el borde exacto de la tolerancia, hacia atrás y hacia adelante", () => {
    for (const delta of [-TOLERANCIA_TIMESTAMP_SEGUNDOS, TOLERANCIA_TIMESTAMP_SEGUNDOS]) {
      const ts = String(Number(TS) + delta);
      expect(verificarFirma(SECRET, ID, ts, BODY, firmar(CLAVE, ID, ts, BODY), AHORA)).toBe(true);
    }
  });

  it("rechaza un timestamp que no es un entero de segundos", () => {
    for (const ts of ["", "abc", `${TS}.5`, `-${TS}`, new Date(AHORA).toISOString()]) {
      expect(verificarFirma(SECRET, ID, ts, BODY, firmar(CLAVE, ID, ts, BODY), AHORA)).toBe(false);
    }
  });

  it("rechaza un secret vacío: con clave vacía cualquiera podría firmar", () => {
    const forjada = firmar(Buffer.alloc(0), ID, TS, BODY);
    expect(verificarFirma("whsec_", ID, TS, BODY, forjada, AHORA)).toBe(false);
    expect(verificarFirma("", ID, TS, BODY, forjada, AHORA)).toBe(false);
  });

  it("rechaza un secret que no es base64 sin lanzar", () => {
    expect(() => verificarFirma("whsec_no es base64!", ID, TS, BODY, FIRMA, AHORA)).not.toThrow();
    expect(verificarFirma("whsec_no es base64!", ID, TS, BODY, FIRMA, AHORA)).toBe(false);
  });

  it("ignora versiones que no son v1 aunque traigan el HMAC correcto", () => {
    const hmac = FIRMA.slice("v1,".length);
    expect(verificarFirma(SECRET, ID, TS, BODY, `v1a,${hmac}`, AHORA)).toBe(false);
    expect(verificarFirma(SECRET, ID, TS, BODY, hmac, AHORA)).toBe(false);
  });

  it("rechaza header vacío o firmas truncadas sin lanzar", () => {
    expect(verificarFirma(SECRET, ID, TS, BODY, "", AHORA)).toBe(false);
    expect(verificarFirma(SECRET, ID, TS, BODY, "v1,", AHORA)).toBe(false);
    expect(() => verificarFirma(SECRET, ID, TS, BODY, FIRMA.slice(0, 20), AHORA)).not.toThrow();
    expect(verificarFirma(SECRET, ID, TS, BODY, FIRMA.slice(0, 20), AHORA)).toBe(false);
  });
});
