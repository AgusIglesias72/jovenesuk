/**
 * (auth) route group layout.
 *
 * Unlike (admin), this layout does NOT require a session — it's used for
 * login, password reset, and other anonymous flows.
 *
 * Visual (STUDIO): full-screen split with the brand-gradient panel on the
 * left and a clean surface panel with the form on the right. On mobile,
 * collapses to single column.
 */

import { Suspense } from "react";

import { JukBrandPanel } from "@/components/auth/juk-brand-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-[var(--c-surface)] lg:grid-cols-2">
      {/* El panel lee `?portal=` para saber a quién le habla; con Suspense el
          layout no arrastra a las páginas a render dinámico obligatorio. */}
      <Suspense fallback={null}>
        <JukBrandPanel />
      </Suspense>
      <main className="flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
