import { cn } from "@/lib/utils/cn";

/**
 * DataTable — tabla densa para listados de alumnos / viajes / pagos.
 *
 * Reglas de densidad:
 *  - Padding de fila 12px vertical (NO 16-24px como el SaaS genérico)
 *  - Hover con var(--c-overlay)
 *  - Celdas compuestas (CodeCell, DateCell) reutilizadas en todos lados; la
 *    plata pasa por formatMonto (@/lib/domain/cuotas), no por una celda
 *
 * Las columnas monoespaciadas usan font-mono + tabular-nums para alinear.
 *
 * @example
 *   <TableWrap>
 *     <Table responsive>
 *       <THead>
 *         <TR>
 *           <TH>Alumno</TH>
 *           <TH>Viaje</TH>
 *           <TH>Pasaporte vto.</TH>
 *           <TH numeric>Saldo</TH>
 *           <TH className="w-[88px]"><span className="sr-only">Acciones</span></TH>
 *         </TR>
 *       </THead>
 *       <TBody>
 *         <TR onClick={() => router.push(`/alumnos/${dni}`)}>
 *           <TD label="Alumno">Camila O'Toole</TD>
 *           <TD label="Viaje"><CodeCell code="UK-2026-JUL-LONDON" /></TD>
 *           <TD label="Pasaporte vto."><DateCell date="03/2030" /></TD>
 *           <TD label="Saldo" numeric>{formatMonto(1250, "GBP")}</TD>
 *           <TD className="max-sm:justify-end"><LinkButton variant="ghost" size="sm">Abrir</LinkButton></TD>
 *         </TR>
 *       </TBody>
 *     </Table>
 *   </TableWrap>
 *
 * ── MODO CARD (mobile) ─────────────────────────────────────────────────────
 * `<Table responsive>` convierte la tabla en una lista de tarjetas por debajo
 * de `sm` (640px): el thead desaparece, cada fila pasa a ser un bloque y cada
 * celda muestra su rótulo a la izquierda y su valor a la derecha. El rótulo
 * sale de `<TD label="…">`: pasale a CADA celda el mismo texto que su `<TH>`.
 * Las celdas sin `label` (acciones) quedan a lo ancho; alineá el contenido con
 * `className="max-sm:justify-end"`.
 *
 * Accesibilidad:
 *  - `display:block` borra los roles implícitos de tabla en Chromium, así que
 *    table/thead/tbody/tr/th/td declaran su rol explícito SIEMPRE (no solo en
 *    modo card): el DOM es idéntico en las dos vistas y `getByRole("row"|"cell")`
 *    sigue resolviendo (recorrido-completo.spec.ts, prospectos.spec.ts).
 *  - En modo card el thead se oculta del árbol de accesibilidad porque cada
 *    celda ya lleva su rótulo visible y anunciado. OJO: por debajo de 640px el
 *    nombre accesible de la celda incluye el rótulo ("Alumno Camila O'Toole"),
 *    así que un test mobile debe filtrar por `hasText`, no por el nombre exacto.
 *  - El scroll horizontal sigue disponible: las tablas que NO adoptan cards
 *    (previews anchas) scrollean con el indicador de TableWrap.
 */

/**
 * Clases del modo card. Viven en `<Table>` y alcanzan a thead/tbody/tr/td con
 * variantes arbitrarias: el único que sabe si la tabla es responsive es la
 * tabla, y así TR/TH/TD siguen siendo componentes tontos que no necesitan
 * contexto (ni `"use client"`) y funcionan en server components.
 *
 * La especificidad de un selector descendente (0,1,1) le gana a la utility
 * base de la celda (0,1,0), así que el override no depende del orden.
 */
export const CLASES_MODO_CARD = [
  "max-sm:block",
  "max-sm:[&_thead]:hidden",
  "max-sm:[&_tbody]:block",
  "max-sm:[&_tr]:block",
  "max-sm:[&_tbody_tr]:border-b max-sm:[&_tbody_tr]:border-[var(--c-border)]",
  "max-sm:[&_tbody_tr]:py-2",
  "max-sm:[&_tbody_tr:last-child]:border-b-0",
  "max-sm:[&_td]:flex max-sm:[&_td]:items-baseline max-sm:[&_td]:justify-between",
  "max-sm:[&_td]:gap-3 max-sm:[&_td]:border-b-0 max-sm:[&_td]:px-4 max-sm:[&_td]:py-1.5",
].join(" ");

/**
 * Sombras de scroll en CSS puro (técnica de gradientes `local` + `scroll`):
 * las dos capas `local` viajan con el contenido y tapan las sombras cuando la
 * tabla está en un extremo, así que el indicador aparece SOLO si hay algo más
 * para ver. Sin JS y sin medir nada. Se pinta en el contenedor que scrollea,
 * detrás del thead opaco, así que solo se ve sobre el cuerpo de la tabla.
 */
const SOMBRAS_DE_SCROLL = [
  "[background-image:linear-gradient(to_right,var(--c-surface),transparent),linear-gradient(to_left,var(--c-surface),transparent),linear-gradient(to_right,var(--c-ring),transparent),linear-gradient(to_left,var(--c-ring),transparent)]",
  "[background-position:left_center,right_center,left_center,right_center]",
  "[background-size:20px_100%,20px_100%,12px_100%,12px_100%]",
  "[background-repeat:no-repeat]",
  "[background-attachment:local,local,scroll,scroll]",
].join(" ");

export function TableWrap({
  children,
  className,
  scrollHint = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Indicador de scroll horizontal. Apagalo si la tabla nunca desborda. */
  scrollHint?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-[var(--c-border)] rounded-[var(--r-lg)] overflow-hidden bg-[var(--c-surface)] shadow-[shadow:var(--shadow-1)]",
        className
      )}
    >
      <div className={cn("overflow-x-auto", scrollHint && SOMBRAS_DE_SCROLL)}>{children}</div>
    </div>
  );
}

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Modo card por debajo de 640px. Requiere `label` en cada `<TD>`. */
  responsive?: boolean;
}

export function Table({ responsive, className, ...props }: TableProps) {
  return (
    <table
      role="table"
      className={cn(
        "w-full border-collapse text-[length:var(--t-small)]",
        responsive && CLASES_MODO_CARD,
        className
      )}
      {...props}
    />
  );
}

export function THead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <thead role="rowgroup" className={cn("bg-[var(--c-surface-2)]", className)}>
      {children}
    </thead>
  );
}

export function TBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tbody role="rowgroup" className={className}>
      {children}
    </tbody>
  );
}

interface TRProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
}

export function TR({ hoverable = true, className, ...props }: TRProps) {
  return (
    <tr
      role="row"
      className={cn(
        hoverable && "hover:bg-[var(--c-overlay)] transition-colors duration-150",
        props.onClick && "cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

interface THProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function TH({ numeric, className, ...props }: THProps) {
  return (
    <th
      role="columnheader"
      scope="col"
      className={cn(
        "text-left font-bold text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]",
        "px-4 py-3 border-b border-[var(--c-border)]",
        numeric && "text-right",
        className
      )}
      {...props}
    />
  );
}

interface TDProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  /** Rótulo de la columna: se muestra dentro de la celda en modo card (<sm). */
  label?: string;
}

export function TD({ numeric, label, className, children, ...props }: TDProps) {
  return (
    <td
      role="cell"
      data-label={label}
      className={cn(
        "px-4 py-3 border-b border-[var(--c-border)] text-[var(--c-ink)] align-middle last:border-b-0",
        numeric && "text-right tabular-nums font-mono",
        className
      )}
      {...props}
    >
      {label === undefined ? (
        children
      ) : (
        <>
          <span className="hidden shrink-0 font-bold uppercase tracking-[var(--ls-label)] text-[length:var(--t-label)] text-[var(--c-ink-muted)] max-sm:block">
            {label}
          </span>
          <span className="contents max-sm:block max-sm:min-w-0 max-sm:text-right">{children}</span>
        </>
      )}
    </td>
  );
}

/* ============================================================
   COMPOUND CELLS — domain-specific
   ============================================================ */

export function CodeCell({ code }: { code: string }) {
  return (
    <span className="font-mono text-[length:var(--t-mono)] font-bold tracking-wide text-[var(--c-brand)]">
      {code}
    </span>
  );
}

export function DateCell({ date }: { date: string }) {
  return (
    <span className="font-mono text-[length:var(--t-mono)] text-[var(--c-ink-muted)] tabular-nums">
      {date}
    </span>
  );
}
