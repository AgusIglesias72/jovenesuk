import { z } from "zod";

import { VARIANTE_POR_DEFECTO, varianteEnum } from "@/lib/domain/inscripciones/schema";

/**
 * Settings del Application Form: qué variante visual se sirve por defecto.
 *
 * Las variantes ('a', 'b', 'c') son solo estéticas y la precedencia al resolver
 * cuál mostrar es: parámetro del link > variante de la campaña > este setting >
 * 'a'. Esto es el anteúltimo escalón.
 *
 * Por eso `parsearFormularioSettings` NUNCA falla: el formulario es público y
 * una fila corrupta en `configuracion` (un JSON roto, una variante que se sacó
 * del código) no puede dejar sin inscribirse a una familia. Mismo criterio que
 * `getMailSettings` con los remitentes: valor inservible → default.
 */

export const formularioSettingsSchema = z.object({
  varianteActiva: varianteEnum,
});

export type FormularioSettings = z.infer<typeof formularioSettingsSchema>;

export const FORMULARIO_SETTINGS_DEFAULT: FormularioSettings = {
  varianteActiva: VARIANTE_POR_DEFECTO,
};

function aObjeto(guardado: unknown): Record<string, unknown> | null {
  // La columna `valor` es jsonb y llega ya parseada, pero un valor viejo o
  // escrito a mano puede venir como texto: se intenta una vez y se descarta.
  if (typeof guardado === "string") {
    try {
      return aObjeto(JSON.parse(guardado) as unknown);
    } catch {
      return null;
    }
  }
  if (typeof guardado !== "object" || guardado === null || Array.isArray(guardado)) return null;
  return guardado as Record<string, unknown>;
}

/**
 * Lee el setting guardado tolerando cualquier basura. Los campos que falten
 * caen al default uno por uno; si el resultado igual no valida (por ejemplo,
 * una `varianteActiva` desconocida), se devuelve el default entero.
 */
export function parsearFormularioSettings(guardado: unknown): FormularioSettings {
  const valor = aObjeto(guardado);
  if (valor === null) return FORMULARIO_SETTINGS_DEFAULT;

  const parsed = formularioSettingsSchema.safeParse({
    ...FORMULARIO_SETTINGS_DEFAULT,
    ...valor,
  });
  return parsed.success ? parsed.data : FORMULARIO_SETTINGS_DEFAULT;
}
