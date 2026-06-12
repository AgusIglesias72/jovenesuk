import { cn } from "@/lib/utils/cn";

/**
 * AppShell — main authenticated layout.
 *
 * Deep-teal sidebar (--c-surface-inverse, left) + topbar + scrollable content.
 * The dark panel on the left provides constant orientation.
 *
 * Login, password-reset, and 404 pages do NOT use this — they have their
 * own simpler shells.
 *
 * @example
 *   <AppShell
 *     sidebar={<>
 *       <SidebarLogo />
 *       <SidebarNavSection title="Operación">
 *         <SidebarNavItem icon={<HomeIcon />} label="Dashboard" active count={4} countUrgent />
 *         <SidebarNavItem icon={<UserIcon />} label="Alumnos" count={62} />
 *       </SidebarNavSection>
 *       <SidebarUserChip initials="FM" name="Felix Mir" role="Sales · Admin" />
 *     </>}
 *     topbar={<>
 *       <Breadcrumb items={[{ label: "Operación" }, { label: "Dashboard" }]} />
 *       <TopbarSearch />
 *     </>}
 *   >
 *     <PageHeader ... />
 *     ...
 *   </AppShell>
 */

interface AppShellProps {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ sidebar, topbar, children, className }: AppShellProps) {
  return (
    <div className={cn("min-h-screen grid grid-cols-[256px_1fr] bg-[var(--c-page)]", className)}>
      <aside className="bg-[var(--c-surface-inverse)] text-[var(--c-ink-onbrand-muted)] p-5 flex flex-col">
        {sidebar}
      </aside>
      <main className="flex flex-col overflow-hidden">
        <div className="bg-[var(--c-surface)] border-b border-[var(--c-border)] px-5 py-3 flex items-center gap-4">
          {topbar}
        </div>
        <div className="p-6 flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}

/* ============================================================
   SIDEBAR PARTS
   ============================================================ */

export function SidebarLogo({
  orgName = "JUK",
  subtitle = "Portal Interno",
}: {
  orgName?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-8 px-1">
      <div className="w-9 h-9 bg-[image:var(--grad-warm)] rounded-[var(--r-md)] flex items-center justify-center text-[var(--c-ink-onaccent)] font-display font-bold text-base shadow-[shadow:var(--shadow-accent)]">
        J
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[var(--c-ink-onbrand)] font-display font-semibold text-[15px] tracking-[var(--ls-tight)]">
          {orgName}
        </span>
        <span className="text-[var(--c-ink-onbrand-muted)] text-[10px] uppercase tracking-widest font-medium mt-0.5">
          {subtitle}
        </span>
      </div>
    </div>
  );
}

interface SidebarNavSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function SidebarNavSection({ title, children }: SidebarNavSectionProps) {
  return (
    <div className="mb-6">
      {title && (
        <div className="text-[10px] uppercase tracking-widest text-[var(--c-ink-onbrand-muted)] px-3 mb-2 font-semibold">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

interface SidebarNavItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number | string;
  countUrgent?: boolean;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  soon?: boolean;
}

export function SidebarNavItem({
  icon,
  label,
  count,
  countUrgent,
  active,
  onClick,
  href,
  soon,
}: SidebarNavItemProps) {
  if (soon) {
    return (
      <div
        className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--r-sm)] text-sm font-medium text-[var(--c-ink-onbrand-muted)] cursor-default select-none opacity-60"
        aria-disabled="true"
      >
        <span className="w-4 h-4 flex-shrink-0 opacity-70">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <span className="text-[9px] uppercase tracking-wide font-semibold px-1.5 py-px rounded-[var(--r-pill)] bg-white/10 text-[var(--c-ink-onbrand-muted)]">
          Pronto
        </span>
      </div>
    );
  }
  const inner = (
    <>
      {active && (
        <span
          className="absolute -left-5 top-0 bottom-0 w-[3px] rounded-r bg-[var(--c-accent)]"
          aria-hidden
        />
      )}
      <span className="w-4 h-4 flex-shrink-0 opacity-80">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "font-mono text-[10px] px-1.5 py-px rounded-[var(--r-pill)]",
            countUrgent
              ? "bg-[var(--c-accent)] text-[var(--c-ink-onaccent)] font-bold"
              : "bg-white/10 text-[var(--c-ink-onbrand-muted)]"
          )}
        >
          {count}
        </span>
      )}
    </>
  );

  const cls = cn(
    "w-full flex items-center gap-3 px-3 py-2 rounded-[var(--r-sm)] text-sm font-medium",
    "transition-colors duration-150 relative",
    active
      ? "bg-white/10 text-[var(--c-ink-onbrand)]"
      : "text-[var(--c-ink-onbrand-muted)] hover:bg-white/5 hover:text-[var(--c-ink-onbrand)]"
  );

  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function SidebarUserChip({
  initials,
  name,
  role,
}: {
  initials: string;
  name: string;
  role: string;
}) {
  return (
    <div className="mt-auto flex items-center gap-3 p-3 bg-white/5 rounded-[var(--r-md)]">
      <div className="w-8 h-8 rounded-[var(--r-pill)] bg-[image:var(--grad-warm)] flex items-center justify-center font-bold text-xs text-[var(--c-ink-onaccent)]">
        {initials}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[var(--c-ink-onbrand)] text-sm font-semibold">{name}</span>
        <span className="text-[var(--c-ink-onbrand-muted)] text-[10px]">{role}</span>
      </div>
    </div>
  );
}

/* ============================================================
   TOPBAR PARTS
   ============================================================ */

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]" aria-label="Breadcrumb">
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i}>
            {it.href && !isLast ? (
              <a href={it.href} className="hover:text-[var(--c-brand)] hover:underline">
                {it.label}
              </a>
            ) : (
              <span className={isLast ? "text-[var(--c-ink)] font-semibold" : ""}>{it.label}</span>
            )}
            {!isLast && <span className="mx-1.5 text-[var(--c-ink-subtle)]">›</span>}
          </span>
        );
      })}
    </nav>
  );
}

export function TopbarSearch({
  placeholder = "Buscar alumno, viaje o colegio…",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex-1 max-w-md relative">
      <svg
        viewBox="0 0 16 16"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--c-ink-subtle)]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <circle cx={7} cy={7} r={4.5} />
        <path d="M10.5 10.5L14 14" strokeLinecap="round" />
      </svg>
      <input
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 border border-[var(--c-border)] rounded-[var(--r-pill)] bg-[var(--c-surface-2)] text-[length:var(--t-small)] text-[var(--c-ink)] placeholder:text-[var(--c-ink-subtle)] transition-[border-color,box-shadow,background-color] duration-150 focus:outline-none focus:bg-[var(--c-surface)] focus:border-[var(--c-brand-300)] focus:shadow-[shadow:var(--ring-focus)]"
        {...rest}
      />
    </div>
  );
}
