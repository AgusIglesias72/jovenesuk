import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

import { countAsignacionesActivas, createAsignacion } from "./asignaciones";
import { getColegioById, getConfigDocumental } from "./colegios";
import { crearPasosParaAsignacion } from "./pasos-alumno";
import { setViajeEstado } from "./viajes";
import { alumnos, type Alumno } from "@/lib/db/schema/alumnos";
import type { Viaje } from "@/lib/db/schema/viajes";
import { edadAlInicioDelViaje, pasosIniciales } from "@/lib/domain/pasos";

/**
 * Núcleo del trigger de asignación (PRD §6.2), compartido por la server action
 * y el webhook del Google Form: crea la asignación, genera el tablero M6 con
 * los N/A automáticos y auto-confirma el viaje Grupal al llegar a 5.
 *
 * Las VALIDACIONES (estado del viaje, pasaporte, cupo) son responsabilidad
 * del llamador: acá solo se ejecuta el efecto.
 */
export async function asignarConTablero(opts: {
  viaje: Viaje;
  alumno: Alumno;
  /** null cuando lo dispara el webhook (sin sesión). */
  usuarioId: string | null;
}): Promise<{ asignacionId: string; autoConfirmado: boolean; pasosCreados: number }> {
  const { viaje, alumno, usuarioId } = opts;

  const asig = await createAsignacion({ alumnoId: alumno.id, viajeId: viaje.id });

  const colegio = await getColegioById(viaje.colegioDestinoId);
  const configDocumental = await getConfigDocumental(viaje.colegioDestinoId);
  const pasos = pasosIniciales({
    configDocumental,
    tipoEntrada: colegio?.tipoEntradaRequerida ?? "eta",
    origenViaje: viaje.origen,
    tipoViaje: viaje.tipo,
    edadAlInicio: edadAlInicioDelViaje(alumno.fechaNacimiento, viaje.fechaInicio),
    canalAlta: alumno.canalAlta,
  });
  await crearPasosParaAsignacion(asig.id, pasos, alumno.fechaAlta, usuarioId);

  // El alumno asignado deja de ser pre-inscripto (PRD §5.5).
  if (alumno.estado === "pre_inscripto") {
    await db
      .update(alumnos)
      .set({ estado: "inscripto", updatedAt: new Date() })
      .where(eq(alumnos.id, alumno.id));
  }

  // Confirmado AUTOMÁTICO al 5to inscripto, solo Grupales (US-13).
  let autoConfirmado = false;
  if (viaje.tipo === "grupal" && viaje.estado === "inscripcion_abierta") {
    const activas = await countAsignacionesActivas(viaje.id);
    if (activas >= 5) {
      await setViajeEstado(viaje.id, "confirmado");
      autoConfirmado = true;
    }
  }

  return { asignacionId: asig.id, autoConfirmado, pasosCreados: pasos.length };
}
