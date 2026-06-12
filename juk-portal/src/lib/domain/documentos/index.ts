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

export class DocumentoInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentoInvalidoError";
  }
}

export function validarDocumento(opts: { mime: string; bytes: number }): MimePermitido {
  if (!(opts.mime in MIME_PERMITIDOS)) {
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
  return opts.mime as MimePermitido;
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
