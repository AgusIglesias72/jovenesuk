import { banderaDelViaje, fotoDelViaje } from "../imagenes";
import {
  Aviso,
  Ayuda,
  CodigoDestacado,
  Firma,
  MarcoFamilia,
  Parrafo,
  Pasos,
  SelloListo,
  Subtitulo,
  TarjetaViaje,
  Titulo,
  Volanta,
  type Paso,
} from "./_marca";

/**
 * InscripcionRecibidaEmail — acuse a quien completó el Application Form propio.
 *
 * CONTRATO DE PRIVACIDAD: este template recibe SOLO campos de Nivel 1
 * (`src/lib/domain/inscripciones/niveles.ts`). No hay props para DNI, pasaporte,
 * fecha de nacimiento, teléfonos ni datos de salud, y por eso no pueden
 * filtrarse aunque el llamador tenga la ficha entera a mano: el sender recorta
 * con `soloNivel1` antes de construir esto. Un mail viaja por servidores que no
 * controlamos y queda en la casilla de la familia para siempre; el único dato
 * que hace falta para reconocer la ficha es su código público.
 */

type InscripcionRecibidaEmailProps = {
  tutorNombre: string;
  /** Nombre y apellido del alumno, ya armados. */
  alumnoNombre: string;
  /** Código público INS-000123 (`codigoInscripcion`). */
  codigo: string;
  viajeNombre?: string | null;
  /** UK-2026-JUL-LONDON: elige la foto de cabecera y la bandera. */
  viajeCodigo?: string | null;
};

const PASOS: readonly Paso[] = [
  {
    titulo: "Completaste la ficha",
    texto: "Ya quedó guardada. No hace falta que la vuelvas a cargar.",
    hecho: true,
  },
  {
    titulo: "La revisamos",
    texto: "El equipo controla los datos y, si falta algo, te escribe.",
  },
  {
    titulo: "Te contamos cómo sigue",
    texto: "Documentación, pagos y todo lo que viene hasta el día de la salida.",
  },
];

export function InscripcionRecibidaEmail({
  tutorNombre,
  alumnoNombre,
  codigo,
  viajeNombre,
  viajeCodigo,
}: InscripcionRecibidaEmailProps) {
  const viaje = viajeNombre?.trim();
  // El sender puede llegar sin nombre (una fila vieja, un nombre en blanco): el
  // título no puede quedar colgando en "la ficha de".
  const alumno = alumnoNombre.trim();
  const titulo = alumno ? `¡Listo! Ya tenemos la ficha de ${alumno}` : "¡Listo! Ya tenemos tu ficha";

  return (
    <MarcoFamilia
      preview={alumno ? `Recibimos la ficha de ${alumno} · ${codigo}` : `Recibimos tu ficha · ${codigo}`}
      foto={fotoDelViaje({ codigo: viajeCodigo, nombre: viaje })}
      motivo="Te llega este mail porque completaste la ficha de inscripción de Jóvenes en UK."
    >
      <SelloListo />
      <Volanta>Ficha recibida</Volanta>
      <Titulo>{titulo}</Titulo>

      <Parrafo>Hola {tutorNombre},</Parrafo>
      <Parrafo>
        Recibimos la ficha de inscripción{alumno ? " de " : null}
        {alumno ? <strong>{alumno}</strong> : null}
        {viaje ? (
          <>
            {" "}
            para <strong>{viaje}</strong>
          </>
        ) : null}
        . Ya quedó registrada y el equipo de Jóvenes en UK la va a revisar.
      </Parrafo>

      <CodigoDestacado codigo={codigo}>
        Guardalo: con ese número encontramos tu ficha enseguida si nos escribís.
      </CodigoDestacado>

      {viaje ? (
        <TarjetaViaje
          viaje={{
            nombre: viaje,
            codigo: viajeCodigo,
            bandera: banderaDelViaje({ codigo: viajeCodigo }),
          }}
        />
      ) : null}

      <Subtitulo>Cómo sigue</Subtitulo>
      <Pasos pasos={PASOS} />

      <Aviso icono="lapiz" tono="neutro">
        Por tu privacidad no repetimos acá los datos que cargaste. Si alguno quedó mal,{" "}
        <strong>respondé este mail</strong> contándonos qué corregir y lo arreglamos nosotros.
      </Aviso>
      <Ayuda asuntoWhatsapp={`Hola, tengo una consulta sobre la ficha ${codigo}`} />

      <Firma />
    </MarcoFamilia>
  );
}
