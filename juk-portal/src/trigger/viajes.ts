import { task } from "@trigger.dev/sdk/v3";

/**
 * Aviso de cancelación de un viaje a las familias de todos los inscriptos
 * (US-13).
 *
 * Vive en un job y no en `cancelarViajeAction` porque son N emails en serie:
 * con un grupo completo la server action se comía el timeout de la función y
 * un fallo a mitad de camino no era reintentable. Acá el equipo cancela al
 * instante y Trigger reintenta los envíos.
 */
export const notificarCancelacionViaje = task({
  id: "notificar-cancelacion-viaje",
  maxDuration: 600,
  run: async (payload: { viajeId: string }) => {
    const { getViajeById } = await import("@/lib/db/queries/viajes");
    const viaje = await getViajeById(payload.viajeId);
    if (!viaje) return { notificados: 0, motivo: "viaje inexistente" };

    const { listAsignacionesByViaje } = await import("@/lib/db/queries/asignaciones");
    const { getAlumnoById } = await import("@/lib/db/queries/alumnos");
    const { sendEmail } = await import("@/lib/email");
    const { ViajeCanceladoEmail } = await import("@/lib/email/templates/viaje-cancelado-email");

    const roster = (await listAsignacionesByViaje(viaje.id)).filter((a) => a.estado === "activa");

    let notificados = 0;
    for (const asignacion of roster) {
      const alumno = await getAlumnoById(asignacion.alumno.id);
      if (!alumno) continue;
      await sendEmail({
        to: alumno.tutor1Email,
        tipo: "comunicacion",
        subject: `Cancelación del viaje ${viaje.codigo}`,
        react: ViajeCanceladoEmail({
          tutorNombre: alumno.tutor1Nombre,
          alumnoNombre: `${alumno.nombre} ${alumno.apellido}`,
          viajeNombre: viaje.nombre,
          viajeCodigo: viaje.codigo,
        }),
      });
      notificados += 1;
    }

    return { notificados };
  },
});
