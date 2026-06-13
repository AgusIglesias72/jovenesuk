import { LinkButton, PageHeader, Pagination } from "@/components/ui";
import { requireRole } from "@/lib/auth/helpers";
import { listUsuarios } from "@/lib/db/queries/usuarios";
import { paginar } from "@/lib/utils/paginate";

import { UsuariosTable } from "./usuarios-table";

export const metadata = { title: "Usuarios" };

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireRole("super_admin");
  const sp = await searchParams;
  const todos = await listUsuarios();
  const { items: usuarios, total, page, pages } = paginar(todos, sp.page);

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle={total === 1 ? "1 usuario" : `${total} usuarios`}
        actions={<LinkButton href="/usuarios/nuevo">+ Nuevo usuario</LinkButton>}
      />
      <UsuariosTable usuarios={usuarios} currentUserId={session.user.id} />
      <Pagination total={total} page={page} pages={pages} />
    </>
  );
}
