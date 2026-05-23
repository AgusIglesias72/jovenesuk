import { PageHeader } from "@/components/ui";

import { AlumnoForm } from "../alumno-form";

export const metadata = { title: "Nuevo alumno" };

export default function NuevoAlumnoPage() {
  return (
    <>
      <PageHeader title="Nuevo alumno" subtitle="Cargá los datos del alumno y sus tutores." />
      <AlumnoForm mode="create" />
    </>
  );
}
