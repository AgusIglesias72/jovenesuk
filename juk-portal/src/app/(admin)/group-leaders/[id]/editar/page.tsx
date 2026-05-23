import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getGroupLeaderById } from "@/lib/db/queries/group-leaders";

import { GroupLeaderForm } from "../../group-leader-form";

export const metadata = { title: "Editar group leader" };

export default async function EditarGroupLeaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gl = await getGroupLeaderById(id);
  if (!gl) notFound();

  return (
    <>
      <PageHeader title={`${gl.apellido}, ${gl.nombre}`} subtitle="Editar group leader" />
      <GroupLeaderForm mode="edit" initial={gl} />
    </>
  );
}
