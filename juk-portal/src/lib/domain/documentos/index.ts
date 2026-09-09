/**
 * Validación de documentos adjuntos (TEC-02): tipos y tamaño máximo (PRD M3:
 * PDF/DOCX máx 10 MB; los pasos aceptan también imágenes — certificados
 * fotografiados, capturas del ETA).
 */

export const MAX_DOCUMENTO_BYTES = 10 * 1024 * 1024; // 10 MB

export const MIME_PERMITIDOS = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type MimePermitido = keyof typeof MIME_PERMITIDOS;

const EXTENSION_A_MIME: Record<string, MimePermitido> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export class DocumentoInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentoInvalidoError";
  }
}

export function esMimePermitido(mime: string): mime is MimePermitido {
  return mime in MIME_PERMITIDOS;
}

/** MIME derivado de la extensión de una key de storage (fallback al servir). */
export function mimePorExtension(nombreOKey: string): MimePermitido | null {
  const ext = /\.([a-zA-Z0-9]+)$/.exec(nombreOKey)?.[1]?.toLowerCase();
  return (ext && EXTENSION_A_MIME[ext]) || null;
}

function empiezaCon(head: Uint8Array, firma: readonly number[]): boolean {
  if (head.length < firma.length) return false;
  return firma.every((byte, i) => head[i] === byte);
}

/**
 * Tipo real del archivo por magic bytes. El MIME que manda el navegador lo
 * elige el cliente y se puede falsear, así que es lo único en lo que confiamos
 * para decidir qué se guarda y con qué Content-Type se sirve después.
 */
export function detectarMime(head: Uint8Array): MimePermitido | null {
  if (empiezaCon(head, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (empiezaCon(head, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (empiezaCon(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (
    empiezaCon(head, [0x52, 0x49, 0x46, 0x46]) &&
    head.length >= 12 &&
    empiezaCon(head.subarray(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return "image/webp";
  }
  // Todo OOXML es un ZIP; para nuestra allowlist eso solo puede ser un .docx.
  if (empiezaCon(head, [0x50, 0x4b]) && (head[2] === 0x03 || head[2] === 0x05 || head[2] === 0x07)) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (empiezaCon(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return "application/msword";
  }
  return null;
}

export function validarDocumento(opts: {
  mime: string;
  bytes: number;
  head?: Uint8Array;
}): MimePermitido {
  if (!esMimePermitido(opts.mime)) {
    throw new DocumentoInvalidoError(
      "Formato no permitido. Aceptamos PDF, DOC/DOCX, JPG, PNG o WEBP."
    );
  }
  if (opts.bytes > MAX_DOCUMENTO_BYTES) {
    throw new DocumentoInvalidoError("El archivo supera el máximo de 10 MB.");
  }
  if (opts.bytes === 0) {
    throw new DocumentoInvalidoError("El archivo está vacío.");
  }
  if (opts.head) {
    const real = detectarMime(opts.head);
    if (!real) {
      throw new DocumentoInvalidoError(
        "No pudimos reconocer el archivo. Subí un PDF, DOC/DOCX, JPG, PNG o WEBP."
      );
    }
    if (real !== opts.mime) {
      throw new DocumentoInvalidoError(
        "El contenido del archivo no coincide con su extensión. Subí el archivo original."
      );
    }
  }
  return opts.mime;
}

/** Key estable y legible: entidad/id/fecha-nombre-sanitizado.ext */
export function keyDocumento(opts: {
  entidadTipo: string;
  entidadId: string;
  nombreOriginal: string;
  mime: MimePermitido;
  timestamp: Date;
}): string {
  const base = opts.nombreOriginal
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .toLowerCase();
  const stamp = opts.timestamp.toISOString().slice(0, 10);
  return `${opts.entidadTipo}/${opts.entidadId}/${stamp}-${base || "documento"}.${MIME_PERMITIDOS[opts.mime]}`;
}
