/**
 * Errores nombrados del dominio de Colegios.
 * No usar `throw new Error("...")` crudo en dominio (ver CLAUDE.md).
 */

export class ColegioNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`No se encontró el colegio ${id}`);
    this.name = "ColegioNotFoundError";
  }
}
