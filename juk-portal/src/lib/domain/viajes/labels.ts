import { VIAJE_ESTADOS, VIAJE_ORIGENES, VIAJE_TIPOS } from "./schema";

export const VIAJE_ESTADO_LABELS: Record<(typeof VIAJE_ESTADOS)[number], string> = {
  inscripcion_abierta: "Inscripción abierta",
  confirmado: "Confirmado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const VIAJE_TIPO_LABELS: Record<(typeof VIAJE_TIPOS)[number], string> = {
  grupal: "Grupal",
  individual: "Individual",
};

export const VIAJE_ORIGEN_LABELS: Record<(typeof VIAJE_ORIGENES)[number], string> = {
  representante_independiente: "Representante independiente",
  instituto: "Instituto",
  colegio_cliente: "Colegio cliente",
  juk_directo: "JUK (directo)",
};
