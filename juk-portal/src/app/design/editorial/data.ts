/*
 * Datos hardcodeados + mapping de badges para la dirección Editorial.
 * Los colores salen de tokens.css (var(--b-...)) para que todo viva en un solo lugar.
 */

export const badgeViaje = {
  inscripcion_abierta: { label: "Inscripción abierta", fg: "var(--b-viaje-abierta)", bg: "var(--b-viaje-abierta-bg)" },
  confirmado: { label: "Confirmado", fg: "var(--b-viaje-confirmado)", bg: "var(--b-viaje-confirmado-bg)" },
  en_curso: { label: "En curso", fg: "var(--b-viaje-en_curso)", bg: "var(--b-viaje-en_curso-bg)" },
  finalizado: { label: "Finalizado", fg: "var(--b-viaje-finalizado)", bg: "var(--b-viaje-finalizado-bg)" },
  cancelado: { label: "Cancelado", fg: "var(--b-viaje-cancelado)", bg: "var(--b-viaje-cancelado-bg)" },
} as const;

export const badgePaso = {
  pendiente: { label: "Pendiente", fg: "var(--b-paso-pendiente)", bg: "var(--b-paso-pendiente-bg)" },
  en_progreso: { label: "En progreso", fg: "var(--b-paso-en_progreso)", bg: "var(--b-paso-en_progreso-bg)" },
  completado: { label: "Completado", fg: "var(--b-paso-completado)", bg: "var(--b-paso-completado-bg)" },
  bloqueado: { label: "Bloqueado", fg: "var(--b-paso-bloqueado)", bg: "var(--b-paso-bloqueado-bg)" },
  na: { label: "N/A", fg: "var(--b-paso-na)", bg: "var(--b-paso-na-bg)" },
} as const;

export const badgePolice = {
  pendiente: { label: "Pendiente", fg: "var(--b-police-pendiente)", bg: "var(--b-police-pendiente-bg)" },
  en_tramite: { label: "En trámite", fg: "var(--b-police-en_tramite)", bg: "var(--b-police-en_tramite-bg)" },
  aprobado: { label: "Aprobado", fg: "var(--b-police-aprobado)", bg: "var(--b-police-aprobado-bg)" },
  vencido: { label: "Vencido", fg: "var(--b-police-vencido)", bg: "var(--b-police-vencido-bg)" },
} as const;

/* ── Dashboard ── */
export const stats = [
  { label: "Alumnos", value: "60", note: "en cartera" },
  { label: "Viajes confirmados", value: "3", note: "esta temporada" },
  { label: "Viajando ahora", value: "0", note: "en destino" },
  { label: "Inscripción abierta", value: "2", note: "tomando cupo" },
] as const;

export const proximosViajes = [
  {
    codigo: "UK-2026-JUL-LONDON",
    nombre: "Londres en Julio · Campus",
    estado: "inscripcion_abierta" as const,
    fechas: "04/07/2026 – 25/07/2026",
    colegio: "London School of English",
    cupo: 12,
    cupoMax: 24,
  },
  {
    codigo: "UK-2026-AGO-BRIGHTON",
    nombre: "Brighton Costa · Inmersión",
    estado: "confirmado" as const,
    fechas: "08/08/2026 – 29/08/2026",
    colegio: "Brighton Language College",
    cupo: 18,
    cupoMax: 20,
  },
  {
    codigo: "UK-2026-JUL-OXFORD",
    nombre: "Oxford Clásico · Colleges",
    estado: "inscripcion_abierta" as const,
    fechas: "11/07/2026 – 01/08/2026",
    colegio: "Oxford International",
    cupo: 6,
    cupoMax: 22,
  },
] as const;

/* ── Alumnos (lista) ── */
export const alumnos = [
  { apellido: "Álvarez", nombre: "Martina", dni: "45.231.880", pasaporte: "AAH998211", vto: "12/09/2031", estado: "completado" as const },
  { apellido: "Benedetti", nombre: "Joaquín", dni: "44.110.502", pasaporte: "AAG771043", vto: "03/02/2029", estado: "en_progreso" as const },
  { apellido: "Cabrera", nombre: "Lucía", dni: "46.880.120", pasaporte: "—", vto: "—", estado: "pendiente" as const },
  { apellido: "Domínguez", nombre: "Tomás", dni: "45.009.771", pasaporte: "AAF330218", vto: "21/11/2026", estado: "bloqueado" as const },
  { apellido: "Esquivel", nombre: "Valentina", dni: "47.221.009", pasaporte: "AAH114550", vto: "30/06/2030", estado: "en_progreso" as const },
  { apellido: "Ferreyra", nombre: "Bautista", dni: "44.778.310", pasaporte: "AAG662109", vto: "15/04/2028", estado: "completado" as const },
] as const;

/* ── Detalle de viaje ── */
export const viajeDetalle = {
  titulo: "Londres en Julio · Campus",
  codigo: "UK-2026-JUL-LONDON",
  estado: "inscripcion_abierta" as const,
  fechas: "04/07/2026 – 25/07/2026",
  destino: "London School of English · Reino Unido",
  curso: "General English",
  origen: "Representante independiente",
  groupLeaders: 2,
  cupo: 0,
  cupoMax: 24,
  cupoMin: 5,
};

export const groupLeaders = [
  { nombre: "Carolina Steed", rol: "Group Leader · Principal", police: "aprobado" as const, principal: true },
  { nombre: "Diego Ferrari", rol: "Group Leader", police: "en_tramite" as const, principal: false },
] as const;

export const pasosM7 = [
  { n: "01", nombre: "Pasajes", estado: "en_progreso" as const },
  { n: "02", nombre: "Excursiones", estado: "pendiente" as const },
  { n: "03", nombre: "Transfers", estado: "bloqueado" as const, aviso: "Requiere Pasajes" },
  { n: "04", nombre: "Tarjetas de transporte", estado: "pendiente" as const },
  { n: "05", nombre: "Police Checks", estado: "completado" as const },
] as const;
