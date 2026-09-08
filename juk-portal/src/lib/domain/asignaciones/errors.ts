export class AsignacionNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`No se encontró la asignación ${id}`);
    this.name = "AsignacionNotFoundError";
  }
}

/** El viaje ya no está en Inscripción abierta ni Confirmado (US-11/MIN-12). */
export class ViajeNoInscribibleError extends Error {
  constructor(public readonly estado: string) {
    super(`El viaje ya no admite inscripciones (estado: ${estado}).`);
    this.name = "ViajeNoInscribibleError";
  }
}
