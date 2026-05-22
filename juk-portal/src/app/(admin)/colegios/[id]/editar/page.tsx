import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getColegioById } from "@/lib/db/queries/colegios";

import { ColegioForm } from "../../colegio-form";

export const metadata = { title: "Editar colegio" };

export default async function EditarColegioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const colegio = await getColegioById(id);
  if (!colegio) notFound();

  return (
    <>
      <PageHeader title={colegio.nombre} subtitle="Editar colegio" />
      <ColegioForm mode="edit" initial={colegio} />
    </>
  );
}
