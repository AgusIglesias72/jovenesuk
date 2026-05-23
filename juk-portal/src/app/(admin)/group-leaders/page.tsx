import { LinkButton, PageHeader } from "@/components/ui";
import { listGroupLeaders } from "@/lib/db/queries/group-leaders";
import { groupLeaderFiltersSchema } from "@/lib/domain/group-leaders";

import { GroupLeadersFilters } from "./group-leaders-filters";
import { GroupLeadersTable } from "./group-leaders-table";

export const metadata = { title: "Group Leaders" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GroupLeadersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  const parsed = groupLeaderFiltersSchema.safeParse({
    q: str(sp.q),
    policeCheckEstado: str(sp.policeCheckEstado),
  });
  const filters = parsed.success ? parsed.data : {};
  const gls = await listGroupLeaders(filters);

  return (
    <>
      <PageHeader
        title="Group Leaders"
        subtitle={gls.length === 1 ? "1 group leader" : `${gls.length} group leaders`}
        actions={<LinkButton href="/group-leaders/nuevo">+ Nuevo group leader</LinkButton>}
      />

      <div className="mb-4">
        <GroupLeadersFilters />
      </div>

      <GroupLeadersTable groupLeaders={gls} />
    </>
  );
}
