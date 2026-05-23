import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/helpers";

import { UsuarioForm } from "../usuario-form";

export const metadata = { title: "Nuevo usuario" };

export default async function NuevoUsuarioPage() {
  await requireRole("super_admin");

  return (
    <>
      <PageHeader title="Nuevo usuario" subtitle="Creá una cuenta de admin del equipo JUK." />
      <UsuarioForm />
    </>
  );
}
