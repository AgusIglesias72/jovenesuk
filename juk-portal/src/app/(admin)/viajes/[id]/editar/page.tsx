import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getColegioById, listColegios } from "@/lib/db/queries/colegios";
import { getViajeById } from "@/lib/db/queries/viajes";

import { ViajeForm } from "../../viaje-form";

export const metadata = { title: "Editar viaje" };

type Opcion = { id: string; nombre: string };

// Asegura que el colegio actualmente asignado aparezca como opción aunque esté
// inactivo (si no, el <select> quedaría en blanco y se perdería al guardar).
async function conActual(opciones: Opcion[], actualId: string | null): Promise<Opcion[]> {
  if (!actualId || opciones.some((o) => o.id === actualId)) return opciones;
  const c = await getColegioById(actualId);
  return c ? [{ id: c.id, nombre: `${c.nombre} (inactivo)` }, ...opciones] : opciones;
}

export default async function EditarViajePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [viaje, destino, cliente] = await Promise.all([
    getViajeById(id),
    listColegios({ tipo: "destino" }),
    listColegios({ tipo: "cliente" }),
  ]);
  if (!viaje) notFound();

  const opt = (cs: { id: string; nombre: string }[]) =>
    cs.map((c) => ({ id: c.id, nombre: c.nombre }));
  const [colegiosDestino, colegiosCliente] = await Promise.all([
    conActual(opt(destino), viaje.colegioDestinoId),
    conActual(opt(cliente), viaje.colegioClienteId),
  ]);

  return (
    <>
      <PageHeader title={viaje.nombre} subtitle={viaje.codigo} />
      <ViajeForm
        mode="edit"
        initial={viaje}
        colegiosDestino={colegiosDestino}
        colegiosCliente={colegiosCliente}
      />
    </>
  );
}
