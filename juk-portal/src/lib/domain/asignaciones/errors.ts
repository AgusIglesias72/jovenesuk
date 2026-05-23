export class AsignacionNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`No se encontró la asignación ${id}`);
    this.name = "AsignacionNotFoundError";
  }
}
