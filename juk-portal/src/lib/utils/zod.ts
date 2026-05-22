import type { ZodError } from "zod";

/**
 * Convierte un ZodError en un mapa de errores por campo, con paths anidados
 * (ej. "contactoAcademico.email", "cursosDisponibles.0"). A diferencia de
 * `flatten()`, conserva el path completo para poder resolver subcampos en la UI.
 */
export function fieldErrorsFromZod(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
