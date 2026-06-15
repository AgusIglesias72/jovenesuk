"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

export function DesktopNav({ links }: { links: readonly NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-7 lg:flex" aria-label="Principal">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-[var(--r-sm)] text-[length:var(--t-small)] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-honey)] ${
              active
                ? "text-[var(--c-ink-onbrand)]"
                : "text-[var(--c-ink-onbrand-muted)] hover:text-[var(--c-ink-onbrand)]"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
