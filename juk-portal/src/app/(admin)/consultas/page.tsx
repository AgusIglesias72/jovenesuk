import { PageHeader, Pagination } from "@/components/ui";
import { listConsultas } from "@/lib/db/queries/leads";
import { estadoConsultaSchema } from "@/lib/domain/leads";
import { pagina } from "@/lib/utils/paginate";

import { ConsultasFilters } from "./consultas-filters";
import { ConsultasTable } from "./consultas-table";

export const metadata = { title: "Consultas" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  const estado = estadoConsultaSchema.safeParse(str(sp.estado));
  const {
    items: consultas,
    total,
    page,
    pages,
  } = await listConsultas(
    { q: str(sp.q), estado: estado.success ? estado.data : undefined },
    pagina(str(sp.page))
  );

  return (
    <>
      <PageHeader
        title="Consultas"
        subtitle={total === 1 ? "1 consulta" : `${total} consultas`}
      />

      <div className="mb-4">
        <ConsultasFilters />
      </div>

      <ConsultasTable
        consultas={consultas}
        hayFiltros={Boolean(str(sp.q) || (estado.success && estado.data))}
      />
      <Pagination total={total} page={page} pages={pages} />
    </>
  );
}
