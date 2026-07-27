import { PageHeader } from "@/components/ui";
import { listUsuarios } from "@/lib/db/queries/usuarios";

import { ProspectoForm } from "../prospecto-form";

export const metadata = { title: "Nuevo prospecto" };

export default async function NuevoProspectoPage() {
  const usuarios = (await listUsuarios()).map((u) => ({ id: u.id, nombre: u.name }));

  return (
    <>
      <PageHeader title="Nuevo prospecto" subtitle="Cargá un prospecto al pipeline." />
      <ProspectoForm mode="create" usuarios={usuarios} />
    </>
  );
}
