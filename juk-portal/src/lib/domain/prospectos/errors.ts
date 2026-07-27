/**
 * Errores nombrados del dominio de Prospectos.
 * No usar `throw new Error("...")` crudo en dominio (ver CLAUDE.md).
 */

export class ProspectoNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`No se encontró el prospecto ${id}`);
    this.name = "ProspectoNotFoundError";
  }
}
