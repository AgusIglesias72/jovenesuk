import type { Metadata } from "next";
import * as Sentry from "@sentry/nextjs";

import { EMAIL, MAIL_URL } from "@/lib/contact";
import { getFormularioSettings } from "@/lib/db/queries/configuracion";
import { getInvitacionByTokenHash } from "@/lib/db/queries/inscripciones-publicas";
import { estadoInvitacion, puedeCargar } from "@/lib/domain/inscripciones/invitacion";
import { resolverVariante, type Variante } from "@/lib/domain/inscripciones/schema";
import { hashToken } from "@/lib/utils/token-opaco";

import { ComoSigue, FranjaDeConfianza, HeroInscripcion } from "./_marco";
import { InscripcionForm } from "./inscripcion-form";
import { VARIANTE_CLASES } from "./variantes";

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

/**
 * La piel jamás puede impedir una inscripción: si la configuración no se puede
 * leer (clave todavía sin escribir, base caída), se sigue sin escalón de
 * setting y `resolverVariante` cae al default. Un valor guardado corrupto ya lo
 * absorbe `getFormularioSettings`.
 */
async function varianteConfigurada(): Promise<Variante | undefined> {
  try {
    return (await getFormularioSettings()).varianteActiva;
  } catch (err) {
    Sentry.captureException(err);
    return undefined;
  }
}

export default async function InscripcionPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { t, v } = await searchParams;
  const token = primerValor(t)?.trim() || undefined;

  // Dos round-trips independientes: van juntos para no encadenarlos.
  const [invitacion, setting] = await Promise.all([
    token ? getInvitacionByTokenHash(hashToken(token)) : null,
    varianteConfigurada(),
  ]);
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

  // Precedencia: parámetro del link > variante de la campaña > el setting de
  // /configuracion > 'a'. Cada escalón se descarta solo si no es una variante
  // conocida, así que un `?v=` basura cae al siguiente sin romper nada: el
  // valor del querystring no se refleja en ninguna parte de la página.
  const variante = resolverVariante({
    param: primerValor(v),
    campana: invitacion?.variante,
    setting,
  });

  // La marca de la piel va acá y no en el formulario: desde este contenedor el
  // CSS la sube al <body> (`body:has(.v-form-b)`), y con eso quedan en la misma
  // variante el shell del layout, el formulario y el calendario que <DateInput>
  // monta en un portal. El porqué completo, en `layout.tsx` y en
  // `src/styles/form-variants.css`.
  return (
    <div className={VARIANTE_CLASES[variante]} data-variante={variante}>
      <HeroInscripcion viajeNombre={invitacion?.viajeNombre} sinToken={!token} />

      {/* La ficha manda y la columna lateral acompaña: en el teléfono `ComoSigue`
          cae DEBAJO del formulario, que es el orden correcto —primero se
          completa, después se lee qué sigue—.

          Los anchos están medidos, no elegidos: la raíz del proyecto es de 14px,
          así que `max-w-5xl` son 896px y la columna del formulario queda en
          ~580 contra los ~620 de antes. Cada campo de la grilla de dos columnas
          de A y B pierde 20px —no se aprieta— y la columna única de C se acorta
          un poco, que para leer de corrido es mejor. */}
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <InscripcionForm token={token} variante={variante} />
        <ComoSigue />
      </div>

      <FranjaDeConfianza />
    </div>
  );
}

const TONO_CAJA = {
  ok: "border-[var(--c-success)] bg-[var(--c-success-bg)]",
  alerta: "border-[var(--c-warning)] bg-[var(--c-warning-bg)]",
} as const;

/**
 * Pantalla de un link que no abre el formulario. Sin datos de la invitación.
 *
 * NO monta el hero a propósito, y conserva su propio `<h1>`: `a11y-basico.spec.ts`
 * exige exactamente un `<h1>` visible en cada piel, y acá no hay ficha que
 * encabezar — con dos piezas menos la pantalla dice lo único que tiene que decir.
 * El contenedor trae su padding porque el `<main>` del shell ya no lo pone.
 */
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
    <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
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
    </div>
  );
}
