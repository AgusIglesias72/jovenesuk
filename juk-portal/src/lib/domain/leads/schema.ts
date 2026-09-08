/*
 * Dominio: captación de clientes potenciales (leads) y suscripciones al
 * newsletter desde la web pública. Lógica pura (sin next/react/db): define
 * las opciones del formulario y la validación Zod compartida entre el
 * formulario (cliente) y la server action.
 *
 * La PERSISTENCIA y el aviso por email los implementa el backend
 * (ver docs/forms-implementation.md).
 */
import { z } from "zod";

/* ── Opciones del formulario (value + label para los <select>) ───────── */

export const PARA_QUIEN = [
  { value: "para_mi", label: "Para mí" },
  { value: "para_mi_hijo", label: "Para mi hijo/a" },
  { value: "colegio", label: "Para mi colegio o institución" },
] as const;

export const MODALIDAD = [
  { value: "asesoramiento", label: "Busco asesoramiento" },
  { value: "grupal", label: "Salida grupal" },
  { value: "individual", label: "Salida individual" },
  { value: "study_work", label: "Study & Work" },
] as const;

export const CUANDO = [
  { value: "proximos_3_meses", label: "En los próximos 3 meses" },
  { value: "este_ano", label: "Este año" },
  { value: "proximo_ano", label: "El año que viene" },
  { value: "solo_averiguando", label: "Solo estoy averiguando" },
] as const;

export const DESTINO = [
  { value: "reino_unido", label: "Reino Unido" },
  { value: "irlanda", label: "Irlanda" },
  { value: "malta", label: "Malta" },
  { value: "canada", label: "Canadá" },
  { value: "estados_unidos", label: "Estados Unidos" },
  { value: "australia", label: "Australia" },
  { value: "nueva_zelanda", label: "Nueva Zelanda" },
  { value: "sudafrica", label: "Sudáfrica" },
  { value: "no_se", label: "Todavía no lo decidí" },
] as const;

/* ── Estado de seguimiento de la consulta en el admin ────────────────── */

export const ESTADO_CONSULTA = [
  { value: "nueva", label: "Nueva" },
  { value: "contactada", label: "Contactada" },
  { value: "descartada", label: "Descartada" },
] as const;

export type EstadoConsulta = (typeof ESTADO_CONSULTA)[number]["value"];

export const values = <T extends ReadonlyArray<{ value: string }>>(opts: T) =>
  opts.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];

/* ── Validación ──────────────────────────────────────────────────────── */

export const estadoConsultaSchema = z.enum(values(ESTADO_CONSULTA));

export const cambiarEstadoConsultaSchema = z.object({
  id: z.string().uuid(),
  estado: estadoConsultaSchema,
});

export const newsletterSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido."),
  // Honeypot anti-spam: debe venir vacío (campo oculto al usuario real).
  website: z.string().max(0).optional(),
});

export const leadSchema = z
  .object({
    nombre: z.string().trim().min(2, "Ingresá tu nombre.").max(60),
    apellido: z.string().trim().min(2, "Ingresá tu apellido.").max(60),
    email: z.string().trim().email("Ingresá un email válido."),
    telefono: z
      .string()
      .trim()
      .min(6, "Ingresá un teléfono de contacto.")
      .max(30),
    paraQuien: z.enum(values(PARA_QUIEN)),
    institucion: z.string().trim().max(120).optional(),
    modalidad: z.enum(values(MODALIDAD), {
      errorMap: () => ({ message: "Elegí una opción." }),
    }),
    destino: z.enum(values(DESTINO)).optional(),
    cuando: z.enum(values(CUANDO), {
      errorMap: () => ({ message: "Elegí cuándo te gustaría viajar." }),
    }),
    mensaje: z.string().trim().max(1000).optional(),
    acepta: z.literal(true, {
      errorMap: () => ({ message: "Necesitamos tu consentimiento para contactarte." }),
    }),
    // Honeypot anti-spam.
    website: z.string().max(0).optional(),
  })
  .refine((d) => d.paraQuien !== "colegio" || (d.institucion?.length ?? 0) >= 2, {
    message: "Contanos el nombre de tu colegio o institución.",
    path: ["institucion"],
  });

export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
