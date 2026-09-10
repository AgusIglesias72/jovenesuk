import { LinkButton, PageHeader, Pagination } from "@/components/ui";
import { listAlumnos } from "@/lib/db/queries/alumnos";
import { listViajesParaFiltro } from "@/lib/db/queries/viajes";
import { alumnoFiltersSchema } from "@/lib/domain/alumnos";
import { pagina } from "@/lib/utils/paginate";

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

  // Cada filtro inválido se descarta por separado (ver alumnoFiltersSchema).
  const filters = alumnoFiltersSchema.parse({
    q: str(sp.q),
    estado: str(sp.estado),
    alerta: str(sp.alerta),
    viajeId: str(sp.viaje),
    paso: str(sp.paso),
  });

  const [{ items: alumnos, total, page, pages }, viajes] = await Promise.all([
    listAlumnos(filters, pagina(str(sp.page))),
    listViajesParaFiltro(),
  ]);

  return (
    <>
      <PageHeader
        title="Alumnos"
        subtitle={total === 1 ? "1 alumno" : `${total} alumnos`}
        actions={<LinkButton href="/alumnos/nuevo">+ Nuevo alumno</LinkButton>}
      />

      <div className="mb-4">
        <AlumnosFilters viajes={viajes} />
      </div>

      <AlumnosTable
        alumnos={alumnos}
        hayFiltros={Object.values(filters).some((v) => v !== undefined)}
      />
      <Pagination total={total} page={page} pages={pages} />
    </>
  );
}
