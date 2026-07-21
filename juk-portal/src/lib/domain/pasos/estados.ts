import { esPasoEditable, type PasoCodigo } from "./codigos";

export const PASO_ESTADOS = [
  "pendiente",
  "en_progreso",
  "completado",
  "bloqueado",
  "na",
  "vencido",
] as const;

export type PasoEstado = (typeof PASO_ESTADOS)[number];

export const PASO_ESTADO_LABELS: Record<PasoEstado, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completado: "Completado",
  bloqueado: "Bloqueado",
  na: "No aplica",
  vencido: "Vencido",
};

/**
 * Transiciones del estado de un paso del alumno.
 * 'vencido' existe solo para A1 (fecha límite pasada sin completar; NO bloquea:
 * el paso se puede seguir trabajando). 'na' se puede revertir a mano (ej: el
 * admin reactiva un paso que la config marcó N/A).
 */
const TRANSICIONES: Record<PasoEstado, readonly PasoEstado[]> = {
  pendiente: ["en_progreso", "completado", "bloqueado", "na", "vencido"],
  en_progreso: ["completado", "bloqueado", "pendiente", "vencido"],
  completado: ["en_progreso", "pendiente"],
  bloqueado: ["pendiente", "en_progreso"],
  na: ["pendiente"],
  vencido: ["en_progreso", "completado"],
};

/**
 * B1 (plan de cuotas) y B2 (último pago presencial) NO se editan a mano: su
 * estado lo fija sincronizarPasosPago a partir del plan de cuotas. Editarlos en
 * el tablero se revertía solo en la próxima sincronización, así que el dominio
 * es la fuente única de verdad y los trata como solo lectura.
 */
const PASOS_DERIVADOS_DE_PAGO: ReadonlySet<PasoCodigo> = new Set(["b1", "b2"]);

export function esPasoDerivadoDePago(codigo: PasoCodigo): boolean {
  return PASOS_DERIVADOS_DE_PAGO.has(codigo);
}

export function puedeTransicionarPasoAlumno(
  codigo: PasoCodigo,
  actual: PasoEstado,
  nuevo: PasoEstado
): boolean {
  if (!esPasoEditable(codigo)) return false; // Paso 0: solo lectura
  if (esPasoDerivadoDePago(codigo)) return false; // B1/B2: derivados del plan de cuotas
  if (nuevo === "vencido" && codigo !== "a1") return false;
  if (actual === nuevo) return true;
  return TRANSICIONES[actual].includes(nuevo);
}

export function transicionesPasoAlumno(
  codigo: PasoCodigo,
  actual: PasoEstado
): readonly PasoEstado[] {
  if (!esPasoEditable(codigo)) return [actual];
  if (esPasoDerivadoDePago(codigo)) return [actual];
  const destinos = TRANSICIONES[actual].filter(
    (e) => e !== "vencido" || codigo === "a1"
  );
  return [actual, ...destinos];
}

/**
 * MIN-13/MIN-06: un paso cuenta para la completitud y las alertas de
 * "obligatorios" solo si está activo y NO es opcional según la config del
 * colegio. El llamador indica si el paso quedó marcado opcional al inicializar.
 */
export function cuentaParaCompletitud(estado: PasoEstado, esOpcional: boolean): boolean {
  return estado !== "na" && !esOpcional;
}
