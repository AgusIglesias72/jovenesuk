import { PageHeader, Pagination } from "@/components/ui";
import { listConsultas } from "@/lib/db/queries/leads";
import { estadoConsultaSchema } from "@/lib/domain/leads";
import { paginar } from "@/lib/utils/paginate";

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
  const todas = await listConsultas({
    q: str(sp.q),
    estado: estado.success ? estado.data : undefined,
  });
  const { items: consultas, total, page, pages } = paginar(todas, str(sp.page));

  return (
    <>
      <PageHeader
        title="Consultas"
        subtitle={total === 1 ? "1 consulta" : `${total} consultas`}
      />

      <div className="mb-4">
        <ConsultasFilters />
      </div>

      <ConsultasTable consultas={consultas} />
      <Pagination total={total} page={page} pages={pages} />
    </>
  );
}
