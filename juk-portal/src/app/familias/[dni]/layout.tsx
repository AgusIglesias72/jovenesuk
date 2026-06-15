import { getAlumnosDeFamilia } from "@/lib/db/queries/familias";

import { FamiliaShell } from "../_shell";
import { cargarAlumnoFamilia } from "./_data";

export default async function AlumnoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ dni: string }>;
}) {
  const { dni } = await params;
  const { session, alumno } = await cargarAlumnoFamilia(dni);
  const alumnos = await getAlumnosDeFamilia(session.user.id);

  return (
    <FamiliaShell
      dniActual={dni}
      nombreAlumno={`${alumno.nombre} ${alumno.apellido}`}
      nombreTutor={session.user.name}
      alumnos={alumnos.map((a) => ({
        dni: a.dni,
        nombre: a.nombre,
        apellido: a.apellido,
      }))}
    >
      {children}
    </FamiliaShell>
  );
}
