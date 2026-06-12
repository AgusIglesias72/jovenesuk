import { LinkButton, PageHeader } from "@/components/ui";
import { listAlumnos } from "@/lib/db/queries/alumnos";
import { alumnoFiltersSchema } from "@/lib/domain/alumnos";

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
  const alumnos = await listAlumnos(filters);

  return (
    <>
      <PageHeader
        title="Alumnos"
        subtitle={alumnos.length === 1 ? "1 alumno" : `${alumnos.length} alumnos`}
        actions={<LinkButton href="/alumnos/nuevo">+ Nuevo alumno</LinkButton>}
      />

      <div className="mb-4">
        <AlumnosFilters />
      </div>

      <AlumnosTable alumnos={alumnos} />
    </>
  );
}
