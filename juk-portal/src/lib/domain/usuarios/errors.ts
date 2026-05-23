export class UsuarioNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`No se encontró el usuario ${id}`);
    this.name = "UsuarioNotFoundError";
  }
}
