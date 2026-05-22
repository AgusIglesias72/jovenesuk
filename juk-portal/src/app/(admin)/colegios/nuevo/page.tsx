import { PageHeader } from "@/components/ui";

import { ColegioForm } from "../colegio-form";

export const metadata = { title: "Nuevo colegio" };

export default function NuevoColegioPage() {
  return (
    <>
      <PageHeader title="Nuevo colegio" subtitle="Cargá un colegio destino o cliente." />
      <ColegioForm mode="create" />
    </>
  );
}
