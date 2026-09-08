/**
 * Errores nombrados del dominio de Cuotas.
 * No usar `throw new Error("...")` crudo en dominio ni queries (ver CLAUDE.md).
 */

export class CuotaNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`No se encontró la cuota ${id}`);
    this.name = "CuotaNotFoundError";
  }
}

export class PlanConPagosError extends Error {
  constructor() {
    super("El plan ya tiene pagos registrados; no se puede regenerar.");
    this.name = "PlanConPagosError";
  }
}
