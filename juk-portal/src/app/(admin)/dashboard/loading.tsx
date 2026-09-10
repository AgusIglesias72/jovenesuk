import { PageHeaderSkeleton } from "@/components/ui";

import {
  AccesosRapidos,
  AccionUrgenteFallback,
  AlertasFallback,
  StatsFallback,
  ViajesProximosFallback,
} from "./sections";

/**
 * Se arma con los MISMOS fallbacks que usan los <Suspense> de page.tsx: la
 * silueta de carga es idéntica a la del streaming y no salta al llegar el
 * header. Los accesos rápidos no dependen de datos y ya se pueden tocar.
 */
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton withAction={false} />
      <AccesosRapidos />
      <StatsFallback />
      <AccionUrgenteFallback />
      <AlertasFallback />
      <ViajesProximosFallback />
    </>
  );
}
