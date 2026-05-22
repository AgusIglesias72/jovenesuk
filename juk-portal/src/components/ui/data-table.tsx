import { cn } from "@/lib/utils/cn";

/**
 * DataTable — dense table for student / trip / payment lists.
 *
 * Density rules:
 *  - Row padding 12px vertical (NOT 16-24px like generic SaaS)
 *  - Hover state highlights with juk-navy-50
 *  - Compound cells (StudentCell, MoneyCell, etc) reused everywhere
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
 *         <TR onClick={() => router.push(`/alumnos/${id}`)}>
 *           <TD><StudentCell name="Camila O'Toole" passport="AAB 562 419" /></TD>
 *           <TD><CodeCell code="UK-2026-JUL-LONDON" /></TD>
 *           <TD><DateCell date="03/2030" /></TD>
 *           <TD numeric><MoneyCell amount={1250} /></TD>
 *           <TD><Button variant="ghost" size="sm">Abrir</Button></TD>
 *         </TR>
 *       </TBody>
 *     </Table>
 *   </TableWrap>
 */

export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden bg-white", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <table className={cn("w-full border-collapse text-sm", className)}>{children}</table>;
}

export function THead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <thead className={cn("bg-gray-50", className)}>{children}</thead>;
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
        hoverable && "hover:bg-juk-navy-50 transition-colors duration-150",
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
        "text-left font-semibold text-xs uppercase tracking-wide text-gray-600",
        "px-4 py-3 border-b border-gray-200",
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
        "px-4 py-3 border-b border-gray-200 text-gray-900 align-middle last:border-b-0",
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

export function StudentCell({ name, passport }: { name: string; passport?: string }) {
  return (
    <>
      <div className="font-semibold text-juk-navy-950">{name}</div>
      {passport && (
        <div className="font-mono text-xs text-gray-500 tabular-nums mt-px">{passport}</div>
      )}
    </>
  );
}

export function CodeCell({ code }: { code: string }) {
  return (
    <span className="font-mono text-xs font-semibold tracking-wide text-juk-navy-700">
      {code}
    </span>
  );
}

export function DateCell({ date }: { date: string }) {
  return <span className="font-mono text-xs text-gray-700 tabular-nums">{date}</span>;
}

type Currency = "GBP" | "ARS" | "USD";

export function MoneyCell({ amount, currency = "GBP" }: { amount: number; currency?: Currency }) {
  const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : "AR$";
  return (
    <span className="font-mono text-sm tabular-nums">
      {symbol} {amount.toLocaleString("es-AR")}
    </span>
  );
}
