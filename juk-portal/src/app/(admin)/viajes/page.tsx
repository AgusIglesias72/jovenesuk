import { LinkButton, PageHeader, Pagination } from "@/components/ui";
import { listViajes } from "@/lib/db/queries/viajes";
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

  const parsed = viajeFiltersSchema.safeParse({
    q: str(sp.q),
    estado: str(sp.estado),
    origen: str(sp.origen),
    tipo: str(sp.tipo),
  });
  const filters = parsed.success ? parsed.data : {};
  const {
    items: viajes,
    total,
    page,
    pages,
  } = await listViajes(filters, pagina(str(sp.page)));

  return (
    <>
      <PageHeader
        title="Viajes"
        subtitle={total === 1 ? "1 viaje" : `${total} viajes`}
        actions={<LinkButton href="/viajes/nuevo">+ Nuevo viaje</LinkButton>}
      />

      <div className="mb-4">
        <ViajesFilters />
      </div>

      <ViajesTable viajes={viajes} hayFiltros={Object.values(filters).some(Boolean)} />
      <Pagination total={total} page={page} pages={pages} />
    </>
  );
}
