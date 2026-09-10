import {
  Badge,
  CodeCell,
  DateCell,
  EmptyState,
  LinkButton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TableWrap,
  TR,
  TripBadge,
} from "@/components/ui";
import type { ViajeFila } from "@/lib/db/queries/viajes";
import { PAIS_LABELS } from "@/lib/domain/colegios";
import { ocupacionViaje } from "@/lib/domain/viajes";
import { formatFecha } from "@/lib/utils/date";

import { BarraProgreso, tonoOcupacion } from "./barra-progreso";

function rango(inicio: Date, fin: Date) {
  return `${formatFecha(inicio)} – ${formatFecha(fin)}`;
}

function CeldaOcupacion({ viaje }: { viaje: ViajeFila }) {
  const o = ocupacionViaje(viaje);
  return (
    <span className="inline-flex w-28 flex-col gap-1.5 max-sm:items-end">
      <span className="font-mono text-[length:var(--t-mono)] tabular-nums text-[var(--c-ink)]">
        {viaje.inscriptos} / {viaje.capacidadMaxima}
        {o.sobreCupo > 0 && (
          <span className="ml-1 font-bold text-[var(--c-berry)]">
            +{o.sobreCupo}
            <span className="sr-only"> por encima del cupo</span>
          </span>
        )}
      </span>
      <BarraProgreso
        pct={o.pct}
        tono={tonoOcupacion(o)}
        label={`Ocupación del cupo de ${viaje.codigo}`}
      />
    </span>
  );
}

export function ViajesTable({
  viajes,
  hayFiltros = false,
}: {
  viajes: ViajeFila[];
  hayFiltros?: boolean;
}) {
  if (viajes.length === 0) {
    return (
      <EmptyState
        icon="✈️"
        title={hayFiltros ? "Sin resultados para estos filtros" : "Todavía no hay viajes"}
        action={
          hayFiltros ? (
            <LinkButton variant="secondary" href="/viajes">
              Limpiar filtros
            </LinkButton>
          ) : (
            <LinkButton href="/viajes/nuevo">+ Nuevo viaje</LinkButton>
          )
        }
      >
        {hayFiltros
          ? "Probá con menos filtros o buscá por código o nombre del viaje."
          : "Cada viaje agrupa a los alumnos, sus pasos y el plan de pagos."}
      </EmptyState>
    );
  }

  return (
    <TableWrap>
      <Table responsive>
        <THead>
          <TR>
            <TH>Código</TH>
            <TH>Viaje</TH>
            <TH>Fechas</TH>
            <TH>Estado</TH>
            <TH>Inscriptos / cupo</TH>
            <TH className="w-[88px]">
              <span className="sr-only">Acciones</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {viajes.map((v) => (
            <TR key={v.id}>
              <TD label="Código">
                <CodeCell code={v.codigo} />
              </TD>
              <TD label="Viaje">
                <span className="flex flex-wrap items-center gap-2 max-sm:justify-end">
                  <span className="font-semibold text-[var(--c-ink)]">{v.nombre}</span>
                  {v.tipo === "individual" && (
                    <Badge tone="info" showDot={false}>
                      Individual
                    </Badge>
                  )}
                </span>
                <span className="block text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                  {v.colegioDestinoNombre ?? "—"} · {PAIS_LABELS[v.paisDestino]}
                </span>
              </TD>
              <TD label="Fechas">
                <DateCell date={rango(v.fechaInicio, v.fechaFin)} />
              </TD>
              <TD label="Estado">
                <TripBadge state={v.estado} />
              </TD>
              <TD label="Inscriptos / cupo">
                <CeldaOcupacion viaje={v} />
              </TD>
              <TD className="max-sm:justify-end">
                <div className="flex justify-end">
                  <LinkButton variant="ghost" size="sm" href={`/viajes/${v.codigo}`}>
                    Ver
                  </LinkButton>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableWrap>
  );
}
