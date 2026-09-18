import type { z } from "zod";

import { diaCalendarioUTC } from "@/lib/utils/date";

import type { CampoInscripcion } from "./niveles";
import {
  aceptaDesdeFormulario,
  CARACTERES_DNI,
  CARACTERES_EMAIL,
  CARACTERES_NOMBRE,
  CARACTERES_PASAPORTE,
  CARACTERES_TELEFONO,
  diaDeFechaIso,
  inscripcionSchema,
} from "./schema";

/**
 * VALIDACIÓN CAMPO POR CAMPO DEL APPLICATION FORM
 * -----------------------------------------------
 * La lógica que el formulario público usa para avisar EN EL MOMENTO que un dato
 * está mal, sin esperar al envío. Vive en el dominio y no en el hook por dos
 * razones:
 *
 * 1. El mensaje sale SIEMPRE de `inscripcionSchema`, que es lo que el server
 *    vuelve a aplicar. No hay una segunda regla que se desincronice.
 * 2. Vitest corre en `environment: "node"` y el proyecto no tiene jsdom ni
 *    testing-library: un hook de React no se puede unit-testear acá. Toda la
 *    decisión es de funciones puras; el hook (`use-validacion-en-vivo.ts`) es
 *    cableado y lo cubre el E2E.
 *
 * ES EL MOLDE PARA EL RESTO DE LOS FORMULARIOS. El alcance de esta tanda es
 * `/inscripcion`; `lead-form.tsx`, `alumno-form.tsx` y `prospecto-form.tsx`
 * quedan afuera a propósito. Cuando les toque, se copia esta forma (schema de
 * dominio + `validarCampo*` + `esCaracterImposible*`) en vez de inventar otra.
 */

/**
 * Los campos que se validan mientras la familia completa la ficha.
 *
 * Quedan afuera, a propósito:
 * - `website`: es el honeypot. Marcarlo le enseñaría al bot qué lo delata.
 * - `acepta`: el consentimiento. Tabular fuera del casillero sin tildarlo es lo
 *   que hace cualquiera que todavía está leyendo la política; pintarlo en rojo
 *   ahí sería retarla por algo que nunca intentó hacer mal. Se marca solo con
 *   los errores que devuelve el server.
 */
export const CAMPOS_EN_VIVO = [
  "nombre",
  "apellido",
  "fechaNacimiento",
  "dni",
  "numeroPasaporte",
  "fechaVencimientoPasaporte",
  "tutor1Nombre",
  "tutor1Celular",
  "tutor1Email",
  "telefonoAlumno",
  "emailAlumno",
  "alergiasSalud",
  "preferenciasAlojamiento",
  "nivelInglesAutoevaluacion",
] as const satisfies readonly CampoInscripcion[];

export type CampoEnVivo = (typeof CAMPOS_EN_VIVO)[number];

const EN_VIVO = new Set<string>(CAMPOS_EN_VIVO);

/** ¿Este `name` del DOM es un campo que se valida en vivo? */
export function esCampoEnVivo(nombre: string): nombre is CampoEnVivo {
  return EN_VIVO.has(nombre);
}

/**
 * El primer mensaje del schema para un campo suelto, o `undefined` si está
 * bien. El valor llega crudo, tal como lo tiene el formulario: el `preprocess`
 * de cada campo (trim, vacío → undefined, normalización del DNI) es el mismo
 * que corre en el server.
 */
export function validarCampoInscripcion(
  campo: CampoInscripcion,
  crudo: string
): string | undefined {
  // El casillero del consentimiento no viaja como texto: se coerciona con la
  // misma regla que usa la action.
  const entrada: unknown = campo === "acepta" ? aceptaDesdeFormulario(crudo) : crudo;
  const schemaDelCampo: z.ZodTypeAny = inscripcionSchema.shape[campo];
  const r = schemaDelCampo.safeParse(entrada);
  return r.success ? undefined : r.error.issues[0]?.message;
}

/**
 * Los caracteres que un campo no puede contener NUNCA, ni a medio escribir.
 * Es lo que separa "todavía no terminaste" de "eso está mal": nadie está a
 * mitad de camino de un DNI con una letra adentro.
 */
const CARACTERES_PERMITIDOS: Partial<Record<CampoInscripcion, RegExp>> = {
  nombre: CARACTERES_NOMBRE,
  apellido: CARACTERES_NOMBRE,
  tutor1Nombre: CARACTERES_NOMBRE,
  dni: CARACTERES_DNI,
  numeroPasaporte: CARACTERES_PASAPORTE,
  tutor1Celular: CARACTERES_TELEFONO,
  telefonoAlumno: CARACTERES_TELEFONO,
  tutor1Email: CARACTERES_EMAIL,
  emailAlumno: CARACTERES_EMAIL,
};

/**
 * Decide CUÁNDO se adelanta el error a la tecla, en vez de esperar a que la
 * persona salga del campo. No inventa ninguna regla: usa los mismos sets del
 * schema. Mientras alguien escribe por primera vez no se le grita —un email a
 * medio tipear no es un error—, pero un carácter imposible se marca en el acto.
 */
export function esCaracterImposible(campo: CampoInscripcion, crudo: string): boolean {
  const permitidos = CARACTERES_PERMITIDOS[campo];
  if (!permitidos) return false;
  return crudo !== "" && !permitidos.test(crudo);
}

export const AVISO_PASAPORTE_VENCIDO =
  "Ese pasaporte ya está vencido: hay que renovarlo antes del viaje.";

/**
 * Avisos que NO bloquean el envío. El pasaporte vencido es el caso: una familia
 * que lo está renovando es justo la que el equipo quiere ver entrar en la
 * bandeja, y rechazarla la manda a WhatsApp o directamente la pierde.
 */
export function avisoDelCampo(
  campo: CampoInscripcion,
  valor: string,
  hoy: Date
): string | undefined {
  if (campo !== "fechaVencimientoPasaporte") return undefined;
  if (validarCampoInscripcion(campo, valor) !== undefined) return undefined;
  return diaDeFechaIso(valor.trim()) < diaCalendarioUTC(hoy)
    ? AVISO_PASAPORTE_VENCIDO
    : undefined;
}
