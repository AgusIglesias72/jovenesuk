import { soloDigitos } from "@/lib/utils/dni";

import type { InscripcionData } from "./schema";

/**
 * Clasificación de los datos del Application Form en dos niveles.
 *
 * - **Nivel 1**: puede viajar por mail o mostrarse en un aviso del back-office
 *   (nombre, apellido, email del tutor, el viaje).
 * - **Nivel 2**: NUNCA sale del sistema (DNI, pasaporte, fecha de nacimiento,
 *   alergias y datos de salud, teléfonos). Se ve solo dentro del portal, con
 *   sesión, y en los avisos se enmascara.
 *
 * La unión de los dos niveles tiene que cubrir TODAS las claves de
 * `inscripcionSchema`: sumar un campo al formulario sin clasificarlo rompe el
 * chequeo de tipos de abajo y el test de contrato de `niveles.test.ts`. Es
 * deliberado: un campo sin clasificar se filtraría por el camino más barato
 * (un mail de aviso) sin que nadie lo decida.
 */

export type CampoInscripcion = keyof InscripcionData;

export const CAMPOS_NIVEL_1 = [
  "nombre",
  "apellido",
  "tutor1Nombre",
  "tutor1Email",
  "acepta",
] as const satisfies readonly CampoInscripcion[];

export const CAMPOS_NIVEL_2 = [
  "fechaNacimiento",
  "dni",
  "numeroPasaporte",
  "fechaVencimientoPasaporte",
  "tutor1Celular",
  "telefonoAlumno",
  // El email del alumno es el de un menor: no se usa para avisos ni outreach,
  // el canal con la familia es el del tutor.
  "emailAlumno",
  "alergiasSalud",
  // Preferencias y nivel de inglés son texto libre donde la familia cuenta
  // cosas de salud, dieta o convivencia: se tratan como sensibles.
  "preferenciasAlojamiento",
  "nivelInglesAutoevaluacion",
  // El honeypot no es un dato personal, pero tampoco sale nunca del sistema:
  // solo alimenta la detección de bots.
  "website",
] as const satisfies readonly CampoInscripcion[];

export type CampoNivel1 = (typeof CAMPOS_NIVEL_1)[number];
export type CampoNivel2 = (typeof CAMPOS_NIVEL_2)[number];

/** Falla la compilación si un campo del schema quedó sin clasificar. */
type SinClasificar = Exclude<CampoInscripcion, CampoNivel1 | CampoNivel2>;
export type TodosLosCamposClasificados = [SinClasificar] extends [never] ? true : never;

const NIVEL_2 = new Set<string>(CAMPOS_NIVEL_2);

/** true si el campo es de Nivel 2 (no puede salir del sistema). */
export function esCampoSensible(campo: string): boolean {
  return NIVEL_2.has(campo);
}

/**
 * Recorta un payload a lo que puede salir del sistema. Se construye por lista
 * blanca (no borrando claves): un campo nuevo sin clasificar no se cuela.
 */
export function soloNivel1(payload: Partial<InscripcionData>): Partial<Pick<InscripcionData, CampoNivel1>> {
  const salida: Partial<Pick<InscripcionData, CampoNivel1>> = {};
  for (const campo of CAMPOS_NIVEL_1) {
    const valor = payload[campo];
    if (valor === undefined) continue;
    if (campo === "acepta") {
      salida.acepta = valor as true;
    } else {
      salida[campo] = valor as string;
    }
  }
  return salida;
}

const OCULTO = "•";
const DIGITOS_VISIBLES = 4;

/**
 * Enmascara un DNI dejando los últimos 4 dígitos: "45102338" → "••••2338".
 * Un DNI de 4 dígitos o menos se oculta entero (mostrarlo no sería enmascarar).
 */
export function enmascararDni(dni: string): string {
  const digitos = soloDigitos(dni ?? "");
  if (digitos === "") return "";
  if (digitos.length <= DIGITOS_VISIBLES) return OCULTO.repeat(digitos.length);
  return OCULTO.repeat(digitos.length - DIGITOS_VISIBLES) + digitos.slice(-DIGITOS_VISIBLES);
}
