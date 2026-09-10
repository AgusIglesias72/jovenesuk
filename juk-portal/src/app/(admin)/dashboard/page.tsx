import { Suspense } from "react";

import { PageHeader } from "@/components/ui";
import { getSession } from "@/lib/auth/helpers";

import {
  AccesosRapidos,
  AccionUrgenteFallback,
  AccionUrgenteSection,
  AlertasFallback,
  AlertasSection,
  ProximoAnioFallback,
  ProximoAnioSection,
  StatsFallback,
  StatsSection,
  ViajesProximosFallback,
  ViajesProximosSection,
} from "./sections";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  const firstName = session?.user.name.split(" ")[0] ?? "ahí";

  // Orden por "qué hago hoy": primero a quién hay que llamar, después el
  // detalle de alertas y recién ahí la agenda de viajes.
  return (
    <>
      <PageHeader title="Dashboard" subtitle={<>Buen día, {firstName}.</>} />

      <AccesosRapidos />

      <Suspense fallback={<StatsFallback />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={<AccionUrgenteFallback />}>
        <AccionUrgenteSection />
      </Suspense>

      <Suspense fallback={<AlertasFallback />}>
        <AlertasSection />
      </Suspense>

      <Suspense fallback={<ViajesProximosFallback />}>
        <ViajesProximosSection />
      </Suspense>

      <Suspense fallback={<ProximoAnioFallback />}>
        <ProximoAnioSection />
      </Suspense>
    </>
  );
}
