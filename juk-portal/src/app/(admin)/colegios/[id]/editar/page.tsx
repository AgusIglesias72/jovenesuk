import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getColegioById, getConfigDocumental } from "@/lib/db/queries/colegios";

import { ColegioForm } from "../../colegio-form";

export const metadata = { title: "Editar colegio" };

export default async function EditarColegioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Independientes: getConfigDocumental de un id inexistente devuelve los
  // defaults del dominio, así que pedirla antes del notFound() es inocuo.
  const [colegio, configDocumental] = await Promise.all([
    getColegioById(id),
    getConfigDocumental(id),
  ]);
  if (!colegio) notFound();

  return (
    <>
      <PageHeader title={colegio.nombre} subtitle="Editar colegio" />
      <ColegioForm mode="edit" initial={colegio} initialConfig={configDocumental} />
    </>
  );
}
