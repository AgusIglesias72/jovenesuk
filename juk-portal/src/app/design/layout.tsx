import Link from "next/link";

import { DESIGN_VARIANTS } from "./variants";

export const metadata = { title: "Design Lab · JUK" };

// Layout propio del Design Lab: NO usa el AppShell del portal, así cada variante
// se ve limpia y sin marco. Solo una barra para saltar entre direcciones.
export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-50 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-gray-200 bg-white/90 px-6 py-3 backdrop-blur">
        <Link href="/design" className="text-sm font-bold tracking-tight text-gray-900">
          JUK · Design Lab
        </Link>
        <nav className="flex flex-wrap gap-4 text-sm">
          {DESIGN_VARIANTS.map((v) => (
            <Link key={v.slug} href={`/design/${v.slug}`} className="text-gray-600 hover:text-gray-900">
              {v.name}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="ml-auto text-xs text-gray-400 hover:text-gray-600">
          ← volver al portal
        </Link>
      </header>
      {children}
    </div>
  );
}
