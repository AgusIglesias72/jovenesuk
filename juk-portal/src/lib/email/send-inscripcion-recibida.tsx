import type { Inscripcion } from "@/lib/db/schema/inscripciones";
import { soloNivel1 } from "@/lib/domain/inscripciones/niveles";
import { codigoInscripcion, type InscripcionData } from "@/lib/domain/inscripciones/schema";

import { sendEmail } from "./index";
import { InscripcionRecibidaEmail } from "./templates/inscripcion-recibida";

/** Contexto del viaje, que no vive en la fila sino en el join. */
export type ViajeDeLaInscripcion = {
  nombre?: string | null;
  codigo?: string | null;
};

/**
 * La fila tiene `null` donde el schema del formulario tiene `undefined`, y
 * además columnas que no son de la ficha (id, sellos, hashes). Se normaliza
 * ENTERA, no campo por campo, justamente para que el recorte lo siga haciendo
 * `soloNivel1`: es lista blanca, así que una columna nueva llega al mail solo
 * si alguien la clasificó como Nivel 1 a mano.
 */
export function fichaDeLaFila(fila: Inscripcion): Partial<InscripcionData> {
  const salida: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(fila)) {
    if (valor !== null) salida[campo] = valor;
  }
  return salida as Partial<InscripcionData>;
}

export function nombreDelAlumno(visible: Partial<InscripcionData>): string {
  return [visible.nombre, visible.apellido].filter(Boolean).join(" ");
}

export function asuntoInscripcionRecibida(inscripcion: Inscripcion): string {
  const alumno = nombreDelAlumno(soloNivel1(fichaDeLaFila(inscripcion)));
  const codigo = codigoInscripcion(inscripcion.numero);
  return alumno ? `Recibimos la ficha de ${alumno} · ${codigo}` : `Recibimos tu ficha · ${codigo}`;
}

/**
 * Acuse a quien completó el Application Form. Sale como `comunicacion` (desde
 * info@) a propósito: si un dato quedó mal, la familia contesta este mismo mail
 * y le llega a una casilla que alguien lee. Un `automatico` desde noreply@ le
 * cerraría el único canal que tiene.
 *
 * Se llama con la ficha YA persistida y del lado del llamador va en un
 * try/catch: una caída de Resend no puede perder una inscripción que se guardó
 * bien.
 */
export async function sendInscripcionRecibidaEmail(
  inscripcion: Inscripcion,
  viaje?: ViajeDeLaInscripcion | null
): Promise<void> {
  const visible = soloNivel1(fichaDeLaFila(inscripcion));
  const to = visible.tutor1Email;
  // Sin email del tutor no hay a quién acusarle recibo. La ficha ya quedó
  // guardada: el equipo la ve igual en la bandeja.
  if (!to) return;

  await sendEmail({
    to,
    tipo: "comunicacion",
    subject: asuntoInscripcionRecibida(inscripcion),
    react: (
      <InscripcionRecibidaEmail
        tutorNombre={visible.tutor1Nombre ?? "familia"}
        alumnoNombre={nombreDelAlumno(visible)}
        codigo={codigoInscripcion(inscripcion.numero)}
        viajeNombre={viaje?.nombre}
      />
    ),
  });
}
