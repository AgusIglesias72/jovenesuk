import { PageHeader, Pagination, StatCard } from "@/components/ui";
import {
  listInscripciones,
  resumenInscripciones,
  viajesConInscripciones,
} from "@/lib/db/queries/inscripciones";
import {
  INSCRIPCION_ESTADO_LABELS,
  VARIANTE_LABELS_CORTOS,
} from "@/lib/domain/inscripciones/labels";
import {
  VARIANTES,
  inscripcionFiltersSchema,
  type InscripcionEstado,
  type Variante,
} from "@/lib/domain/inscripciones/schema";
import { pagina } from "@/lib/utils/paginate";

import { InscripcionesFilters } from "./inscripciones-filters";
import { InscripcionesTable } from "./inscripciones-table";

export const metadata = { title: "Inscripciones" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InscripcionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  // Cada filtro inválido se descarta solo (el `.catch(undefined)` del schema):
  // un `?estado=cualquiera` pegado a mano no tira abajo el resto de la URL.
  const filtros = inscripcionFiltersSchema.parse({
    q: str(sp.q),
    estado: str(sp.estado),
    viajeId: str(sp.viaje),
    variante: str(sp.variante),
  });

  // El resumen se calcula sobre el mismo universo que la tabla MENOS el estado
  // (lo excluye la firma de la query): los conteos por estado son justamente lo
  // que deja elegir uno, así que filtrar por estado los volvería circulares. La
  // variante sí entra, y por eso el reparto A/B/C se compara con el filtro de
  // variante vacío, que es el default de la pantalla.
  const filtrosDelResumen = {
    q: filtros.q,
    viajeId: filtros.viajeId,
    variante: filtros.variante,
  };

  const [inscripciones, resumen, viajes] = await Promise.all([
    listInscripciones(filtros, pagina(str(sp.page))),
    resumenInscripciones(filtrosDelResumen),
    viajesConInscripciones(),
  ]);

  // Los links de las cards conservan los demás filtros: si no, el número de la
  // card y las filas que se abren al tocarla dejarían de ser lo mismo.
  const base = new URLSearchParams();
  if (filtros.q) base.set("q", filtros.q);
  if (filtros.viajeId) base.set("viaje", filtros.viajeId);
  if (filtros.variante) base.set("variante", filtros.variante);

  const href = (clave: "estado" | "variante", valor?: string) => {
    const params = new URLSearchParams(base);
    if (valor) params.set(clave, valor);
    else params.delete(clave);
    const qs = params.toString();
    return qs ? `/inscripciones?${qs}` : "/inscripciones";
  };

  const porEstado = (estado: InscripcionEstado) => resumen.porEstado[estado];
  const porcentaje = (n: number) =>
    resumen.total > 0 ? `${Math.round((n * 100) / resumen.total)}% de las fichas` : "Sin fichas";

  const hayFiltros = Boolean(
    filtros.q || filtros.estado || filtros.viajeId || filtros.variante
  );

  return (
    <>
      <PageHeader
        title="Inscripciones"
        subtitle="Las fichas que entran por el Application Form. Todavía no crean al alumno: se revisan acá."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de fichas"
          value={resumen.total}
          href={href("estado")}
          delta={`Recibidas: ${porEstado("recibida")} · ${
            INSCRIPCION_ESTADO_LABELS.duplicada
          }: ${porEstado("duplicada")} · Anuladas: ${porEstado("anulada")}`}
        />
        <StatCard
          label="Necesitan revisión"
          value={porEstado("requiere_revision")}
          tone={porEstado("requiere_revision") > 0 ? "critical" : "neutral"}
          href={href("estado", "requiere_revision")}
          delta={
            porEstado("requiere_revision") > 0
              ? "Las mira una persona antes del alta"
              : "Nada esperando"
          }
          deltaTone={porEstado("requiere_revision") > 0 ? "down" : "neutral"}
        />
        <StatCard
          label="Fallaron el alta"
          value={porEstado("error")}
          tone={porEstado("error") > 0 ? "critical" : "neutral"}
          href={href("estado", "error")}
          delta={porEstado("error") > 0 ? "Con su motivo, para reintentar" : "Sin fallas"}
          deltaTone={porEstado("error") > 0 ? "down" : "neutral"}
        />
        <StatCard
          label="Procesadas"
          value={porEstado("procesada")}
          href={href("estado", "procesada")}
          delta={porcentaje(porEstado("procesada"))}
          deltaTone={porEstado("procesada") > 0 ? "up" : "neutral"}
        />
      </div>

      {/* Reparto por variante: es lo que después deja comparar cuál convierte. */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VARIANTES.map((variante: Variante) => (
          <StatCard
            key={variante}
            label={`Variante ${VARIANTE_LABELS_CORTOS[variante]}`}
            value={resumen.porVariante[variante]}
            href={href("variante", variante)}
            delta={porcentaje(resumen.porVariante[variante])}
          />
        ))}
      </div>

      <div className="mb-4">
        <InscripcionesFilters viajes={viajes} />
      </div>

      <InscripcionesTable inscripciones={inscripciones.items} hayFiltros={hayFiltros} />
      <Pagination
        total={inscripciones.total}
        page={inscripciones.page}
        pages={inscripciones.pages}
      />
    </>
  );
}
