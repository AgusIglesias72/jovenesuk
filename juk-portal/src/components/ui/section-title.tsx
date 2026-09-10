import { cn } from "@/lib/utils/cn";

/**
 * SectionTitle — el rótulo de sección de la app.
 *
 * Es el patrón que ya estaba copiado a mano en los 5 formularios, en
 * pagos-table, en la ficha del alumno y en el detalle del prospecto. Vive acá
 * para que cambiarlo sea un solo lugar.
 *
 * `as` permite usarlo como `dt` en las listas de definición (detalle de viaje)
 * o bajar a `h3` cuando ya hay un `h2` en la sección.
 *
 * @example
 *   <SectionTitle>Datos del pasaporte</SectionTitle>
 *   <SectionTitle as="dt">Cupo</SectionTitle>
 */

const ETIQUETAS = ["h2", "h3", "h4", "dt", "div"] as const;

type SectionTitleTag = (typeof ETIQUETAS)[number];

/** El className consolidado, para los casos que no pueden usar el componente. */
export const sectionTitleClasses =
  "text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]";

interface SectionTitleProps {
  children: React.ReactNode;
  as?: SectionTitleTag;
  className?: string;
  id?: string;
}

export function SectionTitle({ children, as = "h2", className, id }: SectionTitleProps) {
  const Tag = as;
  return (
    <Tag id={id} className={cn(sectionTitleClasses, className)}>
      {children}
    </Tag>
  );
}
