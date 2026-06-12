import { z } from "zod";

// Replica el paisEnum de ./schema (no se importa para evitar import circular:
// schema.ts usa configDocumentalSchema de este módulo).
type Pais =
  | "reino_unido"
  | "irlanda"
  | "canada"
  | "malta"
  | "australia"
  | "argentina"
  | "otro";

/**
 * Config documental por colegio (PRD US-05b) y documentación de entrada (C1).
 * Lógica pura: la consumen el ABM de Colegios y el trigger de asignación (M6).
 */

export const documentoProgramaEnum = z.enum([
  "application_form",
  "test_nivel",
  "parental_consent",
  "confirmation_letter",
  "visa_immigration_letter",
]);
export const requisitoDocumentoEnum = z.enum(["requerido", "opcional", "na"]);
export const tipoEntradaEnum = z.enum(["eta", "visa", "ninguna"]);

export const DOCUMENTOS_PROGRAMA = documentoProgramaEnum.options;
export const REQUISITOS_DOCUMENTO = requisitoDocumentoEnum.options;
export const TIPOS_ENTRADA = tipoEntradaEnum.options;

export type DocumentoPrograma = z.infer<typeof documentoProgramaEnum>;
export type RequisitoDocumento = z.infer<typeof requisitoDocumentoEnum>;
export type TipoEntrada = z.infer<typeof tipoEntradaEnum>;
export type ConfigDocumental = Record<DocumentoPrograma, RequisitoDocumento>;

export const DOCUMENTO_LABELS: Record<DocumentoPrograma, string> = {
  application_form: "Application Form",
  test_nivel: "Test de Nivel",
  parental_consent: "Parental Consent",
  confirmation_letter: "Confirmation Letter",
  visa_immigration_letter: "VISA / Immigration Letter",
};

export const REQUISITO_LABELS: Record<RequisitoDocumento, string> = {
  requerido: "Requerido",
  opcional: "Opcional",
  na: "No aplica",
};

export const TIPO_ENTRADA_LABELS: Record<TipoEntrada, string> = {
  eta: "ETA",
  visa: "VISA",
  ninguna: "Ninguna",
};

/**
 * Defaults por documento (MIN-11, decisión 11/06/2026): los del Modelo v1.7,
 * que reflejan la operación real (Test de Nivel y Parental Consent solo los
 * pide Wimbledon).
 */
export const CONFIG_DOCUMENTAL_DEFAULT: ConfigDocumental = {
  application_form: "requerido",
  test_nivel: "na",
  parental_consent: "na",
  confirmation_letter: "requerido",
  visa_immigration_letter: "requerido",
};

/** Documentos cuya config inicializa pasos del M6 (los otros 2 son campos de control). */
export const DOCUMENTOS_CON_PASO = [
  "application_form",
  "test_nivel",
  "parental_consent",
] as const satisfies readonly DocumentoPrograma[];

/**
 * Default de documentación de entrada por país del colegio (MIN-14):
 * UK → ETA · Irlanda/Malta/Argentina → nada para argentinos · Canadá/Australia
 * → VISA obligatoria (el flujo de gestión de VISA es v2; C1 queda N/A).
 * "otro" → ninguna (el admin lo ajusta a mano si corresponde).
 */
export function tipoEntradaPorPais(pais: Pais): TipoEntrada {
  switch (pais) {
    case "reino_unido":
      return "eta";
    case "canada":
    case "australia":
      return "visa";
    default:
      return "ninguna";
  }
}

/**
 * Config efectiva del colegio: defaults + overrides persistidos.
 * Las filas ausentes en DB caen al default (MIN-11).
 */
export function configDocumentalEfectiva(
  overrides: Partial<ConfigDocumental>
): ConfigDocumental {
  return { ...CONFIG_DOCUMENTAL_DEFAULT, ...overrides };
}

/** Schema Zod del bloque de config en el form del colegio. */
export const configDocumentalSchema = z
  .object({
    application_form: requisitoDocumentoEnum,
    test_nivel: requisitoDocumentoEnum,
    parental_consent: requisitoDocumentoEnum,
    confirmation_letter: requisitoDocumentoEnum,
    visa_immigration_letter: requisitoDocumentoEnum,
  })
  .default(CONFIG_DOCUMENTAL_DEFAULT);
