/*
 * Datos de contacto de Jóvenes en UK — fuente única para toda la app (web
 * pública y Portal de Familias). `src/app/(public)/contact.ts` re-exporta esto
 * para no romper a sus consumidores históricos.
 */

export const PHONE_DISPLAY = "+54 9 11 3378-3515";
export const PHONE_E164 = "5491133783515";
export const EMAIL = "info@jovenesenuk.com";

export const WHATSAPP_URL = `https://wa.me/${PHONE_E164}`;
export const MAIL_URL = `mailto:${EMAIL}`;

export const SOCIALS = [
  { label: "Instagram", handle: "@jovenesenuk", href: "https://www.instagram.com/jovenesenuk" },
  { label: "Facebook", handle: "/jovenesenuk", href: "https://www.facebook.com/jovenesenuk" },
  { label: "TikTok", handle: "@jovenesenuk", href: "https://www.tiktok.com/@jovenesenuk" },
  { label: "X", handle: "@jovenesenuk", href: "https://x.com/jovenesenuk" },
] as const;

/** Link de WhatsApp con un mensaje ya escrito (el titular solo aprieta enviar). */
export function whatsappConMensaje(texto: string): string {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(texto)}`;
}

/**
 * `mailto:` con asunto (y cuerpo) pre-armado. Sin URLSearchParams a propósito:
 * codifica los espacios como "+" y varios clientes de mail los muestran tal cual.
 */
export function mailConAsunto(asunto: string, cuerpo?: string): string {
  const partes = [`subject=${encodeURIComponent(asunto)}`];
  if (cuerpo) partes.push(`body=${encodeURIComponent(cuerpo)}`);
  return `${MAIL_URL}?${partes.join("&")}`;
}
