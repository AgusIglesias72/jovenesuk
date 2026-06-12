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

import { JukBrandPanel } from "@/components/auth/juk-brand-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-[var(--c-surface)] lg:grid-cols-2">
      <JukBrandPanel />
      <main className="flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
