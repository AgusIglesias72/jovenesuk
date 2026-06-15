"use client";

import { useEffect, useState } from "react";

import {
  IconCalendar,
  IconChart,
  IconCheck,
  IconCog,
  IconGrid,
  IconLock,
  IconPin,
  IconPlane,
  IconUsers,
} from "./icons";

const ANCHORS = [
  { id: "dashboard", label: "Dashboard", icon: IconChart },
  { id: "alumnos", label: "Alumnos · ABM", icon: IconUsers },
  { id: "viaje", label: "Detalle de viaje", icon: IconPlane },
  { id: "login", label: "Login", icon: IconLock },
  { id: "seguimiento", label: "Seguimiento M6", icon: IconCheck },
  { id: "pagos", label: "Pagos", icon: IconCalendar },
  { id: "pantallas", label: "Pantallas", icon: IconPin },
  { id: "pantallas-admin", label: "Admin", icon: IconCog },
  { id: "componentes", label: "Componentes", icon: IconGrid },
];

export function SubNav() {
  const [active, setActive] = useState("dashboard");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: [0.1, 0.5] },
    );
    ANCHORS.forEach((a) => {
      const el = document.getElementById(a.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[var(--c-surface)]/92 backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] items-center gap-[var(--s-1)] overflow-x-auto px-[var(--s-6)] py-[var(--s-2)]">
        <IconGrid className="mr-[var(--s-2)] size-[15px] shrink-0 text-[var(--c-ink-4)]" />
        {ANCHORS.map((a) => {
          const isActive = active === a.id;
          return (
            <a
              key={a.id}
              href={`#${a.id}`}
              onClick={() => setActive(a.id)}
              className={`flex shrink-0 items-center gap-[var(--s-2)] rounded-[var(--r-sm)] px-[var(--s-3)] py-[var(--s-2)] text-[length:var(--t-sm)] font-[number:var(--fw-medium)] transition-colors ${
                isActive
                  ? "bg-[var(--c-brand-soft)] text-[var(--c-brand-soft-ink)]"
                  : "text-[var(--c-ink-3)] hover:bg-[var(--c-surface-3)] hover:text-[var(--c-ink)]"
              }`}
            >
              <a.icon className="size-[14px]" />
              {a.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
