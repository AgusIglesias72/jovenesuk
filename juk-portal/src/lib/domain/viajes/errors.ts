export class ViajeNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`No se encontró el viaje ${id}`);
    this.name = "ViajeNotFoundError";
  }
}
