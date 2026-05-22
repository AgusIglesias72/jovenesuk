import Link from "next/link";

import { PageHeader } from "@/components/ui";
import { listViajes } from "@/lib/db/queries/viajes";
import { viajeFiltersSchema } from "@/lib/domain/viajes";

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
  });
  const filters = parsed.success ? parsed.data : {};
  const viajes = await listViajes(filters);

  return (
    <>
      <PageHeader
        title="Viajes"
        subtitle={viajes.length === 1 ? "1 viaje" : `${viajes.length} viajes`}
        actions={
          <Link
            href="/viajes/nuevo"
            className="inline-flex items-center gap-2 h-8 px-4 text-sm rounded-md border font-semibold tracking-tight bg-juk-navy-900 text-white border-juk-navy-900 hover:bg-juk-navy-800 hover:border-juk-navy-800 transition-colors duration-150"
          >
            + Nuevo viaje
          </Link>
        }
      />

      <div className="mb-4">
        <ViajesFilters />
      </div>

      <ViajesTable viajes={viajes} />
    </>
  );
}
