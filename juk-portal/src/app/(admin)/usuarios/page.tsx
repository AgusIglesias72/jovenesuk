import { LinkButton, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/helpers";
import { listUsuarios } from "@/lib/db/queries/usuarios";

import { UsuariosTable } from "./usuarios-table";

export const metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const session = await requireRole("super_admin");
  const usuarios = await listUsuarios();

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle={usuarios.length === 1 ? "1 usuario" : `${usuarios.length} usuarios`}
        actions={<LinkButton href="/usuarios/nuevo">+ Nuevo usuario</LinkButton>}
      />
      <UsuariosTable usuarios={usuarios} currentUserId={session.user.id} />
    </>
  );
}
