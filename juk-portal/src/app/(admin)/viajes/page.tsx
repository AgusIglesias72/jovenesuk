import { LinkButton, PageHeader, Pagination } from "@/components/ui";
import { listViajes, opcionesFiltroViajes } from "@/lib/db/queries/viajes";
import { viajeFiltersSchema } from "@/lib/domain/viajes";
import { pagina } from "@/lib/utils/paginate";

import { ViajesFilters } from "./viajes-filters";
import { ViajesTable } from "./viajes-table";

export const metadata = { title: "Viajes" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ViajesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  // Cada filtro inválido se descarta por separado (ver viajeFiltersSchema).
  const filters = viajeFiltersSchema.parse({
    q: str(sp.q),
    estado: str(sp.estado),
    origen: str(sp.origen),
    tipo: str(sp.tipo),
    anio: str(sp.anio),
    pais: str(sp.pais),
    colegioDestinoId: str(sp.colegio),
  });

  const [{ items: viajes, total, page, pages }, opciones] = await Promise.all([
    listViajes(filters, pagina(str(sp.page))),
    opcionesFiltroViajes(),
  ]);

  return (
    <>
      <PageHeader
        title="Viajes"
        subtitle={total === 1 ? "1 viaje" : `${total} viajes`}
        actions={<LinkButton href="/viajes/nuevo">+ Nuevo viaje</LinkButton>}
      />

      <div className="mb-4">
        <ViajesFilters anios={opciones.anios} colegios={opciones.colegios} />
      </div>

      <ViajesTable
        viajes={viajes}
        hayFiltros={Object.values(filters).some((v) => v !== undefined)}
      />
      <Pagination total={total} page={page} pages={pages} />
    </>
  );
}
