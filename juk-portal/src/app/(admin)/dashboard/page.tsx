import { Suspense } from "react";

import { PageHeader } from "@/components/ui";
import { getSession } from "@/lib/auth/helpers";

import {
  AlertasFallback,
  AlertasSection,
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

  return (
    <>
      <PageHeader title="Dashboard" subtitle={<>Buen día, {firstName}.</>} />

      <Suspense fallback={<StatsFallback />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={<AlertasFallback />}>
        <AlertasSection />
      </Suspense>

      <Suspense fallback={<ViajesProximosFallback />}>
        <ViajesProximosSection />
      </Suspense>

      <Suspense fallback={null}>
        <ProximoAnioSection />
      </Suspense>
    </>
  );
}
