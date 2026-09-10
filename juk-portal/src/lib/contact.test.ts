import { describe, expect, it } from "vitest";

import { EMAIL, mailConAsunto, WHATSAPP_URL, whatsappConMensaje } from "./contact";

describe("contacto compartido", () => {
  it("el WhatsApp apunta a wa.me con el número en formato internacional", () => {
    expect(WHATSAPP_URL).toMatch(/^https:\/\/wa\.me\/\d+$/);
  });

  it("whatsappConMensaje codifica el texto pre-armado", () => {
    expect(whatsappConMensaje("Hola, soy la mamá de Lola")).toBe(
      `${WHATSAPP_URL}?text=Hola%2C%20soy%20la%20mam%C3%A1%20de%20Lola`
    );
  });

  it("mailConAsunto codifica espacios como %20 (no como +)", () => {
    const url = mailConAsunto("Consulta por Lola Demo", "Hola equipo");
    expect(url).toBe(`mailto:${EMAIL}?subject=Consulta%20por%20Lola%20Demo&body=Hola%20equipo`);
    expect(url).not.toContain("+");
  });

  it("mailConAsunto sin cuerpo solo lleva el asunto", () => {
    expect(mailConAsunto("Hola")).toBe(`mailto:${EMAIL}?subject=Hola`);
  });
});
