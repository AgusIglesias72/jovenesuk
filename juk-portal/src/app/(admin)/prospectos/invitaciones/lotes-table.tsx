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
import type { ResumenLote } from "@/lib/db/queries/invitaciones";
import { VARIANTE_LABELS_CORTOS } from "@/lib/domain/inscripciones/labels";
import { formatFecha } from "@/lib/utils/date";

import { useEnvioDeLote } from "./nuevo-lote";

/**
 * Las campañas, la más nueva arriba.
 *
 * Es un componente de cliente por una sola razón: el botón "Retomar". El envío
 * no corre solo (Trigger.dev no está desplegado), así que una campaña a medias
 * —porque se cerró la pestaña, porque se cortó internet— se termina desde acá,
 * y lo que ya salió no se vuelve a mandar.
 */

export function LotesTable({ lotes }: { lotes: ResumenLote[] }) {
  if (lotes.length === 0) {
    return (
      <EmptyState icon="✉️" title="Todavía no mandaste ninguna campaña">
        Armá la primera acá arriba: elegí el viaje y a quiénes les querés mandar el link al
        formulario de inscripción.
      </EmptyState>
    );
  }

  return (
    <TableWrap>
      <Table responsive>
        <THead>
          <TR>
            <TH>Campaña</TH>
            <TH>Enviadas</TH>
            <TH>Situación</TH>
            <TH>Respondidas</TH>
            <TH className="w-[140px]">
              <span className="sr-only">Acciones</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {lotes.map((lote) => (
            <FilaLote key={lote.loteId} lote={lote} />
          ))}
        </TBody>
      </Table>
    </TableWrap>
  );
}

function FilaLote({ lote }: { lote: ResumenLote }) {
  const porcentaje = lote.total > 0 ? Math.round((lote.enviadas * 100) / lote.total) : 0;

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

      <TD label="Enviadas">
        <span className="block text-[var(--c-ink)]">
          {lote.enviadas} de {lote.total}
        </span>
        <span
          className="mt-1 block h-1.5 w-full max-w-[140px] overflow-hidden rounded-[var(--r-pill)] bg-[var(--c-border)]"
          role="progressbar"
          aria-valuenow={porcentaje}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Enviadas"
        >
          {/* El ancho es un dato, no un estilo: Tailwind no puede expresarlo. */}
          <span
            className="block h-full rounded-[var(--r-pill)] bg-[var(--c-brand)]"
            style={{ width: `${porcentaje}%` }}
          />
        </span>
      </TD>

      <TD label="Situación">
        <span className="flex flex-wrap gap-1.5">
          {lote.pendientes > 0 && <Badge tone="warning">{lote.pendientes} sin mandar</Badge>}
          {lote.enviando > 0 && <Badge tone="info">{lote.enviando} en vuelo</Badge>}
          {lote.fallidas > 0 && <Badge tone="danger">{lote.fallidas} fallaron</Badge>}
          {lote.revocadas > 0 && <Badge tone="neutral">{lote.revocadas} revocadas</Badge>}
          {lote.pendientes === 0 && lote.enviando === 0 && lote.fallidas === 0 && (
            <Badge tone="success">Completa</Badge>
          )}
        </span>
      </TD>

      <TD label="Respondidas">
        <span className="text-[var(--c-ink)]">{lote.respondidas}</span>
        <span className="text-[var(--c-ink-subtle)]"> / {lote.enviadas}</span>
      </TD>

      <TD className="max-sm:justify-end">
        <RetomarLote loteId={lote.loteId} pendientes={lote.pendientes} />
      </TD>
    </TR>
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
