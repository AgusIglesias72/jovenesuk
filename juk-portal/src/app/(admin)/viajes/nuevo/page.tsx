import { PageHeader } from "@/components/ui";
import { listColegios } from "@/lib/db/queries/colegios";

import { ViajeForm } from "../viaje-form";

export const metadata = { title: "Nuevo viaje" };

export default async function NuevoViajePage() {
  const [destino, cliente] = await Promise.all([
    listColegios({ tipo: "destino" }),
    listColegios({ tipo: "cliente" }),
  ]);

  return (
    <>
      <PageHeader title="Nuevo viaje" subtitle="Creá una salida grupal." />
      <ViajeForm
        mode="create"
        colegiosDestino={destino.map((c) => ({ id: c.id, nombre: c.nombre }))}
        colegiosCliente={cliente.map((c) => ({ id: c.id, nombre: c.nombre }))}
      />
    </>
  );
}
