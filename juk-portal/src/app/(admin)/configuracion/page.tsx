import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/helpers";
import { getMailSettings } from "@/lib/db/queries/configuracion";

import { MailsForm } from "./mails-form";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const session = await requireRole("super_admin");
  const mails = await getMailSettings();

  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Remitentes de email del portal y envío de pruebas."
      />
      <MailsForm initial={mails} emailUsuario={session.user.email} />
    </>
  );
}
