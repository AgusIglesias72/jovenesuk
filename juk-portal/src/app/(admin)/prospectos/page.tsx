import Link from "next/link";

import { LinkButton, PageHeader, Pagination } from "@/components/ui";
import { listProspectos } from "@/lib/db/queries/prospectos";
import { prospectoFiltersSchema } from "@/lib/domain/prospectos";
import { cn } from "@/lib/utils/cn";
import { paginar } from "@/lib/utils/paginate";

import { ProspectosFilters } from "./prospectos-filters";
import { ProspectosKanban } from "./prospectos-kanban";
import { ProspectosTable } from "./prospectos-table";

export const metadata = { title: "Prospectos" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Vista = "kanban" | "tabla";

export default async function ProspectosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  const vista: Vista = str(sp.vista) === "tabla" ? "tabla" : "kanban";

  const parsed = prospectoFiltersSchema.safeParse({
    q: str(sp.q),
    estado: str(sp.estado),
    page: str(sp.page),
  });
  const filters = parsed.success ? parsed.data : {};

  const todos = await listProspectos({ q: filters.q, estado: filters.estado });
  const total = todos.length;

  const conVista = (v: Vista) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.estado) params.set("estado", filters.estado);
    params.set("vista", v);
    return `/prospectos?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Prospectos"
        subtitle={total === 1 ? "1 prospecto" : `${total} prospectos`}
        actions={
          <>
            <div
              className="inline-flex rounded-[var(--r-pill)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] p-0.5"
              role="group"
              aria-label="Vista"
            >
              <VistaTab href={conVista("kanban")} activo={vista === "kanban"}>
                Kanban
              </VistaTab>
              <VistaTab href={conVista("tabla")} activo={vista === "tabla"}>
                Tabla
              </VistaTab>
            </div>
            <LinkButton href="/prospectos/importar" variant="secondary">
              Importar
            </LinkButton>
            <LinkButton href="/prospectos/nuevo">+ Nuevo</LinkButton>
          </>
        }
      />

      {vista === "tabla" ? (
        <TablaVista todos={todos} pageParam={str(sp.page)} />
      ) : (
        <ProspectosKanban prospectos={todos} />
      )}
    </>
  );
}

function VistaTab({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "rounded-[var(--r-pill)] px-3 py-1 text-[length:var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] transition-colors",
        activo
          ? "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)]"
          : "text-[var(--c-ink-muted)] hover:text-[var(--c-ink)]"
      )}
    >
      {children}
    </Link>
  );
}

function TablaVista({
  todos,
  pageParam,
}: {
  todos: Awaited<ReturnType<typeof listProspectos>>;
  pageParam: string | undefined;
}) {
  const { items, total, page, pages } = paginar(todos, pageParam);
  return (
    <>
      <div className="mb-4">
        <ProspectosFilters />
      </div>
      <ProspectosTable prospectos={items} />
      <Pagination total={total} page={page} pages={pages} />
    </>
  );
}
