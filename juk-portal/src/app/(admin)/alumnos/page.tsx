import { LinkButton, PageHeader, Pagination } from "@/components/ui";
import { listAlumnos } from "@/lib/db/queries/alumnos";
import { alumnoFiltersSchema } from "@/lib/domain/alumnos";
import { paginar } from "@/lib/utils/paginate";

import { AlumnosFilters } from "./alumnos-filters";
import { AlumnosTable } from "./alumnos-table";

export const metadata = { title: "Alumnos" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  const parsed = alumnoFiltersSchema.safeParse({
    q: str(sp.q),
    estado: str(sp.estado),
    alerta: str(sp.alerta),
  });
  const filters = parsed.success ? parsed.data : {};
  const todos = await listAlumnos(filters);
  const { items: alumnos, total, page, pages } = paginar(todos, str(sp.page));

  return (
    <>
      <PageHeader
        title="Alumnos"
        subtitle={total === 1 ? "1 alumno" : `${total} alumnos`}
        actions={<LinkButton href="/alumnos/nuevo">+ Nuevo alumno</LinkButton>}
      />

      <div className="mb-4">
        <AlumnosFilters />
      </div>

      <AlumnosTable alumnos={alumnos} />
      <Pagination total={total} page={page} pages={pages} />
    </>
  );
}
