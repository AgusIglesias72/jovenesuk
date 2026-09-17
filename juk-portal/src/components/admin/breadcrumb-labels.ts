import { formatearDni } from "@/lib/utils/dni";

/**
 * Breadcrumb del back-office derivado del pathname.
 *
 * Los segmentos dinámicos de las rutas de detalle son slugs (DNI del alumno,
 * código del viaje) o uuids. Un uuid no le dice nada a nadie: se omite y el
 * breadcrumb queda "Colegios › Editar". El DNI se muestra con puntos y el
 * código de viaje tal cual (ya es legible).
 *
 * Resolver el NOMBRE real del alumno/viaje exigiría que cada page le pase el
 * dato al shell (contexto + estado en el layout, doble render en cada
 * navegación): queda como mejora aparte, no vale ese costo acá.
 */

export type Crumb = { label: string; href?: string };

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  alumnos: "Alumnos",
  viajes: "Viajes",
  colegios: "Colegios",
  prospectos: "Prospectos",
  "group-leaders": "Group Leaders",
  pagos: "Pagos",
  consultas: "Consultas",
  inscripciones: "Inscripciones",
  invitaciones: "Invitaciones",
  usuarios: "Usuarios",
  configuracion: "Configuración",
  cuenta: "Mi cuenta",
  nuevo: "Nuevo",
  editar: "Editar",
  importar: "Importar",
  documentacion: "Documentación",
  asignaciones: "Asignaciones",
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function capitalizar(seg: string): string {
  const limpio = decodeURIComponent(seg).replace(/-/g, " ");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** Etiqueta de un segmento dinámico según la raíz de la ruta. `null` = omitir. */
function labelDinamico(raiz: string, seg: string): string | null {
  if (UUID.test(seg)) return null;
  if (raiz === "alumnos" && /^\d+$/.test(seg)) return formatearDni(seg);
  return decodeURIComponent(seg);
}

export function buildBreadcrumb(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Inicio" }];

  const raiz = segments[0] ?? "";
  const crumbs: Crumb[] = [];

  segments.forEach((seg, i) => {
    const href =
      i === segments.length - 1 ? undefined : "/" + segments.slice(0, i + 1).join("/");

    const conocido = LABEL_MAP[seg];
    if (conocido) {
      crumbs.push({ label: conocido, href });
      return;
    }

    if (i === 0) {
      crumbs.push({ label: capitalizar(seg), href });
      return;
    }

    const label = labelDinamico(raiz, seg);
    if (label === null) return;
    crumbs.push({ label, href });
  });

  return crumbs.length > 0 ? crumbs : [{ label: "Inicio" }];
}
