export class AlumnoNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`No se encontró el alumno ${id}`);
    this.name = "AlumnoNotFoundError";
  }
}
