import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/helpers";

import { getEstadoServicios } from "./actions";
import { TestsPlayground } from "./tests-playground";

export const metadata = { title: "Tests" };

export default async function TestsPage() {
  const session = await requireRole("super_admin");
  const servicios = await getEstadoServicios();

  return (
    <>
      <PageHeader
        title="Tests"
        subtitle="Playground interno: toasts, modal de confirmación, emails, estado de servicios y componentes del design system."
      />
      <TestsPlayground emailUsuario={session.user.email} servicios={servicios} />
    </>
  );
}
