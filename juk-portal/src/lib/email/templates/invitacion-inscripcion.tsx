import { VIGENCIA_DIAS } from "@/lib/domain/inscripciones/invitacion";

import { banderaDelViaje, fotoDelViaje } from "../imagenes";
import {
  Aviso,
  Ayuda,
  BotonPrincipal,
  Firma,
  ListaConIconos,
  MarcoFamilia,
  NotaDelBoton,
  Parrafo,
  Pasos,
  Subtitulo,
  TarjetaViaje,
  Titulo,
  Volanta,
  type ItemConIcono,
  type Paso,
} from "./_marca";

/**
 * InvitacionInscripcionEmail — el mail que abre el Application Form propio.
 * Lleva el ÚNICO link con el token en claro: de la base solo sale el hash.
 *
 * Los props son a propósito solo contexto de campaña (a quién saludamos, el
 * viaje, el link). Nada de la ficha viaja acá, y no puede: el mail sale ANTES
 * de que la familia cargue un solo dato, a una casilla que no controlamos. Si
 * mañana alguien quisiera precargar un DNI "para agilizar", tendría que sumar
 * un prop de Nivel 2 — y eso es lo que traba el test del sender
 * (`send-invitacion-inscripcion.test.ts`).
 *
 * El plazo no se escribe a mano: sale de `VIGENCIA_DIAS`, así que el mail no
 * puede prometer 90 días mientras la invitación vence a los 30.
 */

type InvitacionInscripcionEmailProps = {
  contactoNombre?: string | null;
  prospectoNombre?: string | null;
  viajeNombre?: string | null;
  /** UK-2026-JUL-LONDON: elige la foto de cabecera y la bandera. */
  viajeCodigo?: string | null;
  /** Las fechas del viaje YA formateadas ("Del 04/07/2026 al 18/07/2026"). */
  viajeFechas?: string | null;
  /** El `pais` del viaje (reino_unido, irlanda…), para la bandera. */
  viajePais?: string | null;
  formularioUrl: string;
  unsubscribeUrl: string;
  /** El vencimiento YA formateado (DD/MM/AAAA). Sin él se anuncia la vigencia estándar. */
  venceEl?: string;
  vigenciaDias?: number;
};

/**
 * Se saluda a la persona si la tenemos, y si no a la institución. El genérico
 * existe porque el CRM tiene prospectos cargados solo con una casilla: un
 * "Hola null" en el primer mail que ve una familia no es una opción.
 */
function saludoDe(contactoNombre?: string | null, prospectoNombre?: string | null): string {
  if (contactoNombre?.trim()) return `Hola ${contactoNombre.trim()},`;
  if (prospectoNombre?.trim()) return `Hola, equipo de ${prospectoNombre.trim()}:`;
  return "¡Hola!";
}

/**
 * Lo que pide el formulario, contado para que la familia lo junte ANTES de
 * abrirlo (las secciones de `src/app/inscripcion/inscripcion-form.tsx`). Son
 * descripciones de qué se pide, nunca un dato.
 */
const TENER_A_MANO: readonly ItemConIcono[] = [
  {
    icono: "pasaporte",
    titulo: "El pasaporte y el DNI del alumno",
    texto:
      "Número y vencimiento del pasaporte. El nombre va tal como figura ahí: es el que usamos para toda la documentación del viaje.",
  },
  {
    icono: "celular",
    titulo: "Los datos del adulto responsable",
    texto: "Nombre, celular y mail: es por donde te vamos a escribir.",
  },
  {
    icono: "salud",
    titulo: "Salud y alojamiento",
    texto:
      "Si tiene alergias, toma alguna medicación o hay algo que tengamos que saber para ubicarlo mejor. Es opcional.",
  },
];

const PASOS: readonly Paso[] = [
  {
    titulo: "Completás la ficha",
    texto: "Al terminar te llega un mail con tu código de referencia.",
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

export function InvitacionInscripcionEmail({
  contactoNombre,
  prospectoNombre,
  viajeNombre,
  viajeCodigo,
  viajeFechas,
  viajePais,
  formularioUrl,
  unsubscribeUrl,
  venceEl,
  vigenciaDias = VIGENCIA_DIAS,
}: InvitacionInscripcionEmailProps) {
  const saludo = saludoDe(contactoNombre, prospectoNombre);
  const viaje = viajeNombre?.trim();
  // La frase se arma entera acá: intercalar `{vigenciaDias}` entre texto hace
  // que React parta el nodo y meta un comentario en el medio ("vence en
  // <!-- -->30<!-- --> días"), que se ve igual pero deja de ser buscable en el
  // HTML renderizado.
  const plazo = venceEl?.trim()
    ? `El link es personal y vence el ${venceEl.trim()}.`
    : `El link es personal y vence en ${vigenciaDias} días.`;
  const intro = viaje
    ? `Ya podés completar la ficha de inscripción para ${viaje}.`
    : "Ya podés completar la ficha de inscripción del viaje.";

  return (
    <MarcoFamilia
      preview={
        viaje
          ? `Completá la ficha de inscripción · ${viaje}. Son unos 10 minutos.`
          : "Completá la ficha de inscripción. Son unos 10 minutos."
      }
      foto={fotoDelViaje({ codigo: viajeCodigo, nombre: viaje })}
      motivo="Recibís este correo porque estás en contacto con Jóvenes en UK por un viaje de estudios."
      bajaUrl={unsubscribeUrl}
    >
      <Volanta>{viaje ? `Inscripción abierta · ${viaje}` : "Inscripción abierta"}</Volanta>
      <Titulo>Completá la ficha de inscripción</Titulo>

      <Parrafo>{saludo}</Parrafo>
      <Parrafo>
        {intro} Es el formulario con el que armamos toda la documentación, así que es el{" "}
        <strong>primer paso para reservar el lugar</strong>.
      </Parrafo>

      {viaje ? (
        <TarjetaViaje
          viaje={{
            nombre: viaje,
            codigo: viajeCodigo,
            fechas: viajeFechas,
            bandera: banderaDelViaje({ paisDestino: viajePais, codigo: viajeCodigo }),
          }}
        />
      ) : null}

      <BotonPrincipal href={formularioUrl}>Completar la inscripción</BotonPrincipal>
      <NotaDelBoton>Son unos 10 minutos y se puede hacer desde el teléfono.</NotaDelBoton>

      <Aviso icono="calendario">
        <strong>{plazo}</strong> Mejor no reenviarlo: si otra persona de la familia tiene que
        completar la ficha, avisanos y le mandamos el suyo.
      </Aviso>

      <Subtitulo>Qué conviene tener a mano</Subtitulo>
      <ListaConIconos items={TENER_A_MANO} />
      <Parrafo chico>
        ¿El pasaporte está en trámite o falta algún dato? Escribinos antes de empezar y lo vemos
        juntos.
      </Parrafo>

      <Subtitulo>Cómo sigue</Subtitulo>
      <Pasos pasos={PASOS} />

      <Aviso icono="candado" tono="neutro">
        Lo que cargues lo ve <strong>solo el equipo que organiza el viaje</strong>.
      </Aviso>
      <Ayuda asuntoWhatsapp="Hola, tengo una consulta sobre la ficha de inscripción" />

      <Firma />
    </MarcoFamilia>
  );
}
