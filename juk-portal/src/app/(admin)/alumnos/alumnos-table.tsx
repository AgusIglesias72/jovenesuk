import {
  Badge,
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
} from "@/components/ui";
import { ALUMNO_ESTADO_LABELS, ALUMNO_ESTADO_TONE } from "@/lib/domain/alumnos";
import { formatFecha } from "@/lib/utils/date";
import { formatearDni } from "@/lib/utils/dni";
import type { Alumno } from "@/lib/db/schema/alumnos";

export function AlumnosTable({
  alumnos,
  hayFiltros = false,
}: {
  alumnos: Alumno[];
  hayFiltros?: boolean;
}) {
  if (alumnos.length === 0) {
    return (
      <EmptyState
        icon="🎒"
        title={hayFiltros ? "Sin resultados para estos filtros" : "Todavía no hay alumnos"}
        action={
          hayFiltros ? (
            <LinkButton variant="secondary" href="/alumnos">
              Limpiar filtros
            </LinkButton>
          ) : (
            <LinkButton href="/alumnos/nuevo">+ Nuevo alumno</LinkButton>
          )
        }
      >
        {hayFiltros
          ? "Probá con menos filtros o buscá por apellido, DNI o pasaporte."
          : "Los alumnos se cargan a mano o llegan por el formulario de inscripción."}
      </EmptyState>
    );
  }

  return (
    <TableWrap>
      <Table responsive>
        <THead>
          <TR>
            <TH>Alumno</TH>
            <TH>DNI</TH>
            <TH>Pasaporte vto.</TH>
            <TH>Estado</TH>
            <TH className="w-[168px]">
              <span className="sr-only">Acciones</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {alumnos.map((a) => (
            <TR key={a.id}>
              <TD label="Alumno">
                <span className="block font-semibold text-[var(--c-ink)]">
                  {a.apellido}, {a.nombre}
                </span>
                <span className="block font-mono text-[length:var(--t-mono)] text-[var(--c-ink-muted)]">
                  {a.numeroPasaporte}
                </span>
              </TD>
              <TD label="DNI">
                <span className="font-mono text-[length:var(--t-mono)] tabular-nums text-[var(--c-ink)]">
                  {formatearDni(a.dni)}
                </span>
              </TD>
              <TD label="Pasaporte vto.">
                <DateCell date={formatFecha(a.fechaVencimientoPasaporte)} />
              </TD>
              <TD label="Estado">
                <Badge tone={ALUMNO_ESTADO_TONE[a.estado]}>{ALUMNO_ESTADO_LABELS[a.estado]}</Badge>
              </TD>
              <TD className="max-sm:justify-end">
                <div className="flex items-center justify-end gap-1">
                  <LinkButton variant="ghost" size="sm" href={`/alumnos/${a.dni}`}>
                    Ver
                  </LinkButton>
                  <LinkButton variant="ghost" size="sm" href={`/alumnos/${a.dni}/editar`}>
                    Editar
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
