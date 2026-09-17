"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { DateInput } from "@/components/ui/date-input";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import type { Variante } from "@/lib/domain/inscripciones/schema";
import { ENLACE_POLITICA, TEXTO_CONSENTIMIENTO } from "@/lib/domain/privacidad/politica";
import { cn } from "@/lib/utils/cn";

import { enviarInscripcion } from "./actions";

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
 * Las variantes son SOLO estéticas: los campos, el orden y la validación son
 * los mismos en las tres. Cada clase va escrita entera en el mapa porque el JIT
 * de Tailwind lee texto plano y una clase armada por interpolación no existiría
 * en el CSS final.
 */
const CAJA_POR_VARIANTE: Record<Variante, string> = {
  a: "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-1)]",
  b: "rounded-[var(--r-xl)] border border-[var(--c-border-strong)] bg-[var(--c-surface-3)] shadow-[shadow:var(--shadow-2)]",
  c: "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-soft)]",
};

/** La variante C se queda en una columna a cualquier ancho (pensada para el teléfono). */
const GRILLA_POR_VARIANTE: Record<Variante, string> = {
  a: "grid gap-x-4 gap-y-5 sm:grid-cols-2",
  b: "grid gap-x-5 gap-y-5 sm:grid-cols-2",
  c: "grid gap-y-5",
};

const TITULO_POR_VARIANTE: Record<Variante, string> = {
  a: "font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]",
  b: "font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold italic text-[var(--c-brand)]",
  c: "font-[family-name:var(--font-display)] text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-brand)]",
};

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
  const [state, action, pending] = useActionState(enviarInscripcion, null);
  const resumenRef = useRef<HTMLDivElement>(null);

  // El resumen recibe el foco al fallar: el error puede estar a cuatro pantallas
  // de scroll del botón y nadie lo ve si solo se marca el campo.
  useEffect(() => {
    if (state && !state.ok) resumenRef.current?.focus();
  }, [state]);

  const fe = (k: string) => (state && !state.ok ? state.fieldErrors?.[k]?.[0] : undefined);
  const errores =
    state && !state.ok
      ? Object.entries(state.fieldErrors ?? {}).flatMap(([campo, mensajes]) => {
          const mensaje = mensajes?.[0];
          return mensaje ? [{ campo, mensaje }] : [];
        })
      : [];

  if (state?.ok) {
    return (
      <div
        className={cn("p-6 text-center sm:p-10", CAJA_POR_VARIANTE[variante])}
        role="status"
      >
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
    <form action={action} className={cn("p-5 sm:p-8", CAJA_POR_VARIANTE[variante])} noValidate>
      {/* El token viaja oculto; el server lo hashea y vuelve a resolver la
          invitación. El viaje, la campaña y el estado NO salen de este form.
          `v` se reenvía solo porque es estético: lo que se registra tiene que
          ser la variante que la familia efectivamente vio. */}
      {token && <input type="hidden" name="token" value={token} />}
      <input type="hidden" name="v" value={variante} />

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

      <fieldset className="border-0 p-0">
        <legend className={cn("mb-4", TITULO_POR_VARIANTE[variante])}>Datos del alumno</legend>
        <div className={GRILLA_POR_VARIANTE[variante]}>
          <Field
            label="Nombre"
            required
            error={fe("nombre")}
            help="Como figura en el pasaporte"
          >
            <Input name="nombre" autoComplete="off" />
          </Field>
          <Field label="Apellido" required error={fe("apellido")}>
            <Input name="apellido" autoComplete="off" />
          </Field>
          <Field label="Fecha de nacimiento" required error={fe("fechaNacimiento")}>
            <DateInput name="fechaNacimiento" />
          </Field>
          <Field label="DNI" required error={fe("dni")} help="Solo números, sin puntos">
            <Input name="dni" inputMode="numeric" autoComplete="off" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-8 border-0 p-0">
        <legend className={cn("mb-4", TITULO_POR_VARIANTE[variante])}>Pasaporte</legend>
        <div className={GRILLA_POR_VARIANTE[variante]}>
          <Field label="Número de pasaporte" required error={fe("numeroPasaporte")}>
            <Input name="numeroPasaporte" autoComplete="off" />
          </Field>
          <Field
            label="Vencimiento del pasaporte"
            required
            error={fe("fechaVencimientoPasaporte")}
            help="Tiene que seguir vigente al terminar el viaje"
          >
            <DateInput name="fechaVencimientoPasaporte" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-8 border-0 p-0">
        <legend className={cn("mb-4", TITULO_POR_VARIANTE[variante])}>
          Adulto responsable
        </legend>
        <div className={GRILLA_POR_VARIANTE[variante]}>
          <Field
            label="Nombre y apellido"
            required
            error={fe("tutor1Nombre")}
            className={variante === "c" ? undefined : "sm:col-span-2"}
          >
            <Input name="tutor1Nombre" autoComplete="name" defaultValue={preset.tutor1Nombre} />
          </Field>
          <Field
            label="Celular"
            required
            error={fe("tutor1Celular")}
            help="Con código de área, para una urgencia durante el viaje"
          >
            <Input name="tutor1Celular" inputMode="tel" autoComplete="tel" />
          </Field>
          <Field
            label="Email"
            required
            error={fe("tutor1Email")}
            help="Por acá te escribimos y accedés al Portal de Familias"
          >
            <Input
              type="email"
              name="tutor1Email"
              autoComplete="email"
              defaultValue={preset.tutor1Email}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-8 border-0 p-0">
        <legend className={cn("mb-4", TITULO_POR_VARIANTE[variante])}>
          Contacto y preferencias del alumno
        </legend>
        <div className={GRILLA_POR_VARIANTE[variante]}>
          <Field label="Teléfono del alumno" help="Opcional" error={fe("telefonoAlumno")}>
            <Input name="telefonoAlumno" inputMode="tel" autoComplete="off" />
          </Field>
          <Field label="Email del alumno" help="Opcional" error={fe("emailAlumno")}>
            <Input type="email" name="emailAlumno" autoComplete="off" />
          </Field>
          <Field
            label="Nivel de inglés"
            help="Opcional. Con tus palabras: básico, intermedio, avanzado, un examen rendido…"
            error={fe("nivelInglesAutoevaluacion")}
            className={variante === "c" ? undefined : "sm:col-span-2"}
          >
            <Input name="nivelInglesAutoevaluacion" autoComplete="off" />
          </Field>
          <Field
            label="Alergias y datos de salud"
            help="Opcional. Alergias, medicación o cualquier cosa a tener en cuenta durante el viaje"
            error={fe("alergiasSalud")}
            className={variante === "c" ? undefined : "sm:col-span-2"}
          >
            <Textarea name="alergiasSalud" rows={3} />
          </Field>
          <Field
            label="Preferencias de alojamiento"
            help="Opcional. Dieta, convivencia, con quién le gustaría compartir"
            error={fe("preferenciasAlojamiento")}
            className={variante === "c" ? undefined : "sm:col-span-2"}
          >
            <Textarea name="preferenciasAlojamiento" rows={3} />
          </Field>
        </div>
      </fieldset>

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
          className="mt-6 inline-flex min-h-[var(--tap)] w-full items-center justify-center gap-2 rounded-[var(--r-pill)] bg-[var(--c-brand)] px-6 text-[length:var(--t-body)] font-semibold text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] transition-transform hover:bg-[var(--c-brand-700)] active:scale-[0.97] disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Enviando…" : "Enviar la inscripción"}
        </button>
      </div>
    </form>
  );
}
