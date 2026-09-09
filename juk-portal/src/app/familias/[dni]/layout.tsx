import { requireFamilia } from "@/lib/auth/helpers";
import { getAlumnosDeFamilia } from "@/lib/db/queries/familias";

import { FamiliaShell } from "../_shell";
import { cargarAlumnoFamilia } from "./_data";

/*
 * OJO: no agregar un `loading.tsx` en `familias/` (el segmento padre). Ese
 * boundary envolvería a este layout, la respuesta pasaría a ser streameada y
 * Next devuelve 200 en vez de 404 para el `notFound()` de pertenencia — o sea,
 * pedir el DNI de otra familia contestaría 200. Los `loading.tsx` de las
 * páginas internas (documentación, pagos, …) sí son seguros: cuelgan por
 * debajo de este chequeo.
 */
export default async function AlumnoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ dni: string }>;
}) {
  const { dni } = await params;
  // La sesión ya viene memoizada por request (helpers.getSession), así que este
  // await no agrega round-trips: solo destraba el user.id para pedir el alumno
  // del slug y los hermanos del grupo familiar en paralelo.
  const session = await requireFamilia();
  const [{ alumno }, alumnos] = await Promise.all([
    cargarAlumnoFamilia(dni),
    getAlumnosDeFamilia(session.user.id),
  ]);

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
