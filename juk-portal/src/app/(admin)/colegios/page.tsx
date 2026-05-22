import Link from "next/link";

import { PageHeader } from "@/components/ui";
import { listColegios } from "@/lib/db/queries/colegios";
import { colegioFiltersSchema } from "@/lib/domain/colegios";

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
  const colegios = await listColegios(filters);

  return (
    <>
      <PageHeader
        title="Colegios"
        subtitle={
          colegios.length === 1
            ? "1 colegio"
            : `${colegios.length} colegios`
        }
        actions={
          <Link
            href="/colegios/nuevo"
            className="inline-flex items-center gap-2 h-8 px-4 text-sm rounded-md border font-semibold tracking-tight bg-juk-navy-900 text-white border-juk-navy-900 hover:bg-juk-navy-800 hover:border-juk-navy-800 transition-colors duration-150"
          >
            + Nuevo colegio
          </Link>
        }
      />

      <div className="mb-4">
        <ColegiosFilters />
      </div>

      <ColegiosTable colegios={colegios} />
    </>
  );
}
