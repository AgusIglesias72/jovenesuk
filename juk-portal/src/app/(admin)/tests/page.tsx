import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/helpers";

import { TestsPlayground } from "./tests-playground";

export const metadata = { title: "Tests" };

export default async function TestsPage() {
  const session = await requireRole("super_admin");

  return (
    <>
      <PageHeader
        title="Tests"
        subtitle="Playground interno: toasts, modal de confirmación, emails de prueba y componentes del design system."
      />
      <TestsPlayground emailUsuario={session.user.email} />
    </>
  );
}
