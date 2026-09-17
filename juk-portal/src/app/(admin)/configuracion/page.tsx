import { LinkButton, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/helpers";
import { getFormularioSettings, getMailSettings } from "@/lib/db/queries/configuracion";

import { getEstadoServiciosAction } from "./actions";
import { EstadoServicios } from "./estado-servicios";
import { FormularioForm } from "./formulario-form";
import { MailsForm } from "./mails-form";
import { PreviewTemplates } from "./preview-templates";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const session = await requireRole("super_admin");
  const [mails, formulario, estado] = await Promise.all([
    getMailSettings(),
    getFormularioSettings(),
    getEstadoServiciosAction(),
  ]);

  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Remitentes de email del portal, variante del formulario de inscripción, pruebas de templates y estado de los servicios."
        actions={
          <LinkButton variant="secondary" href="/configuracion/cuenta">
            Mi cuenta · cambiar contraseña
          </LinkButton>
        }
      />
      <div className="flex flex-col gap-6">
        <MailsForm initial={mails} emailUsuario={session.user.email} />
        <div className="grid gap-6 lg:grid-cols-2">
          <EstadoServicios estado={estado.ok ? estado.data : null} />
          <PreviewTemplates />
        </div>
        <FormularioForm initial={formulario} />
      </div>
    </>
  );
}
