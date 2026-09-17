import type { Metadata } from "next";

import { EMAIL, MAIL_URL } from "@/lib/contact";
import { getInvitacionByTokenHash } from "@/lib/db/queries/inscripciones-publicas";
import { estadoInvitacion, puedeCargar } from "@/lib/domain/inscripciones/invitacion";
import { resolverVariante } from "@/lib/domain/inscripciones/schema";
import { hashToken } from "@/lib/utils/token-opaco";

import { InscripcionForm } from "./inscripcion-form";

/**
 * Application Form público. Se llega por el link tokenizado del mail
 * (`/inscripcion?t=<token>`), o a mano sin token.
 *
 * ESTA PÁGINA NO ESCRIBE NADA. Es un GET y solo resuelve el token a su campaña
 * con un SELECT puro (`getInvitacionByTokenHash`). El precedente malo del repo
 * es `src/app/baja/page.tsx`, que hace un UPDATE dentro del render: el prefetch
 * del cliente de correo lo dispara solo, sin que nadie haya clickeado. Persistir
 * la ficha y marcar la invitación es trabajo de la server action.
 *
 * Tampoco el token deriva en datos personales: la ficha nace vacía y lo único
 * que sale de la invitación es el contexto de campaña (viaje y variante).
 */

export const metadata: Metadata = {
  title: "Inscripción · Jóvenes en UK",
  // La URL lleva una credencial en el querystring: nunca se indexa, y `follow:
  // false` evita que un crawler siga desde acá con el token pegado al referer.
  robots: { index: false, follow: false },
};

type Params = { t?: string | string[]; v?: string | string[] };

/**
 * Un querystring puede repetir la clave (`?t=a&t=b`) y Next entrega un array.
 * Se toma el primero en vez de romper: es una página pública y un link
 * malformado tiene que caer en el aviso genérico, no en un error de render.
 */
function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function InscripcionPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { t, v } = await searchParams;
  const token = primerValor(t)?.trim() || undefined;

  const invitacion = token ? await getInvitacionByTokenHash(hashToken(token)) : null;
  const estado = invitacion ? estadoInvitacion({ ...invitacion, ahora: new Date() }) : null;

  if (token) {
    // "Ya se usó" se cuenta aparte del resto porque le pasa a una familia real:
    // el que vuelve a abrir su propio link después de enviar la ficha necesita
    // saber que llegó, no que su link está roto.
    if (estado === "respondida") {
      return (
        <Aviso
          titulo="Ya recibimos tu ficha"
          tono="ok"
          detalle="Este link ya se usó para enviar una inscripción. Si creés que fue un error, o
            necesitás corregir un dato, escribinos y lo resolvemos."
        />
      );
    }

    // Un solo copy para inválido, vencido y revocado: distinguirlos le
    // confirmaría a quien prueba tokens cuáles existen de verdad.
    if (estado === null || !puedeCargar(estado)) {
      return (
        <Aviso
          titulo="Este link no está disponible"
          tono="alerta"
          detalle="Puede haber vencido, o haber sido reemplazado por uno nuevo. Escribinos y te
            mandamos un link al día para completar la inscripción."
        />
      );
    }
  }

  // Precedencia: parámetro del link > variante de la campaña > 'a'. El escalón
  // del setting de /configuracion todavía no tiene query (la bandeja del
  // back-office la trae en su etapa): `resolverVariante` cae solo al default.
  const variante = resolverVariante({ param: primerValor(v), campana: invitacion?.variante });

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-bold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          Inscripción al viaje
        </h1>
        <p className="mt-2 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          {invitacion?.viajeNombre
            ? `Completá la ficha del alumno para ${invitacion.viajeNombre}. `
            : "Completá la ficha del alumno. "}
          Los datos tienen que coincidir con el pasaporte: con ellos emitimos la documentación
          del viaje.
        </p>

        {!token && (
          <p className="mt-4 rounded-[var(--r-md)] border border-[var(--c-warning)] bg-[var(--c-warning-bg)] px-4 py-3 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink)]">
            Estás completando el formulario sin el link que te mandamos por mail. Podés enviarlo
            igual: lo vamos a revisar a mano antes de darlo de alta, así que puede demorar un poco
            más.
          </p>
        )}
      </header>

      <InscripcionForm token={token} variante={variante} />
    </>
  );
}

const TONO_CAJA = {
  ok: "border-[var(--c-success)] bg-[var(--c-success-bg)]",
  alerta: "border-[var(--c-warning)] bg-[var(--c-warning-bg)]",
} as const;

/** Pantalla de un link que no abre el formulario. Sin datos de la invitación. */
function Aviso({
  titulo,
  detalle,
  tono,
}: {
  titulo: string;
  detalle: string;
  tono: keyof typeof TONO_CAJA;
}) {
  return (
    <div
      className={`rounded-[var(--r-xl)] border p-6 text-center shadow-[shadow:var(--shadow-1)] sm:p-10 ${TONO_CAJA[tono]}`}
    >
      <h1 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        {titulo}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        {detalle}
      </p>
      <a
        href={MAIL_URL}
        className="mt-6 inline-flex min-h-[var(--tap)] items-center justify-center rounded-[var(--r-pill)] bg-[var(--c-brand)] px-6 text-[length:var(--t-body)] font-semibold text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] transition-transform hover:bg-[var(--c-brand-700)] active:scale-[0.97]"
      >
        Escribinos a {EMAIL}
      </a>
    </div>
  );
}
