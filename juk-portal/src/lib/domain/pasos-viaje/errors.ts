export class PasoViajeNotFoundError extends Error {
  constructor(
    public readonly viajeId: string,
    public readonly tipo: string
  ) {
    super(`Paso de viaje no encontrado: ${tipo} (viaje ${viajeId})`);
    this.name = "PasoViajeNotFoundError";
  }
}

export class TransicionPasoInvalidaError extends Error {
  constructor(
    public readonly desde: string,
    public readonly hacia: string
  ) {
    super(`Transición de paso inválida: ${desde} → ${hacia}`);
    this.name = "TransicionPasoInvalidaError";
  }
}

export class DependenciaPasoError extends Error {
  constructor(
    public readonly tipo: string,
    public readonly requiere: string
  ) {
    super(`El paso ${tipo} requiere que ${requiere} esté completado.`);
    this.name = "DependenciaPasoError";
  }
}
