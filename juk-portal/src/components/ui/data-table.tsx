import { cn } from "@/lib/utils/cn";

/**
 * DataTable — dense table for student / trip / payment lists.
 *
 * Density rules:
 *  - Row padding 12px vertical (NOT 16-24px like generic SaaS)
 *  - Hover state highlights with var(--c-overlay)
 *  - Compound cells (CodeCell, DateCell) reused everywhere; money goes
 *    through formatMonto (@/lib/domain/cuotas), not a cell component
 *
 * Monospace columns must use font-mono + tabular-nums for proper alignment.
 *
 * @example
 *   <TableWrap>
 *     <Table>
 *       <THead>
 *         <TR>
 *           <TH>Alumno</TH>
 *           <TH>Viaje</TH>
 *           <TH>Pasaporte vto.</TH>
 *           <TH numeric>Saldo</TH>
 *           <TH className="w-[88px]" />
 *         </TR>
 *       </THead>
 *       <TBody>
 *         <TR onClick={() => router.push(`/alumnos/${dni}`)}>
 *           <TD>Camila O'Toole</TD>
 *           <TD><CodeCell code="UK-2026-JUL-LONDON" /></TD>
 *           <TD><DateCell date="03/2030" /></TD>
 *           <TD numeric>{formatMonto(1250, "GBP")}</TD>
 *           <TD><Button variant="ghost" size="sm">Abrir</Button></TD>
 *         </TR>
 *       </TBody>
 *     </Table>
 *   </TableWrap>
 */

export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "border border-[var(--c-border)] rounded-[var(--r-lg)] overflow-hidden bg-[var(--c-surface)] shadow-[shadow:var(--shadow-1)]",
        className
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <table className={cn("w-full border-collapse text-[length:var(--t-small)]", className)}>
      {children}
    </table>
  );
}

export function THead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <thead className={cn("bg-[var(--c-surface-2)]", className)}>{children}</thead>;
}

export function TBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tbody className={className}>{children}</tbody>;
}

interface TRProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
}

export function TR({ hoverable = true, className, ...props }: TRProps) {
  return (
    <tr
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
}

export function TD({ numeric, className, ...props }: TDProps) {
  return (
    <td
      className={cn(
        "px-4 py-3 border-b border-[var(--c-border)] text-[var(--c-ink)] align-middle last:border-b-0",
        numeric && "text-right tabular-nums font-mono",
        className
      )}
      {...props}
    />
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
