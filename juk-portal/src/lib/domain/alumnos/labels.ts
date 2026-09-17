import { ALUMNO_ESTADOS, CANALES_ALTA, CONDICIONES_FISCALES } from "./schema";

export const ALUMNO_ESTADO_LABELS: Record<(typeof ALUMNO_ESTADOS)[number], string> = {
  pre_inscripto: "Pre-inscripto",
  inscripto: "Inscripto",
  activo: "Activo",
  viajando: "Viajando",
  finalizado: "Finalizado",
  baja: "Baja",
};

export const CANAL_ALTA_LABELS: Record<(typeof CANALES_ALTA)[number], string> = {
  formulario_web: "Formulario web",
  webhook: "Google Form",
  alta_manual: "Carga manual",
};

export const CONDICION_FISCAL_LABELS: Record<(typeof CONDICIONES_FISCALES)[number], string> = {
  consumidor_final: "Consumidor final",
  responsable_inscripto: "Responsable inscripto",
  monotributo: "Monotributo",
  exento: "Exento",
  otro: "Otro",
};

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

export const ALUMNO_ESTADO_TONE: Record<(typeof ALUMNO_ESTADOS)[number], Tone> = {
  pre_inscripto: "neutral",
  inscripto: "info",
  activo: "brand",
  viajando: "warning",
  finalizado: "success",
  baja: "danger",
};
