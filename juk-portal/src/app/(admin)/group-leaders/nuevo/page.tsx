import { PageHeader } from "@/components/ui";

import { GroupLeaderForm } from "../group-leader-form";

export const metadata = { title: "Nuevo group leader" };

export default function NuevoGroupLeaderPage() {
  return (
    <>
      <PageHeader title="Nuevo group leader" subtitle="Cargá los datos y el police check." />
      <GroupLeaderForm mode="create" />
    </>
  );
}
