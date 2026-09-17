import type { Inscripcion } from "@/lib/db/schema/inscripciones";
import { CAMPOS_NIVEL_2 } from "@/lib/domain/inscripciones/niveles";

/**
 * Una fila de `inscripciones` como la devuelve `crearInscripcion`, con TODOS los
 * campos sensibles cargados con un valor distinguible. Los mails de este módulo
 * se prueban contra esto: si un dato de Nivel 2 aparece en el HTML, el assert
 * negativo lo agarra. Compartida por los dos senders para que el catálogo de
 * datos prohibidos sea uno solo.
 */
export function filaInscripcion(overrides: Partial<Inscripcion> = {}): Inscripcion {
  return {
    id: "3b7c1f6a-0c8e-4a2b-9f6d-1e2c3a4b5c6d",
    numero: 123,
    comunicacionId: "9a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
    tokenHash: "9f2c1a".padEnd(64, "0"),
    variante: "b",
    viajeId: "7d6c5b4a-3e2f-4a1b-9c8d-7e6f5a4b3c2d",

    nombre: "Ana",
    apellido: "Pérez",
    fechaNacimiento: "2009-04-17",
    dni: "45102338",
    numeroPasaporte: "AAX9931725",
    fechaVencimientoPasaporte: "2031-08-04",

    telefonoAlumno: "1155443322",
    emailAlumno: "ana.menor@ejemplo.com",
    alergiasSalud: "Alergia a la penicilina",

    tutor1Nombre: "Marina Pérez",
    tutor1Celular: "1166554433",
    tutor1Email: "marina@ejemplo.com",

    preferenciasAlojamiento: "Sin gatos en la casa",
    nivelInglesAutoevaluacion: "Intermedio alto",

    estado: "recibida",
    alumnoId: null,
    motivo: null,

    consentimientoVersion: "2026-09-01",
    consentimientoTextoHash: "c0ffee".padEnd(64, "0"),
    consentimientoEl: new Date("2026-09-16T12:00:00.000Z"),

    borradoEl: null,
    borradoPor: null,
    motivoBorrado: null,
    datosPurgadosEl: null,

    createdAt: new Date("2026-09-16T12:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Los valores que NINGÚN mail puede contener, derivados del catálogo de Nivel 2
 * y no de una lista escrita a mano: un campo sensible nuevo entra solo al
 * assert, sin que nadie se acuerde de sumarlo.
 */
export function valoresNivel2De(fila: Inscripcion): string[] {
  const comoRegistro = fila as unknown as Record<string, unknown>;
  return CAMPOS_NIVEL_2.map((campo) => comoRegistro[campo]).filter(
    (valor): valor is string => typeof valor === "string" && valor.trim() !== ""
  );
}
