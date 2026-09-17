"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { Alert, Button, Checkbox, Field, Select, useConfirm, useToast } from "@/components/ui";
import type { MotivoExclusion } from "@/lib/db/queries/invitaciones";
import type { ViajeOpcion } from "@/lib/db/queries/viajes";
import { MAX_DESTINATARIOS_LOTE, VIGENCIA_DIAS } from "@/lib/domain/inscripciones/invitacion";
import { VARIANTE_LABELS } from "@/lib/domain/inscripciones/labels";
import { VARIANTES, type Variante } from "@/lib/domain/inscripciones/schema";

import { continuarLoteAction, crearLoteInvitacionesAction } from "../actions";

/**
 * Armar la campaña y empujarla.
 *
 * Lo que hace rara a esta pantalla —y lo que hay que respetar si se toca— es
 * que el envío NO corre solo: Trigger.dev no está desplegado, así que quien
 * avanza el lote es este componente, llamando a `continuarLoteAction` de a
 * tandas. Por eso el bucle vive en el cliente y por eso la pantalla dice con
 * todas las letras que se puede cerrar: el progreso está en la base, no acá.
 *
 * Nada de lo que decide a quién le llega el mail se arma en el cliente: se
 * mandan ids de prospecto y el servidor vuelve a derivar las casillas.
 */

export type DestinatarioPreview = {
  prospectoId: string;
  prospectoNombre: string;
  email: string;
};

export type ExcluidoPreview = {
  prospectoId: string;
  prospectoNombre: string;
  motivo: MotivoExclusion;
};

const MOTIVO_LABELS: Record<MotivoExclusion, string> = {
  dado_de_baja: "Se dio de baja de los correos",
  sin_email: "No tiene email cargado",
  email_repetido: "Su email ya está en la lista",
};

const SIN_VIAJE = "";
const VARIANTE_AUTOMATICA = "";

/** Lo que la pantalla sabe del envío en curso. */
export type Avance = {
  loteId: string;
  total: number;
  enviados: number;
  fallidos: number;
  restantes: number;
  fase: "enviando" | "terminado" | "cortado";
  nota?: string;
};

/**
 * El bucle del envío, compartido con el botón "Retomar" de la tabla.
 *
 * Corta en tres casos y los tres importan:
 *  - `restantes === 0`: la campaña terminó;
 *  - la action devolvió error: se muestra y se puede retomar (nada se reenvía);
 *  - una tanda no movió NADA y sin embargo quedan pendientes: otra pestaña (u
 *    otra persona) está empujando el mismo lote y tiene las filas reservadas.
 *    Sin este corte, esta pestaña llamaría en loop sin trabajo que hacer.
 */
export function useEnvioDeLote() {
  const router = useRouter();
  const [avance, setAvance] = useState<Avance | null>(null);
  // El bucle vive fuera de React: si el componente se re-renderiza a mitad de
  // camino, no se puede disparar un segundo bucle sobre el mismo lote.
  const corriendo = useRef(false);

  const empujar = useCallback(
    async (loteId: string, total: number) => {
      if (corriendo.current) return;
      corriendo.current = true;

      let acumulado: Avance = {
        loteId,
        total,
        enviados: 0,
        fallidos: 0,
        restantes: total,
        fase: "enviando",
      };
      setAvance(acumulado);

      try {
        for (;;) {
          const r = await continuarLoteAction({ loteId });

          if (!r.ok) {
            acumulado = { ...acumulado, fase: "cortado", nota: r.error };
            setAvance(acumulado);
            return;
          }

          const { enviados, fallidos, restantes } = r.data;
          acumulado = {
            ...acumulado,
            enviados: acumulado.enviados + enviados,
            fallidos: acumulado.fallidos + fallidos,
            restantes,
          };

          if (restantes === 0) {
            acumulado = { ...acumulado, fase: "terminado" };
            setAvance(acumulado);
            return;
          }

          if (enviados + fallidos === 0) {
            acumulado = {
              ...acumulado,
              fase: "cortado",
              nota: `Quedan ${restantes} invitaciones, pero ahora mismo las tiene tomadas otro envío. Esperá unos minutos y retomá.`,
            };
            setAvance(acumulado);
            return;
          }

          setAvance(acumulado);
        }
      } finally {
        corriendo.current = false;
        router.refresh();
      }
    },
    [router]
  );

  /** Vuelve a dejar el panel en blanco para armar otra campaña. */
  const reiniciar = useCallback(() => setAvance(null), []);

  return { avance, empujar, reiniciar, enCurso: avance?.fase === "enviando" };
}

/** La barra de progreso + el texto que el equipo lee de un vistazo. */
function ProgresoLote({ avance }: { avance: Avance }) {
  const hechas = avance.enviados + avance.fallidos;
  const porcentaje = avance.total > 0 ? Math.round((hechas * 100) / avance.total) : 0;

  return (
    <div className="mt-4 rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface-2)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
          {avance.fase === "enviando"
            ? `Enviando… ${hechas} de ${avance.total}`
            : avance.fase === "terminado"
              ? `Listo: ${avance.enviados} enviadas de ${avance.total}`
              : `Pausado en ${hechas} de ${avance.total}`}
        </span>
        <span className="text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
          {avance.fallidos > 0 ? `${avance.fallidos} fallaron · ` : ""}
          {avance.restantes} sin mandar
        </span>
      </div>

      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-[var(--r-pill)] bg-[var(--c-border)]"
        role="progressbar"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso del envío"
      >
        {/* El ancho es un dato, no un estilo: Tailwind no puede expresarlo. */}
        <div
          className="h-full rounded-[var(--r-pill)] bg-[var(--c-brand)] transition-[width] duration-300"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {avance.nota && (
        <p className="mt-3 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{avance.nota}</p>
      )}

      {avance.fase === "enviando" && (
        <p className="mt-3 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          Podés cerrar esta pestaña: el envío se retoma desde donde quedó y lo que ya salió no se
          vuelve a mandar.
        </p>
      )}
    </div>
  );
}

export function NuevoLote({
  viajes,
  incluidos,
  excluidos,
  totalIncluidos,
  totalExcluidos,
  hayFiltro,
}: {
  viajes: ViajeOpcion[];
  /** Vacío cuando el universo del filtro no entra en una campaña. */
  incluidos: DestinatarioPreview[];
  /** Una muestra: el total real viene aparte. */
  excluidos: ExcluidoPreview[];
  totalIncluidos: number;
  totalExcluidos: number;
  hayFiltro: boolean;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const { avance, empujar, reiniciar, enCurso } = useEnvioDeLote();

  const [viajeId, setViajeId] = useState(SIN_VIAJE);
  const [variante, setVariante] = useState<string>(VARIANTE_AUTOMATICA);
  const [armando, setArmando] = useState(false);
  const [excluidosVisibles, setExcluidosVisibles] = useState(false);
  const [sinTildar, setSinTildar] = useState<Set<string>>(new Set());

  const excedeTope = totalIncluidos > MAX_DESTINATARIOS_LOTE;
  const elegidos = incluidos.filter((d) => !sinTildar.has(d.prospectoId));
  // Una campaña ya mandada bloquea el botón hasta que alguien diga explícitamente
  // "otra": con la misma selección tildada, un segundo click serían 200 mails
  // repetidos, y esta pantalla es la única que los dispara.
  const puedeEnviar =
    !excedeTope && elegidos.length > 0 && !armando && !enCurso && avance === null;

  function alternar(prospectoId: string) {
    setSinTildar((previo) => {
      const proximo = new Set(previo);
      if (proximo.has(prospectoId)) proximo.delete(prospectoId);
      else proximo.add(prospectoId);
      return proximo;
    });
  }

  function tildarTodos(todos: boolean) {
    setSinTildar(todos ? new Set() : new Set(incluidos.map((d) => d.prospectoId)));
  }

  async function enviar() {
    const viaje = viajes.find((v) => v.id === viajeId);
    const { confirmado } = await confirm({
      titulo: `¿Mandar ${elegidos.length} ${elegidos.length === 1 ? "invitación" : "invitaciones"}?`,
      detalle: (
        <>
          Sale un mail por prospecto con su propio link al formulario
          {viaje ? ` de ${viaje.nombre}` : ""}. El link vale {VIGENCIA_DIAS} días y se puede
          revocar de a uno. A los que se dieron de baja no les llega nada.
        </>
      ),
      confirmLabel: "Mandar ahora",
      tone: "brand",
    });
    if (!confirmado) return;

    setArmando(true);
    const r = await crearLoteInvitacionesAction({
      ids: elegidos.map((d) => d.prospectoId),
      viajeId: viajeId || undefined,
      variante: variante || undefined,
    });
    setArmando(false);

    if (!r.ok) {
      toast.error(r.error);
      return;
    }

    toast.success(
      `Campaña armada: ${r.data.total} ${r.data.total === 1 ? "invitación" : "invitaciones"}. Ya salen.`
    );
    await empujar(r.data.loteId, r.data.total);
  }

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
      <h2 className="font-display text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
        Nueva campaña
      </h2>
      <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        Cada prospecto recibe un mail con su propio link al Application Form. El link vence a los{" "}
        {VIGENCIA_DIAS} días y como máximo entran {MAX_DESTINATARIOS_LOTE} destinatarios por
        campaña.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Viaje"
          help="Aparece en el mail y en el formulario. Sin viaje, la invitación es general."
        >
          <Select
            value={viajeId}
            onChange={(e) => setViajeId(e.target.value)}
            searchable
            disabled={enCurso}
          >
            <option value={SIN_VIAJE}>Sin viaje (invitación general)</option>
            {viajes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre} · {v.codigo}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Variante del formulario" help="Solo cambia el diseño; la ficha es la misma.">
          <Select
            value={variante}
            onChange={(e) => setVariante(e.target.value)}
            disabled={enCurso}
          >
            <option value={VARIANTE_AUTOMATICA}>La configurada en el portal</option>
            {VARIANTES.map((v: Variante) => (
              <option key={v} value={v}>
                {VARIANTE_LABELS[v]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-5 border-t border-[var(--c-border)] pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
            Destinatarios
          </h3>
          {incluidos.length > 0 && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => tildarTodos(true)}
                className="text-[length:var(--t-label)] font-semibold text-[var(--c-brand)] underline-offset-2 hover:underline"
              >
                Tildar todos
              </button>
              <button
                type="button"
                onClick={() => tildarTodos(false)}
                className="text-[length:var(--t-label)] font-semibold text-[var(--c-ink-muted)] underline-offset-2 hover:underline"
              >
                Destildar todos
              </button>
            </div>
          )}
        </div>

        {excedeTope ? (
          <Alert
            level="warning"
            title={`El filtro alcanza a ${totalIncluidos} prospectos y el tope es ${MAX_DESTINATARIOS_LOTE}`}
            className="mt-3"
          >
            Achicá el universo con el buscador o la etapa del pipeline y mandá la campaña en varias
            tandas. Es a propósito: {MAX_DESTINATARIOS_LOTE} mails ya tardan un par de minutos.
          </Alert>
        ) : totalIncluidos === 0 ? (
          <p className="mt-3 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            {hayFiltro
              ? "Ningún prospecto de este filtro puede recibir la invitación."
              : "Todavía no hay prospectos a quienes invitar."}
          </p>
        ) : (
          <ul className="mt-3 flex max-h-72 flex-col gap-1 overflow-y-auto rounded-[var(--r-md)] border border-[var(--c-border)] p-2">
            {incluidos.map((d) => (
              <li key={d.prospectoId}>
                <Checkbox
                  checked={!sinTildar.has(d.prospectoId)}
                  onChange={() => alternar(d.prospectoId)}
                  disabled={enCurso}
                  label={
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
                        {d.prospectoNombre}
                      </span>
                      <span className="truncate font-mono text-[length:var(--t-mono)] text-[var(--c-ink-subtle)]">
                        {d.email}
                      </span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}

        {totalExcluidos > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExcluidosVisibles((v) => !v)}
              aria-expanded={excluidosVisibles}
              className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)] underline-offset-2 hover:underline"
            >
              {totalExcluidos} {totalExcluidos === 1 ? "queda" : "quedan"} afuera{" "}
              {excluidosVisibles ? "▴" : "▾"}
            </button>

            {excluidosVisibles && (
              <ul className="mt-2 flex flex-col gap-1">
                {excluidos.map((e) => (
                  <li
                    key={e.prospectoId}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-[var(--r-sm)] bg-[var(--c-surface-2)] px-3 py-2"
                  >
                    <span className="text-[length:var(--t-small)] text-[var(--c-ink)]">
                      {e.prospectoNombre}
                    </span>
                    <span className="text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                      {MOTIVO_LABELS[e.motivo]}
                    </span>
                  </li>
                ))}
                {totalExcluidos > excluidos.length && (
                  <li className="px-3 py-1 text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
                    y {totalExcluidos - excluidos.length} más
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-[var(--c-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          Se van a enviar{" "}
          <span className="font-semibold text-[var(--c-ink)]">
            {elegidos.length} {elegidos.length === 1 ? "mail" : "mails"}
          </span>
          {totalExcluidos > 0 ? `, y ${totalExcluidos} quedan afuera.` : "."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {avance?.fase === "cortado" && (
            <Button
              onClick={() => empujar(avance.loteId, avance.restantes)}
              className="w-full sm:w-auto"
            >
              Retomar el envío
            </Button>
          )}

          {avance && !enCurso ? (
            <Button
              variant="secondary"
              onClick={() => {
                reiniciar();
                tildarTodos(true);
              }}
              className="w-full sm:w-auto"
            >
              Armar otra campaña
            </Button>
          ) : (
            <Button onClick={enviar} disabled={!puedeEnviar} className="w-full sm:w-auto">
              {armando ? "Armando…" : enCurso ? "Enviando…" : "Enviar invitaciones"}
            </Button>
          )}
        </div>
      </div>

      {avance && <ProgresoLote avance={avance} />}

      <Alert level="info" title="El envío lo empuja esta pantalla" className="mt-4">
        Mientras la barra avanza, dejá la pestaña abierta para que la campaña siga saliendo.{" "}
        <strong>Podés cerrarla igual</strong>: el progreso queda guardado y desde la tabla de abajo
        se retoma donde quedó, sin reenviarle a nadie que ya recibió el mail.
      </Alert>
    </section>
  );
}
