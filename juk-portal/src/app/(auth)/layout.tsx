/**
 * (auth) route group layout.
 *
 * Unlike (admin), this layout does NOT require a session — it's used for
 * login, password reset, and other anonymous flows.
 *
 * Visual: full-screen split with a navy panel on the left (branding) and
 * a white panel on the right (form). On mobile, collapses to single column.
 */

import { JukBrandPanel } from "@/components/auth/juk-brand-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <JukBrandPanel />
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
