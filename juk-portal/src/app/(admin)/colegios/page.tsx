import { LinkButton, PageHeader, Pagination } from "@/components/ui";
import { listColegiosPaginado } from "@/lib/db/queries/colegios";
import { colegioFiltersSchema } from "@/lib/domain/colegios";
import { pagina } from "@/lib/utils/paginate";

import { ColegiosFilters } from "./colegios-filters";
import { ColegiosTable } from "./colegios-table";

export const metadata = { title: "Colegios" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ColegiosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  const parsed = colegioFiltersSchema.safeParse({
    q: str(sp.q),
    tipo: str(sp.tipo),
    pais: str(sp.pais),
    incluirInactivos: str(sp.incluirInactivos) === "1" ? true : undefined,
  });
  const filters = parsed.success ? parsed.data : {};
  const {
    items: colegios,
    total,
    page,
    pages,
  } = await listColegiosPaginado(filters, pagina(str(sp.page)));

  return (
    <>
      <PageHeader
        title="Colegios"
        subtitle={
          total === 1
            ? "1 colegio"
            : `${total} colegios`
        }
        actions={<LinkButton href="/colegios/nuevo">+ Nuevo colegio</LinkButton>}
      />

      <div className="mb-4">
        <ColegiosFilters />
      </div>

      <ColegiosTable colegios={colegios} hayFiltros={Object.values(filters).some(Boolean)} />
      <Pagination total={total} page={page} pages={pages} />
    </>
  );
}
