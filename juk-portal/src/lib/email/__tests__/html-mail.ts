/**
 * Lo que un mail a una familia NO puede tener para verse en Gmail y en Outlook
 * (el porqué, en `docs/design-system.md` §Mails). Devuelve la lista de problemas
 * para que el assert diga cuál falló, no solo que algo falló.
 */
export function problemasDeCompatibilidad(html: string): string[] {
  const problemas: string[] = [];

  if (/<svg[\s>]/i.test(html)) problemas.push("tiene un <svg> inline (Gmail no lo muestra)");
  if (/\.(webp|svg)\b/i.test(html)) problemas.push("referencia un WebP o un SVG (Outlook y Gmail)");
  if (html.includes("var(--")) problemas.push("usa variables CSS (ningún cliente las lee)");

  const imagenes = html.match(/<img\b[^>]*>/gi) ?? [];
  if (imagenes.length === 0) problemas.push("no tiene ninguna imagen");
  for (const img of imagenes) {
    const src = /\ssrc="([^"]*)"/.exec(img)?.[1] ?? "";
    if (!/^https:\/\//.test(src)) problemas.push(`imagen sin URL absoluta https: ${src}`);
    if (!/\salt="/.test(img)) problemas.push(`imagen sin alt: ${src}`);
    if (!/\swidth="\d+"/.test(img)) problemas.push(`imagen sin width: ${src}`);
    if (!/\sheight="\d+"/.test(img)) problemas.push(`imagen sin height: ${src}`);
  }

  // Gmail recorta el mensaje arriba de los 102 KB y el link de baja del pie
  // queda escondido detrás de "Ver mensaje completo".
  const kb = Buffer.byteLength(html, "utf8") / 1024;
  if (kb > 90) problemas.push(`pesa ${kb.toFixed(1)} KB (el techo de Gmail es 102 KB)`);

  return problemas;
}
