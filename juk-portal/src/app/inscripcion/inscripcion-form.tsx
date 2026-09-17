"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { DateInput } from "@/components/ui/date-input";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import type { Variante } from "@/lib/domain/inscripciones/schema";
import { ENLACE_POLITICA, TEXTO_CONSENTIMIENTO } from "@/lib/domain/privacidad/politica";
import { cn } from "@/lib/utils/cn";

import { enviarInscripcion } from "./actions";
import {
  MICROCOPY,
  PRESENTACION_POR_VARIANTE,
  textoRotulo,
  type PresentacionVariante,
} from "./variantes";

/**
 * La ficha que completa la familia. Todo lo que decide algo (a qué viaje entra,
 * de qué campaña viene, en qué estado nace) se deriva en el server a partir del
 * token: acá solo viaja lo que la familia tipeó, más el token en claro — que ya
 * está en su barra de direcciones, así que mandarlo en un campo oculto no
 * expone nada nuevo y le ahorra a la action depender del `referer`.
 *
 * El éxito se muestra INLINE y no con `useToast()`: esta superficie no monta
 * `ToastProvider` (solo lo hacen `admin-shell` y el shell de familias), y un
 * toast que desaparece no es un acuse de recibo suficiente para una ficha que
 * se completa una sola vez.
 *
 * LAS TRES VARIANTES SON UN SOLO FORMULARIO
 * -----------------------------------------
 * Este componente no se duplica ni se bifurca por variante: los campos, el
 * orden, la validación y los nombres accesibles son los mismos en las tres.
 * De la piel se encarga el CSS (`src/styles/form-variants.css`, la clase la
 * marca la page) y de los adornos, los datos de `variantes.ts`. Lo decorativo
 * —el número de sección, el tilde de la parada, la barra de progreso— va en
 * nodos `aria-hidden` para que el árbol accesible no cambie entre variantes.
 */

/**
 * El consentimiento se parte en el nombre de la política para linkearla sin
 * reescribir la frase: lo que se muestra tiene que ser palabra por palabra el
 * texto versionado que la action hashea y sella junto a la ficha.
 */
const [ANTES_DEL_ENLACE = "", DESPUES_DEL_ENLACE = ""] =
  TEXTO_CONSENTIMIENTO.split(ENLACE_POLITICA);

/** Nombre humano de cada campo, para el resumen de errores de arriba. */
const ETIQUETAS: Record<string, string> = {
  nombre: "Nombre del alumno",
  apellido: "Apellido del alumno",
  fechaNacimiento: "Fecha de nacimiento",
  dni: "DNI",
  numeroPasaporte: "Número de pasaporte",
  fechaVencimientoPasaporte: "Vencimiento del pasaporte",
  tutor1Nombre: "Nombre del adulto responsable",
  tutor1Celular: "Celular del adulto responsable",
  tutor1Email: "Email del adulto responsable",
  telefonoAlumno: "Teléfono del alumno",
  emailAlumno: "Email del alumno",
  alergiasSalud: "Alergias y datos de salud",
  preferenciasAlojamiento: "Preferencias de alojamiento",
  nivelInglesAutoevaluacion: "Nivel de inglés",
  acepta: "Consentimiento",
};

/**
 * Las secciones del formulario, con los campos que cada una necesita para
 * darse por completa. La lista de obligatorios se escribe acá y no se deduce
 * del atributo `required` del DOM: el form va con `noValidate` y los controles
 * no lo llevan (la validación real es la del schema, en el server).
 */
const SECCIONES = [
  {
    titulo: "Datos del alumno",
    requeridos: ["nombre", "apellido", "fechaNacimiento", "dni"],
  },
  {
    titulo: "Pasaporte",
    requeridos: ["numeroPasaporte", "fechaVencimientoPasaporte"],
  },
  {
    titulo: "Adulto responsable",
    requeridos: ["tutor1Nombre", "tutor1Celular", "tutor1Email"],
  },
  {
    titulo: "Contacto y preferencias del alumno",
    requeridos: [],
  },
] as const satisfies readonly { titulo: string; requeridos: readonly string[] }[];

/** El consentimiento no es una sección, pero sí un obligatorio del avance. */
const REQUERIDOS: readonly string[] = [
  ...SECCIONES.flatMap((s) => s.requeridos),
  "acepta",
];

/**
 * Valores con los que puede arrancar la ficha. Hoy siempre vacía: el token no
 * lleva datos personales. Si algún día se prellena algo, llega por acá —
 * resuelto en el server— y nunca desde la URL, que es texto que escribe quien
 * manda el link.
 */
export type PresetInscripcion = Partial<Record<"tutor1Nombre" | "tutor1Email", string>>;

type Props = {
  /** Token en claro del link, o `undefined` si la carga llegó sin link. */
  token?: string;
  variante: Variante;
  preset?: PresetInscripcion;
};

export function InscripcionForm({ token, variante, preset = {} }: Props) {
  const presentacion = PRESENTACION_POR_VARIANTE[variante];
  const [state, action, pending] = useActionState(enviarInscripcion, null);
  const resumenRef = useRef<HTMLDivElement>(null);
  // Qué obligatorios ya tienen valor. Es estado de la pantalla (lo que se ve en
  // el teclado), no datos del server: alimenta el tilde de cada parada y la
  // barra de progreso. Solo lo sigue la variante que los muestra — mirar el
  // formulario entero en cada tecla no tiene sentido si nada lo dibuja.
  const [llenos, setLlenos] = useState<ReadonlySet<string>>(() => new Set<string>());

  // El resumen recibe el foco al fallar: el error puede estar a cuatro pantallas
  // de scroll del botón y nadie lo ve si solo se marca el campo.
  useEffect(() => {
    if (state && !state.ok) resumenRef.current?.focus();
  }, [state]);

  // `input` burbujea desde todos los controles, incluido el <input type="date">
  // oculto de <DateInput>, que despacha el evento a mano al commitear su ISO.
  function alEscribir(e: React.FormEvent<HTMLFormElement>) {
    const datos = new FormData(e.currentTarget);
    setLlenos(
      new Set(REQUERIDOS.filter((campo) => String(datos.get(campo) ?? "").trim() !== ""))
    );
  }

  const avance = Math.round((llenos.size / REQUERIDOS.length) * 100);

  const fe = (k: string) => (state && !state.ok ? state.fieldErrors?.[k]?.[0] : undefined);
  const nota = (campo: string) => (presentacion.microcopy ? MICROCOPY[campo] : undefined);
  const errores =
    state && !state.ok
      ? Object.entries(state.fieldErrors ?? {}).flatMap(([campo, mensajes]) => {
          const mensaje = mensajes?.[0];
          return mensaje ? [{ campo, mensaje }] : [];
        })
      : [];

  if (state?.ok) {
    return (
      <div className="form-caja form-exito p-6 text-center sm:p-10" role="status">
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--c-success-bg)] text-[var(--c-success)]"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 13 4 4L19 7" />
          </svg>
        </span>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
          Recibimos la inscripción
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          {state.data.mensaje}
        </p>
        {state.data.codigo && (
          <p className="mt-5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            Tu número de inscripción:{" "}
            <span className="font-mono font-bold text-[var(--c-ink)]">{state.data.codigo}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      action={action}
      onInput={presentacion.progreso ? alEscribir : undefined}
      className="form-caja p-5 sm:p-8"
      noValidate
    >
      {/* El token viaja oculto; el server lo hashea y vuelve a resolver la
          invitación. El viaje, la campaña y el estado NO salen de este form.
          `v` se reenvía solo porque es estético: lo que se registra tiene que
          ser la variante que la familia efectivamente vio. */}
      {token && <input type="hidden" name="token" value={token} />}
      <input type="hidden" name="v" value={variante} />

      {presentacion.progreso && (
        // Decorativa a propósito: los campos y sus errores son la fuente de
        // verdad del avance, y el árbol accesible tiene que ser el mismo en las
        // tres variantes. El ancho es un porcentaje calculado: Tailwind no
        // puede expresarlo.
        <div className="form-progreso" aria-hidden>
          <span className="form-progreso-barra" style={{ width: `${avance}%` }} />
        </div>
      )}

      {errores.length > 0 && (
        <div
          ref={resumenRef}
          tabIndex={-1}
          role="alert"
          className="mb-6 rounded-[var(--r-md)] border border-[var(--c-danger)] bg-[var(--c-danger-bg)] p-4 focus:outline-none"
        >
          <p className="text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">
            Revisá {errores.length === 1 ? "este dato" : `estos ${errores.length} datos`} antes
            de enviar:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink)]">
            {errores.map(({ campo, mensaje }) => (
              <li key={campo}>
                <span className="font-semibold">{ETIQUETAS[campo] ?? campo}</span>: {mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Seccion indice={0} presentacion={presentacion} llenos={llenos}>
        <Campo label="Nombre" required error={fe("nombre")} help="Como figura en el pasaporte">
          <Input name="nombre" autoComplete="off" />
        </Campo>
        <Campo label="Apellido" required error={fe("apellido")}>
          <Input name="apellido" autoComplete="off" />
        </Campo>
        <Campo label="Fecha de nacimiento" required error={fe("fechaNacimiento")}>
          <DateInput name="fechaNacimiento" />
        </Campo>
        <Campo
          label="DNI"
          required
          error={fe("dni")}
          help="Solo números, sin puntos"
          nota={nota("dni")}
        >
          <Input name="dni" inputMode="numeric" autoComplete="off" />
        </Campo>
      </Seccion>

      <Seccion indice={1} presentacion={presentacion} llenos={llenos}>
        <Campo label="Número de pasaporte" required error={fe("numeroPasaporte")}>
          <Input name="numeroPasaporte" autoComplete="off" />
        </Campo>
        <Campo
          label="Vencimiento del pasaporte"
          required
          error={fe("fechaVencimientoPasaporte")}
          help="Tiene que seguir vigente al terminar el viaje"
          nota={nota("fechaVencimientoPasaporte")}
        >
          <DateInput name="fechaVencimientoPasaporte" />
        </Campo>
      </Seccion>

      <Seccion indice={2} presentacion={presentacion} llenos={llenos}>
        <Campo
          label="Nombre y apellido"
          required
          error={fe("tutor1Nombre")}
          className="form-campo-ancho"
        >
          <Input name="tutor1Nombre" autoComplete="name" defaultValue={preset.tutor1Nombre} />
        </Campo>
        <Campo
          label="Celular"
          required
          error={fe("tutor1Celular")}
          help="Con código de área, para una urgencia durante el viaje"
          nota={nota("tutor1Celular")}
        >
          <Input name="tutor1Celular" inputMode="tel" autoComplete="tel" />
        </Campo>
        <Campo
          label="Email"
          required
          error={fe("tutor1Email")}
          help="Por acá te escribimos y accedés al Portal de Familias"
          nota={nota("tutor1Email")}
        >
          <Input
            type="email"
            name="tutor1Email"
            autoComplete="email"
            defaultValue={preset.tutor1Email}
          />
        </Campo>
      </Seccion>

      <Seccion indice={3} presentacion={presentacion} llenos={llenos}>
        <Campo label="Teléfono del alumno" help="Opcional" error={fe("telefonoAlumno")}>
          <Input name="telefonoAlumno" inputMode="tel" autoComplete="off" />
        </Campo>
        <Campo label="Email del alumno" help="Opcional" error={fe("emailAlumno")}>
          <Input type="email" name="emailAlumno" autoComplete="off" />
        </Campo>
        <Campo
          label="Nivel de inglés"
          help="Opcional. Con tus palabras: básico, intermedio, avanzado, un examen rendido…"
          error={fe("nivelInglesAutoevaluacion")}
          className="form-campo-ancho"
        >
          <Input name="nivelInglesAutoevaluacion" autoComplete="off" />
        </Campo>
        <Campo
          label="Alergias y datos de salud"
          help="Opcional. Alergias, medicación o cualquier cosa a tener en cuenta durante el viaje"
          error={fe("alergiasSalud")}
          className="form-campo-ancho"
          nota={nota("alergiasSalud")}
        >
          <Textarea name="alergiasSalud" rows={3} />
        </Campo>
        <Campo
          label="Preferencias de alojamiento"
          help="Opcional. Dieta, convivencia, con quién le gustaría compartir"
          error={fe("preferenciasAlojamiento")}
          className="form-campo-ancho"
        >
          <Textarea name="preferenciasAlojamiento" rows={3} />
        </Campo>
      </Seccion>

      {/* Honeypot anti-spam: invisible para una persona, irresistible para un bot. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <div className="mt-8 border-t border-[var(--c-border)] pt-6">
        <Checkbox
          name="acepta"
          // El <label> del Checkbox envuelve al input, así que el link queda
          // adentro. No tilda la casilla: el HTML exime a la activación del
          // label cuando el click apunta a contenido interactivo (un <a href>).
          // aria-label deja el nombre accesible clavado en la frase completa,
          // sin depender de cómo cada lector aplane el link.
          aria-label={TEXTO_CONSENTIMIENTO}
          aria-invalid={fe("acepta") ? true : undefined}
          aria-describedby={fe("acepta") ? "error-acepta" : undefined}
          className="items-start"
          label={
            <span className="text-[length:var(--t-small)] leading-[var(--lh-body)]">
              {ANTES_DEL_ENLACE}
              <Link
                href="/privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--c-brand)] underline underline-offset-2 hover:text-[var(--c-brand-700)]"
              >
                {ENLACE_POLITICA}
              </Link>
              {DESPUES_DEL_ENLACE}
            </span>
          }
        />
        {fe("acepta") && (
          <p
            id="error-acepta"
            className="mt-1 text-[length:var(--t-small)] font-medium text-[var(--c-danger)]"
          >
            {fe("acepta")}
          </p>
        )}

        {state && !state.ok && errores.length === 0 && (
          <p className="mt-3 text-[length:var(--t-small)] font-semibold text-[var(--c-danger)]">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="form-enviar mt-6 inline-flex min-h-[var(--tap)] w-full items-center justify-center gap-2 rounded-[var(--r-pill)] bg-[var(--c-brand)] px-6 text-[length:var(--t-body)] font-semibold text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] transition-transform hover:bg-[var(--c-brand-700)] active:scale-[0.97] disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Enviando…" : "Enviar la inscripción"}
        </button>
      </div>
    </form>
  );
}

/* ============================================================
   Piezas internas — la misma estructura en las tres variantes
   ============================================================ */

/** Estado de una parada. `opcional` = la sección no tiene obligatorios. */
type EstadoSeccion = "si" | "no" | "opcional";

type SeccionProps = {
  indice: number;
  presentacion: PresentacionVariante;
  llenos: ReadonlySet<string>;
  children: ReactNode;
};

function Seccion({ indice, presentacion, llenos, children }: SeccionProps) {
  const seccion = SECCIONES[indice];
  if (!seccion) return null;

  const estado: EstadoSeccion =
    seccion.requeridos.length === 0
      ? "opcional"
      : seccion.requeridos.every((campo) => llenos.has(campo))
        ? "si"
        : "no";
  const tildada = presentacion.progreso && estado === "si";

  return (
    // `data-lista` solo sale cuando la variante sigue el avance: en las otras
    // no se actualiza, y un atributo que miente es peor que uno ausente.
    <fieldset
      className="form-seccion border-0 p-0"
      data-lista={presentacion.progreso ? estado : undefined}
    >
      <legend className="form-rotulo">
        <span className="form-rotulo-caja">
          {/* Decorativo: el nombre accesible del grupo tiene que ser el título
              solo, igual en las tres variantes. Lo que está en un subárbol
              aria-hidden no entra en el cálculo de ese nombre. */}
          <span className="form-rotulo-orden" aria-hidden>
            {tildada ? (
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
            ) : (
              textoRotulo(presentacion.rotulo, indice + 1, SECCIONES.length)
            )}
          </span>
          <span className="form-rotulo-titulo">{seccion.titulo}</span>
        </span>
      </legend>
      <div className="form-grilla">{children}</div>
    </fieldset>
  );
}

type CampoProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
  help?: string;
  error?: string;
  className?: string;
  /** Microcopy de confianza. Va como texto suelto, no como descripción del
      control: `aria-describedby` tiene que decir lo mismo en las tres. */
  nota?: string;
};

function Campo({ nota, className, children, ...props }: CampoProps) {
  if (!nota) {
    return (
      <Field className={className} {...props}>
        {children}
      </Field>
    );
  }
  return (
    <div className={cn("flex flex-col", className)}>
      <Field {...props}>{children}</Field>
      <p className="form-nota">{nota}</p>
    </div>
  );
}
