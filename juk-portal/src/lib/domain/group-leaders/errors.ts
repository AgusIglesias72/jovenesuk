export class GroupLeaderNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`No se encontró el Group Leader ${id}`);
    this.name = "GroupLeaderNotFoundError";
  }
}
