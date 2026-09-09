/**
 * Armado seguro del header Content-Disposition. El nombre viene del archivo que
 * subió el usuario: sin escapar, unas comillas o un CR/LF permiten inyectar
 * parámetros o headers enteros en la respuesta.
 */

const CONTROL = /[\u0000-\u001f\u007f]/g;
const NO_ASCII_IMPRIMIBLE = /[^\u0020-\u007e]/g;
// RFC 5987: encodeURIComponent deja pasar estos, que no son attr-char válidos.
const RESTO_RFC5987 = /['()*]/g;

/** Nombre de archivo sin control chars ni separadores de path. */
export function nombreArchivoSeguro(nombre: string): string {
  const limpio = nombre.replace(CONTROL, "").replace(/[/\\]/g, "_").trim();
  return limpio || "documento";
}

export function contentDisposition(opts: { nombre: string; inline: boolean }): string {
  const nombre = nombreArchivoSeguro(opts.nombre);
  const ascii = nombre.replace(NO_ASCII_IMPRIMIBLE, "_").replace(/["\\]/g, "_");
  const utf8 = encodeURIComponent(nombre).replace(
    RESTO_RFC5987,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `${opts.inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}
