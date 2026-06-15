/*
 * Datos de contacto de Jóvenes en UK — fuente única para la web pública.
 * Otros archivos (sections, contacto, seo) van a adoptar estas constantes.
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
