/**
 * Contrato único de las server actions del portal (CLAUDE.md):
 * `{ ok: true, data } | { ok: false, error }`. El branch de error admite
 * errores por campo (Zod) y la advertencia confirmable de los flujos
 * "¿guardar igual?".
 */

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: FieldErrors;
      requiereConfirmacion?: boolean;
    };
