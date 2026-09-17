import {
  Badge,
  CodeCell,
  DateCell,
  EmptyState,
  LinkButton,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import type { InscripcionListItem } from "@/lib/db/queries/inscripciones";
import {
  INSCRIPCION_ESTADO_LABELS,
  INSCRIPCION_ESTADO_TONE,
  VARIANTE_LABELS_CORTOS,
} from "@/lib/domain/inscripciones/labels";
import { enmascararDni } from "@/lib/domain/inscripciones/niveles";
import { codigoInscripcion } from "@/lib/domain/inscripciones/schema";
import { formatFecha } from "@/lib/utils/date";

/**
 * La bandeja: una fila por ficha recibida, ordenada por lo último que entró.
 *
 * El DNI se muestra ENMASCARADO (`enmascararDni`, Nivel 2). La lista es la
 * pantalla que más veces se abre y muchas veces con alguien mirando de costado:
 * los últimos cuatro dígitos alcanzan para reconocer la ficha, y el DNI entero
 * se ve recién en el detalle, que se abre a propósito.
 */
export function InscripcionesTable({
  inscripciones,
  hayFiltros = false,
}: {
  inscripciones: InscripcionListItem[];
  hayFiltros?: boolean;
}) {
  if (inscripciones.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title={
          hayFiltros ? "Sin resultados para estos filtros" : "Todavía no entró ninguna ficha"
        }
        action={
          hayFiltros ? (
            <LinkButton variant="secondary" href="/inscripciones">
              Limpiar filtros
            </LinkButton>
          ) : undefined
        }
      >
        {hayFiltros
          ? "Probá con menos filtros, o buscá por nombre, DNI o código INS-000123."
          : "Cuando una familia complete el Application Form, la ficha cae acá."}
      </EmptyState>
    );
  }

  return (
    <TableWrap>
      <Table responsive>
        <THead>
          <TR>
            <TH>Código</TH>
            <TH>Alumno</TH>
            <TH>Adulto responsable</TH>
            <TH>Viaje</TH>
            <TH className="w-[88px]">Variante</TH>
            <TH className="w-[200px]">Estado</TH>
            <TH className="w-[88px]">
              <span className="sr-only">Acciones</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {inscripciones.map((i) => {
            const codigo = codigoInscripcion(i.numero);
            return (
              <TR key={i.id}>
                <TD label="Código">
                  <span className="block">
                    <CodeCell code={codigo} />
                  </span>
                  <span className="mt-0.5 block">
                    <DateCell date={formatFecha(i.createdAt)} />
                  </span>
                </TD>
                <TD label="Alumno">
                  <span className="block font-semibold text-[var(--c-ink)]">
                    {i.apellido}, {i.nombre}
                  </span>
                  <span className="block font-mono text-[length:var(--t-mono)] text-[var(--c-ink-muted)]">
                    DNI {enmascararDni(i.dni)}
                  </span>
                </TD>
                <TD label="Adulto responsable">
                  <span className="break-all text-[var(--c-ink-muted)]">{i.tutor1Email}</span>
                </TD>
                <TD label="Viaje">
                  {i.viajeCodigo ? (
                    <CodeCell code={i.viajeCodigo} />
                  ) : (
                    <span className="text-[var(--c-ink-subtle)]">Sin viaje</span>
                  )}
                </TD>
                <TD label="Variante">{VARIANTE_LABELS_CORTOS[i.variante]}</TD>
                <TD label="Estado">
                  <Badge tone={INSCRIPCION_ESTADO_TONE[i.estado]}>
                    {INSCRIPCION_ESTADO_LABELS[i.estado]}
                  </Badge>
                  {i.motivo && (
                    <span className="mt-1 line-clamp-2 block text-[length:var(--t-label)] leading-[var(--lh-snug)] text-[var(--c-ink-muted)] max-sm:text-right">
                      {i.motivo}
                    </span>
                  )}
                </TD>
                <TD className="max-sm:justify-end">
                  <LinkButton variant="ghost" size="sm" href={`/inscripciones/${codigo}`}>
                    Ver
                  </LinkButton>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableWrap>
  );
}
