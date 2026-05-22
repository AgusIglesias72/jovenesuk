import { cn } from "@/lib/utils/cn";

/**
 * AppShell — main authenticated layout.
 *
 * Navy-950 sidebar (left) + topbar + scrollable content.
 * The deep navy on the left provides constant orientation.
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
    <div className={cn("min-h-screen grid grid-cols-[256px_1fr] bg-gray-50", className)}>
      <aside className="bg-juk-navy-950 text-juk-navy-200 p-5 flex flex-col">{sidebar}</aside>
      <main className="flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-4">
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
      <div className="w-9 h-9 bg-juk-coral-600 rounded-md flex items-center justify-center text-white font-display font-bold text-base">
        J
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-white font-display font-semibold text-[15px] tracking-tight">{orgName}</span>
        <span className="text-juk-navy-400 text-[10px] uppercase tracking-widest font-medium mt-0.5">
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
        <div className="text-[10px] uppercase tracking-widest text-juk-navy-400 px-3 mb-2 font-semibold">
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
}

export function SidebarNavItem({
  icon,
  label,
  count,
  countUrgent,
  active,
  onClick,
  href,
}: SidebarNavItemProps) {
  const inner = (
    <>
      {active && (
        <span className="absolute -left-5 top-0 bottom-0 w-[3px] bg-juk-coral-500" aria-hidden />
      )}
      <span className="w-4 h-4 flex-shrink-0 opacity-80">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "font-mono text-[10px] px-1.5 py-px rounded-full",
            countUrgent ? "bg-juk-coral-600 text-white" : "bg-white/10 text-juk-navy-200"
          )}
        >
          {count}
        </span>
      )}
    </>
  );

  const cls = cn(
    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
    "transition-colors duration-150 relative",
    active
      ? "bg-juk-navy-800 text-white"
      : "text-juk-navy-200 hover:bg-white/5 hover:text-white"
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
    <div className="mt-auto flex items-center gap-3 p-3 bg-white/5 rounded-md">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-juk-gold-500 to-juk-coral-500 flex items-center justify-center font-bold text-xs text-juk-navy-950">
        {initials}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-white text-sm font-semibold">{name}</span>
        <span className="text-juk-navy-400 text-[10px]">{role}</span>
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
    <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i}>
            {it.href && !isLast ? (
              <a href={it.href} className="hover:text-juk-navy-900">
                {it.label}
              </a>
            ) : (
              <span className={isLast ? "text-juk-navy-900 font-semibold" : ""}>{it.label}</span>
            )}
            {!isLast && <span className="mx-1.5 opacity-40">›</span>}
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
        className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <circle cx={7} cy={7} r={4.5} />
        <path d="M10.5 10.5L14 14" strokeLinecap="round" />
      </svg>
      <input
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none focus:bg-white focus:border-juk-navy-700 focus:shadow-focus"
        {...rest}
      />
    </div>
  );
}
