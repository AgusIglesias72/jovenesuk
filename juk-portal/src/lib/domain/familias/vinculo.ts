/**
 * Vínculo alumno ↔ cuenta del Portal de Familias (US-19b + MIN-07).
 *
 * La identidad de la cuenta es el email del Tutor 1, así que un typo del admin
 * (o un email compartido del colegio) alcanzaría para que el alumno aparezca en
 * el portal de OTRA familia. Por eso el vínculo con una cuenta que ya tiene
 * alumnos de otro apellido no se hace solo: pide confirmación explícita.
 */

export type AlumnoVinculado = {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
};

export type UsuarioExistente = { id: string; role: string };

export type AlumnoAVincular = { id: string; dni: string; apellido: string };

export type ResultadoVinculo =
  | { tipo: "crear" }
  | { tipo: "vincular"; userId: string }
  | { tipo: "conflicto"; userId: string; alumnos: AlumnoVinculado[] }
  | { tipo: "email_del_equipo" };

export function normalizarApellido(apellido: string): string {
  return apellido
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Decide qué hacer con el email del Tutor 1 antes de tocar la base.
 * `alumnosDeLaCuenta` son los alumnos ACTIVOS que ya cuelgan de esa cuenta.
 */
export function evaluarVinculoFamilia(input: {
  usuario: UsuarioExistente | null;
  alumnosDeLaCuenta: AlumnoVinculado[];
  alumno: AlumnoAVincular;
}): ResultadoVinculo {
  const { usuario, alumnosDeLaCuenta, alumno } = input;

  if (!usuario) return { tipo: "crear" };
  if (usuario.role !== "familia") return { tipo: "email_del_equipo" };

  const apellido = normalizarApellido(alumno.apellido);
  const ajenos = alumnosDeLaCuenta.filter(
    (a) =>
      a.id !== alumno.id &&
      a.dni !== alumno.dni &&
      normalizarApellido(a.apellido) !== apellido
  );

  if (ajenos.length > 0) {
    return { tipo: "conflicto", userId: usuario.id, alumnos: ajenos };
  }
  return { tipo: "vincular", userId: usuario.id };
}

/** "Pérez, Juan (DNI 45102338)" — para el mensaje de confirmación del admin. */
export function describirAlumnosVinculados(alumnos: AlumnoVinculado[]): string {
  return alumnos
    .map((a) => `${a.apellido}, ${a.nombre} (DNI ${a.dni})`)
    .join(" · ");
}
