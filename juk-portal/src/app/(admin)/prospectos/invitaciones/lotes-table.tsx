"use client";

import {
  Badge,
  Button,
  EmptyState,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import type { CorteVariante, ResumenLote } from "@/lib/db/queries/invitaciones";
import { VARIANTE_LABELS_CORTOS } from "@/lib/domain/inscripciones/labels";
import { formatFecha } from "@/lib/utils/date";

import { useEnvioDeLote } from "./nuevo-lote";

/**
 * Las campañas, la más nueva arriba, con su embudo: qué pasó entre "salió el
 * mail" y "el equipo dio de alta al alumno".
 *
 * DOS REGLAS QUE NO SE NEGOCIAN
 * -----------------------------
 * 1. El número SIEMPRE al lado del porcentaje. Una campaña de 4 destinatarios
 *    donde respondieron 2 no es "50% de conversión", es "2 de 4": con
 *    volúmenes chicos el porcentaje solo invita a conclusiones falsas.
 * 2. Lo que no se mide se dice. Entrega, apertura y clic dependen del webhook
 *    de Resend; sin él esos contadores quedan en cero para siempre y un cero se
 *    lee como "nadie lo abrió". Van como "no disponible", con el mismo lenguaje
 *    visual que la tarjeta de servicios de `/configuracion`: badge ámbar y el
 *    motivo al lado.
 *
 * Los conteos llegan agregados EN SQL sobre el lote entero (`resumenLote`).
 * Nada de esto se calcula sobre las filas visibles: una página de 50 campañas
 * diría "3 enviadas" de un lote de 200.
 *
 * Es un componente de cliente por una sola razón: el botón "Retomar". El envío
 * no corre solo (Trigger.dev no está desplegado), así que una campaña a medias
 * —porque se cerró la pestaña, porque se cortó internet— se termina desde acá,
 * y lo que ya salió no se vuelve a mandar.
 */

export function LotesTable({
  lotes,
  trackingMails,
}: {
  lotes: ResumenLote[];
  /** ¿El webhook de Resend está configurado? Lo resuelve la página. */
  trackingMails: boolean;
}) {
  if (lotes.length === 0) {
    return (
      <EmptyState icon="✉️" title="Todavía no mandaste ninguna campaña">
        Armá la primera acá arriba: elegí el viaje y a quiénes les querés mandar el link al
        formulario de inscripción.
      </EmptyState>
    );
  }

  return (
    <>
      <TableWrap>
        <Table responsive>
          <THead>
            <TR>
              <TH>Campaña</TH>
              <TH>Envío</TH>
              <TH>Embudo</TH>
              <TH>Por piel</TH>
              <TH className="w-[140px]">
                <span className="sr-only">Acciones</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {lotes.map((lote) => (
              <FilaLote key={lote.loteId} lote={lote} trackingMails={trackingMails} />
            ))}
          </TBody>
        </Table>
      </TableWrap>

      <p className="mt-2 text-[length:var(--t-label)] leading-[var(--lh-body)] text-[var(--c-ink-subtle)]">
        Cada escalón muestra el número y, al lado, qué parte de las enviadas representa. Con pocos
        casos el porcentaje no dice nada: mirá siempre el número.
      </p>
    </>
  );
}

function FilaLote({ lote, trackingMails }: { lote: ResumenLote; trackingMails: boolean }) {
  const porcentajeEnviadas = lote.total > 0 ? Math.round((lote.enviadas * 100) / lote.total) : 0;

  return (
    <TR>
      <TD label="Campaña">
        <span className="block font-semibold text-[var(--c-ink)]">
          {lote.viajeNombre ?? "Invitación general"}
        </span>
        <span className="block text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
          {formatFecha(lote.creadoEl)}
          {lote.viajeCodigo ? ` · ${lote.viajeCodigo}` : ""}
          {lote.variante ? ` · Variante ${VARIANTE_LABELS_CORTOS[lote.variante]}` : ""}
        </span>
      </TD>

      <TD label="Envío">
        <span className="block text-[var(--c-ink)]">
          {lote.enviadas} de {lote.total}
        </span>
        <span
          className="mt-1 block h-1.5 w-full max-w-[140px] overflow-hidden rounded-[var(--r-pill)] bg-[var(--c-border)]"
          role="progressbar"
          aria-valuenow={porcentajeEnviadas}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Enviadas"
        >
          {/* El ancho es un dato, no un estilo: Tailwind no puede expresarlo. */}
          <span
            className="block h-full rounded-[var(--r-pill)] bg-[var(--c-brand)]"
            style={{ width: `${porcentajeEnviadas}%` }}
          />
        </span>

        <span className="mt-2 flex flex-wrap gap-1.5">
          {lote.pendientes > 0 && <Badge tone="warning">{lote.pendientes} sin mandar</Badge>}
          {lote.enviando > 0 && <Badge tone="info">{lote.enviando} en vuelo</Badge>}
          {lote.fallidas > 0 && <Badge tone="danger">{lote.fallidas} fallaron</Badge>}
          {lote.revocadas > 0 && <Badge tone="neutral">{lote.revocadas} revocadas</Badge>}
          {lote.pendientes === 0 && lote.enviando === 0 && lote.fallidas === 0 && (
            <Badge tone="success">Completa</Badge>
          )}
        </span>
      </TD>

      <TD label="Embudo">
        <Embudo lote={lote} trackingMails={trackingMails} />
      </TD>

      <TD label="Por piel">
        <PorPiel cortes={lote.porVariante} />
      </TD>

      <TD className="max-sm:justify-end">
        <RetomarLote loteId={lote.loteId} pendientes={lote.pendientes} />
      </TD>
    </TR>
  );
}

/**
 * Los escalones, de arriba abajo, en el orden en que ocurren. La base de todos
 * los porcentajes son las ENVIADAS y no el total del lote: lo que se compara es
 * qué hizo la gente que recibió el mail, no cuántos mails faltan mandar.
 */
function Embudo({ lote, trackingMails }: { lote: ResumenLote; trackingMails: boolean }) {
  const base = lote.enviadas;

  return (
    <span className="flex max-w-[260px] flex-col gap-1 text-[length:var(--t-label)]">
      <Escalon label="Enviadas" n={lote.enviadas} base={lote.total} />

      {trackingMails ? (
        <>
          <Escalon label="Entregadas" n={lote.entregadas} base={base} />
          <Escalon label="Abrieron el mail" n={lote.abiertas} base={base} />
          <Escalon label="Clic en el link" n={lote.clics} base={base} />
        </>
      ) : (
        <span className="flex items-center justify-between gap-2">
          <span className="text-[var(--c-ink-muted)]">Entrega, apertura y clic</span>
          <Badge tone="warning">No disponible</Badge>
        </span>
      )}

      <Escalon label="Abrieron el formulario" n={lote.formularioAbierto} base={base} />
      <Escalon label="Fichas recibidas" n={lote.respondidas} base={base} />
      <Escalon label="Fichas procesadas" n={lote.procesadas} base={base} />
    </span>
  );
}

/** El porcentaje NUNCA va solo: el `n` va siempre pegado a la izquierda. */
function porcentaje(n: number, base: number): string {
  return base === 0 ? "—" : `${Math.round((n * 100) / base)}%`;
}

function Escalon({ label, n, base }: { label: string; n: number; base: number }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="text-[var(--c-ink-muted)]">{label}</span>
      <span className="whitespace-nowrap">
        <span className="font-semibold text-[var(--c-ink)]">{n}</span>
        <span className="text-[var(--c-ink-subtle)]"> · {porcentaje(n, base)}</span>
      </span>
    </span>
  );
}

/**
 * El corte por piel: enviadas → abrieron el formulario → fichas, para cada
 * variante que tenga algo que mostrar.
 *
 * Una campaña que forzó su variante muestra una sola línea, y está bien: el
 * reparto recién significa algo cuando la piel la decide `/configuracion` al
 * abrir el link. Las invitaciones cuya piel nadie registró (sin variante
 * forzada y sin ficha) no se le atribuyen a ninguna: por eso las líneas pueden
 * sumar menos que el total del lote.
 */
function PorPiel({ cortes }: { cortes: CorteVariante[] }) {
  const conDatos = cortes.filter(
    (c) => c.enviadas > 0 || c.formularioAbierto > 0 || c.fichas > 0
  );

  if (conDatos.length === 0) {
    return (
      <span className="text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
        Sin datos por piel todavía
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-1.5 text-[length:var(--t-label)]">
      {conDatos.map((corte) => (
        <span key={corte.variante} className="flex items-center gap-2">
          <Badge tone="neutral" showDot={false}>
            {VARIANTE_LABELS_CORTOS[corte.variante]}
          </Badge>
          <span className="text-[var(--c-ink-muted)]">
            <span className="text-[var(--c-ink)]">{corte.enviadas}</span> env. ·{" "}
            <span className="text-[var(--c-ink)]">{corte.formularioAbierto}</span> abrieron ·{" "}
            <span className="text-[var(--c-ink)]">{corte.fichas}</span> fichas
            <span className="text-[var(--c-ink-subtle)]">
              {" "}
              ({porcentaje(corte.fichas, corte.enviadas)})
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * Termina una campaña que quedó a medias. El tope del bucle es el mismo del
 * envío original: llama tanda tras tanda hasta que no quede nada mandable.
 */
function RetomarLote({ loteId, pendientes }: { loteId: string; pendientes: number }) {
  const { avance, empujar, enCurso } = useEnvioDeLote();

  if (pendientes === 0 && !avance) {
    return <span className="text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">—</span>;
  }

  const hechas = avance ? avance.enviados + avance.fallidos : 0;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        size="sm"
        disabled={enCurso || pendientes === 0}
        onClick={() => empujar(loteId, pendientes)}
      >
        {enCurso ? `Enviando ${hechas}/${pendientes}…` : `Retomar (${pendientes})`}
      </Button>

      {avance?.fase === "cortado" && (
        <span className="text-right text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
          {avance.nota}
        </span>
      )}
      {avance?.fase === "terminado" && (
        <span className="text-right text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
          Listo: {avance.enviados} enviadas.
        </span>
      )}
    </div>
  );
}
