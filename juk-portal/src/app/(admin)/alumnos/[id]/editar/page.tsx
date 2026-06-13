import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getAlumnoByDni } from "@/lib/db/queries/alumnos";

import { AlumnoForm } from "../../alumno-form";

export const metadata = { title: "Editar alumno" };

export default async function EditarAlumnoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const alumno = await getAlumnoByDni(id);
  if (!alumno) notFound();

  return (
    <>
      <PageHeader title={`${alumno.apellido}, ${alumno.nombre}`} subtitle="Editar alumno" />
      <AlumnoForm mode="edit" initial={alumno} />
    </>
  );
}
