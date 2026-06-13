import { sendEmail } from "./index";
import { RecordatorioEmail } from "./templates/recordatorio-email";

/** Recordatorio automático a la familia (US-20 A1 / US-33 D1). */
export async function sendRecordatorioEmail(opts: {
  to: string;
  tutorNombre: string;
  alumnoNombre: string;
  viajeCodigo: string;
  paso: string;
  diasAntes: number;
  fechaObjetivo: Date;
}) {
  return sendEmail({
    to: opts.to,
    tipo: "automatico",
    subject: `Recordatorio · ${opts.paso} de ${opts.alumnoNombre} (${opts.diasAntes} día${opts.diasAntes === 1 ? "" : "s"})`,
    react: (
      <RecordatorioEmail
        tutorNombre={opts.tutorNombre}
        alumnoNombre={opts.alumnoNombre}
        viajeCodigo={opts.viajeCodigo}
        paso={opts.paso}
        diasAntes={opts.diasAntes}
        fechaObjetivo={opts.fechaObjetivo}
      />
    ),
  });
}
