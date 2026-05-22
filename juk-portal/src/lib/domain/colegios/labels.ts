import {
  ESTADOS_COLEGIO,
  PAISES,
  TIPOS_ALOJAMIENTO,
  TIPOS_COLEGIO,
} from "./schema";

/** Labels en español rioplatense para mostrar los enums en la UI. */

export const TIPO_COLEGIO_LABELS: Record<(typeof TIPOS_COLEGIO)[number], string> = {
  destino: "Destino",
  cliente: "Cliente",
};

export const ESTADO_COLEGIO_LABELS: Record<(typeof ESTADOS_COLEGIO)[number], string> = {
  activo: "Activo",
  inactivo: "Inactivo",
};

export const PAIS_LABELS: Record<(typeof PAISES)[number], string> = {
  reino_unido: "Reino Unido",
  irlanda: "Irlanda",
  canada: "Canadá",
  malta: "Malta",
  australia: "Australia",
  argentina: "Argentina",
  otro: "Otro",
};

export const TIPO_ALOJAMIENTO_LABELS: Record<(typeof TIPOS_ALOJAMIENTO)[number], string> = {
  familia_anfitriona: "Familia anfitriona",
  residencia: "Residencia",
  campus: "Campus",
  otro: "Otro",
};
