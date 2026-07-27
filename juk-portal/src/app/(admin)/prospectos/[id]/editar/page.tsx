import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getProspectoById } from "@/lib/db/queries/prospectos";
import { listUsuarios } from "@/lib/db/queries/usuarios";

import { ProspectoForm } from "../../prospecto-form";

export const metadata = { title: "Editar prospecto" };

export default async function EditarProspectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prospecto = await getProspectoById(id);
  if (!prospecto) notFound();

  const usuarios = (await listUsuarios()).map((u) => ({ id: u.id, nombre: u.name }));

  return (
    <>
      <PageHeader title={prospecto.nombre} subtitle="Editar prospecto" />
      <ProspectoForm mode="edit" initial={prospecto} usuarios={usuarios} />
    </>
  );
}
