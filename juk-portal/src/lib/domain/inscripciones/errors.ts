/**
 * Errores nombrados del dominio de Inscripciones.
 * No usar `throw new Error("...")` crudo en dominio (ver CLAUDE.md).
 */

export class NumeroInscripcionInvalidoError extends Error {
  constructor(public readonly numero: number) {
    super(`El número de inscripción ${numero} no es un correlativo válido`);
    this.name = "NumeroInscripcionInvalidoError";
  }
}

export class InscripcionNotFoundError extends Error {
  constructor(public readonly codigo: string) {
    super(`No se encontró la inscripción ${codigo}`);
    this.name = "InscripcionNotFoundError";
  }
}

/** El link tokenizado no resuelve a ninguna campaña (o venció). */
export class TokenInscripcionInvalidoError extends Error {
  constructor() {
    super("El link de inscripción no es válido o ya venció");
    this.name = "TokenInscripcionInvalidoError";
  }
}

/** La inscripción ya se convirtió en alumno: no se procesa dos veces. */
export class InscripcionYaProcesadaError extends Error {
  constructor(public readonly codigo: string) {
    super(`La inscripción ${codigo} ya fue procesada`);
    this.name = "InscripcionYaProcesadaError";
  }
}

/** Ya existe un alumno con ese DNI: la inscripción se vincula, no duplica. */
export class InscripcionDuplicadaError extends Error {
  constructor(public readonly dni: string) {
    super("Ya existe una inscripción con ese DNI");
    this.name = "InscripcionDuplicadaError";
  }
}
