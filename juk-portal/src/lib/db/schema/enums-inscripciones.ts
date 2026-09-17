import { pgEnum } from "drizzle-orm/pg-core";

import {
  INSCRIPCION_ESTADOS,
  VARIANTES,
} from "@/lib/domain/inscripciones/schema";

/**
 * Los dos enums del formulario de inscripción viven en su propio módulo porque
 * los usan DOS tablas que se referencian entre sí: `inscripciones` apunta a
 * `prospecto_comunicaciones` (la invitación de origen) y esa tabla usa
 * `variante_formulario` en una columna.
 *
 * Declararlos dentro de `inscripciones.ts` cerraba un ciclo de imports que
 * explotaba en runtime: una FK es un callback y se evalúa tarde, pero
 * `varianteFormulario("invitacion_variante")` se ejecuta al evaluar el módulo,
 * así que importar `schema/inscripciones` antes que `schema/prospectos` tiraba
 * `varianteFormulario is not a function`. Las queries se salvaban de casualidad,
 * por el orden en que el barril de `@/lib/db` importa las tablas.
 *
 * Los valores salen del dominio (fuente única) y los nombres SQL no cambian:
 * mover la declaración acá no toca la base ni pide migración.
 */
export const inscripcionEstado = pgEnum("inscripcion_estado", INSCRIPCION_ESTADOS);

export const varianteFormulario = pgEnum("variante_formulario", VARIANTES);
